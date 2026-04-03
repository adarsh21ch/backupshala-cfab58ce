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

    const { video_id, module_id, course_id, current_position_seconds, watch_percentage } = await req.json();

    if (!video_id || !module_id || !course_id) {
      throw new Error("video_id, module_id, and course_id are required");
    }

    // Get min watch percentage from settings
    const { data: settingsData } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "min_watch_percentage_to_complete")
      .single();
    const minWatchPercent = Number(settingsData?.value) || 80;

    // Get existing progress
    const { data: existing } = await supabase
      .from("video_watch_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("module_id", module_id)
      .maybeSingle();

    const newPercentage = Math.max(existing?.watch_percentage || 0, watch_percentage || 0);
    const isCompleted = newPercentage >= minWatchPercent;

    if (existing) {
      await supabase
        .from("video_watch_progress")
        .update({
          watch_percentage: newPercentage,
          last_position_seconds: current_position_seconds || 0,
          total_watch_time_seconds: (existing.total_watch_time_seconds || 0) + 10,
          is_completed: isCompleted,
          last_updated: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("video_watch_progress")
        .insert({
          user_id: user.id,
          video_id,
          module_id,
          course_id,
          watch_percentage: newPercentage,
          last_position_seconds: current_position_seconds || 0,
          total_watch_time_seconds: 10,
          is_completed: isCompleted,
        });
    }

    // If completed, insert module_completion if not exists
    if (isCompleted) {
      const { data: existingCompletion } = await supabase
        .from("module_completions")
        .select("id")
        .eq("student_id", user.id)
        .eq("module_id", module_id)
        .maybeSingle();

      if (!existingCompletion) {
        await supabase.from("module_completions").insert({
          student_id: user.id,
          module_id,
          course_id,
        });
      }
    }

    // Increment total views on video
    await supabase.rpc("increment_video_views", { vid: video_id }).catch(() => {});

    return new Response(JSON.stringify({
      success: true,
      is_completed: isCompleted,
      watch_percentage: newPercentage,
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
