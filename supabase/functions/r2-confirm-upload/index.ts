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

    const { asset_id, duration_seconds, thumbnail_base64 } = await req.json();
    if (!asset_id) throw new Error("asset_id required");
    if (!duration_seconds || duration_seconds <= 0) throw new Error("Valid duration_seconds required");

    const { data: asset } = await supabase.from("video_assets")
      .select("*").eq("id", asset_id).single();
    if (!asset) throw new Error("Asset not found");
    if (asset.uploaded_by !== user.id) throw new Error("Not your asset");
    if (asset.status !== "processing") throw new Error("Asset already confirmed");

    let thumbnailKey: string | null = null;
    const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
    const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "backupshala";
    const R2_PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL") || "";

    if (thumbnail_base64) {
      const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID")!;
      const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
      const r2 = new AwsClient({
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
        region: "auto",
        service: "s3",
      });

      thumbnailKey = `thumbnails/${asset_id}/thumb.jpg`;
      const raw = atob(thumbnail_base64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

      const thumbUrl = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${thumbnailKey}`;
      await r2.fetch(thumbUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: bytes,
      });
    }

    await supabase.from("video_assets").update({
      status: "ready",
      duration_seconds: Math.floor(duration_seconds),
      thumbnail_key: thumbnailKey,
      updated_at: new Date().toISOString(),
    }).eq("id", asset_id);

    // Notify all creators
    const { data: creators } = await supabase.from("profiles").select("id").eq("is_creator", true).eq("creator_approved", true);
    if (creators?.length) {
      const notifications = creators.map((c: any) => ({
        user_id: c.id,
        title: "New video available in library! 🎬",
        message: `'${asset.title}' has been added to the video library. Use it in your courses.`,
        type: "video_library",
        action_url: "/creator/videos",
      }));
      await supabase.from("notifications").insert(notifications);
    }

    const thumbnailUrl = thumbnailKey && R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${thumbnailKey}` : null;

    return new Response(JSON.stringify({
      success: true,
      asset_id,
      bsv_code: asset.bsv_code,
      title: asset.title,
      duration_seconds: Math.floor(duration_seconds),
      thumbnail_url: thumbnailUrl,
      watch_url: `/watch/${asset.bsv_code}`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
