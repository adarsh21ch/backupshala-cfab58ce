# Certificate System — Production Plan

## How students get the certificate

1. **Trigger** — already in place. The instant a student completes the last module, `check-and-issue-certificate` fires and creates the row in the `certificates` table with a unique code (e.g. `BS-A7K3M9`).
2. **Auto email** — new. The same edge function will then enqueue a transactional email ("🎓 Your Backupshala Certificate is ready") with the student's name, course title, certificate code, a **Download PDF** button (links back to dashboard), and a **Verify** link.
3. **Dashboard** — `/dashboard/certificates` keeps the list. Each card gets two buttons: **Download PDF** and **Share on WhatsApp** (PNG preview removed).
4. **Verification** — `/verify/{code}` page already works publicly.

## What's printed on the certificate

Universal template, identical for every course:

```text
┌─────────────────────────────────────────────────┐
│            [Backupshala logo, top center]        │
│                                                  │
│           Certificate of Completion              │
│           ───── gradient divider ─────           │
│                                                  │
│              This is to certify that             │
│                                                  │
│              {Student Full Name}                 │   ← from profiles
│                                                  │
│            has successfully completed            │   ← admin-editable line
│                                                  │
│                {Course Title}                    │   ← from courses
│                                                  │
│        offered by {Creator Name} on Backupshala  │
│                                                  │
│   {Issue Date}              {Certificate Code}   │
│                                                  │
│   ─────────────          ─────────────           │
│   {Creator Name}         [Admin sig image]       │
│      Creator              Backupshala            │
│                                                  │
│         Verify at backupshala.com/verify/...     │
└─────────────────────────────────────────────────┘
```

Data sources are automatic — creators and students never fill anything in. No per-course customization for now (matches your "keep it simple" preference).

## Admin controls (Settings → new "Certificate" tab)

A small, focused section, sitting alongside Creator Pro / Referral Commission etc.:

- **Platform signature image** — upload PNG/JPG (stored in `course-resources` bucket, key saved in `platform_settings`). Shown on every certificate.
- **Body line** — editable text input. Default: `"has successfully completed"`. Stored in `platform_settings` so you can tweak wording later without a deploy.
- **Email subject** — editable. Default: `"🎓 Your Backupshala Certificate is ready"`.
- **Live preview** — small thumbnail rendering with sample data so admin sees what the cert looks like before saving.

Nothing for creators to configure — keeps the creator UX clean.

## Technical details

- **PDF library**: `jspdf` + `jspdf-autotable` (lightweight, browser-side, no server roundtrip). Replaces `html2canvas` PNG approach.
- **Logo**: bundled as imported asset (`src/assets/certificate-logo.png`) — already-existing Backupshala wordmark, no extra upload.
- **Signature storage**: 3 new keys in `platform_settings`:
  - `certificate_signature_url`
  - `certificate_body_line`
  - `certificate_email_subject`
- **Email**: requires Lovable Emails infrastructure. If your email domain isn't set up yet, I'll prompt that first; otherwise I scaffold a transactional email function `send-certificate-email` and call it from `check-and-issue-certificate` after the cert row is inserted.
- **Edge function update**: `check-and-issue-certificate` gets a final step — invoke `send-certificate-email` (fire-and-forget, won't block cert issuance if email fails).
- **Files touched**:
  - `src/pages/Certificate.tsx` — swap PNG download for PDF generator
  - `src/lib/certificatePdf.ts` (new) — single function `generateCertificatePdf({...})`
  - `src/pages/admin/AdminSettings.tsx` — new Certificate section
  - `supabase/functions/check-and-issue-certificate/index.ts` — add email trigger
  - `supabase/functions/send-certificate-email/index.ts` (new, scaffolded by transactional email tool)
  - 1 small migration to seed the 3 new `platform_settings` keys

## Out of scope (can add later if you want)

- Per-creator or per-course custom signatures
- QR code on cert face
- Course duration line
- Multi-language certificate text

Ready to build this when you approve.
