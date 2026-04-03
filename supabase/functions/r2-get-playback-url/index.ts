import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.18";

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

    // Find video
    let query = supabase.from("video_assets").select("*");
    if (asset_id) query = query.eq("id", asset_id);
    else query = query.eq("bsv_code", bsv_code);
    const { data: video } = await query.single();
    if (!video) throw new Error("Video not found");
    if (video.status !== "ready" || !video.is_active) throw new Error("Video not available");

    // Access control
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    if (!is_public_watch) {
      if (!userId) throw new Error("Authentication required");
      
      // Check admin
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userId).single();
      const isAdmin = profile?.is_admin === true;

      if (!isAdmin) {
        if (module_id && course_id) {
          const { data: enrollment } = await supabase.from("enrollments")
            .select("id").eq("student_id", userId).eq("course_id", course_id).maybeSingle();
          if (!enrollment) {
            // Check if creator owns the course
            const { data: course } = await supabase.from("courses")
              .select("creator_id").eq("id", course_id).single();
            if (!course || course.creator_id !== userId) throw new Error("Access denied");
          }
        } else if (video.uploaded_by !== userId) {
          throw new Error("Access denied");
        }
      }
    }

    // Generate presigned GET URL
    const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
    const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "backupshala";
    const R2_PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL") || "";

    const r2 = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      region: "auto",
      service: "s3",
    });

    const expiry = 14400; // 4 hours
    const r2Url = new URL(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${video.r2_object_key}`);
    r2Url.searchParams.set("X-Amz-Expires", String(expiry));

    const signed = await r2.sign(new Request(r2Url.toString(), { method: "GET" }), {
      aws: { signQuery: true },
    });

    // Increment views
    await supabase.from("video_assets")
      .update({ total_views: (video.total_views || 0) + 1 })
      .eq("id", video.id);

    const thumbnailUrl = video.thumbnail_key && R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${video.thumbnail_key}` : null;

    const expiresAt = new Date(Date.now() + expiry * 1000).toISOString();

    return new Response(JSON.stringify({
      playback_url: signed.url,
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
