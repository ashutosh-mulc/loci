// Loci `ingest` Edge Function.
//   GET  → the palace JSON (same shape as Assets/Scripts/PalaceData.ts) for the Lens.
//   POST → add thoughts: {label, text, prompt?, kind?, source?, topic_hint?} or {items: [...]}.
//          Each is embedded with Supabase's built-in gte-small, then public.ingest_node() picks
//          its topic and proposes edges by similarity. If GROQ_API_KEY is set, an LLM then judges
//          each proposed cross-topic edge: related or not, which relation, and a short reason.
//   POST {action: "judge"} (service key only) → judge every unjudged cross-topic edge (backfill).
// Free: gte-small runs inside Supabase; the LLM is Groq's free tier (no key = similarity only).
// The service key is injected by Supabase, never shipped.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
const model = new Supabase.ai.Session("gte-small")

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })

const LLM_KEY = Deno.env.get("GROQ_API_KEY") ?? ""
const LLM_MODEL = Deno.env.get("GROQ_MODEL") ?? "openai/gpt-oss-120b"
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// New-style projects use sb_secret_… keys (SUPABASE_SECRET_KEYS, a JSON map of name → key), sent in
// the `apikey` header; legacy projects use the service_role JWT in `Authorization`. Accept either.
const SECRET_KEYS: string[] = (() => {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS") ?? ""
  try { return Object.values(JSON.parse(raw)).filter((v): v is string => typeof v === "string") }
  catch { return raw ? [raw] : [] }
})()
function isServiceKey(req: Request): boolean {
  const apikey = req.headers.get("apikey") ?? ""
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
  return (apikey !== "" && SECRET_KEYS.includes(apikey)) || (bearer !== "" && bearer === SERVICE_KEY)
}
const RELATIONS =["supports", "contradicts", "depends on", "answers", "refines", "example of"]

type Node = { id: string; topic_id: string; label: string; text: string; kind: string }
type Edge = { src: string; dst: string }

/** Ask the LLM about up to 40 pairs in one call. Returns pair index → verdict. */
async function askLLM(pairs: [Node, Node][]): Promise<Map<number, { related: boolean; relation: string; why: string }>> {
  const list = pairs.map(([a, b], i) =>
    `${i}. A (${a.kind}): "${a.label}: ${a.text}"\n   B (${b.kind}): "${b.label}: ${b.text}"`).join("\n")
  const prompt = `These are notes from one person's AI conversations, from different topics.
For each pair, decide if there is a real, specific link a reader would find useful (not just shared words or a shared broad theme).
If related, pick the relation of A to B from: ${RELATIONS.join(", ")}; and give the reason in at most 8 plain words.
Be strict: most pairs are not related.\n\n${list}`
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: 'Reply with JSON only: {"verdicts": [{"pair": <number>, "related": <true|false>, "relation": "<one of the list, if related>", "why": "<8 words max, if related>"}]}, one verdict per pair.' },
        { role: "user", content: prompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const out = await res.json()
  const parsed = JSON.parse(out?.choices?.[0]?.message?.content ?? "{}")
  const verdicts: any[] = Array.isArray(parsed?.verdicts) ? parsed.verdicts : []
  const m = new Map<number, { related: boolean; relation: string; why: string }>()
  for (const v of verdicts) {
    if (typeof v?.pair !== "number" || v.pair < 0 || v.pair >= pairs.length) continue
    const ok = v.related === true && RELATIONS.includes(v.relation)
    m.set(v.pair, { related: ok, relation: ok ? v.relation : "none", why: ok ? clip(v.why, 8) : "" })
  }
  return m
}

/** Judge the given edges (cross-topic only); write relation + why. Returns counts. */
async function judgeEdges(edges: Edge[]): Promise<{ judged: number; kept: number; error?: string }> {
  if (!LLM_KEY || edges.length === 0) return { judged: 0, kept: 0 }
  const ids = [...new Set(edges.flatMap((e) => [e.src, e.dst]))]
  const { data: nodes, error } = await db.from("nodes").select("id, topic_id, label, text, kind").in("id", ids)
  if (error) return { judged: 0, kept: 0, error: error.message }
  const byId = new Map((nodes as Node[]).map((n) => [n.id, n]))
  const cross = edges.filter((e) => byId.get(e.src) && byId.get(e.dst) && byId.get(e.src)!.topic_id !== byId.get(e.dst)!.topic_id)
  let judged = 0, kept = 0
  try {
    for (let i = 0; i < cross.length; i += 40) {
      const batch = cross.slice(i, i + 40)
      const verdicts = await askLLM(batch.map((e) => [byId.get(e.src)!, byId.get(e.dst)!]))
      for (const [k, v] of verdicts) {
        const e = batch[k]
        await db.from("edges").update({ relation: v.relation, why: v.why }).eq("src", e.src).eq("dst", e.dst)
        judged++
        if (v.related) kept++
      }
    }
  } catch (err) {
    return { judged, kept, error: String((err as Error).message ?? err) } // unjudged edges keep the similarity fallback
  }
  return { judged, kept }
}

const words = (s: string) => s.split(/\s+/).filter(Boolean)
const clip = (s: unknown, n: number) => words(typeof s === "string" ? s.trim() : "").slice(0, n).join(" ")

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  if (req.method === "GET") {
    const { data, error } = await db.rpc("palace")
    return error ? json({ error: error.message }, 500) : json(data)
  }
  if (req.method !== "POST") return json({ error: "Use GET or POST" }, 405)

  let body: any
  try { body = await req.json() } catch { return json({ error: "Body must be JSON" }, 400) }
  if (body?.action === "judge") {
    if (!isServiceKey(req)) return json({ error: "Service key required" }, 401)
    if (!LLM_KEY) return json({ error: "Set the GROQ_API_KEY function secret first" }, 400)
    if (body.rebuild === true) {
      const { error } = await db.rpc("rebuild_edges")
      if (error) return json({ error: error.message }, 500)
    }
    const { data, error } = await db.from("edges").select("src, dst").is("relation", null)
    if (error) return json({ error: error.message }, 500)
    return json(await judgeEdges(data as Edge[]))
  }

  const items: any[] = Array.isArray(body?.items) ? body.items : [body]
  if (items.length === 0 || items.length > 50) return json({ error: "Send 1 to 50 items" }, 400)

  const results = []
  for (const it of items) {
    const label = clip(it?.label, 4)
    const text = clip(it?.text, 40)
    if (!label || !text) { results.push({ error: "label and text are required" }); continue }
    const embedding = await model.run(`${label}. ${text}`, { mean_pool: true, normalize: true }) as number[]
    const { data, error } = await db.rpc("ingest_node", {
      p_label: label,
      p_text: text,
      p_embedding: JSON.stringify(Array.from(embedding)),
      p_prompt: typeof it.prompt === "string" ? it.prompt.trim() : "",
      p_kind: it.kind ?? "insight",
      p_source: clip(it.source, 6),
      p_topic_hint: clip(it.topic_hint, 3) || null,
      p_topic_id: typeof it.topic_id === "string" ? it.topic_id : null,
      p_id: typeof it.id === "string" ? it.id : null,
    })
    if (error) { results.push({ label, error: error.message }); continue }
    const { data: fresh } = await db.from("edges").select("src, dst")
      .or(`src.eq.${data.id},dst.eq.${data.id}`).is("relation", null)
    const judge = await judgeEdges((fresh ?? []) as Edge[])
    const { data: kept } = await db.from("edges").select("src, dst, relation, why")
      .or(`src.eq.${data.id},dst.eq.${data.id}`).not("relation", "is", null).neq("relation", "none")
    results.push({ label, ...data, judge, links: kept ?? [] })
  }
  return json({ results })
})
