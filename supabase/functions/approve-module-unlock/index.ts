import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { request_id, action, rejection_reason } = await req.json();

    if (!request_id || !action) {
      return new Response(JSON.stringify({ error: "request_id and action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the request
    const { data: unlockRequest } = await supabase
      .from("mentor_unlock_requests")
      .select("*, locked_module:modules!mentor_unlock_requests_locked_module_id_fkey(title)")
      .eq("id", request_id)
      .single();

    if (!unlockRequest) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is mentor or admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (user.id !== unlockRequest.mentor_user_id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      await supabase
        .from("mentor_unlock_requests")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request_id);

      // Notify student
      await supabase.from("notifications").insert({
        user_id: unlockRequest.student_id,
        title: "🔓 Module Unlocked!",
        message: `Your mentor approved access to "${unlockRequest.locked_module?.title || "next module"}". Continue learning!`,
        type: "module_unlocked",
        action_url: `/courses/${unlockRequest.course_id}/module/${unlockRequest.locked_module_id}`,
      });
    } else if (action === "reject") {
      await supabase
        .from("mentor_unlock_requests")
        .update({
          status: "rejected",
          rejection_reason: rejection_reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request_id);

      await supabase.from("notifications").insert({
        user_id: unlockRequest.student_id,
        title: "Action needed",
        message: `Your mentor needs you to do something first before unlocking the next module.${rejection_reason ? ` Reason: ${rejection_reason}` : ""}`,
        type: "info",
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
