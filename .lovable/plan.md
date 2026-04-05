

## Fix: R2 Signature Mismatch Error

### What's actually happening

The screenshot shows: **"The request signature we calculated does not match the signature you provided."** This is coming from the proxy edge function — meaning the request IS reaching R2 now (CORS is no longer the blocker), but **the R2 API credentials stored as secrets are wrong or stale**.

Important clarification: the `r2.dev` public URL is for **read-only public access** — it cannot be used for authenticated uploads. The S3 API endpoint (`r2.cloudflarestorage.com`) that we're currently using is correct for uploads. The issue is the credentials, not the endpoint.

### Root cause

The `R2_ACCESS_KEY_ID` and/or `R2_SECRET_ACCESS_KEY` secrets stored in your backend don't match what Cloudflare R2 expects. This happens when:
- The API token was regenerated in Cloudflare but not updated here
- The token was copied with extra whitespace or characters
- The token doesn't have write permission on the bucket

### What you need to do (no code changes needed)

1. Go to **Cloudflare Dashboard → R2 → Manage R2 API Tokens**
2. Either verify your existing token or **create a new API token** with:
   - **Permissions**: Object Read & Write
   - **Bucket scope**: Apply to your `backupshala` bucket (or all buckets)
3. Copy the **Access Key ID** and **Secret Access Key** exactly
4. Update the secrets in your backend:
   - `R2_ACCESS_KEY_ID` — the new Access Key ID
   - `R2_SECRET_ACCESS_KEY` — the new Secret Access Key
5. Also verify `R2_ACCOUNT_ID` matches your Cloudflare account ID (visible in the R2 dashboard URL: `dash.cloudflare.com/<account_id>/r2`)

### After updating credentials

No code changes are needed — the proxy edge function and frontend are already correctly wired. Once the credentials match, the upload should complete successfully.

### Technical details

- The proxy flow (`VideoUploadModal → r2-proxy-upload edge function → R2 PutObject`) is working correctly
- The edge function successfully authenticates the user, finds the asset, and attempts the R2 upload
- R2 rejects it at the S3 signing step because the stored credentials don't match
- The `r2.cloudflarestorage.com` S3 endpoint is the correct one for authenticated uploads — `r2.dev` is public-read only

