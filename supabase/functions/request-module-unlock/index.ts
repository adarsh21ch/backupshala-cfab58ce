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

    const { module_id, completed_module_id, course_id, contact_method } = await req.json();

    if (!module_id || !completed_module_id || !course_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify enrollment
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", course_id)
      .maybeSingle();

    if (!enrollment) {
      return new Response(JSON.stringify({ error: "Not enrolled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify completion
    const { data: completion } = await supabase
      .from("module_completions")
      .select("id")
      .eq("student_id", user.id)
      .eq("module_id", completed_module_id)
      .maybeSingle();

    if (!completion) {
      return new Response(JSON.stringify({ error: "Previous module not completed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get student profile for referrer email
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("referrer_email, full_name")
      .eq("id", user.id)
      .single();

    const mentorEmail = studentProfile?.referrer_email || "none@backupshala.com";

    // Find mentor user
    const { data: mentorProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", mentorEmail)
      .maybeSingle();

    // Upsert unlock request
    const { data: request, error: upsertError } = await supabase
      .from("mentor_unlock_requests")
      .upsert({
        student_id: user.id,
        course_id,
        locked_module_id: module_id,
        completed_module_id,
        mentor_email: mentorEmail,
        mentor_user_id: mentorProfile?.id || null,
        status: contact_method ? "contacted" : "waiting",
        student_contacted_at: contact_method ? new Date().toISOString() : null,
        contact_method: contact_method || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "student_id,locked_module_id" })
      .select()
      .single();

    if (upsertError) throw upsertError;

    // Get module title for notification
    const { data: lockedModule } = await supabase
      .from("modules")
      .select("title")
      .eq("id", module_id)
      .single();

    // Notify mentor
    if (mentorProfile?.id) {
      await supabase.from("notifications").insert({
        user_id: mentorProfile.id,
        title: "🔔 Student needs your approval!",
        message: `${studentProfile?.full_name || "A student"} completed a module and is waiting for your approval to unlock "${lockedModule?.title || "next module"}".`,
        type: "mentor_unlock",
        action_url: "/creator/unlock-requests",
      });
    }

    return new Response(JSON.stringify({ success: true, request_id: request.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
