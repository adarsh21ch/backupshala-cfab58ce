# Cloudflare R2 — CORS policy for Backupshala

The video upload UI uploads files **directly from the creator's browser** to the
R2 bucket using a presigned URL. R2 must allow that cross-origin PUT request,
otherwise the browser blocks it and the user sees:

> Network error during upload. Check your connection.

## One-time setup

1. Open the Cloudflare dashboard → **R2** → bucket `backupshala`.
2. Go to **Settings** → scroll to **CORS Policy** → **Add CORS policy**.
3. Paste the JSON below and save.

```json
[
  {
    "AllowedOrigins": [
      "https://backupshala.com",
      "https://www.backupshala.com",
      "https://backupshala.lovable.app",
      "https://id-preview--ca791d54-8375-4712-8ff2-bec4800191ca.lovable.app",
      "http://localhost:5173",
      "http://localhost:8080"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

If you ever publish on a new domain, add it to `AllowedOrigins` and save again.

## Verifying it works

1. Sign in as a creator → open any course → **Build Course** → pick a chapter.
2. Click **Upload Video**, choose a small MP4.
3. The progress bar should go 0 → 100% with no error toast.

## Fallback (already shipped in code)

If CORS is not configured (or the bucket policy was overwritten), uploads
**under 40MB** automatically fall back to a server-side proxy
(`creator-proxy-upload` edge function). Files over 40MB still require the
CORS policy above — edge functions cannot stream half-a-gig uploads.

## Public read access (playback)

For students to play uploaded videos, the bucket also needs public read on
the `creator-videos/` and `course-videos/` prefixes. This is handled by the
R2 public URL setting + the `R2_PUBLIC_URL` env var on the edge functions —
no CORS rule needed for playback (HTML5 `<video>` is not a CORS request
unless `crossorigin` is set).
