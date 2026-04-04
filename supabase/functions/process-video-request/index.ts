import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const { request_id, action, video_asset_id, admin_note } = await req.json();
    if (!request_id || !action) throw new Error("request_id and action required");

    const { data: request } = await supabase.from("video_requests").select("*").eq("id", request_id).single();
    if (!request) throw new Error("Request not found");

    const now = new Date().toISOString();

    if (action === "start_processing") {
      await supabase.from("video_requests").update({
        status: "processing", reviewed_at: now, admin_note: admin_note || request.admin_note,
      }).eq("id", request_id);
      await supabase.from("notifications").insert({
        user_id: request.requested_by,
        title: "Your video request is being processed 🎬",
        message: `'${request.video_title}' is now being processed.`,
        type: "video_request", action_url: "/creator/videos",
      });
    } else if (action === "complete") {
      if (!video_asset_id) throw new Error("video_asset_id required");
      const { data: video } = await supabase.from("video_assets").select("*").eq("id", video_asset_id).single();
      if (!video || video.status !== "ready") throw new Error("Video asset must exist and be ready");

      await supabase.from("video_requests").update({
        status: "completed", video_asset_id, completed_at: now,
        reviewed_at: request.reviewed_at || now, admin_note: admin_note || request.admin_note,
      }).eq("id", request_id);
      await supabase.from("notifications").insert({
        user_id: request.requested_by,
        title: "✅ Your video request is ready!",
        message: `'${request.video_title}' is now in the Video Gallery.`,
        type: "video_request", action_url: "/creator/videos",
      });
    } else if (action === "reject") {
      if (!admin_note) throw new Error("Admin note required for rejection");
      await supabase.from("video_requests").update({
        status: "rejected", reviewed_at: now, admin_note,
      }).eq("id", request_id);
      await supabase.from("notifications").insert({
        user_id: request.requested_by,
        title: "Video request not approved",
        message: `Reason: ${admin_note}. You can submit a new request.`,
        type: "video_request", action_url: "/creator/videos",
      });
    } else {
      throw new Error("Invalid action");
    }

    return new Response(JSON.stringify({ success: true, action, request_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
