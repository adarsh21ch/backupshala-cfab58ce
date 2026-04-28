/**
 * Clean a slug input: lowercase, alphanumerics + hyphens only,
 * collapse repeated hyphens, strip leading/trailing hyphens.
 */
export const cleanSlug = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Generate a URL-safe slug from a free-form title.
 * Spaces become hyphens; punctuation is dropped; trims trailing hyphens.
 */
export const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
