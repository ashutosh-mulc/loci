// Seed the Loci cloud graph from a palace file.
//   node --env-file=.env tools/palace-builder/seed_cloud.mjs                      → the curated PalaceData.ts
//   node --env-file=.env tools/palace-builder/seed_cloud.mjs student-palace.json  → a palace JSON (topics + thoughts)
//   add --replace to wipe the cloud graph first (needs SUPABASE_SERVICE_ROLE_KEY; prints a backup path).
// Topics are kept as given (topic_id); links are found and judged by the cloud.
// Needs SUPABASE_URL and SUPABASE_ANON_KEY in .env. Prints a summary, never the keys.
import { readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY
if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY in .env"); process.exit(1) }
const base = url.replace(/\/$/, "")
const fn = `${base}/functions/v1/ingest`
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key }
const args = process.argv.slice(2)
const replace = args.includes("--replace")
const file = args.find((a) => !a.startsWith("--"))

let PALACE
if (file) {
  PALACE = JSON.parse(readFileSync(new URL(file, new URL(".", import.meta.url)), "utf8"))
} else {
  // PalaceData.ts is our own generated file: take the object literal after "= " and evaluate it.
  const src = readFileSync(new URL("../../Assets/Scripts/PalaceData.ts", import.meta.url), "utf8")
  const literal = src.slice(src.indexOf("= {", src.indexOf("export const PALACE")) + 2).replace(/;\s*$/, "")
  PALACE = Function(`"use strict"; return (${literal})`)()
}

if (replace) {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!service) { console.error("--replace needs SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1) }
  const backup = join(tmpdir(), `loci-cloud-backup-${Date.now()}.json`)
  writeFileSync(backup, JSON.stringify(await (await fetch(fn, { headers })).json(), null, 2))
  console.log(`Backed up the current cloud palace to ${backup}`)
  const admin = { apikey: service, Authorization: `Bearer ${service}`, Prefer: "return=minimal" }
  for (const [table, col] of [["edges", "src"], ["nodes", "id"], ["topics", "id"]]) {
    const r = await fetch(`${base}/rest/v1/${table}?${col}=not.is.null`, { method: "DELETE", headers: admin })
    if (!r.ok) { console.error(`Wiping ${table} failed:`, r.status, await r.text()); process.exit(1) }
  }
  console.log("Wiped the cloud graph.")
}

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
