

# Backupshala Marketplace Upgrade — Phase 1 Plan

## What Phase 1 Delivers
The foundation: new database schema, updated auth, and all public-facing pages. After this phase, visitors can browse courses, view creator profiles, sign up, and log in.

## Scope

### 1. Database: Drop and Rebuild
Drop all existing tables (profiles, courses, modules, module_completions, payments, commissions, payout_requests, certificates, notifications, user_roles) and the `app_role` enum. Recreate with the new marketplace schema:

**New tables (11):**
- `profiles` — expanded with creator fields (is_creator, creator_approved, creator_slug, bio, social links, wallet_balance, total_earned, etc.)
- `courses` — now has creator_id, slug, price, commission_percent, platform_fee_percent, status (draft/pending_review/published/suspended), ratings, tags, level, language, is_featured
- `modules` — adds is_preview flag, course_id
- `enrollments` — new table replacing the old is_enrolled flag; tracks per-course enrollment with referrer_email
- `module_completions` — adds course_id column
- `payments` — expanded: creator_id, platform_fee_amount, commission_amount, creator_payout_amount, gst_amount, base_amount
- `commissions` — adds course_id, referrer_user_id
- `creator_payouts` — new table for creator earnings tracking
- `payout_requests` — adds request_type (student_commission / creator_earnings)
- `certificates` — now per-course: student_id, course_id, creator_id
- `course_reviews` — new table
- `notifications` — adds action_url
- `platform_settings` — new table for admin config

**Keep:** `user_roles` table and `app_role` enum (already correct). Update `handle_new_user` trigger for new profile fields. Keep `prevent_referrer_email_change` trigger. Update `has_role` function.

**RLS policies:** Full set for all tables as specified. Use `has_role()` security definer function for admin checks.

**Seed data:** platform_settings defaults + 3 sample courses with modules.

### 2. Auth Context Update
- Update `AuthContext` to fetch new profile shape (creator fields, wallet_balance, etc.)
- Update `ProtectedRoute` with creator/admin guard variants
- Add `CreatorRoute` wrapper (checks is_creator + creator_approved)
- Add `AdminRoute` wrapper (checks via user_roles table)

### 3. Updated Design System
- Update dark theme background from `#0f172a` to `#0a0f1e`
- Add new surface colors (`#111827`, `#1f2937`)
- Add warning color `#eab308`, error `#dc2626`
- Button border-radius: 6px (changed from current)

### 4. Public Pages (Light Theme)

**Landing Page (/)** — Complete redesign:
- Two-sided messaging (creators + students)
- Stats bar with animated counters
- "For Students" and "For Creators" benefit sections
- Platform fee breakdown visual
- Featured courses grid (from DB, is_featured=true)
- Creator CTA section
- FAQ accordion
- Updated footer with 3-column layout

**Explore Courses (/explore)** — New page:
- Filter sidebar (category, price range, level, language, rating)
- Course card grid with creator info, ratings, price
- Sort options, pagination

**Creator Public Profile (/c/[creator-slug])** — New page:
- Creator banner, avatar, bio, social links, stats
- Grid of their published courses

**Course Enrollment Page (/c/[creator-slug]/[course-slug])** — New page:
- Two-column layout: course content + sticky enrollment card
- Preview video, tabs (What You'll Learn, Course Content, Requirements, Reviews, About Creator)
- Enrollment CTA with price and commission info
- Redirects to signup if not logged in

**Signup (/signup)** — Updated:
- Support `?course=` and `?creator=` and `?ref=` URL params
- Pre-fill referrer email from `?ref=` param
- Redirect to course page after signup if params present

**Login (/login)** — Minor updates for new redirect logic

**Certificate Verification (/verify/[certCode])** — Updated:
- Show course title, creator name (new fields)

### 5. Updated App Router
- Add new routes: /explore, /c/:creatorSlug, /c/:creatorSlug/:courseSlug
- Keep existing protected routes (will be updated in Phase 2)
- Update NotFound page

### 6. Shared Components
- Updated `DashboardLayout` with new sidebar links
- `CourseCard` reusable component for explore/landing/creator pages
- `CreatorCard` component
- `PriceDisplay` component (₹ Indian format)

---

## What's in Later Phases
- **Phase 2:** Student dashboard, course player, certificates, refer & earn, payouts
- **Phase 3:** Creator system (onboarding, dashboard, course builder, earnings)
- **Phase 4:** Admin panel, edge functions, Razorpay integration

---

## Technical Details

**Database migration:** Single migration that drops all existing tables (preserving user_roles and app_role enum), recreates everything, adds triggers, RLS policies, and seed data.

**File changes (~20 files):**
- 1 new migration file
- Update: `AuthContext.tsx`, `ProtectedRoute.tsx`, `App.tsx`, `index.css`, `tailwind.config.ts`
- New pages: `Explore.tsx`, `CreatorProfile.tsx`, `CourseEnrollment.tsx`
- Rewrite: `Index.tsx` (landing), `Signup.tsx`, `Login.tsx`, `VerifyCertificate.tsx`
- Update: all landing components (Navbar, Hero, HowItWorks, etc.)
- New components: `CourseCard.tsx`, `CreatorCard.tsx`, `PriceDisplay.tsx`
- Update memory files

