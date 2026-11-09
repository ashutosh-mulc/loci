// Two-way sync between the Loci cloud graph (Supabase) and this project.
//   push: every thought in Assets/Data/cloud-palace.json that the cloud doesn't have yet is sent
//         to `ingest` (the cloud picks or makes its topic, links it, and has the LLM judge links).
//         To add a memory locally, append {label, text, kind?, prompt?, topic?} to "thoughts";
//         `id` is optional. `topic` may be an existing topic id or a new topic name.
//   pull: the cloud palace is written back to Assets/Data/cloud-palace.json (the mirror) and
//         Assets/Scripts/PalaceData.ts is regenerated from it, keeping each star's layout offset,
//         so the Lens, the demo tour and the LEAF tests all show the cloud graph.
// Usage (from the repo root):  node --env-file=.env tools/palace-builder/sync_cloud.mjs [--pull-only]
// Deleting or editing a thought locally is not synced up (the cloud keeps it); do that in Supabase.
import { existsSync, readFileSync, writeFileSync } from "node:fs"

const root = new URL("../../", import.meta.url)
const MIRROR = new URL("Assets/Data/cloud-palace.json", root)
const DATA_TS = new URL("Assets/Scripts/PalaceData.ts", root)
const pullOnly = process.argv.includes("--pull-only")

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY
if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY in .env"); process.exit(1) }
const fn = `${url.replace(/\/$/, "")}/functions/v1/ingest`
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key }
const getPalace = async () => {
  const r = await fetch(fn, { headers })
  if (!r.ok) throw new Error(`GET palace ${r.status}: ${await r.text()}`)
  return r.json()
}

// The current PalaceData.ts: its offsets (curated star layouts) and its full content as a fallback.
function readDataTs() {
  const src = readFileSync(DATA_TS, "utf8")
  const literal = src.slice(src.indexOf("= {", src.indexOf("export const PALACE")) + 2).replace(/;\s*$/, "")
  return Function(`"use strict"; return (${literal})`)()
}

let cloud = await getPalace()

// ---------- push ----------
if (!pullOnly && existsSync(MIRROR)) {
  const local = JSON.parse(readFileSync(MIRROR, "utf8"))
  const have = new Set(cloud.thoughts.map((t) => t.id))
  const topicIds = new Set(cloud.topics.map((t) => t.id))
  const nameOf = Object.fromEntries((local.topics ?? []).concat(cloud.topics).map((t) => [t.id, t.name]))
  const fresh = (local.thoughts ?? []).filter((t) => t && t.label && t.text && !(t.id && have.has(t.id)))
  if (fresh.length) {
    console.log(`Pushing ${fresh.length} new thought(s) to the cloud…`)
    for (let i = 0; i < fresh.length; i += 5) {
      const items = fresh.slice(i, i + 5).map((t) => ({
        id: t.id, label: t.label, text: t.text, kind: t.kind, prompt: t.prompt, source: t.source || "local note",
        // An existing topic id pins it there; anything else is a hint for a new topic's name.
        ...(topicIds.has(t.topic) ? { topic_id: t.topic, topic_hint: nameOf[t.topic] } : { topic_hint: nameOf[t.topic] ?? t.topic }),
      }))
      const res = await fetch(fn, { method: "POST", headers, body: JSON.stringify({ items }) })
      const body = await res.json()
      if (!res.ok) { console.error("Push failed:", res.status, body); process.exit(1) }
      for (const r of body.results) {
        if (r.error) console.log(`  ✗ ${r.label}: ${r.error}`)
        else console.log(`  + ${r.label} → ${r.new_topic ? "new topic " : ""}${r.topic}` +
          (r.links?.length ? `, linked: ${r.links.map((l) => `${l.relation} (${l.why})`).join("; ")}` : ""))
      }
    }
    cloud = await getPalace()
  } else {
    console.log("Nothing new to push.")
  }
}

// ---------- pull ----------
const old = readDataTs()
const offsetOf = Object.fromEntries(old.thoughts.map((t) => [t.id, t.offset]))
const spotOf = Object.fromEntries(old.topics.map((t) => [t.id, t.spot]))
// Default layout for a star with no curated offset: the schema's ring (13 cm across).
const ring = (n) => n === 0 ? [0, 0, 0]
  : [Math.round(Math.cos(((n - 1) / 7) * Math.PI * 2) * 130) / 10, Math.round(Math.sin(((n - 1) / 7) * Math.PI * 2) * 100) / 10, n % 2 ? 5 : -5]

const perTopic = new Map()
const palace = {
  topics: cloud.topics.map((t) => ({ id: t.id, name: t.name, spot: spotOf[t.id] ?? t.spot ?? "wall" })),
  thoughts: cloud.thoughts.map((t) => {
    const n = perTopic.get(t.topic) ?? 0
    perTopic.set(t.topic, n + 1)
    return {
      id: t.id, topic: t.topic, label: t.label, text: t.text, kind: t.kind, date: t.date,
      source: t.source, prompt: t.prompt || `What did you conclude about "${t.label}"?`,
      offset: offsetOf[t.id] ?? ring(n),
    }
  }),
  // The Lens shows at most 2 threads per thought; the cloud already sorts judged links first.
  threads: cloud.threads.map((e) => ({ from: e.from, to: e.to, why: e.why || "", ...(e.relation ? { relation: e.relation } : {}) })),
}
if (palace.thoughts.length === 0) { console.error("The cloud palace is empty; not overwriting local data."); process.exit(1) }

writeFileSync(MIRROR, JSON.stringify(palace, null, 2) + "\n")

const q = (s) => JSON.stringify(s ?? "")
const ts = `// Assets/Scripts/PalaceData.ts
// GENERATED by tools/palace-builder/sync_cloud.mjs from the Loci cloud graph (Supabase) on ${new Date().toISOString().slice(0, 10)}.
// Do not hand-edit: add memories to Assets/Data/cloud-palace.json (or with add.mjs) and re-run the sync.
// Topics are formed by the cloud; links are proposed by similarity and judged by an LLM.
// Schema and limits: devpost/data-spec.md. No people's names.

export type Kind = "decision" | "insight" | "question";

export interface Topic {
  id: string;
  name: string;
  spot: string;
}

export interface Thought {
  id: string;
  topic: string;
  label: string;
  text: string;
  kind: Kind;
  date: string;
  source: string;
  prompt: string;
  offset: [number, number, number];
}

export interface Thread {
  from: string;
  to: string;
  why: string;
  /** How \`from\` relates to \`to\` (LLM-judged), e.g. "answers". Absent = similarity only. */
  relation?: string;
}


export const PALACE: { topics: Topic[]; thoughts: Thought[]; threads: Thread[] } = {
  topics: [
${palace.topics.map((t) => `    { id: ${q(t.id)}, name: ${q(t.name)}, spot: ${q(t.spot)} },`).join("\n")}
  ],
  thoughts: [
${palace.thoughts.map((t) => `    { id: ${q(t.id)}, topic: ${q(t.topic)}, label: ${q(t.label)}, kind: ${q(t.kind)},
      text: ${q(t.text)},
      date: ${q(t.date)}, source: ${q(t.source)}, prompt: ${q(t.prompt)}, offset: [${t.offset.map((v) => Number(v).toFixed(1)).join(", ")}] },`).join("\n")}
  ],
  threads: [
${palace.threads.map((e) => `    { from: ${q(e.from)}, to: ${q(e.to)}, why: ${q(e.why)}${e.relation ? `, relation: ${q(e.relation)}` : ""} },`).join("\n")}
  ],
};
`
writeFileSync(DATA_TS, ts)
const judged = palace.threads.filter((t) => t.relation && t.relation !== "none").length
console.log(`Pulled ${palace.topics.length} topics, ${palace.thoughts.length} thoughts, ${palace.threads.length} threads ` +
  `(${judged} judged by the LLM) → Assets/Data/cloud-palace.json and Assets/Scripts/PalaceData.ts`)
