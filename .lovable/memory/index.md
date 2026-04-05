# Project Memory

## Core
Backupshala — Indian digital skills education platform. Backup=orange(#f97316), shala=green(#16a34a).
Plus Jakarta Sans headings, DM Sans body, JetBrains Mono for codes.
Landing page: light theme. Dashboard/logged-in pages: dark theme (#0c0f1a).
Uses user_roles table for admin (not is_admin on profiles). referrer_email is immutable after signup.
₹249 enrollment, ₹75 referral commission. Razorpay for payments (Phase 2).
Video folder system: video_folders, video_folder_items, folder_shares tables with RLS.

## Memories
- [Brand & design tokens](mem://design/brand) — Full color palette, typography, border radius system
- [Database schema](mem://features/database) — All tables, RLS policies, triggers
- [User journey](mem://features/user-journey) — Signup, enrollment, learning, certification, referral flow
