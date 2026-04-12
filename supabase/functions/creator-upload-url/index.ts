import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.525.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.525.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const body = await req.json();
    const { filename, content_type, file_size_bytes, course_id, module_title } = body;

    // Validate creator owns the course
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("id, creator_id")
      .eq("id", course_id)
      .single();
    if (courseErr || !course) throw new Error("Course not found");
    if (course.creator_id !== user.id) throw new Error("You don't own this course");

    const validTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
    if (!validTypes.includes(content_type)) throw new Error("Invalid file type. Accepted: MP4, WebM, MOV, AVI, MKV");
    if (!file_size_bytes || file_size_bytes <= 0 || file_size_bytes > 524_288_000) throw new Error("File size must be between 1 byte and 500MB");

    const sanitized = (filename || "video.mp4").toLowerCase().replace(/[^a-z0-9.\-_]/g, "-").replace(/-+/g, "-");
    const objectKey = `creator-videos/${user.id}/${Date.now()}-${sanitized}`;

    const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID");
    const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID");
    const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "backupshala";

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error("R2 credentials not configured");
    }

    const r2 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    const command = new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: objectKey });
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 1800 });

    const R2_PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL") || "";
    const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${objectKey}` : "";

    return new Response(JSON.stringify({
      upload_url: uploadUrl,
      object_key: objectKey,
      public_url: publicUrl,
      expires_in: 1800,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
