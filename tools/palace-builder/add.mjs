// Add one memory to the Loci cloud graph and show where it landed and what it connected to.
// Usage: node --env-file=.env tools/palace-builder/add.mjs "label (≤4 words)" "one-sentence text" ["topic hint"]
const [label, text, topic_hint] = process.argv.slice(2)
if (!label || !text) { console.error('Usage: add.mjs "label" "text" ["topic hint"]'); process.exit(1) }
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY
if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY in .env"); process.exit(1) }
const fn = `${url.replace(/\/$/, "")}/functions/v1/ingest`
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key }

const res = await fetch(fn, { method: "POST", headers, body: JSON.stringify({ label, text, topic_hint, source: "spoken note" }) })
const body = await res.json()
if (!res.ok) { console.error(res.status, body); process.exit(1) }
const r = body.results[0]
if (r.error) { console.error(r.error); process.exit(1) }

const palace = await (await fetch(fn, { headers })).json()
const labelOf = Object.fromEntries(palace.thoughts.map((t) => [t.id, `${t.label} [${t.topic}]`]))
console.log(`${r.id} "${r.label}" → ${r.new_topic ? "NEW topic" : "joined"} ${r.topic}` +
  (r.topic_similarity != null ? ` (topic match ${Number(r.topic_similarity).toFixed(2)})` : ""))
for (const e of r.edges) console.log(`   ↔ ${labelOf[e.to] ?? e.to}  ${e.score}`)
if (r.edges.length === 0) console.log("   (no edges above the threshold)")
