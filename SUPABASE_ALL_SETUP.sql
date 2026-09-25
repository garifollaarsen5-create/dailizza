-- ===== Dailizza · барлық кестелер (бір рет орындалады) =====
-- Supabase → SQL Editor → New query → осыны толық қойып, Run басыңыз.

-- ---------- 1. Клиент пікірлері ----------
create table if not exists reviews (
  id bigserial primary key,
  created_at timestamptz default now(),
  name text not null,
  text text not null,
  photos jsonb default '[]'::jsonb,
  published boolean default true
);

alter table reviews enable row level security;

drop policy if exists "Public read"   on reviews;
drop policy if exists "Public insert" on reviews;

create policy "Public read"
  on reviews for select
  using (published = true);

create policy "Public insert"
  on reviews for insert
  with check (true);

-- ---------- 2. Стоп-меню ----------
-- Аты dz_ префиксімен: бұл жобада otdoner клиентінің stop_items кестесі бар.
create table if not exists dz_stop_items (
  item_id    text primary key,          -- тағам id (мыс. "doner-kur")
  until      timestamptz,               -- null = қолмен қайта қосылады
  updated_at timestamptz default now()
);

alter table dz_stop_items enable row level security;

drop policy if exists "Public read stop" on dz_stop_items;
drop policy if exists "Auth write stop"  on dz_stop_items;
drop policy if exists "Owner write stop" on dz_stop_items;

-- Оқу — бәріне ашық (клиенттер сайттан көру үшін)
create policy "Public read stop"
  on dz_stop_items for select
  using (true);

-- Жазу/өшіру — тек иесінің поштасымен кірген адамға
create policy "Owner write stop"
  on dz_stop_items for all
  to authenticated
  using      ((auth.jwt() ->> 'email') = 'garifollaarsen5@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'garifollaarsen5@gmail.com');
