-- gte-small scores almost every pair of short notes 0.75–0.90, so raw cosine can't tell related
-- from unrelated. Subtracting the mean embedding of the graph ("centring") spreads scores to about
-- -0.1..0.6 and the top pairs become genuinely related. Topics and edges now use centred cosine.

alter table public.graph_config add column if not exists mean extensions.vector(384);
update public.graph_config set topic_min_sim = 0.25, edge_min_sim = 0.15, edges_per_node = 2;

-- Centred cosine similarity between two embeddings.
create or replace function public.csim(a extensions.vector, b extensions.vector, mu extensions.vector)
returns real language sql immutable set search_path = public, extensions as $$
  select (1 - ((a - mu) <=> (b - mu)))::real
$$;

create or replace function public.refresh_mean() returns void
language sql security definer set search_path = public, extensions as $$
  update public.graph_config set mean = (select avg(embedding) from public.nodes);
  update public.topics t set centroid = (select avg(embedding) from public.nodes n where n.topic_id = t.id);
$$;

-- Recompute every edge from scratch with the current mean (after seeding, or after tuning).
create or replace function public.rebuild_edges() returns int
language plpgsql security definer set search_path = public, extensions as $$
declare cfg public.graph_config; n int;
begin
  perform public.refresh_mean();
  select * into cfg from public.graph_config limit 1;
  delete from public.edges;
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

create or replace function public.ingest_node(
  p_label      text,
  p_text       text,
  p_embedding  extensions.vector(384),
  p_prompt     text default '',
  p_kind       text default 'insight',
  p_source     text default '',
  p_topic_hint text default null,
  p_topic_id   text default null,
  p_id         text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  cfg     public.graph_config;
  mu      extensions.vector(384);
  v_topic text;
  v_sim   real;
  v_new   boolean := false;
  v_id    text := coalesce(nullif(p_id, ''), 'n' || substr(md5(random()::text || clock_timestamp()::text), 1, 8));
begin
  select * into cfg from public.graph_config limit 1;
  mu := coalesce(cfg.mean, p_embedding);  -- first node ever: nothing to centre on yet

  if p_topic_id is not null then
    insert into public.topics(id, name) values (p_topic_id, coalesce(nullif(p_topic_hint, ''), p_topic_id))
      on conflict (id) do nothing;
    v_topic := p_topic_id;
  else
    select t.id, public.csim(t.centroid, p_embedding, mu) into v_topic, v_sim
      from public.topics t
     where t.centroid is not null
       and (select count(*) from public.nodes n where n.topic_id = t.id) < cfg.max_topic_size
     order by public.csim(t.centroid, p_embedding, mu) desc
     limit 1;
    if v_topic is null or v_sim < cfg.topic_min_sim then
      v_topic := coalesce(nullif(public.slug(coalesce(nullif(p_topic_hint, ''), p_label)), ''), 'topic')
                 || '-' || substr(md5(random()::text), 1, 4);
      insert into public.topics(id, name) values (v_topic, coalesce(nullif(p_topic_hint, ''), p_label));
      v_new := true;
    end if;
  end if;

  insert into public.nodes(id, topic_id, label, text, prompt, kind, source, embedding)
  values (v_id, v_topic, p_label, p_text, coalesce(p_prompt, ''),
          case when p_kind in ('decision', 'insight', 'question') then p_kind else 'insight' end,
          coalesce(p_source, ''), p_embedding);

  update public.topics
     set centroid = (select avg(embedding) from public.nodes where topic_id = v_topic)
   where id = v_topic;

  -- Edges use the mean from before this node, so one new note can't shift every score.
  if cfg.mean is not null then
    insert into public.edges(src, dst, score)
    select least(v_id, n.id), greatest(v_id, n.id), public.csim(n.embedding, p_embedding, mu)
      from public.nodes n
     where n.id <> v_id and public.csim(n.embedding, p_embedding, mu) >= cfg.edge_min_sim
     order by public.csim(n.embedding, p_embedding, mu) desc
     limit cfg.edges_per_node
    on conflict do nothing;
  end if;
  update public.graph_config set mean = (select avg(embedding) from public.nodes);

  return jsonb_build_object(
    'id', v_id, 'topic', v_topic, 'topic_similarity', v_sim, 'new_topic', v_new,
    'edges', (select coalesce(jsonb_agg(jsonb_build_object(
                 'to', case when e.src = v_id then e.dst else e.src end, 'score', round(e.score::numeric, 3))
                 order by e.score desc), '[]'::jsonb)
                from public.edges e where e.src = v_id or e.dst = v_id));
end $$;

revoke all on function public.ingest_node from public, anon, authenticated;
revoke all on function public.rebuild_edges from public, anon, authenticated;
revoke all on function public.refresh_mean from public, anon, authenticated;
grant execute on function public.ingest_node, public.rebuild_edges, public.refresh_mean to service_role;

select public.rebuild_edges();
