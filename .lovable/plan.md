

## Fix: R2 Upload CORS Bypass

### Problem
Your R2 CORS policy has the correct origins, methods, and headers — but the browser PUT is still blocked. This could be:
- R2 CORS propagation delay (can take minutes)
- Browser caching an old failed preflight response
- R2 quirk with `Content-Type` header on presigned PUT URLs

### Plan

**1. Remove Content-Type header from the XHR request**
- File: `src/components/video/VideoUploadModal.tsx`
- Currently line 138 sends `Content-Type` header, which forces a CORS preflight
- Also remove `ContentType` from the `PutObjectCommand` in the edge function so it's not part of the signed contract either
- Without custom headers, the browser still sends a preflight for PUT, but R2 is more lenient when no extra headers are in the signature

**2. Sign the URL without ContentType in the edge function**
- File: `supabase/functions/r2-get-upload-url/index.ts`
- Remove `ContentType: content_type` from `PutObjectCommand` — this keeps the signed URL simpler and avoids any mismatch
- R2 will accept the file regardless since content type isn't enforced on PUT

**3. Add a console log of the exact upload URL (temporary debug)**
- Log `upload_url` to console so we can inspect what's actually being sent to R2
- This helps confirm the signed URL format is clean

**4. User action: clear browser cache or try incognito**
- Old failed preflight responses are cached by the browser (up to MaxAgeSeconds)
- Opening an incognito window bypasses this cache entirely

### Technical details
- The `PutObjectCommand` currently signs with `ContentType`, but `X-Amz-SignedHeaders=host` means it's NOT actually in the signature — so removing it from both sides is safe
- PUT requests always trigger CORS preflight, but removing the `Content-Type` header from XHR removes one potential mismatch point
- If this still fails after incognito test, the fallback would be proxying through an edge function (but with file size limits)

### Files changed
- `supabase/functions/r2-get-upload-url/index.ts` — remove ContentType from PutObjectCommand
- `src/components/video/VideoUploadModal.tsx` — remove Content-Type header from XHR, add debug log

