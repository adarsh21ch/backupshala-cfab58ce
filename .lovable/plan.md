
Goal: fix the direct video upload to R2, because the app is successfully generating a signed upload URL but the browser PUT to R2 is still failing before confirmation.

What I found
- The admin/auth issue is no longer the blocker. `r2-get-upload-url` now returns 200 and gives a signed URL.
- The failure happens in `src/components/video/VideoUploadModal.tsx` during the direct `PUT` to R2.
- The returned signed URL currently contains these query params:
  - `x-amz-sdk-checksum-algorithm=CRC32`
  - `x-amz-checksum-crc32=...`
- That points to the AWS SDK v3 flexible-checksum behavior, which is a known compatibility problem with R2/presigned browser uploads in some setups.
- The current toast message is generic, so it hides whether the real issue is:
  1. checksum/signing mismatch,
  2. bucket CORS preflight mismatch,
  3. wrong endpoint style.

Why upload is failing
- The upload is failing after the signed URL is created because the signed URL itself is likely wrong for this browser upload flow.
- Specifically, `supabase/functions/r2-get-upload-url/index.ts` signs `PutObjectCommand(...)`, and the generated URL includes checksum-related query params.
- Browser uploads are very sensitive to signed header/query “contract drift”. If R2/browser/CORS does not match that exact contract, the upload dies with the generic error you are seeing.
- Your screenshot message “Upload to R2 failed. This is usually a signed URL or bucket CORS issue.” matches exactly where the XHR fails.

Files to fix
- `supabase/functions/r2-get-upload-url/index.ts`
- `src/components/video/VideoUploadModal.tsx`
- Possibly `supabase/functions/r2-get-playback-url/index.ts` too, so read/download signing stays consistent.

Implementation plan
1. Replace the upload signing approach in `r2-get-upload-url`
- Stop generating presigned upload URLs with the current `PutObjectCommand` setup that injects checksum query params.
- Generate a simpler R2-compatible presigned PUT URL without checksum requirements.
- Keep the same auth + admin checks + DB insert flow.

2. Make the browser upload request match the signed contract exactly
- In `VideoUploadModal.tsx`, keep the upload method as `PUT`.
- Only send headers that are truly required by the final signed URL.
- If the new signed URL is created without `Content-Type` signing, do not manually set it in XHR.
- If `Content-Type` remains signed, ensure the exact same value is sent.

3. Improve client-side error reporting
- Capture and surface:
  - `xhr.status`
  - response body text
  - likely failure category (CORS vs signature vs forbidden)
- This prevents future “15% then failed” dead ends.

4. Verify bucket CORS assumptions in code behavior
- Since you already added bucket CORS, I will make the app compatible with a strict CORS setup by avoiding unnecessary signed headers/checksum expectations.
- Recommended stable bucket rule for this flow:
```text
AllowedOrigins: [preview origin, published origin]
AllowedMethods: [PUT, GET, HEAD]
AllowedHeaders: [Content-Type, *]
```
- If needed, I’ll align the upload flow to require fewer headers so the bucket policy can stay simpler.

5. Keep post-upload confirmation unchanged
- `r2-confirm-upload` runs after the file is stored, and is not the current blocker.
- I would leave that flow intact unless testing shows the upload succeeds but confirmation fails.

Most likely root cause
- The strongest signal is the checksum-enriched presigned URL:
```text
X-Amz-SignedHeaders=host
x-amz-sdk-checksum-algorithm=CRC32
x-amz-checksum-crc32=...
```
- That is the most probable reason the browser PUT is rejected by R2 in this setup, even after CORS was added.

Expected result after fix
- Upload should move past 15%, complete the direct PUT, then call `r2-confirm-upload`, and finally show the BSV code / success step.

Technical notes
- The auth role check is already using `has_role(...)` and is not the current issue.
- The frontend is currently failing inside:
```text
xhr.open('PUT', upload_url)
xhr.setRequestHeader('Content-Type', signedContentType || file.type || 'video/mp4')
xhr.send(file)
```
- The edge function currently signs with:
```text
new PutObjectCommand({
  Bucket,
  Key,
  ContentType: content_type,
})
```
- That is the part I would change first, because the network snapshot proves the URL creation succeeds and the browser upload is where the failure occurs.
