ns
# Backupshala — Full Application Audit (May 2026)

Below is a complete pass over the app: security, payments, video pipeline, frontend/UX, admin tooling, and what's missing for production. Items are tagged P0 (ship-blocker / security), P1 (high), P2 (polish).

---

## 1. SECURITY (most urgent)

### 1.1 Database / RLS
- **P0 — `contact_submissions` has `WITH CHECK (true)` on INSERT for `public`.** Anyone can spam submissions with no rate-limit. Add a per-IP rate limiter (edge function with hCaptcha/Turnstile) or move INSERT behind an edge function.
- **P0 — `course_chapters.cc_sel_preview` is open to `public` role.** Combined with `is_preview = true` on a published course it's intended, but verify no chapter accidentally has `is_preview = true` with the full paid video. Add an admin report listing all preview chapters.
- **P1 — 14 SECURITY DEFINER functions are executable by `anon`/`authenticated`.** Of these, only `has_role`, `verify_certificate`, `get_my_profile` are intended public. REVOKE EXECUTE FROM `anon, authenticated` on the rest (`handle_new_user`, `handle_new_wallet`, `protect_admin_fields`, `prevent_referrer_email_change`, `update_updated_at_column`) — these should only run from triggers.
- **P1 — `profiles.is_admin`, `is_creator_pro`, `creator_approved`, wallet/earning fields** are on the `profiles` table. The `protect_admin_fields` trigger guards them, but admin checks must NEVER read `profiles.is_admin` from the client. Audit every `useAuth().profile.is_admin` reference and replace with `has_role` RPC. (Memory already says this — verify enforcement.)
- **P1 — `payments` has no INSERT policy** (good — only edge functions write). Verify every payments-writing edge function uses the service role key, not anon.
- **P2 — `contact_submissions` and `payout_requests` expose PII (phone, bank, UPI).** Add a column-level mask in the admin UI and never log them in `console.log`.
- **P2 — Storage buckets `avatars`, `course-thumbnails`, `course-resources` are all public + listable.** Restrict listing: keep public read on individual objects, drop the broad SELECT-listing policy.

### 1.2 Auth
- **P0 — Enable HIBP leaked-password protection** in Cloud → Auth Settings. One toggle, blocks reused leaked passwords.
- **P1 — Email verification is enforced in `ProtectedRoute`** (good) but not on edge functions. Every edge function should re-check `user.email_confirmed_at` for sensitive flows (payment, payout, role-grant).
- **P1 — No rate-limiting on login.** Supabase has built-in throttling but consider adding a custom captcha after 3 failed attempts.
- **P2 — Session storage = localStorage.** Acceptable, but XSS would steal sessions. Compensate by hardening CSP (see 1.4).

### 1.3 Payments
- **P0 — Razorpay webhook verifies signature** (good). But the webhook also creates enrollments — make sure `verify-razorpay-payment` (client-driven) is **idempotent** with the webhook (don't create duplicate enrollments). Confirmed today they both check `existingEnrollment` — good. Add a unique index `(student_id, course_id)` on enrollments to be safe at DB level.
- **P0 — `verify-razorpay-payment`, `verify-upgrade-payment`** must validate that `amount_paid` from Razorpay matches the course price server-side; do not trust the client-supplied amount. Currently the price is recomputed in `create-razorpay-order` — verify the verify step also re-reads `courses.price` and compares to `payment.amount`.
- **P1 — Commission/payout amounts** are computed in edge functions. Add a `commissions_audit` view + daily reconciliation script so manual tampering is detectable.
- **P1 — Payout requests:** current flow lets users submit bank details that admins manually pay. Add (a) min payout threshold, (b) cooldown between requests, (c) PAN/KYC capture before first payout.

### 1.4 Edge functions / network
- **P1 — CORS on every edge function uses `Access-Control-Allow-Origin: *`.** Acceptable for public APIs, but for write functions (payouts, role grants, course creation) lock to `https://backupshala.com, https://www.backupshala.com, lovable preview domain`.
- **P1 — Add a Content-Security-Policy header** via `index.html` meta or a CDN rule. Block inline scripts except Razorpay.
- **P2 — Add `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`** at the edge.
- **P2 — Rotate `RAZORPAY_KEY_SECRET` and `R2_SECRET_ACCESS_KEY`** quarterly; document rotation.

### 1.5 R2 / video
- **P1 — R2 CORS policy still pending** (per `docs/R2_CORS_SETUP.md`). Until set, files >40MB fail. The proxy fallback is a band-aid.
- **P1 — Signed playback URLs:** `r2-get-playback-url` should return short-lived (5–10 min) signed URLs, not public ones. Verify expiry.
- **P1 — Watermarking** in `BackupshalaVideoPlayer` is client-side only. Determined attackers can strip it. Acceptable for now, but add server-side per-user video token logging so leaked downloads can be traced.

---

## 2. VIDEO / LEARNING PIPELINE

- **P0 — Module ↔ Chapter video duplication.** `modules.video_url` and `course_chapters.video_url` both exist. Today's bug ("video not available in preview") was caused by a placeholder URL in `modules.video_url`. **Recommendation:** make `modules.video_url` derived from the first chapter; never store both. Migrate existing rows.
- **P1 — Auto-duration detection** exists in ChapterEditor — verify it writes back to `course_chapters.duration_minutes` AND rolls up to `courses.total_duration_minutes` on save.
- **P1 — Drag-to-reorder chapters/modules** — verify it persists `order_index` atomically (one transaction, not N PATCHes).
- **P1 — Resume-where-you-left-off:** check `update-watch-progress` actually persists per-second progress and `ModulePlayer` reads it on mount.
- **P2 — Offline playback**: PWA installs but videos aren't cached. Add Service Worker rule to cache last-watched video chunks.

---

## 3. FRONTEND / UX

### 3.1 Landing & marketing
- **P1 — SEO:** `<title>` and meta-description need to be unique per route via `SEOHead`. Verify Course/Creator detail pages emit JSON-LD `Course` and `Person` schema.
- **P1 — Hero CTA** says "Get Started Free" but enrollment is ₹449. Either change copy to "Start for ₹249" or make a real free tier.
- **P2 — Cookie banner** appears twice in session replay (clicked Accept twice). Persist consent in `localStorage` with a versioned key.
- **P2 — Testimonials are placeholder.** Replace with real student quotes + photos + course tag.

### 3.2 Student experience
- **P1 — Progress bar** in CourseEnrollment doesn't refresh after completing a module without page reload (use react-query invalidation).
- **P1 — Certificate page** — verify QR code links to `/verify-certificate/:code` and that page loads without auth.
- **P2 — No "search inside course"** for chapters/notes.
- **P2 — Quiz UX:** show explanation after answering, not just pass/fail.

### 3.3 Creator experience
- **P1 — Course Builder** still has a `.legacy.tsx` file — delete it once new builder is stable.
- **P1 — Earnings page** should show pending vs available vs paid clearly with a 7-day rolling chart.
- **P2 — Bulk import students** via CSV.
- **P2 — Coupon analytics** (uses, revenue lift).

### 3.4 Admin experience
- **P1 — Admin Dashboard KPI cards** were just made clickable — verify breakdown modal lazy-loads (don't fetch all 5 breakdowns on page mount).
- **P1 — Audit log** captures admin actions but isn't exportable. Add CSV export.
- **P1 — No "impersonate user"** button for support. Add a server-issued short-lived JWT mint flow (admin-only).
- **P2 — Webhook logs page** — add filter by status, retry button for failed events.
- **P2 — Refund tooling** is missing. Today refunds must be issued in Razorpay dashboard manually — add a "Refund" button on payment row that calls Razorpay API + reverses enrollment + commissions.

---

## 4. MISSING PRODUCTION FEATURES

- **P0 — Refund flow** (admin-initiated, end-to-end).
- **P0 — Email notifications** for: enrollment success, payout approved, certificate issued, course published. Currently only in-app notifications exist.
- **P1 — WhatsApp/SMS notifications** for OTP/payment confirmation (MSG91 or Twilio).
- **P1 — Tax invoices (GST)** with sequential invoice numbers, downloadable PDF. `payments.invoice_number` exists but no PDF generator wired up.
- **P1 — Tiered roles:** `support_agent`, `content_reviewer` in addition to `admin`. Currently it's binary.
- **P1 — Soft-delete + 30-day retention** for courses, accounts, enrollments (GDPR/India DPDP).
- **P2 — Affiliate dashboard** with link tracker, click → conversion funnel.
- **P2 — A/B test framework** for landing page CTAs.
- **P2 — Status page** at `status.backupshala.com`.

---

## 5. PERFORMANCE

- **P1 — Bundle size:** route-based code splitting is in place for admin, extend to creator routes the same way.
- **P1 — Image optimization:** course thumbnails served from R2 are full-resolution. Add a Cloudflare Image Resizing rule or generate WebP variants on upload.
- **P2 — Replace `react-query` default refetch-on-window-focus** with `staleTime: 60_000` for list pages.

---

## 6. LEGAL / COMPLIANCE

- **P1 — Privacy Policy & Terms** exist as pages but need a "last updated" date and an India DPDP-2023 section (right to erasure, data principal contact).
- **P1 — GST invoice format** must include Backupshala/Nevorai's GSTIN, HSN code 999293 (educational services), buyer state.
- **P2 — Cookie banner** must list categories (necessary/analytics/marketing) for DPDP compliance.

---

## 7. PROPOSED EXECUTION ORDER

**Sprint 1 (security hardening, ~3 days)**
1. Lock down SECURITY DEFINER function EXECUTE permissions
2. Enable HIBP password check
3. Add unique index on `enrollments(student_id, course_id)`
4. Server-side amount verification in payment verify functions
5. Lock CORS allow-origin on write edge functions
6. Add CSP + security headers
7. Restrict storage bucket SELECT/listing
8. Apply R2 CORS policy

**Sprint 2 (payments + reliability, ~4 days)**
9. Refund flow (admin button + edge function)
10. Email notifications via Resend (enrollment, payout, certificate)
11. GST invoice PDF generator
12. Reconcile commissions audit view
13. Payout cooldown + min threshold + KYC capture

**Sprint 3 (video + UX, ~4 days)**
14. Migrate `modules.video_url` → derive from chapters; remove placeholders
15. Short-lived signed playback URLs
16. Resume-where-you-left-off verification
17. Course progress live refresh (react-query invalidate)
18. Delete `CourseBuilder.legacy.tsx`

**Sprint 4 (admin polish + roles, ~3 days)**
19. Audit log CSV export
20. Impersonate-user (short-lived JWT)
21. Tiered admin roles (`support_agent`, `content_reviewer`)
22. Webhook logs filtering + retry
23. Soft-delete + retention policy

---

## 8. WHAT'S ALREADY GOOD

- Roles correctly stored in `user_roles` (not on `profiles`)
- `referrer_email` immutable trigger in place
- Razorpay signature verification present
- `protect_admin_fields` trigger blocks privilege escalation via profile update
- RLS enabled on every table
- Tier system, commission model, certificates all implemented
- Auth uses email confirmation (no auto-confirm)

---

## How to proceed

If you approve this plan, I'll execute **Sprint 1 (security hardening)** first since it's the highest risk surface, then come back with a checkpoint before Sprint 2. Each sprint will be a separate prompt so you can review the diff before moving on. Tell me to start, or pick specific items you want first.
