
Goal: make the proxy upload actually reach the backend function and stop failing with the generic “Network error during upload” message.

Do I know what the issue is?
- Yes. The main problem is now the browser-to-backend-function request, not the bucket.

What the actual issue is
- You do not need to create any file or folder in the bucket manually.
- The upload is no longer failing because of R2 bucket setup.
- The current client sends the proxy upload as a `PUT` request to `functions/v1/r2-proxy-upload` with a custom header: `x-asset-id`.
- In `supabase/functions/r2-proxy-upload/index.ts`, the CORS response only includes:
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Headers`
- It does not include `Access-Control-Allow-Methods`.
- That makes the browser preflight for `PUT` brittle, and the custom `x-asset-id` header makes it even more likely to be blocked before the function code runs.
- This matches the exact symptom: the browser shows a generic XHR network error, and the request never gets far enough to produce a useful server response.

Implementation plan
1. Change the proxy request shape
- Update `src/components/video/VideoUploadModal.tsx` to send the proxy upload as `POST`, not `PUT`.
- Remove the custom `x-asset-id` header completely.
- Pass `asset_id` in the query string or request body instead.

2. Fix edge-function CORS properly
- Update `supabase/functions/r2-proxy-upload/index.ts` to return complete CORS headers for browser uploads.
- Add:
```text
Access-Control-Allow-Methods: POST, OPTIONS
```
- Keep `Access-Control-Allow-Headers`, but make it match only the headers the browser truly sends.

3. Reduce custom headers to the minimum
- Keep only standard headers needed for auth:
  - `Authorization`
  - `apikey`
  - `Content-Type` only if needed
- Avoid any extra custom header names, especially `x-asset-id`.

4. Keep the server-side R2 upload logic
- The current server-side `PutObjectCommand` approach can stay.
- Once the request reaches the function correctly, it should upload the file to R2 without browser CORS problems.

5. Improve diagnostics
- In `VideoUploadModal.tsx`, show clearer errors for:
  - preflight/CORS block
  - backend function returned error
  - R2 SDK/server-side upload failure
- In `r2-proxy-upload`, return explicit JSON errors for missing `asset_id`, auth issues, missing R2 secrets, and upload failures.

6. Important follow-up for large files
- The proxy approach is okay as a short-term fix for the current error.
- But for very large videos, sending the full binary through a backend function is not the best long-term design.
- After the immediate fix works, the next upgrade should be multipart/resumable direct object uploads for reliable 2GB-scale uploads.

Expected result
- The browser should successfully call `r2-proxy-upload`.
- The function should receive the file and upload it to R2.
- `r2-confirm-upload` should then run normally.
- The generic “Network error during upload” toast should disappear for normal-sized uploads.

Files to update
- `src/components/video/VideoUploadModal.tsx`
- `supabase/functions/r2-proxy-upload/index.ts`

Technical details
```text
Current fragile flow:
browser -- PUT + x-asset-id header --> edge function
          preflight likely blocked

Safer flow:
browser -- POST + standard auth headers only --> edge function?asset_id=...
edge function --> R2 upload server-side
edge function --> success JSON
browser --> r2-confirm-upload
```

Most likely root cause
- Missing `Access-Control-Allow-Methods`
- plus the custom `x-asset-id` header causing the preflight to fail before the function code runs
