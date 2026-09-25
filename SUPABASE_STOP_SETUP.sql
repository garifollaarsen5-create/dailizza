-- ===== Dailizza · Стоп-меню кестесі =====
-- Бұл SQL-ды Supabase Dashboard → SQL Editor → New query-ге қойып, Run басыңыз.
-- Кестеде тек СТОПТАҒЫ тағамдар тұрады. Қайта қосылған тағам жолы өшіріледі.

create table if not exists stop_items (
  item_id    text primary key,          -- data.js ішіндегі тағам id (мыс. "doner-kur")
  until      timestamptz,               -- null = қолмен қайта қосылады; уақыт = сол уақытқа дейін
  updated_at timestamptz default now()
);

alter table stop_items enable row level security;

drop policy if exists "Public read stop"  on stop_items;
drop policy if exists "Auth write stop"   on stop_items;

-- Оқу — бәріне ашық (клиенттер сайттан көру үшін)
create policy "Public read stop"
  on stop_items for select
  using (true);

-- Жазу/өшіру — тек логин жасаған әкімшіге
create policy "Auth write stop"
  on stop_items for all
  to authenticated
  using (true)
  with check (true);

-- Realtime (қосымша, міндетті емес): өзгеріс бірден тарасын
-- alter publication supabase_realtime add table stop_items;
