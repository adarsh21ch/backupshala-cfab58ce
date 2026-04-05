import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

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
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, course_id } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !course_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify HMAC SHA256 signature
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const key = new TextEncoder().encode(RAZORPAY_KEY_SECRET);
    const msg = new TextEncoder().encode(body);
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, msg);
    const expectedSignature = encodeHex(new Uint8Array(signature));

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment record
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("student_id", user.id)
      .single();

    if (payError || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status === "success") {
      return new Response(JSON.stringify({ success: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate invoice number
    const invoice_number = "INV-" + new Date().getFullYear() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Update payment
    await supabase
      .from("payments")
      .update({ status: "success", razorpay_payment_id, invoice_number, paid_at: new Date().toISOString() })
      .eq("id", payment.id);

    // Get student profile
    const { data: student } = await supabase
      .from("profiles")
      .select("full_name, email, referrer_email")
      .eq("id", user.id)
      .single();

    // Get course info
    const { data: course } = await supabase
      .from("courses")
      .select("title, slug, creator_id")
      .eq("id", course_id)
      .single();

    // Create enrollment
    await supabase.from("enrollments").insert({
      student_id: user.id,
      course_id,
      referrer_email: student?.referrer_email || "none@backupshala.com",
      payment_id: payment.id,
      amount_paid: payment.amount_total,
    });

    // Update course total_students
    const { data: courseData } = await supabase
      .from("courses")
      .select("total_students")
      .eq("id", course_id)
      .single();
    await supabase
      .from("courses")
      .update({ total_students: (courseData?.total_students || 0) + 1 })
      .eq("id", course_id);

    // Handle commission
    if (student?.referrer_email && student.referrer_email !== "none@backupshala.com") {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id, wallet_balance, total_earned, total_referred")
        .eq("email", student.referrer_email)
        .neq("id", user.id)
        .maybeSingle();

      if (referrer) {
        await supabase
          .from("profiles")
          .update({
            wallet_balance: Number(referrer.wallet_balance) + Number(payment.commission_amount),
            total_earned: Number(referrer.total_earned) + Number(payment.commission_amount),
            total_referred: (referrer.total_referred || 0) + 1,
          })
          .eq("id", referrer.id);

        await supabase.from("commissions").insert({
          referrer_email: student.referrer_email,
          referrer_user_id: referrer.id,
          student_id: user.id,
          course_id,
          payment_id: payment.id,
          amount: payment.commission_amount,
          status: "credited",
        });

        await supabase.from("notifications").insert({
          user_id: referrer.id,
          title: `You earned ₹${payment.commission_amount}! 💰`,
          message: `${(student.full_name || "Someone").split(" ")[0]} enrolled in ${course?.title}. Commission added to your wallet.`,
          type: "commission",
        });
      }
    }

    // Handle creator payout
    const { data: creator } = await supabase
      .from("profiles")
      .select("id, wallet_balance, total_earned")
      .eq("id", payment.creator_id)
      .single();

    if (creator) {
      await supabase
        .from("profiles")
        .update({
          wallet_balance: Number(creator.wallet_balance) + Number(payment.creator_payout_amount),
          total_earned: Number(creator.total_earned) + Number(payment.creator_payout_amount),
        })
        .eq("id", creator.id);

      await supabase.from("creator_payouts").insert({
        creator_id: payment.creator_id,
        payment_id: payment.id,
        amount: payment.creator_payout_amount,
        status: "pending",
      });

      await supabase.from("notifications").insert({
        user_id: payment.creator_id,
        title: "New Enrollment! 🎉",
        message: `${(student?.full_name || "Someone").split(" ")[0]} enrolled in ${course?.title}. ₹${payment.creator_payout_amount} added to your earnings.`,
        type: "enrollment",
      });
    }

    // Notification for student
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Enrollment Confirmed! 🎓",
      message: `You are now enrolled in ${course?.title}. Start learning now!`,
      type: "success",
      action_url: "/courses",
    });

    // Update student total_enrolled
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("total_enrolled")
      .eq("id", user.id)
      .single();
    await supabase
      .from("profiles")
      .update({ total_enrolled: (studentProfile?.total_enrolled || 0) + 1 })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({ success: true, invoice_number }),
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
