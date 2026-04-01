

# Backupshala Cleanup & Production-Ready Polish

## Summary
Fix outdated landing page content, unify brand name as "Backupshala" (one word, no space), remove unused files, and add missing production-quality features across the app.

## Issues Found

**Brand name:** Currently rendered as two separate spans: "Backup" + "shala" across ~15 files. Must be one word "Backupshala" everywhere.

**Outdated landing page content:**
- Hero still says "5 practical digital skill courses for ₹249", "Start Learning — ₹249", "5 courses included"
- HowItWorks says "Sign up in 30 seconds and pay ₹249", "refer friends for ₹75 each"
- CoursesSection lists 5 hardcoded courses with "All 5 courses included in one ₹249 enrollment" — should pull from DB
- FeeBreakdown hardcoded to ₹249 example
- ReferEarn (landing component) says fixed "₹75" amounts — should reflect variable commissions
- CertificatePreview says "Complete all courses" — should say "Complete a course"
- Testimonials reference ₹249 and ₹75 specifically

**Unused files (not imported anywhere):**
- `src/components/NavLink.tsx` — unused
- `src/components/landing/CertificatePreview.tsx` — not imported in Index.tsx
- `src/components/landing/Testimonials.tsx` — not imported in Index.tsx
- `src/components/landing/ReferEarn.tsx` — not imported in Index.tsx (separate from `src/pages/ReferEarn.tsx` which IS used)

**Missing production features:**
- Admin panel has no link from student/creator dashboards for admin users
- Explore page missing language filter and rating filter
- "Forgot password?" button on login does nothing
- Creator onboarding "Become a Creator" button on ForCreators links to /signup, should link to /creator/onboarding for logged-in users
- No "Explore" link in student sidebar
- No admin link in student dashboard sidebar for admin users

---

## Plan

### 1. Brand Name Fix — "Backupshala" as One Word
Update all ~15 files where brand appears as two spans. Replace with single styled span:
```
<span className="font-heading text-2xl font-800">
  <span className="text-primary">Backup</span><span className="text-accent">shala</span>
</span>
```
This keeps the green+orange coloring but renders as one visual word with NO space/gap between spans.

**Files:** Navbar, Footer, DashboardLayout, CreatorDashboardLayout, AdminDashboardLayout, Login, Signup, VerifyCertificate, Certificate, CreatorCTA, FAQ (text), ForCreators (text), FeeBreakdown (text), CourseEnrollment, ReferEarn page.

### 2. Landing Page Content Rewrite
Update all landing sections to reflect marketplace model:

- **Hero:** "Teach. Learn. Earn." headline. Sub: "Creators host courses. Students learn and earn certificates. Everyone earns commissions." CTAs: "Start Teaching — Free" + "Explore Courses". Right card: "Set your own price", "Earn commissions on referrals", "Verified certificates"
- **HowItWorks:** 3 steps updated for marketplace: "Browse & Enroll" / "Learn at Your Pace" / "Get Certified & Earn"
- **CoursesSection:** Replace hardcoded courses with DB-driven featured courses using CourseCard component. Remove "All 5 courses" text.
- **FeeBreakdown:** Keep visual but use generic example (₹499 course) and note "varies by course"
- **ForCreators:** Update CTA button — detect auth state, link to /creator/onboarding if logged in, /signup if not
- **FAQ:** Update answers to remove specific ₹249/₹75 references
- **Testimonials:** Update testimonials to reflect marketplace model (remove ₹249 references)

### 3. Delete Unused Files
- `src/components/NavLink.tsx`
- `src/components/landing/CertificatePreview.tsx`
- `src/components/landing/Testimonials.tsx`
- `src/components/landing/ReferEarn.tsx` (the landing component, NOT the page)

### 4. Production Features & Polish
- **Forgot Password:** Implement actual password reset flow on Login page using `supabase.auth.resetPasswordForEmail()`
- **Admin link in sidebar:** Show "Admin Panel" link in DashboardLayout sidebar when user has admin role (check via `has_role` RPC)
- **Explore link in sidebar:** Add "Explore Courses" to student dashboard sidebar
- **ForCreators smart CTA:** Check auth state — logged in users go to /creator/onboarding, guests go to /signup
- **Explore page filters:** Add language filter (All/English/Hindi/Hinglish) and rating filter (4★+/3★+/All)
- **NotFound page:** Polish with Backupshala branding

### 5. Certificate & Verify Page Fix
- Update certificate rendering to show "Backupshala" as one word
- Fix VerifyCertificate foreign key references (currently using named FK which may not exist — use positional joins)

---

## Files Modified (~20)
- Delete: 3 unused files
- Rewrite: Hero, HowItWorks, CoursesSection, FeeBreakdown, ForCreators, FAQ, Testimonials (if kept)
- Update branding: Navbar, Footer, DashboardLayout, CreatorDashboardLayout, AdminDashboardLayout, Login, Signup, VerifyCertificate, Certificate, CreatorCTA, CourseEnrollment, ReferEarn page
- Feature additions: Login (forgot password), DashboardLayout (admin+explore links), Explore (filters), NotFound, ForCreators (smart CTA)

