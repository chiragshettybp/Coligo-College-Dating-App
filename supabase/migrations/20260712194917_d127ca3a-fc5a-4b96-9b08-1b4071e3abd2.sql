-- College logo / banner storage policies
CREATE POLICY "College media are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('college-logos','college-banners'));

CREATE POLICY "Admins upload college media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('college-logos','college-banners') AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update college media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('college-logos','college-banners') AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id IN ('college-logos','college-banners') AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete college media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('college-logos','college-banners') AND public.has_role(auth.uid(),'admin'));