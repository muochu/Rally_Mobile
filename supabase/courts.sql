-- Phase 8: get_courts_in_bounds RPC
-- Paste into Supabase SQL Editor and run.
--
-- Returns courts whose lat/lng falls within the given bounding box,
-- plus a live count of upcoming matches in the next 2 hours for traffic state.

create or replace function public.get_courts_in_bounds(
  sw_lat double precision,
  sw_lng double precision,
  ne_lat double precision,
  ne_lng double precision
)
returns table (
  id uuid,
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  city text,
  court_count integer,
  fee_per_hour_cents integer,
  surface text,
  indoor boolean,
  upcoming_matches_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.address,
    c.latitude::double precision,
    c.longitude::double precision,
    c.city,
    c.court_count,
    c.fee_per_hour_cents,
    c.surface,
    c.indoor,
    (
      select count(*)
      from matches m
      where m.court_id = c.id
        and m.status = 'upcoming'
        and m.start_time >= now()
        and m.start_time < now() + interval '2 hours'
    ) as upcoming_matches_count
  from courts c
  where
    c.latitude  between sw_lat and ne_lat
    and c.longitude between sw_lng and ne_lng
  order by c.name
  limit 100;
$$;

grant execute on function public.get_courts_in_bounds(
  double precision, double precision, double precision, double precision
) to authenticated;
