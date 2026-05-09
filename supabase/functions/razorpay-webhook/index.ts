import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
}

const encoder = new TextEncoder()

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return expected === signature
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('x-razorpay-signature') || ''
    const bodyText = await req.text()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const razorpaySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Verify signature
    const isValid = await verifySignature(bodyText, signature, razorpaySecret)

    const payload = JSON.parse(bodyText)
    const eventType = payload?.event || 'unknown'

    // Log webhook (capture inserted row id for safe later update)
    const { data: logRow } = await supabase.from('webhook_logs').insert({
      event_type: eventType,
      payload,
      status: isValid ? 'verified' : 'invalid_signature',
    }).select('id').single()
    const logId = logRow?.id

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle payment.captured
    if (eventType === 'payment.captured') {
      const paymentEntity = payload?.payload?.payment?.entity
      if (paymentEntity) {
        const razorpayOrderId = paymentEntity.order_id
        const razorpayPaymentId = paymentEntity.id

        // Find existing payment record
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id, student_id, course_id, amount_total, status')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle()

        if (existingPayment && existingPayment.status !== 'paid') {
          // Update payment status
          await supabase
            .from('payments')
            .update({ status: 'paid', razorpay_payment_id: razorpayPaymentId, paid_at: new Date().toISOString() })
            .eq('id', existingPayment.id)

          // Check if enrollment already exists
          const { data: existingEnrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('student_id', existingPayment.student_id)
            .eq('course_id', existingPayment.course_id)
            .maybeSingle()

          if (!existingEnrollment) {
            await supabase.from('enrollments').insert({
              student_id: existingPayment.student_id,
              course_id: existingPayment.course_id,
              payment_id: existingPayment.id,
              amount_paid: existingPayment.amount_total,
            })
          }
        }

        if (logId) {
          await supabase.from('webhook_logs').update({ status: 'processed' }).eq('id', logId)
        }
      }
    }

    // Handle payment.failed
    if (eventType === 'payment.failed') {
      const paymentEntity = payload?.payload?.payment?.entity
      if (paymentEntity) {
        const razorpayOrderId = paymentEntity.order_id
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('razorpay_order_id', razorpayOrderId)
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
