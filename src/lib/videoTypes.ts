export interface VideoAsset {
  id: string;
  r2_object_key: string;
  bsv_code: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  language: string;
  duration_seconds: number;
  file_size_bytes: number;
  mime_type: string;
  thumbnail_key: string | null;
  status: string;
  total_views: number;
  used_in_courses_count: number;
  uploaded_by: string;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export const VIDEO_CATEGORIES = [
  'Video Editing',
  'Content Creation',
  'Personal Branding',
  'Sales & Communication',
  'Freelancing',
  'Business Skills',
  'Digital Marketing',
  'General',
] as const;

export const VIDEO_LANGUAGES = ['English', 'Hindi', 'Hinglish'] as const;

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(1)} KB`;
}

export function getR2ThumbnailUrl(thumbnailKey: string | null): string | null {
  if (!thumbnailKey) return null;
  const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL || '';
  return publicUrl ? `${publicUrl}/${thumbnailKey}` : null;
}
