// Server-side fallback upload: streams file body straight to R2 from the
// edge function. Use when the browser PUT to R2 is blocked by CORS or
// flaky networks. Hard-capped to ~40MB to stay within edge limits — for
// large files configure CORS on R2 and use the presigned URL flow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.525.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-object-key, x-content-type",
};

const MAX_PROXY_BYTES = 40 * 1024 * 1024; // 40MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) throw new Error("Unauthorized");

    const objectKey = req.headers.get("x-object-key");
    const contentType = req.headers.get("x-content-type") || "video/mp4";
    if (!objectKey) throw new Error("Missing x-object-key header");
    // Lock proxy uploads to the user's own creator-videos namespace
    if (!objectKey.startsWith(`creator-videos/${user.id}/`)) {
      throw new Error("Object key does not belong to you");
    }

    const body = await req.arrayBuffer();
    if (!body || body.byteLength === 0) throw new Error("Empty body");
    if (body.byteLength > MAX_PROXY_BYTES) {
      throw new Error(
        `File too large for proxy upload (${Math.round(body.byteLength / 1024 / 1024)}MB > 40MB). ` +
        `Configure CORS on the R2 bucket so the browser can upload directly.`
      );
    }

    const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID");
    const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID");
    const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "backupshala";
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error("R2 credentials not configured");
    }

    const r2 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      Body: new Uint8Array(body),
      ContentType: contentType,
    }));

    return new Response(JSON.stringify({ success: true, objectKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[creator-proxy-upload]", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
