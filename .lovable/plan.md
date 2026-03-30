

# Backupshala — Phase 1 Implementation Plan

## Overview
Build the core foundation: landing page, authentication, database schema, course system, and student dashboard. This phase establishes the brand, data layer, and primary learning experience.

---

## 1. Database & Auth Setup

**Tables to create (with RLS):**
- `profiles` — user data, referrer_email (immutable after creation), wallet_balance, enrollment status
- `user_roles` — separate table for admin roles (security best practice — replaces `is_admin` on profiles)
- `courses` — title, description, thumbnail, what_you_learn array, order
- `modules` — video lessons per course, with ordering
- `module_completions` — tracks which modules each user has completed
- `notifications` — in-app notification system

**Auth trigger:** Auto-create profile on signup with referrer_email permanently locked via RLS policy (no UPDATE allowed on that column).

**Seed data:** 5 courses with 4-5 modules each, using placeholder YouTube embeds.

---

## 2. Design System & Brand

- **Fonts:** Plus Jakarta Sans (headings), DM Sans (body), JetBrains Mono (codes)
- **Colors:** Primary green (#16a34a), accent orange (#f97316), warm white background for public pages, dark theme (#0f172a) for dashboard
- **Components:** shadcn/ui with custom Tailwind config for brand colors, rounded corners (12px cards, 8px inputs)

---

## 3. Landing Page (/)

Conversion-focused, light theme page with:
- **Navbar** — Logo, nav links, orange "Get Started" CTA
- **Hero** — "Learn. Earn. Grow." headline, subheadline, dual CTAs, floating product highlight card
- **How It Works** — 3-step visual flow
- **Courses Section** — 5 course cards with icons and module counts
- **Certificate Preview** — premium certificate mockup
- **Refer & Earn** — referral math explained visually
- **Testimonials** — 3 placeholder cards
- **Final CTA** — full-width enrollment prompt
- **Footer** — links, logo, tagline

---

## 4. Authentication Pages

**Signup (/signup):**
- Fields: Full Name, Email, Phone (10-digit Indian validation), Password with strength indicator, Confirm Password, Referrer Email
- Referrer email helper text and self-referral prevention
- Creates auth user + profile, redirects to /dashboard (payment page in Phase 2)

**Login (/login):**
- Email + password, forgot password link
- Redirects to /dashboard on success

---

## 5. Student Dashboard (/dashboard)

Dark theme. Protected route (must be logged in).
- Welcome header with user's first name
- Overall progress indicator (% of all modules completed)
- Course cards grid with individual progress bars and Continue/Start buttons
- Quick stats row: modules completed, courses in progress, days since enrolled
- Recent activity feed (last 5 completions)

---

## 6. Course Pages

**Course Library (/courses):**
- Grid of all published courses with progress
- Filter: All / In Progress / Completed

**Course Detail (/courses/:id):**
- Module sidebar (desktop) / accordion (mobile)
- Course progress bar, "Continue Learning" button
- Module list with completion checkmarks

**Module Player (/courses/:id/module/:moduleId):**
- Responsive YouTube embed
- Module title & description
- "Mark as Complete ✓" button with animation
- Next/Previous module navigation
- Celebration modal when all courses completed

---

## 7. Certificate Page (/certificate)

- **Not yet earned:** Progress breakdown by course, motivational message, "Continue Learning" button
- **Earned:** Premium certificate display with student name, course list, completion date, certificate code (CERT-2025-XXXX)
- Download as PNG (html2canvas), Share on WhatsApp button

**Public Verification (/verify/:certCode):**
- No login required
- Shows valid/invalid status with student name and completion date

---

## 8. Profile Page (/profile)

- Editable: name, phone, profile photo (Supabase Storage)
- Read-only (locked): email, referrer email
- Change password section

---

## 9. Notifications (/notifications)

- Notification bell in navbar with unread count (Supabase Realtime)
- Notification list page with mark-all-as-read
- Type-based icons

---

## 10. Edge Function: check-and-issue-certificate

- Called after each module completion
- Checks if all published modules are completed
- Generates unique certificate code and creates certificate record
- Creates notification for the student

---

## 11. Mobile Experience

- Bottom tab bar navigation on mobile (Dashboard, Courses, Certificate, Refer, Profile)
- All pages responsive down to 375px width
- Touch-friendly interactions

---

## What's in Phase 2 (later)
- Razorpay payment integration (edge functions + payment page)
- Refer & Earn dashboard with wallet & payout system
- Admin panel (overview, students, courses, commissions, revenue)
- Email notifications (Lovable built-in emails)
- GST invoice generation

