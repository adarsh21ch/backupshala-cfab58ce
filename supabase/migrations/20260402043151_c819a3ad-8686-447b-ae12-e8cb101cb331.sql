
ALTER TABLE modules ADD COLUMN IF NOT EXISTS module_type text DEFAULT 'video';
ALTER TABLE modules ADD COLUMN IF NOT EXISTS resources jsonb DEFAULT '[]'::jsonb;

INSERT INTO platform_settings (key, value) VALUES
('telegram_community_link', 'https://t.me/backupshala'),
('whatsapp_community_link', ''),
('community_description', 'Join our private community of digital skills learners. Get tips, ask questions, and network.')
ON CONFLICT (key) DO NOTHING;
