## Two separate issues to fix

### Issue 1 — Signup blocked by "Password is known to be weak"

Your frontend already only requires 8+ characters. The error in the red toast is added by the **backend auth layer**, which has *leaked-password protection (HIBP)* enabled. This feature checks every password against known breach databases and blocks common ones — regardless of length.

**Fix:** Turn off leaked-password protection in the backend auth config so the only rule is the 8-character minimum (as you requested). No code change needed.

> Note: This lowers account security slightly (users can pick breached passwords). That is the intended behavior per your request to keep "only minimum 8 characters."

### Issue 2 — Enroll fails with "Edge Function returned a non-2xx status code"

The payment order function calls Razorpay and Razorpay responds with `Authentication failed`. Both secrets are present in the backend, so this is a **credential mismatch**, not missing keys. The most common causes:

- The `RAZORPAY_KEY_SECRET` was updated for the new business account, but `RAZORPAY_KEY_ID` still belongs to the **old** account (or vice versa).
- A test Key ID (`rzp_test_…`) is paired with a live secret, or vice versa.
- Stray whitespace / newline accidentally saved into one of the values.

**Fix:** Re-enter **both** `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` together, copied from the **same** account/mode (live) in the Razorpay dashboard, with no surrounding spaces. After updating, I'll trigger a test order against the live Razorpay API to confirm the credentials authenticate (the function logs will show success instead of "Authentication failed").

## Steps

1. Disable leaked-password protection in backend auth config.
2. Open the secure secret form for `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` so you can paste the matching pair from the new account.
3. Verify the payment function authenticates with Razorpay (test order + log check).
4. Confirm signup works with a simple 8-char password and that "Enroll Now" creates an order.

## What I need from you

- Confirm I should disable leaked-password protection (keeps only the 8-char rule).
- Have your new Razorpay **Key ID** and **Key Secret** ready to paste (both from live mode, same account).
