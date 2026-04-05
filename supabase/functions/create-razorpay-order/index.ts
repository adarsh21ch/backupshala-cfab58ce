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

    // Get user from JWT
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { course_id } = await req.json();
    if (!course_id) {
      return new Response(JSON.stringify({ error: "course_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Calculate amounts
    const amount_total = Number(course.price);
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
