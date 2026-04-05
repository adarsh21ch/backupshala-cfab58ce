
-- Create all three tables first
CREATE TABLE IF NOT EXISTS public.video_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#f97316',
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  video_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.folder_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.video_folders(id) ON DELETE CASCADE,
  shared_with uuid REFERENCES public.profiles(id),
  shared_with_email text,
  shared_by uuid NOT NULL REFERENCES public.profiles(id),
  notification_sent boolean DEFAULT false,
  message text DEFAULT '',
  is_active boolean DEFAULT true,
  shared_at timestamptz DEFAULT now(),
  UNIQUE(folder_id, shared_with)
);

CREATE TABLE IF NOT EXISTS public.video_folder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.video_folders(id) ON DELETE CASCADE,
  video_asset_id uuid NOT NULL REFERENCES public.video_assets(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES public.profiles(id),
  order_index integer DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE(folder_id, video_asset_id)
);

-- Enable RLS
ALTER TABLE public.video_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_folder_items ENABLE ROW LEVEL SECURITY;

-- Policies for video_folders
CREATE POLICY "vf_admin" ON public.video_folders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "vf_shared_read" ON public.video_folders FOR SELECT TO authenticated USING (
  is_active = true AND EXISTS (
    SELECT 1 FROM public.folder_shares WHERE folder_id = video_folders.id AND shared_with = auth.uid() AND is_active = true
  )
);

-- Policies for folder_shares
CREATE POLICY "fs_admin" ON public.folder_shares FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fs_own_read" ON public.folder_shares FOR SELECT TO authenticated USING (auth.uid() = shared_with);

-- Policies for video_folder_items
CREATE POLICY "vfi_admin" ON public.video_folder_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "vfi_shared_read" ON public.video_folder_items FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.folder_shares WHERE folder_id = video_folder_items.folder_id AND shared_with = auth.uid() AND is_active = true
  )
);
