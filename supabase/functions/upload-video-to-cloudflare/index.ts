import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

function generateBsvLink(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'bsv_';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) throw new Error("Admin access required");

    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      throw new Error("Cloudflare credentials not configured");
    }

    const contentType = req.headers.get("content-type") || "";

    let title: string, description: string, category: string, tags: string[], language: string, videoBlob: Blob;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = formData.get("title") as string;
      description = (formData.get("description") as string) || "";
      category = (formData.get("category") as string) || "";
      tags = JSON.parse((formData.get("tags") as string) || "[]");
      language = (formData.get("language") as string) || "English";
      videoBlob = formData.get("file") as Blob;
      if (!videoBlob) throw new Error("No video file provided");
    } else {
      throw new Error("Content-Type must be multipart/form-data");
    }

    if (!title) throw new Error("Title is required");

    // Upload to Cloudflare Stream using TUS or direct upload
    // Using direct upload creator approach
    const createUploadRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds: 21600, // 6 hours max
          meta: { name: title },
        }),
      }
    );

    const createUploadData = await createUploadRes.json();
    if (!createUploadData.success) {
      throw new Error("Failed to create Cloudflare upload URL: " + JSON.stringify(createUploadData.errors));
    }

    const uploadUrl = createUploadData.result.uploadURL;
    const streamUid = createUploadData.result.uid;

    // Upload the video file
    const uploadForm = new FormData();
    uploadForm.append("file", videoBlob);

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload video to Cloudflare Stream");
    }

    // Generate unique backupshala_video_link
    let bsvLink = generateBsvLink();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("videos")
        .select("id")
        .eq("backupshala_video_link", bsvLink)
        .maybeSingle();
      if (!existing) break;
      bsvLink = generateBsvLink();
      attempts++;
    }

    const customerSubdomain = Deno.env.get("CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN") || "";
    const playbackUrl = customerSubdomain
      ? `https://${customerSubdomain}/${streamUid}/manifest/video.m3u8`
      : `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${streamUid}/manifest/video.m3u8`;
    const thumbnailUrl = customerSubdomain
      ? `https://${customerSubdomain}/${streamUid}/thumbnails/thumbnail.jpg`
      : `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${streamUid}/thumbnails/thumbnail.jpg`;

    // Insert into videos table
    const { data: video, error: insertError } = await supabase
      .from("videos")
      .insert({
        title,
        description,
        category,
        tags,
        language,
        cloudflare_stream_id: streamUid,
        cloudflare_playback_url: playbackUrl,
        cloudflare_thumbnail_url: thumbnailUrl,
        backupshala_video_link: bsvLink,
        uploaded_by: user.id,
        file_size_mb: Math.round((videoBlob.size / (1024 * 1024)) * 100) / 100,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      success: true,
      video_id: video.id,
      backupshala_video_link: bsvLink,
      cloudflare_stream_id: streamUid,
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
