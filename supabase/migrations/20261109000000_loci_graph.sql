-- Loci knowledge graph: topics, nodes (thoughts) and edges, with automatic topic assignment and edges.
-- Embeddings come from Supabase's built-in gte-small (384 dims, normalised), computed in the
-- `ingest` Edge Function. The Lens reads the graph through palace(), which returns the same JSON
-- shape as Assets/Scripts/PalaceData.ts; LociPalaceSchema then enforces the display limits.

create extension if not exists vector with schema extensions;

create table public.topics (
  id         text primary key,
  name       text not null,
  centroid   extensions.vector(384),
  created_at timestamptz not null default now()
);

create table public.nodes (
  id         text primary key,
  topic_id   text not null references public.topics(id) on delete cascade,
  label      text not null,
  text       text not null,
  prompt     text not null default '',
  kind       text not null default 'insight' check (kind in ('decision', 'insight', 'question')),
  source     text not null default '',
  embedding  extensions.vector(384) not null,
  created_at timestamptz not null default now()
);
create index nodes_topic_idx on public.nodes(topic_id);

-- Undirected: stored once with src < dst.
create table public.edges (
  src        text not null references public.nodes(id) on delete cascade,
  dst        text not null references public.nodes(id) on delete cascade,
  score      real not null,
  why        text not null default '',
  created_at timestamptz not null default now(),
  primary key (src, dst),
  check (src < dst)
);

-- Tuning knobs, editable with SQL without redeploying (one row).
create table public.graph_config (
  id               boolean primary key default true check (id),
  topic_min_sim    real not null default 0.82,  -- join the nearest topic at or above this
  edge_min_sim     real not null default 0.80,  -- connect to a node at or above this
  edges_per_node   int  not null default 3,     -- best N neighbours stored per new node
  max_topic_size   int  not null default 8      -- a full topic takes no new nodes
);
insert into public.graph_config default values;

-- Reads are public (the Lens needs no key for palace()); writes only through ingest_node().
alter table public.topics enable row level security;
alter table public.nodes enable row level security;
alter table public.edges enable row level security;
alter table public.graph_config enable row level security;
create policy "read topics" on public.topics for select using (true);
create policy "read nodes" on public.nodes for select using (true);
create policy "read edges" on public.edges for select using (true);

create or replace function public.slug(s text) returns text
language sql immutable as $$
  select left(trim(both '-' from lower(regexp_replace(coalesce(s, ''), '[^a-zA-Z0-9]+', '-', 'g'))), 24)
$$;

-- Add one thought: pick or create its topic, store it, refresh the topic centroid, connect it.
create or replace function public.ingest_node(
  p_label      text,
  p_text       text,
  p_embedding  extensions.vector(384),
  p_prompt     text default '',
  p_kind       text default 'insight',
  p_source     text default '',
  p_topic_hint text default null,  -- a short topic name, used only if a new topic is made
  p_topic_id   text default null,  -- force a topic (seeding curated data)
  p_id         text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  cfg     public.graph_config;
  v_topic text;
  v_sim   real;
  v_new   boolean := false;
  v_id    text := coalesce(nullif(p_id, ''), 'n' || substr(md5(random()::text || clock_timestamp()::text), 1, 8));
begin
  select * into cfg from public.graph_config limit 1;

  if p_topic_id is not null then
    insert into public.topics(id, name) values (p_topic_id, coalesce(nullif(p_topic_hint, ''), p_topic_id))
      on conflict (id) do nothing;
    v_topic := p_topic_id;
  else
    select t.id, (1 - (t.centroid <=> p_embedding))::real into v_topic, v_sim
      from public.topics t
     where t.centroid is not null
       and (select count(*) from public.nodes n where n.topic_id = t.id) < cfg.max_topic_size
     order by t.centroid <=> p_embedding
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

  insert into public.edges(src, dst, score)
  select least(v_id, n.id), greatest(v_id, n.id), (1 - (n.embedding <=> p_embedding))::real
    from public.nodes n
   where n.id <> v_id and 1 - (n.embedding <=> p_embedding) >= cfg.edge_min_sim
   order by n.embedding <=> p_embedding
   limit cfg.edges_per_node
  on conflict do nothing;

  return jsonb_build_object(
    'id', v_id, 'topic', v_topic, 'topic_similarity', v_sim, 'new_topic', v_new,
    'edges', (select coalesce(jsonb_agg(jsonb_build_object(
                 'to', case when e.src = v_id then e.dst else e.src end, 'score', round(e.score::numeric, 3))
                 order by e.score desc), '[]'::jsonb)
                from public.edges e where e.src = v_id or e.dst = v_id));
end $$;

revoke all on function public.ingest_node from public, anon, authenticated;
grant execute on function public.ingest_node to service_role;

-- The palace for the Lens, in PalaceData.ts's shape. Newest 8 thoughts per topic; strongest
-- cross-topic edges first (the Lens's validator keeps 2 per thought and 40 overall).
create or replace function public.palace() returns jsonb
language sql stable set search_path = public, extensions as $$
  with shown as (
    select n.*, row_number() over (partition by n.topic_id order by n.created_at desc) as rk
      from public.nodes n
  ), kept as (select * from shown where rk <= 8),
  tops as (
    select t.* from public.topics t where exists (select 1 from kept k where k.topic_id = t.id)
     order by t.created_at limit 8
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
                  'score', round(e.score::numeric, 3)) order by e.score desc)
                from public.edges e
                join kept a on a.id = e.src join kept b on b.id = e.dst
               where a.topic_id <> b.topic_id
                 and a.topic_id in (select id from tops) and b.topic_id in (select id from tops)), '[]'::jsonb)
  )
$$;

grant execute on function public.palace to anon, authenticated, service_role;
