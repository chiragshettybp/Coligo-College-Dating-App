-- ============================================================
-- ENUMS (extensible)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.gender_option AS ENUM ('woman','man','nonbinary','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.looking_for_option AS ENUM ('women','men','everyone');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- COLLEGES
-- ============================================================
CREATE TABLE public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.colleges TO anon, authenticated;
GRANT ALL ON public.colleges TO service_role;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Colleges are viewable by everyone"
  ON public.colleges FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage colleges"
  ON public.colleges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_colleges_updated_at BEFORE UPDATE ON public.colleges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departments TO anon, authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Departments are viewable by everyone"
  ON public.departments FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage departments"
  ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- INTERESTS
-- ============================================================
CREATE TABLE public.interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.interests TO anon, authenticated;
GRANT ALL ON public.interests TO service_role;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interests are viewable by everyone"
  ON public.interests FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage interests"
  ON public.interests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_interests_updated_at BEFORE UPDATE ON public.interests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PROFILES: onboarding fields
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN full_name text,
  ADD COLUMN gender public.gender_option,
  ADD COLUMN date_of_birth date,
  ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL,
  ADD COLUMN graduation_year integer,
  ADD COLUMN semester integer,
  ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN looking_for public.looking_for_option,
  ADD COLUMN bio text,
  ADD COLUMN onboarding_step text NOT NULL DEFAULT 'name';

-- ============================================================
-- USER_INTERESTS
-- ============================================================
CREATE TABLE public.user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, interest_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_interests TO authenticated;
GRANT ALL ON public.user_interests TO service_role;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own interests"
  ON public.user_interests FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PHOTOS
-- ============================================================
CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own photos"
  ON public.photos FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_interests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO public.colleges (name, city) VALUES
  ('Indian Institute of Technology Delhi','New Delhi'),
  ('Indian Institute of Technology Bombay','Mumbai'),
  ('Indian Institute of Technology Madras','Chennai'),
  ('Indian Institute of Technology Kanpur','Kanpur'),
  ('Indian Institute of Technology Kharagpur','Kharagpur'),
  ('Delhi University','New Delhi'),
  ('Jawaharlal Nehru University','New Delhi'),
  ('Birla Institute of Technology and Science Pilani','Pilani'),
  ('Vellore Institute of Technology','Vellore'),
  ('Manipal Academy of Higher Education','Manipal'),
  ('National Institute of Technology Trichy','Tiruchirappalli'),
  ('Anna University','Chennai'),
  ('University of Mumbai','Mumbai'),
  ('Savitribai Phule Pune University','Pune'),
  ('Christ University','Bengaluru'),
  ('Amity University','Noida'),
  ('SRM Institute of Science and Technology','Chennai'),
  ('Jadavpur University','Kolkata'),
  ('Osmania University','Hyderabad'),
  ('Symbiosis International University','Pune');

INSERT INTO public.departments (name) VALUES
  ('Computer Science & Engineering'),
  ('Electronics & Communication'),
  ('Mechanical Engineering'),
  ('Civil Engineering'),
  ('Electrical Engineering'),
  ('Information Technology'),
  ('Chemical Engineering'),
  ('Biotechnology'),
  ('Business Administration'),
  ('Commerce'),
  ('Economics'),
  ('Psychology'),
  ('English Literature'),
  ('Media & Journalism'),
  ('Design'),
  ('Architecture'),
  ('Law'),
  ('Medicine'),
  ('Physics'),
  ('Mathematics');

INSERT INTO public.interests (name, category) VALUES
  ('Music','Arts'),('Movies','Entertainment'),('Reading','Lifestyle'),
  ('Travel','Lifestyle'),('Photography','Arts'),('Gaming','Entertainment'),
  ('Fitness','Health'),('Cooking','Lifestyle'),('Dancing','Arts'),
  ('Coding','Tech'),('Startups','Tech'),('Cricket','Sports'),
  ('Football','Sports'),('Basketball','Sports'),('Yoga','Health'),
  ('Painting','Arts'),('Writing','Arts'),('Anime','Entertainment'),
  ('Foodie','Lifestyle'),('Coffee','Lifestyle'),('Hiking','Outdoors'),
  ('Fashion','Lifestyle'),('Volunteering','Community'),('Podcasts','Entertainment'),
  ('Astronomy','Science'),('Pets','Lifestyle'),('Meditation','Health'),
  ('Entrepreneurship','Tech'),('Singing','Arts'),('Cycling','Sports');