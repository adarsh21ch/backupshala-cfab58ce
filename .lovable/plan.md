

# Plan: Recreate All Database Schema in New Project

## What happened
You connected a new Supabase project, so the database is empty. We need to run a single consolidated migration that creates everything from scratch.

## What we'll do

Create **one new migration** that consolidates all 6 existing migrations into a single, clean SQL file. This migration will:

### Tables (14 total)
1. `profiles` — user profiles with creator fields, wallet, referrer
2. `courses` — with platform_fee_percent, commission_percent, slug
3. `modules` — with module_type (video/resource/community), resources JSONB
4. `payments` — Razorpay fields, fee breakdowns, GST
5. `enrollments` — student-course link with referrer_email
6. `module_completions` — progress tracking
7. `commissions` — referral earnings with status types
8. `creator_payouts` — creator payment tracking
9. `payout_requests` — withdrawal requests
10. `certificates` — per-course certificates
11. `course_reviews` — ratings 1-5
12. `notifications` — in-app notifications
13. `platform_settings` — key-value config
14. `contact_submissions` — support form
15. `course_overrides` — admin fee overrides
16. `user_roles` — admin/moderator/user enum roles

### Functions & Triggers
- `has_role()` — security definer for RLS
- `handle_new_user()` — auto-create profile + welcome notification on signup
- `prevent_referrer_email_change()` — immutable referrer
- `protect_admin_fields()` — non-admins can't change sensitive profile fields

### RLS Policies
All existing policies for every table (copied from migration 2 + 3 + 4).

### Seed Data
- 10 platform_settings rows (fee, commission, community links, etc.)

### Storage
- `avatars` bucket (public) with upload/read policies

### Approach
- Delete the 6 old migration files
- Create one new consolidated migration with everything in correct dependency order
- The enum `app_role` and `user_roles` table come first, then `has_role()`, then all other tables, then RLS, then triggers, then seed data

