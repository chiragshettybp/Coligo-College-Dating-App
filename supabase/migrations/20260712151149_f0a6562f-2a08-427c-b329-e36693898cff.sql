-- Allow authenticated users to read profile photos of active, onboarded members
-- (in addition to their own). Enables server-side signed URLs for the Home feed
-- using the RLS-scoped user client instead of the service role key.
CREATE POLICY "Members read active member photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.account_status = 'active'
      AND p.onboarding_completed = true
  )
);