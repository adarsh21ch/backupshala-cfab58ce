import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const { code, course_id } = await req.json();
    if (!code || !course_id) throw new Error("Code and course_id required");

    const { data: coupon, error: couponErr } = await supabase
      .from("coupon_codes")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (couponErr || !coupon) throw new Error("Invalid coupon code");

    // Check validity period
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) throw new Error("Coupon not yet active");
    if (coupon.valid_until && new Date(coupon.valid_until) < now) throw new Error("Coupon has expired");

    // Check usage limit
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) throw new Error("Coupon usage limit reached");

    // Check course applicability
    if (coupon.course_id && coupon.course_id !== course_id) throw new Error("Coupon not valid for this course");

    // If creator-specific coupon, check course belongs to that creator
    if (coupon.creator_id) {
      const { data: course } = await supabase
        .from("courses")
        .select("creator_id")
        .eq("id", course_id)
        .single();
      if (!course || course.creator_id !== coupon.creator_id) throw new Error("Coupon not valid for this course");
    }

    // Get course price
    const { data: courseData } = await supabase
      .from("courses")
      .select("price")
      .eq("id", course_id)
      .single();
    if (!courseData) throw new Error("Course not found");

    let discount = 0;
    if (coupon.discount_type === "percent") {
      discount = Math.round(courseData.price * (coupon.discount_value / 100));
    } else {
      discount = Math.min(coupon.discount_value, courseData.price);
    }

    const discountedPrice = Math.max(0, courseData.price - discount);

    return new Response(JSON.stringify({
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: discount,
      original_price: courseData.price,
      discounted_price: discountedPrice,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, valid: false }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
