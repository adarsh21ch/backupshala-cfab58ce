import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import { processPaymentSuccess } from "../_shared/process-payment.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token", detail: userError?.message }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, course_id } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !course_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify HMAC SHA256 signature
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const cryptoKey = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(body));
    const expectedSignature = encodeHex(new Uint8Array(signature));
    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: payment, error: payError } = await supabase
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("student_id", user.id)
      .single();

    if (payError || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status === "success") {
      return new Response(JSON.stringify({
        success: true, already_processed: true,
        invoice_number: payment.invoice_number, payment_id: payment.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await processPaymentSuccess({
      supabase,
      payment,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        already_processed: result.alreadyProcessed,
        invoice_number: result.invoiceNumber,
        payment_id: result.paymentId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("verify-razorpay-payment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
