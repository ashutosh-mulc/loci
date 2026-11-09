// Re-propose every edge by similarity, then have the LLM judge each cross-topic pair (backfill).
// Usage (from the repo root):  node --env-file=.env tools/palace-builder/judge_cloud.mjs [--local]
// --local: judge from this machine with GROQ_API_KEY in .env (when the function secret isn't set).
// Needs SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env, and the
// GROQ_API_KEY function secret on Supabase. Prints the resulting threads, never the keys.
const url = process.env.SUPABASE_URL, anon = process.env.SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anon || !service) { console.error("Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1) }
const fn = `${url.replace(/\/$/, "")}/functions/v1/ingest`

if (process.argv.includes("--local")) {
  // Same judging as the ingest function, run from here with GROQ_API_KEY from .env (for when the
  // function secret isn't set). Rebuilds candidates, asks Groq, writes relation + why to the DB.
  const groq = process.env.GROQ_API_KEY
  if (!groq) { console.error("--local needs GROQ_API_KEY in .env"); process.exit(1) }
  const base = url.replace(/\/$/, "")
  const admin = { "Content-Type": "application/json", apikey: service } // sb_ keys: apikey only
  const rb = await fetch(`${base}/rest/v1/rpc/rebuild_edges`, { method: "POST", headers: admin, body: "{}" })
  if (!rb.ok) { console.error("rebuild_edges failed:", rb.status, await rb.text()); process.exit(1) }
  console.log(`Rebuilt ${await rb.text()} candidate links.`)
  const nodes = await (await fetch(`${base}/rest/v1/nodes?select=id,topic_id,label,text,kind`, { headers: admin })).json()
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const edges = (await (await fetch(`${base}/rest/v1/edges?select=src,dst&relation=is.null`, { headers: admin })).json())
    .filter((e) => byId.get(e.src) && byId.get(e.dst) && byId.get(e.src).topic_id !== byId.get(e.dst).topic_id)
  const RELATIONS = ["supports", "contradicts", "depends on", "answers", "refines", "example of"]
  const clip = (t, n) => String(t ?? "").split(/\s+/).filter(Boolean).slice(0, n).join(" ")
  let judged = 0, kept = 0
  for (let i = 0; i < edges.length; i += 40) {
    const batch = edges.slice(i, i + 40)
    const list = batch.map((e, k) => { const a = byId.get(e.src), b = byId.get(e.dst)
      return `${k}. A (${a.kind}): "${a.label}: ${a.text}"\n   B (${b.kind}): "${b.label}: ${b.text}"` }).join("\n")
    const prompt = `These are notes from one person's AI conversations, from different topics.
For each pair, decide if there is a real, specific link a reader would find useful (not just shared words or a shared broad theme).
If related, pick the relation of A to B from: ${RELATIONS.join(", ")}; and give the reason in at most 8 plain words.
Be strict: most pairs are not related.\n\n${list}`
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groq}` },
      body: JSON.stringify({ model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b", temperature: 0, response_format: { type: "json_object" },
        messages: [{ role: "system", content: 'Reply with JSON only: {"verdicts": [{"pair": <number>, "related": <true|false>, "relation": "<one of the list, if related>", "why": "<8 words max, if related>"}]}, one verdict per pair.' },
          { role: "user", content: prompt }] }) })
    if (!r.ok) { console.error("Groq failed:", r.status, (await r.text()).slice(0, 200)); process.exit(1) }
    const verdicts = JSON.parse((await r.json()).choices?.[0]?.message?.content ?? "{}").verdicts ?? []
    for (const v of verdicts) {
      const e = batch[v?.pair]; if (!e) continue
      const ok = v.related === true && RELATIONS.includes(v.relation)
      const up = await fetch(`${base}/rest/v1/edges?src=eq.${encodeURIComponent(e.src)}&dst=eq.${encodeURIComponent(e.dst)}`,
        { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ relation: ok ? v.relation : "none", why: ok ? clip(v.why, 8) : "" }) })
      if (!up.ok) { console.error("Update failed:", up.status, await up.text()); process.exit(1) }
      judged++; if (ok) kept++
    }
  }
  console.log(`Judged ${judged} cross-topic pairs locally with Groq, kept ${kept}.`)
} else {
  const res = await fetch(fn, {
    method: "POST",
    // sb_ keys go in `apikey` only; the gateway rejects a different key in `Authorization`.
    headers: { "Content-Type": "application/json", apikey: service },
    body: JSON.stringify({ action: "judge", rebuild: true }),
  })
  const out = await res.json()
  console.log(res.ok ? `Judged ${out.judged} cross-topic pairs, kept ${out.kept}.` : `Failed (${res.status}):`, out.error ?? "")
}

const palace = await (await fetch(fn, { headers: { Authorization: `Bearer ${anon}`, apikey: anon } })).json()
const name = Object.fromEntries(palace.thoughts.map((t) => [t.id, `${t.label} [${t.topic}]`]))
console.log(`\nThreads shown in the Lens (${palace.threads.length}):`)
for (const t of palace.threads) console.log(`  ${name[t.from]}  —${t.relation ?? "similar"}→  ${name[t.to]}${t.why ? `   "${t.why}"` : ""}`)
