# Backupshala — Admin + Platform Course System V2

This is a large, multi-area change set. I'll execute in the order you specified and report back with a complete list of touched files. Below is the implementation plan so you can confirm scope before I start writing code.

## Scope summary

12 sequenced work items across 7 parts: a global link/navigation fix, admin nav consolidation + auto-grant Creator Pro on KYC, course builder UI polish, video upload pipeline fix, platform-course access logic, and a few small data/UX fixes.

---

## Part 1 — Internal links opening new tabs
- Grep `src/` for `target="_blank"` and `window.open('/`.
- Convert internal `<a target="_blank">` and `window.open('/...')` to React Router `<Link>` / `navigate()`.
- Keep `target="_blank" rel="noopener noreferrer"` only on `http(s)://` links and on the explicit "open public course page" preview button in admin.

## Part 2 — Admin nav + Creators + Platform Courses
- `AdminDashboardLayout`: rebuild sidebar groups exactly as specified (Overview / Manage / Finance / Platform / Settings); remove "Standard Bundle" and "New Platform Course" entries; rename "Courses" → "Creator Courses".
- `AdminCreators`: on approve, set `creator_approved = true` AND `is_creator_pro = true`, upsert a free `creator_pro_subscriptions` row (plan `annual`, amount 0), and write an `admin_audit_log` entry.
- `AdminPlatformCourses`: replace current two-tier card view with a list-style management page (Standard Bundle, Advanced Program, then any additional `is_platform_course = true` rows ordered by `course_level`), each row with Edit (→ `/creator/courses/:id/edit`) and external "open public page" button (this one keeps `target="_blank"`), plus a top-right "+ New Platform Course" CTA and an inline "Create new" footer card.

## Part 3 — Course Builder UI improvements
- `BuilderSidebar` / outline panel: widen to `w-72`, `line-clamp-2` titles with `title=` tooltip, show `+ Add chapter` on module-row hover (auto-expands), `cursor-grab` + tooltip on drag handles.
- Right-panel empty state: replace with the 3-step "Build Your Course" guide.
- `ChapterEditor`: tighten spacing to `space-y-4`; auto-detect duration from selected video file (read-only with "✓ Auto-detected", click to override); add collapsible "Advanced Settings" with Free Preview toggle and Sequential Lock toggle (gated behind Creator Pro with a "Requires Creator Pro" note when not Pro).
- Module editor: title + description + chapter list with reorder handles + destructive "Delete Module" button with warning copy.
- Layout: 3-column at ≥1280px (240 / 280 / flex), 2-column at 768–1280px (hide step sidebar), single-pane with back button on mobile.

## Part 4 — Video upload end-to-end
- `creator-upload-url` edge function: already accepts both param formats — verify CORS headers are returned on every response (including the error path) and keep AWS SDK presigner.
- `useVideoUpload`: align with the spec — also call `r2-confirm-upload` after the PUT and return `{ objectKey, publicUrl }`.
- `ChapterEditor`: wire the hook, persist `video_url` + `video_asset_id` to `course_chapters` on success, show success state with filename + Replace button, surface exact error via `sonner` toast on failure (no silent failures).
- `ModulePlayer`: ensure the three video sources (R2 asset → signed URL via `r2-get-playback-url`, YouTube → embed, direct MP4 → BackupshalaVideoPlayer) all play; do not touch player internals.

## Part 5 — Platform course access + builder mode
- `verify-razorpay-payment`: after enrolling a buyer in the Advanced course, upsert an enrollment for `basic_course_id` (amount 0, tier `basic`).
- `CourseBuilder`: when editing a course where `is_platform_course = true`, hide the Pricing step + commission fields, show a "Course Level" selector (basic / advanced / specialized) + Admin Notes, and replace "Submit for Review" with a direct "Publish" action.

## Part 6 — Creator My Courses filter
- `CreatorCourses`: add `.eq('is_platform_course', false)` so platform courses never leak into a creator's list.

## Part 7 — Small fixes
- `AdminPlatformCourseNew`: default price reads from `usePlatformSettings().basic_price` (fallback 449) instead of hard-coded 249.
- Slug generator: `src/lib/slug.ts` already strips leading/trailing hyphens — audit any local slug helpers and route them through `generateSlug` from `@/lib/slug`.

---

## Out of scope (per your instructions)
- Pricing tab UI, Publish checklist, BackupshalaVideoPlayer internals.
- No new courses created in DB (Standard Bundle + Advanced already exist).
- No hard-coded commission/price values — read from `platform_settings`.

## Risks / things I'll flag if I hit them
- If `r2-confirm-upload` requires fields not currently sent (e.g. duration, mime), I'll match its existing contract rather than invent one.
- If `AdminCreators` has no current "approve" handler (only a stub), I'll wire it; if the approve mutation already exists, I'll extend it.
- Three-column builder layout may require minor refactor of `BuilderSidebar` rendering in `CourseBuilder.tsx`; I'll keep the existing component API.

Reply **approve** to proceed, or tell me what to change.
