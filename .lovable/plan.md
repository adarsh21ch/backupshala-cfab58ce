

# Backupshala — Audit-Driven Polish Plan

This plan executes the 10 parts from your prompt in dependency order. Nothing marked BUILT in the audit is touched.

## Step 1 — Verify wallet trigger (Part 6)
- Run a SELECT on `information_schema.triggers` for `on_auth_user_created_wallet`.
- If missing, migration: `CREATE TRIGGER on_auth_user_created_wallet AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_wallet();`
- Edge function fallback `ensureWallet()` already exists in `verify-razorpay-payment` — leave it.

## Step 2 — Schema: per-module video settings (Part 2)
Migration on `public.modules`:
- `allow_seek BOOLEAN DEFAULT NULL`
- `allow_speed_change BOOLEAN DEFAULT NULL`
- `min_watch_percent INTEGER DEFAULT NULL`
- `show_watermark BOOLEAN DEFAULT NULL`
- `video_source TEXT DEFAULT 'url'` with CHECK constraint
- New platform_settings rows: `video_watermark_position=bottom-right`, `video_watermark_opacity=60`, `video_watermark_size=medium`, `max_preview_modules_per_course=2`

## Step 3 — Wire `BackupshalaVideoPlayer.tsx` to settings (Part 1A–1D, Part 10)
Add props: `allowSeek`, `allowSpeedChange`, `minWatchPercent`, `showWatermark`, `watermarkText`, `watermarkPosition`, `watermarkOpacity`, `watermarkSize`, `isPreview`.

Changes inside the player:
1. **Watermark** — replace hardcoded div with conditional render driven by props; position computed from `watermarkPosition` (corner classes) and `watermarkOpacity`/`watermarkSize`.
2. **Seek prevention** — add `keydown` handler blocking `ArrowRight`/`L` when `!allowSeek`; allow `ArrowLeft`/`J` always; in `handleTimeUpdate`, snap back to `maxWatchedSeconds` if user jumps past it.
3. **Speed control** — new state `speed`, popover with `[0.5, 0.75, 1, 1.25, 1.5, 2]`, persisted to `localStorage` key `bs_video_speed`, button placed between volume and fullscreen, rendered only when `allowSpeedChange`.
4. **Mobile touch** — add `onTouchStart={resetControlsTimer}` to container; ensure control buttons hit 44×44 px minimum.
5. **Preview mode** — when `isPreview`, skip progress fetch + tracking interval + `update-watch-progress` calls.

In `ModulePlayer.tsx`:
- Fetch course row (settings columns) + `usePlatformSettings` defaults.
- Add `resolveSetting(moduleVal, courseVal, platformVal)` helper.
- Pass resolved props into `BackupshalaVideoPlayer`.

In `CourseBuilder.tsx` module editor: collapsible "Advanced Module Settings" with the four override toggles + min-watch input. Empty/null = inherit.

## Step 4 — Remove legacy `VideoPlayer.tsx` (Part 1E)
- Search imports of `@/components/video/VideoPlayer`.
- Replace each with `BackupshalaVideoPlayer` using equivalent props.
- Delete the file.

## Step 5 — Free preview modal (Part 3)
New component `CoursePreviewModal.tsx` used in `CourseEnrollment.tsx`:
- Responsive: `Drawer` (mobile) / `Dialog` (desktop, max-w 800).
- Renders `BackupshalaVideoPlayer` with `isPreview`, watermark forced on, no progress save.
- On `ended` or 10-min timer: overlay CTA "Enroll Now — ₹{tier price}" → `/enroll/:slug`. Logged-out users routed via `/signup?redirect=...`.
- Click handler on `is_preview` modules in CourseEnrollment list opens this modal.
- Add green "▶ Free Preview" badge on `CourseCard.tsx` when course has any preview module (lightweight join in Explore query).

## Step 6 — Fix `ForCreators.tsx` (Part 4)
- Replace component to read `usePlatformSettings`.
- Compute earnings: `floor(price * (1 - gateway%/100) * (1 - platform_fee_free/100))`.
- Replace hero copy + add "No monthly fee. No hidden charges." trust line.
- Replace static example block with **dynamic Basic / Advanced earnings cards**.
- Add **interactive calculator**: tier toggle, sales slider (5–500), monthly + annual projection.
- Add **fee breakdown accordion** with itemised math.
- Add **"Zero upfront cost"** section + Creator Pro optional disclaimer.
- AdminSettings amber note suggesting raising `platform_fee_free` to differentiate Pro.

## Step 7 — Withdrawal modal mobile drawer (Part 5)
In `Wallet.tsx`:
- Use `useIsMobile()` (already in `src/hooks/use-mobile.tsx`).
- Extract withdrawal form into `WithdrawalForm` component.
- Render inside `Drawer` on mobile (handle bar, sticky submit), `Dialog` on desktop.

## Step 8 — Receipt deep link (Part 7)
- `verify-razorpay-payment/index.ts`: change success notification `action_url` from `/courses` to `/receipt/${paymentId}`.
- `CourseEnrollment.tsx` post-payment success block: add **"Download Receipt"** button → `/receipt/:paymentId` alongside "Start Learning".

## Step 9 — Admin Video Settings panel (Part 8)
New section in `AdminSettings.tsx`:
- **Watermark**: enabled toggle, text input, position select (4 corners), opacity slider (10–80), size select (S/M/L), live 16:9 preview box mirroring exact overlay.
- **Defaults**: forward seek toggle, speed control toggle, min-watch % input, max preview modules input.
- Single save button → upserts all keys + writes `admin_audit_log` entry.
- Update CourseBuilder preview-module limit to read `max_preview_modules_per_course` from settings (no hardcoded 2).

## Step 10 — Legacy commission key cleanup (Part 9)
- Grep code for `default_commission_percent` and the legacy `platform_fee_percent` (excluding `platform_fee_free`/`_pro`).
- Replace each usage with the correct fee key based on creator tier (`is_creator_pro ? platform_fee_pro : platform_fee_free`).
- Add amber legacy-keys notice in AdminSettings near the fees block.

## Step 11 — QA checklist
- New signup → `wallets` row exists.
- Disable seek on a course → keyboard right-arrow blocked + toast.
- Toggle speed control off → button vanishes.
- Logged-out preview → plays with watermark, CTA on end.
- ForCreators numbers update after admin edits `platform_fee_free`.
- Withdrawal opens as bottom sheet on 375px viewport.
- Successful payment notification deep-links to `/receipt/:id`.
- Admin watermark position change reflects in next video play.

## Files touched (summary)
**Create**: `src/components/course/CoursePreviewModal.tsx`, `src/components/wallet/WithdrawalForm.tsx`, `src/components/admin/VideoSettingsSection.tsx`
**Edit**: `src/components/video/BackupshalaVideoPlayer.tsx`, `src/pages/ModulePlayer.tsx`, `src/pages/creator/CourseBuilder.tsx`, `src/pages/CourseEnrollment.tsx`, `src/components/CourseCard.tsx`, `src/components/landing/ForCreators.tsx`, `src/pages/Wallet.tsx`, `src/pages/admin/AdminSettings.tsx`, `supabase/functions/verify-razorpay-payment/index.ts`, plus any files still importing legacy `VideoPlayer` or legacy fee keys
**Delete**: `src/components/video/VideoPlayer.tsx`
**Migrations**: modules columns + platform_settings seeds + wallet trigger (if missing)

**Not touched**: auth, tier system, payment flow, certificates, R2 upload, progress tracking, resume prompt, admin panel structure, dashboard nav, sticky CTA, receipt page, gate system.

