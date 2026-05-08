-- Rally — initial schema
-- Paste this entire file into the Supabase SQL Editor on a fresh project.
-- Run supabase/seed.sql afterwards to load sample courts.

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists cube;
create extension if not exists earthdistance;

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  avatar_url text,
  city text,
  utr_rating numeric check (utr_rating between 1 and 16),
  preferred_sport text default 'tennis',
  preferred_hours jsonb default '{"weekday_morning":false,"weekday_evening":true,"weekend":true}',
  home_court_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Availability blocks (free/busy only — never store event content)
create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  source text not null check (source in ('apple','google')),
  synced_at timestamptz default now(),
  check (end_time > start_time)
);

create index availability_blocks_user_id_start_time_idx
  on public.availability_blocks (user_id, start_time);

create table public.schedule_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending','accepted','declined','expired','cancelled')),
  message text,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '48 hours'),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude numeric not null,
  longitude numeric not null,
  city text,
  hours jsonb,
  court_count integer default 1,
  fee_per_hour_cents integer,
  surface text,
  indoor boolean default false
);

create index courts_ll_to_earth_idx
  on public.courts
  using gist (ll_to_earth(latitude, longitude));

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  player_a uuid not null references public.profiles(id),
  player_b uuid not null references public.profiles(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  court_id uuid references public.courts(id),
  court_fee_cents integer,
  status text default 'upcoming' check (status in ('upcoming','completed','cancelled')),
  apple_event_id_a text,
  apple_event_id_b text,
  google_event_id_a text,
  google_event_id_b text,
  schedule_request_id uuid references public.schedule_requests(id),
  created_at timestamptz default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  check (end_time > start_time),
  check (player_a <> player_b)
);

create table public.match_reviews (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  rating integer check (rating between 1 and 5),
  no_show boolean default false,
  created_at timestamptz default now(),
  unique (match_id, reviewer_id)
);

-- Row-level security
alter table public.profiles enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.schedule_requests enable row level security;
alter table public.courts enable row level security;
alter table public.matches enable row level security;
alter table public.match_reviews enable row level security;

-- Profiles policies
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "users read public profile fields" on public.profiles
  for select using (true);

create policy "users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Availability blocks: owner-only, no exceptions
create policy "users manage own availability" on public.availability_blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Schedule requests policies
create policy "participants read requests" on public.schedule_requests
  for select using (auth.uid() in (requester_id, recipient_id));

create policy "participants insert requests" on public.schedule_requests
  for insert with check (
    auth.uid() = requester_id and requester_id <> recipient_id
  );

create policy "participants update requests" on public.schedule_requests
  for update using (auth.uid() in (requester_id, recipient_id))
  with check (auth.uid() in (requester_id, recipient_id));

create policy "requester delete pending requests" on public.schedule_requests
  for delete using (auth.uid() = requester_id and status = 'pending');

-- Courts: publicly readable, no client writes
create policy "users read courts" on public.courts
  for select using (true);

-- Matches policies
create policy "participants read matches" on public.matches
  for select using (auth.uid() in (player_a, player_b));

create policy "participants update matches" on public.matches
  for update using (auth.uid() in (player_a, player_b))
  with check (auth.uid() in (player_a, player_b));

create policy "participants insert matches" on public.matches
  for insert with check (auth.uid() in (player_a, player_b));

create policy "participants delete matches" on public.matches
  for delete using (auth.uid() in (player_a, player_b));

-- Match reviews policies
create policy "participants read match reviews" on public.match_reviews
  for select using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and auth.uid() in (m.player_a, m.player_b)
    )
  );

create policy "participants insert own match reviews" on public.match_reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1
      from public.matches m
      where m.id = match_id
        and auth.uid() in (m.player_a, m.player_b)
    )
  );

create policy "reviewers update own match reviews" on public.match_reviews
  for update using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id);

-- Trigger: auto-create profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'Player')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: keep profiles.updated_at current
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();
