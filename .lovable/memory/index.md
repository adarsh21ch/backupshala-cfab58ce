# Project Memory

## Core
Backupshala — Indian digital skills education platform. Primary #16a34a (green), accent #f97316 (orange).
Space Grotesk headings, DM Sans body, JetBrains Mono for codes.
Landing page: light theme (#FAFAF8). Dashboard/logged-in pages: dark theme (#0F1117).
Uses user_roles table for admin (not is_admin on profiles). referrer_email is immutable after signup.
₹249 enrollment, ₹75 referral commission. Razorpay for payments with webhook backup.
Email verification required on signup. Auto-confirm disabled.

## Memories
- [Brand & design tokens](mem://design/brand-colors) — Full HSL color palette, warm premium theme, shadows
- [Database schema](mem://features/database) — All tables, RLS policies, triggers
- [User journey](mem://features/user-journey) — Signup, enrollment, learning, certification, referral flow
