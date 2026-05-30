-- ===== Dailizza · Reviews table =====
-- Бұл SQL-ды Supabase Dashboard → SQL Editor → New query-ге қойып, Run басыңыз

create table if not exists reviews (
  id bigserial primary key,
  created_at timestamptz default now(),
  name text not null,
  text text not null,
  photos jsonb default '[]'::jsonb,
  published boolean default true
);

-- Row Level Security: барлық оқуға, барлық қосуға рұқсат
alter table reviews enable row level security;

drop policy if exists "Public read"   on reviews;
drop policy if exists "Public insert" on reviews;

create policy "Public read"
  on reviews for select
  using (published = true);

create policy "Public insert"
  on reviews for insert
  with check (true);
