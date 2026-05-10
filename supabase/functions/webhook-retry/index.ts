import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { processPaymentSuccess } from '../_shared/process-payment.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Auth: require admin role
    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: isAdmin } = await userClient.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { log_id } = await req.json()
    if (!log_id) {
      return new Response(JSON.stringify({ error: 'log_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: log } = await supabase
      .from('webhook_logs').select('*').eq('id', log_id).maybeSingle()
    if (!log) {
      return new Response(JSON.stringify({ error: 'Log not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = log.payload
    const eventType = log.event_type

    let result: any = { handled: false }

    if (eventType === 'payment.captured') {
      const paymentEntity = payload?.payload?.payment?.entity
      if (paymentEntity) {
        const razorpayOrderId = paymentEntity.order_id
        const razorpayPaymentId = paymentEntity.id
        const { data: existingPayment } = await supabase
          .from('payments').select('*')
          .eq('razorpay_order_id', razorpayOrderId).maybeSingle()
        if (existingPayment) {
          const r = await processPaymentSuccess({
            supabase, payment: existingPayment,
            razorpayPaymentId, razorpayOrderId,
          })
          result = { handled: true, action: r.alreadyProcessed ? 'already_processed' : 'payment_captured' }
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = payload?.payload?.payment?.entity
      if (paymentEntity) {
        await supabase.from('payments')
          .update({ status: 'failed' })
          .eq('razorpay_order_id', paymentEntity.order_id)
          .neq('status', 'success')
        result = { handled: true, action: 'payment_failed' }
      }
    } else {
      result = { handled: false, reason: `Unsupported event type: ${eventType}` }
    }

    await supabase.from('webhook_logs')
      .update({ status: result.handled ? 'processed' : 'retry_skipped' })
      .eq('id', log_id)

    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'webhook_retry',
      target_type: 'webhook_log',
      target_id: log_id,
      details: { event_type: eventType, result },
    })

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('webhook-retry error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', message: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
