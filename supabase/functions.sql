-- Phase 5: get_nearby_players RPC
-- Paste into Supabase SQL Editor and run.
--
-- Returns players in the same city (or within radius_km if both have a home court set),
-- along with their busy intervals as JSON so the client can compute mutual free slots.
-- Uses security definer to read other users' availability_blocks past RLS.

create or replace function public.get_nearby_players(
  radius_km double precision default 50,
  lookahead_days integer default 14
)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  utr_rating numeric,
  home_court_id uuid,
  home_court_name text,
  city text,
  busy_intervals jsonb,
  distance_km double precision
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_lat double precision;
  caller_lng double precision;
  caller_city text;
  window_start timestamptz;
  window_end timestamptz;
begin
  caller_id := auth.uid();
  if caller_id is null then return; end if;

  window_start := now();
  window_end   := now() + (lookahead_days || ' days')::interval;

  select
    c.latitude::double precision,
    c.longitude::double precision,
    p.city
  into caller_lat, caller_lng, caller_city
  from profiles p
  left join courts c on c.id = p.home_court_id
  where p.id = caller_id;

  return query
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.utr_rating,
    p.home_court_id,
    co.name as home_court_name,
    p.city,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('start_time', ab.start_time, 'end_time', ab.end_time)
          order by ab.start_time
        )
        from availability_blocks ab
        where ab.user_id = p.id
          and ab.start_time >= window_start
          and ab.start_time < window_end
      ),
      '[]'::jsonb
    ) as busy_intervals,
    case
      when caller_lat is not null and co.latitude is not null
        then earth_distance(
          ll_to_earth(caller_lat, caller_lng),
          ll_to_earth(co.latitude::double precision, co.longitude::double precision)
        ) / 1000.0
      else null
    end as distance_km
  from profiles p
  left join courts co on co.id = p.home_court_id
  where p.id <> caller_id
    and p.city is not null
    and (
      (
        caller_lat is not null
        and co.latitude is not null
        and earth_distance(
          ll_to_earth(caller_lat, caller_lng),
          ll_to_earth(co.latitude::double precision, co.longitude::double precision)
        ) / 1000.0 <= radius_km
      )
      or (caller_city is not null and p.city = caller_city)
    )
  order by distance_km asc nulls last
  limit 50;
end;
$$;

grant execute on function public.get_nearby_players(double precision, integer) to authenticated;

-- Phase 6: read another player's availability blocks (security definer so RLS is bypassed)
create or replace function public.get_player_availability(
  player_id uuid,
  from_time timestamptz,
  to_time timestamptz
)
returns table (start_time timestamptz, end_time timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;

  return query
  select ab.start_time, ab.end_time
  from availability_blocks ab
  where ab.user_id = player_id
    and ab.end_time   > from_time
    and ab.start_time < to_time;
end;
$$;

grant execute on function public.get_player_availability(uuid, timestamptz, timestamptz) to authenticated;
