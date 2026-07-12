UPDATE public.application_settings
SET
  maintenance_message = REPLACE(maintenance_message, 'CampusMatch', 'Coligo'),
  support_email = REPLACE(support_email, 'campusmatch.app', 'coligo.app');

ALTER TABLE public.application_settings
  ALTER COLUMN maintenance_message
  SET DEFAULT 'Coligo is undergoing scheduled maintenance. Please check back soon.';

ALTER TABLE public.application_settings
  ALTER COLUMN support_email SET DEFAULT 'support@coligo.app';