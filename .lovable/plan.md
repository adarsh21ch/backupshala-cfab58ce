

# Backupshala — Complete Production Upgrade Plan

This is a large-scope upgrade covering visual overhaul, bug fixes, payment safety, emails, admin upgrades, student UX, creator polish, mobile responsiveness, compliance, SEO, and general polish. The work will be split into phases executed in order.

---

## Phase 1: Visual Identity Overhaul + Bug Fixes

### 1A. Brand & Color System Update
- Update `src/index.css` CSS variables: light bg `#FAFAF8`, dark bg `#0F1117`/`#111827`, card dark `#1C2333`, text dark `#F1F0EE`
- Update `tailwind.config.ts`: add `DM Sans` body + `Space Grotesk` headings font families, consistent border radius (`12px` cards, `8px` inputs, `6px` badges)
- Update `index.html` to import `DM Sans` and `Space Grotesk` from Google Fonts (replace `Plus Jakarta Sans`)
- Update all Card components globally via `card.tsx` default classes: soft warm shadows, no harsh borders
- Update Button variants in `button.tsx`: saffron primary, outlined secondary
- Update KPICard, sidebar active states (left accent bar in saffron), form input styles

### 1B. Bug Fixes
- **Profile.tsx (line 27)**: Replace `useState(() => {...})` with `useEffect` to sync form state when profile loads. Remove the render-phase state sync on lines 37-42.
- **Signup.tsx**: Make `referrerEmail` optional — remove validation requiring it (line 33), default to `none@backupshala.com` if blank, update label and helper text
- **Video settings cleanup**: Remove `vsSpeedControl`, `vsForwardSeeking`, `vsWatermark`, `vsWatchPercent` toggles from CourseBuilder UI (lines 54-58 and their corresponding UI). Keep DB columns but hide from creators. Add note: "Video playback is managed by our secure player."

---

## Phase 2: Email Verification + Razorpay Webhook

### 2A. Email Verification Flow
- Disable auto-confirm via `configure_auth` tool
- Create `/verify-email` page showing "Check your inbox" message with resend button
- Update `Signup.tsx` to redirect to `/verify-email` after signup instead of `/explore`
- Update `ProtectedRoute` to check `user.email_confirmed_at` and redirect unverified users to `/verify-email`
- Add route in `App.tsx`

### 2B. Razorpay Webhook Edge Function
- Create `supabase/functions/razorpay-webhook/index.ts`
- Verify `x-razorpay-signature` using HMAC SHA256 with `RAZORPAY_KEY_SECRET`
- Handle `payment.captured` (create enrollment if missing) and `payment.failed` (update status)
- DB migration: create `webhook_logs` table (id, event_type, payload jsonb, processed_at, status) with admin-only RLS

### 2C. Invoice/Receipt Page
- Create `/receipt/:paymentId` page accessible only to the buyer
- Display: Backupshala logo, invoice number, date, buyer info, course name, amount, GST breakdown, Razorpay payment ID
- Add print-optimized CSS with `@media print`
- Add "View Receipt" link in student dashboard and enrollment success

---

## Phase 3: Transactional Emails

- Set up email infrastructure using Lovable's built-in email system (not Resend — the prompt suggested Resend but Lovable Cloud has built-in support)
- Scaffold transactional email templates:
  1. `enrollment-confirmation` — triggered after enrollment
  2. `certificate-issued` — triggered after certificate generation
  3. `payout-processed` — triggered on admin payout approval
  4. `payout-rejected` — triggered on admin payout rejection
- Wire up triggers in the relevant UI flows using `supabase.functions.invoke('send-transactional-email', ...)`

---

## Phase 4: Admin Panel Upgrades

### 4A. Audit Log
- DB migration: create `admin_audit_log` table (id, admin_id, action, target_type, target_id, details jsonb, created_at) with admin-only RLS
- Create helper function `logAdminAction(action, targetType, targetId, details)` used across admin pages
- Add logging to: creator approve/reject, course approve/reject, payout approve/reject, settings updates
- Create `/admin/audit-log` page with paginated table, add to admin sidebar

### 4B. CSV Export
- Add "Export CSV" button to AdminPayments (already has one — verify others)
- Add to AdminStudents, AdminCommissions, AdminPayouts

### 4C. Revenue Charts
- Add Recharts line chart (daily revenue, last 30 days) to AdminDashboardHome
- Add bar chart (monthly enrollments, last 6 months)
- Add date range filter (7d / 30d / 3mo / custom)

### 4D. Date Filters
- Add From/To date pickers to Payments, Commissions, Payouts admin tables

---

## Phase 5: Student Experience

### 5A. Course Review Modal
- After course completion, show a modal with star rating (1-5) + optional text
- Submit to existing `course_reviews` table (already exists with proper RLS)
- Show average rating on course cards and detail page

### 5B. Student Order History
- Create `/dashboard/orders` page showing past payments
- Add "Order History" to student sidebar
- Show: course name, date, amount, payment ID, status, receipt link

### 5C. Cookie Consent Banner
- Sticky bottom banner on first visit for non-logged-in users
- Store consent in localStorage, hide once accepted

---

## Phase 6: Creator Polish + Mobile

### 6A. Creator UX
- Add character counters on title (100) and description (500) in CourseBuilder
- Add empty state for 0 modules
- Add monthly earnings bar chart to CreatorEarnings using Recharts

### 6B. Mobile Responsiveness Audit
- Navbar: hamburger menu with slide-in drawer (already partially built — polish it)
- Dashboard KPI cards: 2x2 grid on mobile
- Student sidebar: bottom nav bar on mobile (already exists — verify)
- Explore: horizontal scrollable category pills on mobile
- CourseEnrollment: sticky bottom CTA on mobile
- Admin sidebar: collapsible drawer on mobile (already built — verify)

---

## Phase 7: Compliance, SEO, General Polish

### 7A. Trust & Compliance
- Checkout page: add "Price includes 18% GST" note
- Course cards: replace referral earnings badge with "Referral bonus available"
- Add "Report this course" link on CourseDetail page
- Verify all legal pages linked in footer on all page layouts

### 7B. SEO Meta Tags
- Add `react-helmet-async` for per-page `<title>` and meta tags
- Add to: Index, Explore, CourseEnrollment, CourseDetail pages
- Add `loading="lazy"` to course card images

### 7C. General Polish
- Skeleton loaders on all data fetches (audit existing, add missing)
- Empty states on all lists/tables
- Disable + loading spinner on submit buttons
- Confirmation dialogs before destructive admin actions
- `document.title` updates on all pages
- `transition-all duration-200` on interactive elements

---

## Technical Notes

- **Font change**: Replacing `Plus Jakarta Sans` with `Space Grotesk` for headings, keeping `DM Sans` for body, keeping `JetBrains Mono` for code
- **FK verification**: All Supabase queries use FK syntax but no FKs are defined — need migration to add FK constraints on courses.creator_id, enrollments.student_id/course_id, payments.student_id/course_id/creator_id, etc.
- **Email system**: Will use Lovable's built-in email infrastructure (not Resend) since the project runs on Lovable Cloud
- **Webhook secret**: `RAZORPAY_KEY_SECRET` is already configured in secrets
- **Existing CSV export**: AdminPayments already has CSV export — will extend pattern to other admin tables
- **course_reviews table**: Already exists with proper RLS policies — no migration needed for reviews
- **Memory update**: Will update brand design memory to reflect new color tokens and typography

This is approximately 6-8 implementation sessions. Phase 1 and 2 are the highest priority and should be done first.

