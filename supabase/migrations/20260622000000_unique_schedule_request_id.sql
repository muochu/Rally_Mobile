-- Prevent double-booking: each schedule request can produce at most one match.
-- PostgreSQL UNIQUE allows multiple NULLs, so manually-booked matches
-- (schedule_request_id IS NULL) are unaffected.
ALTER TABLE public.matches
  ADD CONSTRAINT matches_schedule_request_id_unique UNIQUE (schedule_request_id);
