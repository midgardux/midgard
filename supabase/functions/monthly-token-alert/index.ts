import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

const INPUT_COST = parseFloat(Deno.env.get('INPUT_COST_PER_MILLION_TOKENS') ?? '3.00')
const OUTPUT_COST = parseFloat(Deno.env.get('OUTPUT_COST_PER_MILLION_TOKENS') ?? '15.00')

Deno.serve(async (req) => {
  const secret = Deno.env.get('FUNCTION_SECRET')
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || authHeader !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (isNaN(INPUT_COST) || isNaN(OUTPUT_COST)) {
      throw new Error('INPUT_COST_PER_MILLION_TOKENS or OUTPUT_COST_PER_MILLION_TOKENS is not a valid number')
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const operatorEmail = Deno.env.get('OPERATOR_ALERT_EMAIL')
    const senderEmail = Deno.env.get('SENDER_EMAIL') ?? 'onboarding@resend.dev'
    if (!resendApiKey) throw new Error('RESEND_API_KEY secret is not configured')
    if (!operatorEmail) throw new Error('OPERATOR_ALERT_EMAIL secret is not configured')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const now = new Date()
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    const period = periodStart.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const periodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

    const { data: lastSentRow } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'token_alert_last_sent')
      .maybeSingle()

    if (lastSentRow?.value === periodKey) {
      return Response.json({ sent: false, reason: 'already_sent_this_period', period })
    }

    const { data: rows, error: usageError } = await supabase
      .from('token_usage')
      .select('input_tokens, output_tokens')
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString())

    if (usageError) throw new Error(`token_usage query failed: ${usageError.message}`)

    const totalInput = (rows ?? []).reduce((sum, r) => sum + (r.input_tokens as number), 0)
    const totalOutput = (rows ?? []).reduce((sum, r) => sum + (r.output_tokens as number), 0)
    const estimatedUSD = (totalInput / 1_000_000) * INPUT_COST + (totalOutput / 1_000_000) * OUTPUT_COST

    const { data: configRow, error: configError } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'token_alert_threshold_usd')
      .single()

    if (configError) throw new Error(`config query failed: ${configError.message}`)
    if (!configRow) throw new Error('token_alert_threshold_usd config row not found')

    const threshold = parseFloat((configRow as { value: string }).value)
    if (isNaN(threshold)) throw new Error('token_alert_threshold_usd is not a valid number')

    if (estimatedUSD <= threshold) {
      return Response.json({ sent: false, estimatedUSD, threshold })
    }

    const resend = new Resend(resendApiKey)
    const { error: sendError } = await resend.emails.send({
      from: `Midgard Alerts <${senderEmail}>`,
      to: operatorEmail,
      subject: `[Midgard] Token spend alert: $${estimatedUSD.toFixed(2)} — ${period}`,
      html: `<p>Monthly token spend has exceeded the alert threshold.</p>
             <p><strong>Estimated spend:</strong> $${estimatedUSD.toFixed(2)}</p>
             <p><strong>Threshold:</strong> $${threshold.toFixed(2)}</p>
             <p><strong>Billing period:</strong> ${period}</p>
             <p>Review usage in your Supabase Dashboard → Table Editor → token_usage.</p>`,
    })
    if (sendError) throw new Error(`Resend failed: ${sendError.message}`)

    await supabase
      .from('config')
      .upsert({ key: 'token_alert_last_sent', value: periodKey, updated_at: new Date().toISOString() })

    return Response.json({ sent: true, estimatedUSD, threshold })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[monthly-token-alert]', message)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})
