-- Realtime UPDATE payloads only include changed columns' prior values when the
-- table has REPLICA IDENTITY FULL; without it payload.old carries only the PK,
-- so the no-more-profiles "new member" detector can't compare onboarding state.
ALTER TABLE public.profiles REPLICA IDENTITY FULL;