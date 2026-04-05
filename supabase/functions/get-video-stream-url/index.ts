import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { video_id, module_id, course_id, is_public } = await req.json();

    // For public watch page, no enrollment check needed
    if (!is_public) {
      if (!video_id || !module_id || !course_id) {
        throw new Error("video_id, module_id, and course_id are required");
      }

      // Verify enrollment
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", user.id)
        .eq("course_id", course_id)
        .maybeSingle();

      // Also allow creator and admin
      if (!enrollment) {
        const { data: course } = await supabase
          .from("courses")
          .select("creator_id")
          .eq("id", course_id)
          .single();

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (course?.creator_id !== user.id && !profile?.is_admin) {
          throw new Error("Not enrolled in this course");
        }
      }
    }

    // Get video
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", video_id)
      .single();

    if (videoError || !video) throw new Error("Video not found");

    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");

    let signedUrl = video.cloudflare_playback_url;

    // Try to generate signed URL if credentials available
    if (CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN) {
      try {
        const tokenRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${video.cloudflare_stream_id}/token`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              exp: Math.floor(Date.now() / 1000) + (4 * 3600), // 4 hours
              accessRules: [{ type: "any", action: "allow" }],
            }),
          }
        );

        const tokenData = await tokenRes.json();
        if (tokenData.success && tokenData.result?.token) {
          const customerSubdomain = Deno.env.get("CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN") || "";
          const base = customerSubdomain
            ? `https://${customerSubdomain}`
            : `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com`;
          signedUrl = `${base}/${tokenData.result.token}/manifest/video.m3u8`;
        }
      } catch {
        // Fall back to unsigned URL
      }
    }

    return new Response(JSON.stringify({
      signed_url: signedUrl,
      thumbnail_url: video.cloudflare_thumbnail_url || video.thumbnail_url,
      duration_seconds: video.duration_seconds,
      title: video.title,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
