import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

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

    // Check admin
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) throw new Error("Admin access required");

    const { request_id, action, admin_note, video_id } = await req.json();
    if (!request_id || !action) throw new Error("request_id and action are required");

    // Get the request
    const { data: request, error: reqError } = await supabase
      .from("video_requests")
      .select("*, profiles:requested_by(full_name, email)")
      .eq("id", request_id)
      .single();
    if (reqError || !request) throw new Error("Request not found");

    const now = new Date().toISOString();

    if (action === "start_processing") {
      await supabase
        .from("video_requests")
        .update({ status: "processing", processed_at: now, admin_note })
        .eq("id", request_id);

      // Notify creator
      await supabase.from("notifications").insert({
        user_id: request.requested_by,
        title: "Video Request Processing 🎬",
        message: `Your video request '${request.video_title}' is being processed.`,
        type: "info",
        action_url: "/creator/videos",
      });

    } else if (action === "reject") {
      await supabase
        .from("video_requests")
        .update({ status: "rejected", processed_at: now, admin_note: admin_note || "Request rejected" })
        .eq("id", request_id);

      await supabase.from("notifications").insert({
        user_id: request.requested_by,
        title: "Video Request Update",
        message: `Your video request '${request.video_title}' was not approved. Reason: ${admin_note || 'Not specified'}`,
        type: "warning",
        action_url: "/creator/videos",
      });

    } else if (action === "complete") {
      if (!video_id) throw new Error("video_id is required to complete a request");

      await supabase
        .from("video_requests")
        .update({ status: "completed", completed_at: now, video_id, admin_note })
        .eq("id", request_id);

      // Get video details for notification
      const { data: video } = await supabase.from("videos").select("backupshala_video_link, title").eq("id", video_id).single();

      await supabase.from("notifications").insert({
        user_id: request.requested_by,
        title: "Your Video is Ready! 🎬",
        message: `Your video '${request.video_title}' is ready! Check your Video Gallery. Link: ${video?.backupshala_video_link || ''}`,
        type: "success",
        action_url: "/creator/videos",
      });
    } else {
      throw new Error("Invalid action. Use: start_processing, reject, complete");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
