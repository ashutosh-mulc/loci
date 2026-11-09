// Seed the Loci cloud graph with the 35 curated thoughts from Assets/Scripts/PalaceData.ts.
// Topics are kept as curated (topic_id); edges are generated automatically by the cloud.
// Usage (from the repo root):  node --env-file=.env tools/palace-builder/seed_cloud.mjs
// Needs SUPABASE_URL and SUPABASE_ANON_KEY in .env. Prints a summary, never the keys.
import { readFileSync } from "node:fs"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY
if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY in .env"); process.exit(1) }
const fn = `${url.replace(/\/$/, "")}/functions/v1/ingest`
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key }

// PalaceData.ts is our own generated file: take the object literal after "= " and evaluate it.
const src = readFileSync(new URL("../../Assets/Scripts/PalaceData.ts", import.meta.url), "utf8")
const literal = src.slice(src.indexOf("= {", src.indexOf("export const PALACE")) + 2).replace(/;\s*$/, "")
const PALACE = Function(`"use strict"; return (${literal})`)()

const topicName = Object.fromEntries(PALACE.topics.map((t) => [t.id, t.name]))
const items = PALACE.thoughts.map((t) => ({
  id: t.id, topic_id: t.topic, topic_hint: topicName[t.topic],
  label: t.label, text: t.text, prompt: t.prompt, kind: t.kind, source: t.source,
}))

// Small batches: one free-tier function call can't embed 35 texts within its compute limit.
const out = { results: [] }
for (let i = 0; i < items.length; i += 5) {
  const res = await fetch(fn, { method: "POST", headers, body: JSON.stringify({ items: items.slice(i, i + 5) }) })
  const body = await res.json()
  if (!res.ok) { console.error(`batch ${i / 5 + 1}:`, res.status, body); process.exit(1) }
  out.results.push(...body.results)
}
let edges = 0
for (const r of out.results) {
  if (r.error) console.log(`  ✗ ${r.label}: ${r.error}`)
  else { edges += r.edges.length; console.log(`  ${r.id.padEnd(4)} ${r.topic.padEnd(16)} ${r.label}  → ${r.edges.map((e) => `${e.to}(${e.score})`).join(" ") || "no edges"}`) }
}

const palace = await (await fetch(fn, { headers })).json()
console.log(`\nSeeded ${out.results.filter((r) => !r.error).length}/${items.length}. ` +
  `Palace: ${palace.topics?.length} topics, ${palace.thoughts?.length} thoughts, ${palace.threads?.length} cross-topic threads.`)
