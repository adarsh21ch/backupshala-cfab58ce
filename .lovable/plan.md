# Backupshala Production Upgrade Plan

This is a large, multi-phase upgrade. To keep each step shippable and reviewable, I will execute it in **phases**, pausing between major phases for you to verify in the preview. Each phase is independently useful — nothing is half-broken at any point.

---

## Phase 1 — Critical pricing bug (ship first, alone)

**Goal:** No hardcoded ₹249 anywhere on the public landing or CTAs. All prices flow from `platform_settings.basic_price` / `advanced_price` via `usePlatformSettings` (already exists).

Files to update:
- `src/components/landing/Hero.tsx` — CTA "Explore Standard Bundle — ₹{basic_price}", "What you get" line.
- `src/components/landing/StandardBundleSpotlight.tsx` — heading, description, card price, both buttons, GST note.
- `src/components/landing/Footer.tsx` / "Ready to Start" section (locate the component) — bundle button price.
- Any SEO meta containing ₹249.
- Loading state: while `usePlatformSettings` is loading, show price as `—` or a skeleton (never fallback to a hardcoded number per your rule).

**Verify:** Change `basic_price` in admin settings → reload landing → all five locations update.

---

## Phase 2 — Database foundations (single migration)

One migration that adds everything later phases need:

```sql
-- courses
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS course_level TEXT
  CHECK (course_level IN ('basic','advanced','creator'));

-- enrollments: admin grant + expiry
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS granted_by_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grant_reason TEXT;

-- chapters
CREATE TABLE course_chapters (
  id UUID PK, module_id UUID FK, course_id UUID FK,
  title, description, chapter_order INT,
  video_url, video_asset_id UUID,
  duration_minutes INT,
  pdf_url, pdf_filename,
  is_preview BOOL, is_published BOOL,
  created_at, updated_at
);

ALTER TABLE modules ADD COLUMN has_pdf_resources BOOLEAN DEFAULT false;

CREATE TABLE pdf_download_logs (
  id, user_id, chapter_id, course_id, downloaded_at
);

-- platform_settings rows (insert if missing)
basic_price = 449, advanced_price = 4449,
basic_course_id, advanced_course_id
```

RLS:
- `course_chapters`: enrolled students read published rows; creator/admin full access for their courses.
- `pdf_download_logs`: insert by owner, select own + admin.

I will also seed `course_level='basic'` on the existing Standard Bundle.

---

## Phase 3 — Admin: Grant Course Access

- New action on `AdminStudents` row menu → "Grant Course Access" modal.
- Course (Basic / Advanced / Both), Duration (1m, 3m, 6m, 1y, lifetime), Reason (required), notify toggle.
- Creates enrollment(s) with `granted_by_admin=true`, `access_expires_at`, logs to `admin_audit_log`, inserts notification.
- Advanced auto-grants Basic.
- Show expiry column in admin enrollments.
- Enforce expiry in `ModulePlayer` (block + "Renew Access" CTA) and badge in My Courses.

---

## Phase 4 — Thumbnail upload UX fix

`src/components/course/ThumbnailUpload.tsx` → compact 400×225 (16:9) centered card, hover "Change", mobile full-width max 200h.

---

## Phase 5 — Chapters inside modules + PDF download

- Update Course Builder to show Module → Chapter tree (left) + Chapter editor (right).
- Chapter editor: title, desc, video upload/URL, optional PDF (≤10MB → R2), preview toggle, duration.
- ModulePlayer: render chapter list under module, video per chapter, "📄 Download Chapter Notes" when `pdf_url`.
- Module completion = all chapters watched ≥ min_watch_percent.

---

## Phase 6 — Admin Platform Courses section

- New admin route `/admin/platform-courses` with Basic + Advanced cards (price, modules, chapters, enrollments).
- Edit opens the same builder from Phase 5.
- Sidebar entry under PLATFORM group.

---

## Phase 7 — Advanced includes Basic (server enforcement)

- `verify-razorpay-payment` edge function: after Advanced enrollment, upsert Basic enrollment (`amount_paid=0`, same `payment_id`, lifetime).
- Checkout page shows "Includes everything in Basic (₹X value) — free".

---

## Phase 8 — Admin overview polish

- Add KPIs: Basic Enrollments, Advanced Enrollments, This Month Revenue, Pending Affiliate Commissions.
- Charts: empty state when zero data; Y-axis based on real range.
- "Revenue by Course" top-5 table.
- Audit Active Creator Pro count.

---

## Phase 9 — Course builder copy/UX fixes

- Yellow warning above Standard Bundle description if it contains `₹249`.
- Pricing hint copy + suggestion pills (₹449 / ₹999 / ₹1999 / ₹4449).
- "Preview Video" — accept any YouTube URL, auto-convert `watch?v=` → `embed/`.
- "What you'll learn" placeholder + 100-char counter + min 3 to publish.

---

## Phase 10 — Mobile pass

Audit at 375px: Hero (h1 36px, stacked CTAs full-width), StandardBundleSpotlight (full-width card, sticky enroll), Dashboard cards single-column, ModulePlayer controls 44px, Admin sidebar hamburger + KPI 2×2.

---

## Phase 11 — Landing content updates

- "What you get" items per your spec, dynamic price.
- Updated Standard Bundle subtitle with dynamic price.

---

## Phase 12 — Advanced course landing page

- New route `/advanced` with dark navy theme + amber accents, "Includes Basic" callout, Enroll, GST.
- Nav link + "Upgrade to Advanced" CTA inside Basic player.

---

## Phase 13 — Invoice/GST verification

- Manual test of `/receipt/:id`: Nevorai Technologies, GSTIN 23CBCPC3986J1ZN, SAC 999293, CGST 9% + SGST 9%, base = price/1.18, sequential `BSH-YYYY-000001`. Fix any gaps found.

---

## Execution approach

Because this is ~30+ files and 1 destructive-ish migration, I'll proceed phase-by-phase and check in:

1. **Now**: implement **Phase 1** (pricing bug — highest user impact, no DB changes, ~5 file edits).
2. **Next message**: send the **Phase 2 migration** for your approval.
3. After migration approved: continue Phases 3–13 in order, pausing only if I hit ambiguity.

### Questions before I start

1. **Basic price**: spec says `basic_price = 449` but current setting/UI shows `249`. Should Phase 2 change it to **449**, or leave **249** and you'll change it in admin?
2. **Advanced referral amount**: any specific ₹ figure, or compute from existing commission % on `advanced_price`?
3. **Sticky mobile enroll button** on the Standard Bundle section — confirm you want it sticky (can feel intrusive on long pages)?

If you reply "go" without answering, I'll assume: keep `basic_price=249` for now, compute referral from existing %, and make enroll button sticky only on the bundle section (not site-wide).