// Referral tracking — captures ?ref= username on any page,
// stores it in localStorage for 30 days, and exposes helpers
// for signup + payment flows.

import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'bs_ref_v1';
const EXPIRY_DAYS = 30;

interface StoredRef {
  username: string;
  capturedAt: number; // epoch ms
}

/** Read ?ref= from current URL and persist it (called on app boot). */
export function captureRefFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    if (!ref) return;
    const clean = ref.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    if (!clean) return;
    const payload: StoredRef = { username: clean, capturedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {/* ignore */}
}

/** Returns the stored referrer username if still valid, else null. */
export function getStoredRef(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRef;
    const ageDays = (Date.now() - parsed.capturedAt) / (1000 * 60 * 60 * 24);
    if (ageDays > EXPIRY_DAYS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.username || null;
  } catch {
    return null;
  }
}

export function clearStoredRef() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
}

/** Look up referrer profile by username (case-insensitive). */
export async function lookupReferrer(username: string) {
  const u = username.trim().toLowerCase();
  if (!u) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .ilike('username', u)
    .maybeSingle();
  return data;
}

/** Build a generic referral URL for the given username. */
export function buildGenericRefLink(username: string) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/?ref=${encodeURIComponent(username)}`;
}

/** Build a course-specific referral URL. */
export function buildCourseRefLink(creatorSlug: string, courseSlug: string, username: string) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/c/${creatorSlug}/${courseSlug}?ref=${encodeURIComponent(username)}`;
}
