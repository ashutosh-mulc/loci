// Re-propose every edge by similarity, then have the LLM judge each cross-topic pair (backfill).
// Usage (from the repo root):  node --env-file=.env tools/palace-builder/judge_cloud.mjs
// Needs SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env, and the
// GROQ_API_KEY function secret on Supabase. Prints the resulting threads, never the keys.
const url = process.env.SUPABASE_URL, anon = process.env.SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anon || !service) { console.error("Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1) }
const fn = `${url.replace(/\/$/, "")}/functions/v1/ingest`

const res = await fetch(fn, {
  method: "POST",
  // sb_ keys go in `apikey` only; the gateway rejects a different key in `Authorization`.
  headers: { "Content-Type": "application/json", apikey: service },
  body: JSON.stringify({ action: "judge", rebuild: true }),
})
const out = await res.json()
console.log(res.ok ? `Judged ${out.judged} cross-topic pairs, kept ${out.kept}.` : `Failed (${res.status}):`, out.error ?? "")

const palace = await (await fetch(fn, { headers: { Authorization: `Bearer ${anon}`, apikey: anon } })).json()
const name = Object.fromEntries(palace.thoughts.map((t) => [t.id, `${t.label} [${t.topic}]`]))
console.log(`\nThreads shown in the Lens (${palace.threads.length}):`)
for (const t of palace.threads) console.log(`  ${name[t.from]}  —${t.relation ?? "similar"}→  ${name[t.to]}${t.why ? `   "${t.why}"` : ""}`)
