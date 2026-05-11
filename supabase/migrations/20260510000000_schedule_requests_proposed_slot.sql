-- Add proposed slot columns so requesters can propose a specific time
alter table public.schedule_requests
  add column if not exists proposed_start timestamptz,
  add column if not exists proposed_end   timestamptz;
