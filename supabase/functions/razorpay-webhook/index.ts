import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { processPaymentSuccess } from "../_shared/process-payment.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

const encoder = new TextEncoder();

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === signature;
}

const isDup = (err: any) => err && (err.code === "23505" || /duplicate key/i.test(err.message || ""));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const signature = req.headers.get("x-razorpay-signature") || "";
    const bodyText = await req.text();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const isValid = await verifySignature(bodyText, signature, Deno.env.get("RAZORPAY_KEY_SECRET")!);

    const payload = JSON.parse(bodyText);
    const eventType = payload?.event || "unknown";
    // Razorpay event id (per docs): top-level `id` on the webhook payload, or fallback to header.
    const eventId: string | null =
      payload?.id || req.headers.get("x-razorpay-event-id") || null;

    // Idempotent webhook log insert. UNIQUE(razorpay_event_id) means a redelivered event
    // is rejected here and we return early without re-processing.
    const { data: logRow, error: logErr } = await supabase
      .from("webhook_logs")
      .insert({
        event_type: eventType,
        payload,
        status: isValid ? "verified" : "invalid_signature",
        razorpay_event_id: eventId,
      })
      .select("id")
      .single();

    if (logErr && isDup(logErr)) {
      return new Response(JSON.stringify({ ok: true, deduped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const logId = logRow?.id;

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (eventType === "payment.captured") {
      const paymentEntity = payload?.payload?.payment?.entity;
      if (paymentEntity) {
        const razorpayOrderId = paymentEntity.order_id;
        const razorpayPaymentId = paymentEntity.id;

        const { data: existingPayment } = await supabase
          .from("payments")
          .select("*")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();

        if (existingPayment) {
          // Same shared processor as the browser-initiated verify call.
          // Atomic claim inside ensures only one of (verify, webhook) finalizes.
          await processPaymentSuccess({
            supabase,
            payment: existingPayment,
            razorpayPaymentId,
            razorpayOrderId,
          });
        }

        if (logId) {
          await supabase.from("webhook_logs").update({ status: "processed" }).eq("id", logId);
        }
      }
    }

    if (eventType === "payment.failed") {
      const paymentEntity = payload?.payload?.payment?.entity;
      if (paymentEntity) {
        // Only mark failed if not already successful — never overwrite a captured payment.
        await supabase
          .from("payments")
          .update({ status: "failed" })
          .eq("razorpay_order_id", paymentEntity.order_id)
          .neq("status", "success");
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
