
Goal: remove the false R2 CORS error on the published site and make production use the same working proxy upload flow as preview.

Do I know what the issue is?
- Yes.

What the problem actually is
- Adding `https://backupshala.lovable.app` to the R2 CORS list is only needed if the browser uploads directly to R2 with `PUT`.
- Your current code no longer does that.
- In `src/components/video/VideoUploadModal.tsx`, the browser now uploads to the backend function `r2-proxy-upload` with `POST`, not to R2 directly.
- I also searched the codebase and the exact toast text in your screenshot does not exist in the current source anymore.
- That means the published site is still serving an older frontend bundle that contains the old direct-to-R2 upload logic/message.

What to do
1. Re-publish the frontend
- Open the Publish dialog and click Update so `backupshala.lovable.app` gets the latest frontend bundle.
- Backend functions already deploy automatically; frontend changes do not.

2. Test production again
- After publish, upload from `https://backupshala.lovable.app`.
- Expected behavior: request should go to the backend upload proxy, not directly to R2, so browser R2 CORS should no longer matter for the main video file.

3. Optional safety update to R2 CORS
- If you want a safer CORS config anyway, add the published domain too:
```json
[
  {
    "AllowedOrigins": [
      "https://ca791d54-8375-4712-8ff2-bec4800191ca.lovableproject.com",
      "https://id-preview--ca791d54-8375-4712-8ff2-bec4800191ca.lovable.app",
      "https://backupshala.lovable.app"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
- This will not hurt, but it is not the real fix for the current published error if production is still on old code.

Expected result
- Preview and published site will both use the same upload flow.
- The misleading “Origin must be allowed in R2 CORS policy with PUT method” toast should disappear on production.

Files involved
- `src/components/video/VideoUploadModal.tsx`
- `supabase/functions/r2-proxy-upload/index.ts`

Technical details
```text
Old production flow:
browser -> direct R2 PUT
needs R2 bucket CORS for each site origin

Current code flow:
browser -> backend function POST /r2-proxy-upload
backend -> R2 PUT server-side

So:
- direct R2 CORS matters for old bundle
- frontend republish is the main fix
- adding backupshala.lovable.app to CORS is optional defense, not the root fix
```
