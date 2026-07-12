-- =========================================================
-- Public module schema: content-driven marketing/legal pages
-- =========================================================

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ---------------------------------------------------------
-- landing_statistics
-- ---------------------------------------------------------
CREATE TABLE public.landing_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  value BIGINT NOT NULL DEFAULT 0,
  suffix TEXT NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.landing_statistics TO anon, authenticated;
GRANT ALL ON public.landing_statistics TO service_role;
ALTER TABLE public.landing_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read statistics" ON public.landing_statistics FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER trg_landing_statistics_updated BEFORE UPDATE ON public.landing_statistics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- featured_colleges
-- ---------------------------------------------------------
CREATE TABLE public.featured_colleges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  verified_students INT NOT NULL DEFAULT 0,
  logo_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.featured_colleges TO anon, authenticated;
GRANT ALL ON public.featured_colleges TO service_role;
ALTER TABLE public.featured_colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published colleges" ON public.featured_colleges FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE TRIGGER trg_featured_colleges_updated BEFORE UPDATE ON public.featured_colleges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- faqs
-- ---------------------------------------------------------
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  display_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published faqs" ON public.faqs FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE TRIGGER trg_faqs_updated BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- legal_documents
-- ---------------------------------------------------------
CREATE TABLE public.legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT ALL ON public.legal_documents TO service_role;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read current legal docs" ON public.legal_documents FOR SELECT TO anon, authenticated USING (is_current = true);
CREATE TRIGGER trg_legal_documents_updated BEFORE UPDATE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- company_information
-- ---------------------------------------------------------
CREATE TABLE public.company_information (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  section_type TEXT NOT NULL DEFAULT 'overview',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_information TO anon, authenticated;
GRANT ALL ON public.company_information TO service_role;
ALTER TABLE public.company_information ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published company info" ON public.company_information FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE TRIGGER trg_company_information_updated BEFORE UPDATE ON public.company_information FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- homepage_media
-- ---------------------------------------------------------
CREATE TABLE public.homepage_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_media TO anon, authenticated;
GRANT ALL ON public.homepage_media TO service_role;
ALTER TABLE public.homepage_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published media" ON public.homepage_media FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE TRIGGER trg_homepage_media_updated BEFORE UPDATE ON public.homepage_media FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- contact_messages (anon INSERT only, no anon SELECT)
-- ---------------------------------------------------------
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  user_agent TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a contact message" ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(name) BETWEEN 1 AND 120
    AND char_length(email) BETWEEN 3 AND 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(subject) BETWEEN 1 AND 200
    AND char_length(message) BETWEEN 1 AND 4000
    AND status = 'new'
  );
CREATE TRIGGER trg_contact_messages_updated BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();