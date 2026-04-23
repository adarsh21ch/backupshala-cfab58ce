// Edge function: Create a Razorpay order for a Basic→Advanced upgrade.
// Charges only the difference (advanced_price - basic_price).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getSetting(supabase: any, key: string, fallback: string) {
  const { data } = await supabase.from("platform_settings").select("value").eq("key", key).maybeSingle();
  return data?.value || fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { course_id } = await req.json();
    if (!course_id) {
      return new Response(JSON.stringify({ error: "course_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has a basic enrollment for this course
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, tier")
      .eq("student_id", user.id)
      .eq("course_id", course_id)
      .maybeSingle();

    if (!enrollment) {
      return new Response(JSON.stringify({ error: "You must be enrolled to upgrade." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (enrollment.tier === "advanced") {
      return new Response(JSON.stringify({ error: "Already on Advanced tier." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check no existing upgrade record (defense in depth)
    const { data: existingUpgrade } = await supabase
      .from("course_upgrades")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .maybeSingle();
    if (existingUpgrade) {
      return new Response(JSON.stringify({ error: "Upgrade already processed." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch course
    const { data: course } = await supabase
      .from("courses")
      .select("id, title, creator_id, status")
      .eq("id", course_id)
      .single();
    if (!course || course.status !== "published") {
      return new Response(JSON.stringify({ error: "Course not available" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute upgrade price from server-side settings
    const basicPrice = Number(await getSetting(supabase, "basic_price", "249"));
    const advancedPrice = Number(await getSetting(supabase, "advanced_price", "499"));
    const upgradePrice = Math.max(0, advancedPrice - basicPrice);

    if (upgradePrice <= 0) {
      return new Response(JSON.stringify({ error: "Upgrade price misconfigured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        amount: Math.round(upgradePrice * 100),
        currency: "INR",
        receipt: "upg_" + Date.now(),
        notes: { type: "upgrade", course_id, user_id: user.id },
      }),
    });

    if (!rzpResponse.ok) {
      const errBody = await rzpResponse.text();
      console.error("Razorpay error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rzpOrder = await rzpResponse.json();

    // Insert payment record (status pending)
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        student_id: user.id,
        course_id,
        creator_id: course.creator_id,
        razorpay_order_id: rzpOrder.id,
        amount_total: upgradePrice,
        base_amount: upgradePrice,
        gst_amount: 0,
        platform_fee_amount: 0,
        commission_amount: 0,
        creator_payout_amount: 0,
        status: "pending",
      })
      .select("id")
      .single();

    if (payErr || !payment) {
      console.error("Payment insert err:", payErr);
      return new Response(JSON.stringify({ error: "Failed to record payment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        razorpay_order_id: rzpOrder.id,
        razorpay_key_id: RAZORPAY_KEY_ID,
        amount: Math.round(upgradePrice * 100),
        currency: "INR",
        course_title: course.title,
        upgrade_price: upgradePrice,
        payment_id: payment.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
