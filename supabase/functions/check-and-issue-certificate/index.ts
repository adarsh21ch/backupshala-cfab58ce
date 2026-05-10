import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateCertCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BS-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { course_id } = await req.json();
    if (!course_id) {
      return new Response(
        JSON.stringify({ error: "course_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from("certificates")
      .select("id, certificate_code")
      .eq("student_id", user.id)
      .eq("course_id", course_id)
      .maybeSingle();

    if (existingCert) {
      return new Response(
        JSON.stringify({
          success: true,
          already_issued: true,
          certificate_code: existingCert.certificate_code,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check enrollment exists
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", course_id)
      .maybeSingle();

    if (!enrollment) {
      return new Response(
        JSON.stringify({ error: "Not enrolled in this course" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get total modules for this course
    const { count: totalModules } = await supabase
      .from("modules")
      .select("id", { count: "exact", head: true })
      .eq("course_id", course_id);

    if (!totalModules || totalModules === 0) {
      return new Response(
        JSON.stringify({ error: "Course has no modules" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get completed modules count
    const { count: completedModules } = await supabase
      .from("module_completions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("course_id", course_id);

    if ((completedModules || 0) < totalModules) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Completed ${completedModules}/${totalModules} modules`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All modules completed — issue certificate
    const { data: course } = await supabase
      .from("courses")
      .select("creator_id, title")
      .eq("id", course_id)
      .single();

    if (!course) {
      return new Response(
        JSON.stringify({ error: "Course not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate unique certificate code
    let certCode = generateCertCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: dup } = await supabase
        .from("certificates")
        .select("id")
        .eq("certificate_code", certCode)
        .maybeSingle();
      if (!dup) break;
      certCode = generateCertCode();
      attempts++;
    }

    // Insert certificate
    const { error: certError } = await supabase.from("certificates").insert({
      student_id: user.id,
      course_id,
      creator_id: course.creator_id,
      certificate_code: certCode,
    });

    if (certError) {
      console.error("Certificate insert error:", certError);
      return new Response(
        JSON.stringify({ error: "Failed to issue certificate" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark enrollment as completed
    await supabase
      .from("enrollments")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("student_id", user.id)
      .eq("course_id", course_id);

    // Notify student
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Certificate Earned! 🏆",
      message: `Congratulations! You completed "${course.title}". Your certificate code: ${certCode}`,
      type: "success",
      action_url: "/dashboard/certificates",
    });

    // Send certificate email via Resend (best-effort, non-blocking failure)
    try {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["certificate_email_subject"]);
      const subjectSetting = settings?.find((s: any) => s.key === "certificate_email_subject")?.value;
      const subject = (typeof subjectSetting === "string" && subjectSetting) || "🎓 Your Backupshala Certificate is ready";

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const studentName = profile?.full_name || "Student";
      const studentEmail = profile?.email || user.email;
      const certUrl = `https://backupshala.com/dashboard/certificates`;
      const verifyUrl = `https://backupshala.com/verify/${certCode}`;

      if (studentEmail) {
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">
            <h1 style="color:#16a34a;margin-bottom:8px">Congratulations, ${studentName}! 🎉</h1>
            <p>You've successfully completed <strong>${course.title}</strong> on Backupshala.</p>
            <p>Your official Certificate of Completion is ready to download.</p>
            <p style="margin:24px 0">
              <a href="${certUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Download Certificate (PDF)</a>
            </p>
            <p style="font-size:14px;color:#475569">
              Certificate code: <strong>${certCode}</strong><br/>
              Verify online: <a href="${verifyUrl}">${verifyUrl}</a>
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="font-size:12px;color:#94a3b8">Backupshala — Learn. Earn. Grow.</p>
          </div>
        `;

        await supabase.functions.invoke("send-email", {
          body: { to: studentEmail, subject, html },
        });
      }
    } catch (emailErr) {
      console.error("Certificate email send failed:", emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        certificate_code: certCode,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
