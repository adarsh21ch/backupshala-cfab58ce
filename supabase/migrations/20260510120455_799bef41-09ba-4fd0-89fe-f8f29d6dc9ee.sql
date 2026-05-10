-- Modules can now have empty video_url because chapters carry the real video.
ALTER TABLE public.modules ALTER COLUMN video_url DROP NOT NULL;

-- Clear placeholder values that were inserted by the legacy builder.
UPDATE public.modules
SET video_url = NULL
WHERE video_url IN ('placeholder', 'https://www.youtube.com/embed/placeholder')
   OR video_url ILIKE 'Watch %on Backupshala:%';