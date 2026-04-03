import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const { video_asset_id, module_id, course_id, current_position_seconds, current_percentage, is_playing } = await req.json();
    if (!video_asset_id || !module_id || !course_id) throw new Error("Missing required fields");

    const { data: enrollment } = await supabase.from("enrollments")
      .select("id").eq("student_id", user.id).eq("course_id", course_id).maybeSingle();
    if (!enrollment) throw new Error("Not enrolled in this course");

    const { data: setting } = await supabase.from("platform_settings")
      .select("value").eq("key", "min_watch_percentage_to_complete").maybeSingle();
    const threshold = Number(setting?.value || 80);

    const { data: existing } = await supabase.from("video_watch_progress")
      .select("*").eq("user_id", user.id).eq("module_id", module_id).maybeSingle();

    const pos = Math.max(0, Math.floor(current_position_seconds || 0));
    const pct = Math.min(100, Math.max(0, current_percentage || 0));
    const watchInc = is_playing ? 10 : 0;

    if (existing) {
      const newMaxSec = Math.max(existing.max_watched_seconds || 0, pos);
      const newMaxPct = Math.max(Number(existing.max_watched_percentage || 0), pct);
      const newTotal = (existing.total_watch_time_seconds || 0) + watchInc;
      const nowDone = newMaxPct >= threshold;
      const wasDone = existing.is_completed;

      await supabase.from("video_watch_progress").update({
        last_position_seconds: pos,
        max_watched_seconds: newMaxSec,
        max_watched_percentage: newMaxPct,
        total_watch_time_seconds: newTotal,
        watch_percentage: newMaxPct,
        is_completed: nowDone || wasDone,
        completed_at: (nowDone && !wasDone) ? new Date().toISOString() : existing.completed_at,
        last_updated: new Date().toISOString(),
      }).eq("id", existing.id);

      if (nowDone && !wasDone) {
        await supabase.from("module_completions").insert({ student_id: user.id, module_id, course_id });
        await supabase.from("notifications").insert({
          user_id: user.id, title: "✅ Module complete!", message: "Keep going!", type: "progress",
        });
      }

      return new Response(JSON.stringify({
        success: true, max_watched_percentage: newMaxPct, max_watched_seconds: newMaxSec,
        is_completed: nowDone || wasDone,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      const nowDone = pct >= threshold;
      await supabase.from("video_watch_progress").insert({
        user_id: user.id, video_id: video_asset_id, video_asset_id, module_id, course_id,
        last_position_seconds: pos, max_watched_seconds: pos, max_watched_percentage: pct,
        total_watch_time_seconds: watchInc, watch_percentage: pct,
        is_completed: nowDone, completed_at: nowDone ? new Date().toISOString() : null,
        last_updated: new Date().toISOString(),
      });
      return new Response(JSON.stringify({
        success: true, max_watched_percentage: pct, max_watched_seconds: pos, is_completed: nowDone,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
