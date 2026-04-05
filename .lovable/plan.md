

# Production Readiness Audit & Plan for Backupshala

After a thorough review of every page, edge function, database schema, RLS policy, and user flow, here is what needs to be fixed, added, or improved to make the app production-ready.

---

## Critical Bugs & Missing Features

### 1. Missing `check-and-issue-certificate` Edge Function
The ModulePlayer calls `supabase.functions.invoke('check-and-issue-certificate')` on course completion, but **this edge function does not exist**. Certificates will never be issued.

**Fix:** Create `supabase/functions/check-and-issue-certificate/index.ts` that:
- Verifies all modules are completed for the course
- Generates a unique certificate code (e.g., `BS-XXXXXX`)
- Inserts into the `certificates` table
- Marks the enrollment as `is_completed = true`

### 2. Missing Password Reset Page (`/reset-password`)
The Login page sends reset emails but redirects to `/login` instead of a dedicated `/reset-password` page. Users clicking the reset link get auto-logged in without ever setting a new password.

**Fix:** Create `src/pages/ResetPassword.tsx` with a new password form, register route in App.tsx, and update the `redirectTo` in Login.tsx.

### 3. Admin Dashboard Revenue Shows ₹0
The admin dashboard filters payments by `status === 'paid'` but the verify-razorpay-payment function sets status to `'success'`, not `'paid'`. Revenue will always show zero.

**Fix:** Update AdminDashboardHome to filter by `status === 'success'` instead of `'paid'`.

### 4. Payout Approval Doesn't Deduct Wallet Balance
When admin approves a payout request, the wallet balance is never deducted from the user's profile. Users could request unlimited payouts.

**Fix:** In AdminPayouts, after approving, deduct the payout amount from the user's `wallet_balance` in the profiles table.

---

## Security Improvements

### 5. Rate Limiting on Auth Forms
Login and Signup have no client-side rate limiting or captcha. Bots could brute-force passwords.

**Fix:** Add a simple cooldown (disable button for 30s after 3 failed attempts) on Login.

### 6. Input Validation on Payout Forms
UPI IDs and bank account numbers are accepted without format validation. Invalid data means failed payouts.

**Fix:** Add regex validation: UPI format `name@bank`, IFSC `^[A-Z]{4}0[A-Z0-9]{6}$`, account number 9-18 digits.

### 7. Enrollment INSERT Policy Missing
The `enrollments` table has no INSERT policy for authenticated users — inserts only work via the service role in the edge function. This is actually correct (server-side only), but we should verify the edge function handles all edge cases (duplicate enrollment check is already there).

---

## Admin Analytics Gaps

### 8. Admin Dashboard Missing Key Analytics
The admin panel lacks:
- Revenue trend (daily/weekly/monthly chart)
- Course-wise revenue breakdown
- Referral funnel (signups → enrollments → commissions)
- Date-range filters on payments/commissions tables
- Export to CSV on key tables

**Fix:** Add a date filter and summary cards to AdminPayments, and a simple revenue chart to AdminDashboardHome.

### 9. Admin Payments Table Missing Search/Filter
No way to search by student name, filter by date, or filter by status.

**Fix:** Add search input + status filter tabs (All / Pending / Success) to AdminPayments.

---

## UX Improvements

### 10. Explore Page Mobile Filters Broken
The sidebar filters show/hide but there's no overlay or close button on mobile. Filters push content down awkwardly.

**Fix:** Wrap mobile filters in a Sheet/Drawer component.

### 11. Course Detail Page Missing (`/courses/:id`)
Students clicking "Start" or "Continue" on their enrolled courses go to `/courses/:id` which renders `CourseDetail.tsx`. Need to verify this page properly lists modules and links to the player.

### 12. QueryClient Missing Error/Retry Config
The QueryClient has no default error handling, no retry config, and no stale time. This means:
- Excessive refetching on every mount
- Silent failures on network errors

**Fix:** Configure `QueryClient` with `staleTime: 5 * 60 * 1000`, `retry: 2`, and a global `onError` handler.

---

## Implementation Order (Priority)

| # | Task | Impact |
|---|------|--------|
| 1 | Create `check-and-issue-certificate` edge function | **Blocker** — certificates don't work |
| 2 | Fix revenue status filter (`'paid'` → `'success'`) | **Blocker** — admin sees ₹0 revenue |
| 3 | Create `/reset-password` page | **Blocker** — password reset broken |
| 4 | Deduct wallet on payout approval | **Blocker** — financial integrity |
| 5 | Add UPI/bank validation on payout forms | Security |
| 6 | Add auth rate limiting | Security |
| 7 | Configure QueryClient defaults | Stability |
| 8 | Add search/filters to AdminPayments | Analytics |
| 9 | Add revenue summary to AdminDashboardHome | Analytics |
| 10 | Fix mobile filters on Explore | UX |

---

## Technical Notes

- The certificate edge function needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (already available as secrets)
- The revenue bug is a one-line fix in `AdminDashboardHome.tsx` line 22: change `'paid'` to `'success'`
- Wallet deduction on payout approval requires an additional Supabase update call in `AdminPayouts.tsx` after the status update
- The reset password page needs to handle the `type=recovery` hash parameter from the email link

