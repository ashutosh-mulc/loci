#!/usr/bin/env bash
# Loci cloud graph: one-command setup. Safe to re-run.
#   ./start.sh            set up / update everything, then judge the edges
#   ./start.sh --no-judge skip the Groq backfill (setup only)
#
# Needs: the Supabase CLI (logged in: `supabase login`), Node 20+, and .env with
#   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_PASSWORD, GROQ_API_KEY
# Never prints the keys.
set -euo pipefail
cd "$(dirname "$0")"

say()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
quiet() { grep -v -e "new version of Supabase CLI" -e "recommend updating" || true; }

JUDGE=1
[[ "${1:-}" == "--no-judge" ]] && JUDGE=0

say "Checking tools and .env"
command -v supabase >/dev/null || fail "Supabase CLI not found. Install: brew install supabase/tap/supabase"
command -v node >/dev/null     || fail "Node not found. Install Node 20 or later."
[[ -f .env ]] || fail ".env is missing (see the header of this script for the keys it needs)."
set -a; . ./.env; set +a
for k in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_PASSWORD GROQ_API_KEY; do
  [[ -n "${!k:-}" ]] || fail "$k is not set in .env"
done
REF=$(echo "$SUPABASE_URL" | sed -E 's#https?://([^.]+)\..*#\1#')
echo "  project: $REF"

say "Linking the Supabase project"
if [[ "$(cat supabase/.temp/project-ref 2>/dev/null || true)" != "$REF" ]]; then
  supabase link --project-ref "$REF" -p "$SUPABASE_DB_PASSWORD" 2>&1 | quiet
else
  echo "  already linked"
fi

say "Applying database migrations"
supabase db push --linked -p "$SUPABASE_DB_PASSWORD" --yes 2>&1 | quiet | tail -3

say "Storing the Groq key as a function secret"
supabase secrets set --linked --yes GROQ_API_KEY="$GROQ_API_KEY" 2>&1 | quiet | sed "s/$GROQ_API_KEY/<key>/g" | tail -2

say "Deploying the ingest function"
supabase functions deploy ingest --use-api --yes 2>&1 | quiet | tail -2

FN="${SUPABASE_URL%/}/functions/v1/ingest"
count=$(node --input-type=module -e '
  const r = await fetch(process.argv[1], { headers: { Authorization: "Bearer " + process.env.SUPABASE_ANON_KEY, apikey: process.env.SUPABASE_ANON_KEY } })
  const p = await r.json(); console.log(p.thoughts?.length ?? 0)' "$FN" 2>/dev/null || echo 0)

if [[ "$count" == "0" ]]; then
  say "Graph is empty: seeding the 35 curated thoughts"
  node tools/palace-builder/seed_cloud.mjs
else
  say "Graph already has $count thoughts: skipping the seed"
fi

if [[ $JUDGE == 1 ]]; then
  say "Judging the links with Groq"
  node tools/palace-builder/judge_cloud.mjs
fi

say "Done. Palace JSON for the Lens: GET $FN"
