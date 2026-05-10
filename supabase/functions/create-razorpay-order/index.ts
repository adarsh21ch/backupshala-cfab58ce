import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user from JWT (use service role client with explicit token — more reliable)
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error("Auth getUser failed:", userError?.message, "jwt length:", jwt.length);
      return new Response(JSON.stringify({ error: "Invalid token", detail: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { course_id, ref_username, coupon_code } = await req.json();
    if (!course_id) {
      return new Response(JSON.stringify({ error: "course_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve ?ref=username to a referrer profile (server-side trust check)
    let resolvedReferrerId: string | null = null;
    if (ref_username && typeof ref_username === "string") {
      const cleaned = ref_username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
      if (cleaned) {
        const { data: refProfile } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", cleaned)
          .neq("id", user.id)
          .maybeSingle();
        if (refProfile) resolvedReferrerId = refProfile.id;
      }
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", course_id)
      .maybeSingle();

    if (existingEnrollment) {
      return new Response(JSON.stringify({ error: "already_enrolled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("price, commission_percent, platform_fee_percent, creator_id, title")
      .eq("id", course_id)
      .eq("status", "published")
      .single();

    if (courseError || !course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Server-side coupon application (NEVER trust client price) ----
    let appliedCoupon: { id: string; code: string; discount: number } | null = null;
    const originalPrice = Number(course.price);
    let amount_total = originalPrice;

    if (coupon_code && typeof coupon_code === "string") {
      const code = coupon_code.trim().toUpperCase().slice(0, 64);
      const { data: coupon } = await supabase
        .from("coupon_codes")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (!coupon) {
        return new Response(JSON.stringify({ error: "Invalid coupon code" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        return new Response(JSON.stringify({ error: "Coupon not yet active" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        return new Response(JSON.stringify({ error: "Coupon has expired" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (coupon.max_uses && Number(coupon.uses_count) >= Number(coupon.max_uses)) {
        return new Response(JSON.stringify({ error: "Coupon usage limit reached" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (coupon.course_id && coupon.course_id !== course_id) {
        return new Response(JSON.stringify({ error: "Coupon not valid for this course" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Creator-scoped coupon: course must belong to that creator
      if (coupon.creator_id && coupon.creator_id !== course.creator_id) {
        return new Response(JSON.stringify({ error: "Coupon not valid for this course" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let discount = 0;
      if (coupon.discount_type === "percent") {
        discount = Math.round(originalPrice * (Number(coupon.discount_value) / 100) * 100) / 100;
      } else {
        discount = Math.min(Number(coupon.discount_value), originalPrice);
      }
      amount_total = Math.max(0, Math.round((originalPrice - discount) * 100) / 100);
      appliedCoupon = { id: coupon.id, code: coupon.code, discount };
    }

    // Razorpay rejects orders below ₹1; treat fully-discounted as not yet supported.
    if (amount_total < 1) {
      return new Response(JSON.stringify({ error: "100% coupons are not currently supported. Please contact support for free access." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate amounts (on the discounted total)
    const base_amount = Math.round((amount_total / 1.18) * 100) / 100;
    const gst_amount = Math.round((amount_total - base_amount) * 100) / 100;
    const platform_fee_amount = Math.round(amount_total * (course.platform_fee_percent / 100) * 100) / 100;
    const commission_amount = Math.round(amount_total * (course.commission_percent / 100) * 100) / 100;
    const creator_payout_amount = Math.round((amount_total - platform_fee_amount - commission_amount) * 100) / 100;

    // Create Razorpay order
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: Math.round(amount_total * 100), // paise
        currency: "INR",
        receipt: "order_" + Date.now(),
        notes: {
          course_id,
          student_id: user.id,
          referrer_id: resolvedReferrerId || "",
        },
      }),
    });

    if (!rzpResponse.ok) {
      const errBody = await rzpResponse.text();
      console.error("Razorpay error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rzpOrder = await rzpResponse.json();

    // Insert payment record
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert({
        student_id: user.id,
        course_id,
        creator_id: course.creator_id,
        razorpay_order_id: rzpOrder.id,
        amount_total,
        base_amount,
        gst_amount,
        platform_fee_amount,
        commission_amount,
        creator_payout_amount,
        status: "pending",
      })
      .select("id")
      .single();

    if (payError) {
      console.error("Payment insert error:", payError);
      return new Response(JSON.stringify({ error: "Failed to create payment record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        razorpay_order_id: rzpOrder.id,
        razorpay_key_id: RAZORPAY_KEY_ID,
        amount: Math.round(amount_total * 100),
        currency: "INR",
        course_title: course.title,
        payment_id: payment.id,
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
