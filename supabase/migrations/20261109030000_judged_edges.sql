-- LLM-judged edges. Similarity only proposes candidates (more of them, at a lower bar); the `ingest`
-- function then asks an LLM (Groq) about each candidate pair. A confirmed pair gets a relation from a
-- fixed list and a short reason (`why`); a rejected pair is kept with relation 'none' so a rebuild
-- doesn't keep re-proposing it, and palace() hides it. Without an LLM key nothing is judged, and
-- palace() falls back to similarity alone (unjudged edges at or above show_min_sim).

alter table public.edges add column if not exists relation text
  check (relation in ('supports', 'contradicts', 'depends on', 'answers', 'refines', 'example of', 'none'));
alter table public.graph_config add column if not exists show_min_sim real not null default 0.18;
update public.graph_config set edges_per_node = 4, edge_min_sim = 0.12 where id;

-- Same as before, with a WHERE on the delete (PostgREST's safe-update guard).
create or replace function public.rebuild_edges() returns int
language plpgsql security definer set search_path = public, extensions as $$
declare cfg public.graph_config; n int;
begin
  perform public.refresh_mean();
  select * into cfg from public.graph_config limit 1;
  delete from public.edges where true;
  insert into public.edges(src, dst, score)
  select distinct least(a.id, b.id), greatest(a.id, b.id), b.s
    from public.nodes a
    cross join lateral (
      select x.id, public.csim(a.embedding, x.embedding, cfg.mean) s
        from public.nodes x
       where x.id <> a.id
       order by public.csim(a.embedding, x.embedding, cfg.mean) desc
       limit cfg.edges_per_node
    ) b
   where b.s >= cfg.edge_min_sim
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.rebuild_edges from public, anon, authenticated;
grant execute on function public.rebuild_edges to service_role;

-- The palace for the Lens. Threads: judged-related edges first, then (no LLM yet) strong unjudged ones.
create or replace function public.palace() returns jsonb
language sql stable set search_path = public, extensions as $$
  with cfg as (select * from public.graph_config limit 1),
  shown as (
    select n.*, row_number() over (partition by n.topic_id order by n.created_at desc) as rk
      from public.nodes n
  ), kept as (select * from shown where rk <= 8),
  tops as (
    select t.* from public.topics t where exists (select 1 from kept k where k.topic_id = t.id)
     order by t.created_at limit 8
  ),
  links as (
    select e.* from public.edges e, cfg
     where (e.relation is not null and e.relation <> 'none')
        or (e.relation is null and e.score >= cfg.show_min_sim)
  )
  select jsonb_build_object(
    'topics', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'spot', 'wall')
                                         order by t.created_at) from tops t), '[]'::jsonb),
    'thoughts', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', k.id, 'topic', k.topic_id, 'label', k.label, 'text', k.text, 'kind', k.kind,
                  'date', to_char(k.created_at, 'YYYY-MM-DD'), 'source', k.source, 'prompt', k.prompt,
                  'created', k.created_at) order by k.topic_id, k.created_at)
                from kept k where k.topic_id in (select id from tops)), '[]'::jsonb),
    'threads', coalesce((select jsonb_agg(jsonb_build_object('from', e.src, 'to', e.dst, 'why', e.why,
                  'relation', e.relation, 'score', round(e.score::numeric, 3))
                  order by (e.relation is not null) desc, e.score desc)
                from links e
                join kept a on a.id = e.src join kept b on b.id = e.dst
               where a.topic_id <> b.topic_id
                 and a.topic_id in (select id from tops) and b.topic_id in (select id from tops)), '[]'::jsonb)
  )
$$;
grant execute on function public.palace to anon, authenticated, service_role;
