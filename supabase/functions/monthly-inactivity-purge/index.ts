import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

Deno.serve(async (req) => {
  // P4: timing-safe comparison prevents secret extraction via response-time analysis.
  const secret = Deno.env.get('FUNCTION_SECRET')
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  if (!secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const encoder = new TextEncoder()
  const authorized = secret.length === authHeader.length &&
    crypto.subtle.timingSafeEqual(encoder.encode(secret), encoder.encode(authHeader))
  if (!authorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const senderEmail = Deno.env.get('SENDER_EMAIL') ?? 'onboarding@resend.dev'
    const appUrl = Deno.env.get('APP_URL') ?? 'https://midgard.app'
    if (!resendApiKey) throw new Error('RESEND_API_KEY secret is not configured')
    if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured')
    if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const resend = new Resend(resendApiKey)

    const now = new Date()
    const twelveMonthsAgo = new Date(Date.UTC(
      now.getUTCFullYear() - 1,
      now.getUTCMonth(),
      now.getUTCDate(),
    ))
    const elevenMonthsAgo = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - 11,
      now.getUTCDate(),
    ))

    const errors: string[] = []
    let purgedCount = 0
    let notifiedCount = 0

    // Step A: purge free-tier users inactive for 12+ months who have been warned.
    // notified_at IS NOT NULL ensures we never delete without prior notification,
    // even if a previous run had a transient Resend failure (P1).
    // Run before Step B so newly-notified users are not also purged in the same run.
    try {
      const { data: purgeUsers, error: purgeQueryError } = await supabase
        .from('profiles')
        .select('id')
        .eq('subscription_tier', 'free')
        .lt('last_active_at', twelveMonthsAgo.toISOString())
        .not('notified_at', 'is', null)

      if (purgeQueryError) throw new Error(`profiles purge query failed: ${purgeQueryError.message}`)

      for (const { id: userId } of purgeUsers ?? []) {
        // P2: per-user try/catch catches thrown network errors in addition to rpcError,
        // so a single failure does not abort the remaining candidates (AC6).
        try {
          const { error: rpcError } = await supabase.rpc('purge_inactive_user', { p_user_id: userId })
          if (rpcError) {
            const msg = `purge failed for ${userId}: ${rpcError.message}`
            console.error('[monthly-inactivity-purge]', msg)
            errors.push(msg)
          } else {
            purgedCount++
          }
        } catch (err) {
          const msg = `purge exception for ${userId}: ${err instanceof Error ? err.message : String(err)}`
          console.error('[monthly-inactivity-purge]', msg)
          errors.push(msg)
        }
      }
    } catch (err) {
      const msg = `purge step failed: ${err instanceof Error ? err.message : String(err)}`
      console.error('[monthly-inactivity-purge]', msg)
      errors.push(msg)
    }

    // Step B: notify free-tier users inactive for 11+ months who have not yet been warned.
    // notified_at IS NULL catches both first-time 11-month candidates and any 12+ month users
    // whose prior notification failed transiently — they are retried here until successful,
    // and Step A will not purge them until notified_at IS NOT NULL (P1).
    try {
      const { data: notifyUsers, error: notifyQueryError } = await supabase
        .from('profiles')
        .select('id')
        .eq('subscription_tier', 'free')
        .lt('last_active_at', elevenMonthsAgo.toISOString())
        .is('notified_at', null)

      if (notifyQueryError) throw new Error(`profiles notify query failed: ${notifyQueryError.message}`)

      for (const { id: userId } of notifyUsers ?? []) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(userId)
          const email = userData.user?.email
          if (!email) {
            const msg = `no email found for user ${userId} — skipping notification`
            console.error('[monthly-inactivity-purge]', msg)
            errors.push(msg)
            continue
          }

          const { error: sendError } = await resend.emails.send({
            from: `Midgard <${senderEmail}>`,
            to: email,
            subject: '[Midgard] Your account data will be deleted in 30 days',
            html: `<p>Your Midgard account has been inactive for 11 months.</p>
                   <p>If you do not log in within the next 30 days, your account data (Realms and artifacts) will be permanently deleted.</p>
                   <p><a href="${appUrl}/login">Log in to keep your account active</a></p>
                   <p>If you no longer need your account, no action is required.</p>`,
          })

          if (sendError) {
            const msg = `notify failed for ${userId}: ${sendError.message}`
            console.error('[monthly-inactivity-purge]', msg)
            errors.push(msg)
          } else {
            const { error: notifyUpdateError } = await supabase
              .from('profiles')
              .update({ notified_at: new Date().toISOString() })
              .eq('id', userId)
            if (notifyUpdateError) {
              console.error('[monthly-inactivity-purge]', `notified_at update failed for ${userId}: ${notifyUpdateError.message}`)
            }
            notifiedCount++
          }
        } catch (err) {
          const msg = `notify exception for ${userId}: ${err instanceof Error ? err.message : String(err)}`
          console.error('[monthly-inactivity-purge]', msg)
          errors.push(msg)
        }
      }
    } catch (err) {
      const msg = `notify step failed: ${err instanceof Error ? err.message : String(err)}`
      console.error('[monthly-inactivity-purge]', msg)
      errors.push(msg)
    }

    return Response.json({ purged: purgedCount, notified: notifiedCount, errors })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[monthly-inactivity-purge]', message)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})
