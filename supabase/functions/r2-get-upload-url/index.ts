import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.18";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const body = await req.json();
    const { filename, content_type, file_size_bytes, title, description, category, tags, language } = body;

    const validTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
    if (!validTypes.includes(content_type)) throw new Error("Invalid file type. Accepted: MP4, WebM, MOV, AVI, MKV");
    if (!file_size_bytes || file_size_bytes <= 0 || file_size_bytes > 2_147_483_648) throw new Error("File size must be between 1 byte and 2GB");
    if (!title?.trim() || title.length > 200) throw new Error("Title required (max 200 chars)");

    const sanitized = (filename || "video.mp4").toLowerCase().replace(/[^a-z0-9.\-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const objectKey = `videos/${user.id}/${Date.now()}-${sanitized}`;

    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let bsvCode = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = "";
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
      bsvCode = `bsv_${code}`;
      const { data: existing } = await supabase.from("video_assets").select("id").eq("bsv_code", bsvCode).maybeSingle();
      if (!existing) break;
      if (attempt === 9) throw new Error("Failed to generate unique BSV code");
    }

    const { data: asset, error: insertErr } = await supabase.from("video_assets").insert({
      r2_object_key: objectKey,
      bsv_code: bsvCode,
      title: title.trim(),
      description: description || "",
      category: category || "General",
      tags: tags || [],
      language: language || "English",
      file_size_bytes: Number(file_size_bytes),
      mime_type: content_type,
      status: "processing",
      uploaded_by: user.id,
    }).select().single();
    if (insertErr) throw insertErr;

    const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID");
    const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID");
    const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "backupshala";

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error("R2 credentials not configured");
    }

    const r2 = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      region: "auto",
      service: "s3",
    });

    const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${objectKey}`;
    const r2Url = new URL(r2Endpoint);
    r2Url.searchParams.set("X-Amz-Expires", "3600");

    const signed = await r2.sign(new Request(r2Url.toString(), {
      method: "PUT",
    }), { aws: { signQuery: true } });

    return new Response(JSON.stringify({
      upload_url: signed.url,
      object_key: objectKey,
      asset_id: asset.id,
      bsv_code: bsvCode,
      expires_in: 3600,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
