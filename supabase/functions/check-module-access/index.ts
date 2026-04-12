import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Get current user
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

    const { module_id, course_id } = await req.json();
    if (!module_id || !course_id) {
      return new Response(JSON.stringify({ error: "module_id and course_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check enrollment
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", course_id)
      .maybeSingle();

    if (!enrollment) {
      return new Response(JSON.stringify({ canAccess: false, reason: "not_enrolled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all modules in order
    const { data: modules } = await supabase
      .from("modules")
      .select("id, title, order_index")
      .eq("course_id", course_id)
      .order("order_index", { ascending: true });

    if (!modules || modules.length === 0) {
      return new Response(JSON.stringify({ canAccess: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const moduleIndex = modules.findIndex((m) => m.id === module_id);
    
    // First module always accessible
    if (moduleIndex <= 0) {
      return new Response(JSON.stringify({ canAccess: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get gate settings for this module
    const { data: gateSettings } = await supabase
      .from("module_gate_settings")
      .select("*")
      .eq("module_id", module_id)
      .maybeSingle();

    // No gate settings = free access
    if (!gateSettings) {
      return new Response(JSON.stringify({ canAccess: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if creator still has pro plan
    const { data: proSub } = await supabase
      .from("creator_pro_subscriptions")
      .select("plan, status")
      .eq("creator_id", gateSettings.creator_id)
      .maybeSingle();

    const isProActive = proSub && 
      (proSub.plan === "pro" || proSub.plan === "trial") && 
      proSub.status === "active";

    // If pro expired, gates are bypassed
    if (!isProActive) {
      return new Response(JSON.stringify({ canAccess: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const previousModule = modules[moduleIndex - 1];

    // Check sequential lock
    if (gateSettings.is_sequential || gateSettings.has_mentor_gate) {
      const { data: completion } = await supabase
        .from("module_completions")
        .select("id")
        .eq("student_id", user.id)
        .eq("module_id", previousModule.id)
        .maybeSingle();

      if (!completion) {
        return new Response(JSON.stringify({
          canAccess: false,
          reason: "previous_incomplete",
          gateInfo: {
            type: "sequential",
            previousModuleId: previousModule.id,
            previousModuleTitle: previousModule.title,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check mentor gate
    if (gateSettings.has_mentor_gate) {
      const { data: unlockRequest } = await supabase
        .from("mentor_unlock_requests")
        .select("*")
        .eq("student_id", user.id)
        .eq("locked_module_id", module_id)
        .maybeSingle();

      if (!unlockRequest) {
        // Get mentor contact info
        const { data: studentProfile } = await supabase
          .from("profiles")
          .select("referrer_email")
          .eq("id", user.id)
          .single();

        const mentorEmail = studentProfile?.referrer_email || "none@backupshala.com";
        
        const { data: mentorProfile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("email", mentorEmail)
          .maybeSingle();

        return new Response(JSON.stringify({
          canAccess: false,
          reason: "mentor_approval_needed",
          gateInfo: {
            type: "mentor",
            mentorEmail,
            mentorName: mentorProfile?.full_name || null,
            mentorPhone: mentorProfile?.phone || null,
            message: gateSettings.mentor_gate_message,
            contactType: gateSettings.mentor_contact_type,
            zoomLink: gateSettings.zoom_link,
            previousModuleId: previousModule.id,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (unlockRequest.status === "waiting" || unlockRequest.status === "contacted") {
        return new Response(JSON.stringify({
          canAccess: false,
          reason: "waiting_mentor",
          gateInfo: {
            type: "mentor",
            unlockRequestId: unlockRequest.id,
            status: unlockRequest.status,
            contactedAt: unlockRequest.student_contacted_at,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (unlockRequest.status === "rejected") {
        return new Response(JSON.stringify({
          canAccess: false,
          reason: "mentor_approval_needed",
          gateInfo: {
            type: "mentor",
            rejected: true,
            rejectionReason: unlockRequest.rejection_reason,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Audio note info
    const audioInfo = gateSettings.has_audio_note ? {
      hasAudioNote: true,
      audioPosition: gateSettings.audio_note_position,
      audioLabel: gateSettings.audio_note_label,
      audioDuration: gateSettings.audio_note_duration_seconds,
      audioR2Key: gateSettings.audio_note_r2_key,
    } : { hasAudioNote: false };

    return new Response(JSON.stringify({ canAccess: true, ...audioInfo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
