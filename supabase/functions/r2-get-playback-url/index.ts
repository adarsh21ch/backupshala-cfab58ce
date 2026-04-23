import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { S3Client, GetObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json();
    const { asset_id, bsv_code, module_id, course_id, is_public_watch } = body;
    if (!asset_id && !bsv_code) throw new Error("Provide asset_id or bsv_code");

    let query = supabase.from("video_assets").select("*");
    if (asset_id) query = query.eq("id", asset_id);
    else query = query.eq("bsv_code", bsv_code);
    const { data: video } = await query.single();
    if (!video) throw new Error("Video not found");
    if (video.status !== "ready" || !video.is_active) throw new Error("Video not available");

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    // Server-side decision: a request is "public watch" only if it has NO module/course context
    // (i.e. it's a standalone Backupshala video on the /watch/:bsv page). The client cannot opt
    // itself into public mode for course content by sending is_public_watch=true.
    const isStandaloneWatch = !module_id && !course_id;
    const allowPublic = is_public_watch && isStandaloneWatch;

    if (!allowPublic) {
      if (!userId) throw new Error("Authentication required");

      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });

      if (!isAdmin) {
        if (module_id && course_id) {
          const { data: enrollment } = await supabase.from("enrollments")
            .select("id").eq("student_id", userId).eq("course_id", course_id).maybeSingle();
          if (!enrollment) {
            const { data: course } = await supabase.from("courses")
              .select("creator_id").eq("id", course_id).single();
            if (!course || course.creator_id !== userId) throw new Error("Access denied");
          }
        } else if (video.uploaded_by !== userId) {
          throw new Error("Access denied");
        }
      }
    }

    const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
    const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "backupshala";
    const R2_PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL") || "";
    const expiry = 14400;

    const r2 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

    const playbackUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: video.r2_object_key,
      }),
      { expiresIn: expiry },
    );

    await supabase.from("video_assets")
      .update({ total_views: (video.total_views || 0) + 1 })
      .eq("id", video.id);

    const thumbnailUrl = video.thumbnail_key && R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${video.thumbnail_key}` : null;

    const expiresAt = new Date(Date.now() + expiry * 1000).toISOString();

    return new Response(JSON.stringify({
      playback_url: playbackUrl,
      thumbnail_url: thumbnailUrl,
      title: video.title,
      description: video.description,
      duration_seconds: video.duration_seconds,
      category: video.category,
      bsv_code: video.bsv_code,
      watch_url: `/watch/${video.bsv_code}`,
      expires_at: expiresAt,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message?.includes("denied") ? 403 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
