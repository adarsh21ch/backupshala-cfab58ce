
Goal: get the direct R2 upload past 15% and confirm why it is failing.

What I found
- You do not need to create any file or folder in the bucket manually. A successful signed `PUT` creates the object automatically; `videos/...` is just a virtual path.
- The bucket being empty means the upload never completes, not that setup is missing.
- The current signed URL is already much cleaner now:
  - `X-Amz-SignedHeaders=host`
  - no checksum query params in the latest log
- So the earlier checksum issue is likely no longer the main blocker.
- The frontend is still failing via `xhr.onerror` in `src/components/video/VideoUploadModal.tsx`, which usually means the browser is blocked before it can read a normal HTTP response. That points most strongly to R2 CORS/preflight, not a missing object in the bucket.
- Important detail: the real browser origin in the logs is:
  `https://ca791d54-8375-4712-8ff2-bec4800191ca.lovableproject.com`
  If bucket CORS was added only for the `id-preview--...lovable.app` URL, upload will still fail.

Plan
1. Verify/fix the bucket CORS to match the real app origin
- Use exact origins, not guesses:
```text
AllowedOrigins:
- https://ca791d54-8375-4712-8ff2-bec4800191ca.lovableproject.com
- https://id-preview--ca791d54-8375-4712-8ff2-bec4800191ca.lovable.app
AllowedMethods:
- PUT
- GET
- HEAD
AllowedHeaders:
- *
ExposeHeaders:
- ETag
MaxAgeSeconds:
- 3600
```
- This is the most likely non-code issue remaining.

2. Refine the upload client error handling
- Update `src/components/video/VideoUploadModal.tsx` so the error message clearly separates:
  - CORS/preflight blocked
  - HTTP 403/401 from R2
  - other network failures
- This avoids the current generic “check console” dead end.

3. Keep the browser request as minimal as possible
- Re-check the upload request in `VideoUploadModal.tsx` so it only sends what the signed URL actually needs.
- Avoid any extra headers unless they are intentionally signed.

4. Re-check `r2-get-upload-url` endpoint assumptions
- Keep the current account endpoint style because it matches the signed URL already being returned.
- No bucket file/folder creation is needed.
- Only change this if exact-origin CORS is confirmed correct and the PUT still fails.

Expected result
- Upload should move past 15%, create the object directly in the bucket, then continue to `r2-confirm-upload`.
- After that, the bucket will finally show the uploaded object and the app should reach the success step.

Technical notes
- Relevant files:
  - `src/components/video/VideoUploadModal.tsx`
  - `supabase/functions/r2-get-upload-url/index.ts`
- Strongest current diagnosis:
  - signed URL generation is now mostly fixed
  - remaining failure is most likely browser-to-R2 CORS for the exact preview origin
