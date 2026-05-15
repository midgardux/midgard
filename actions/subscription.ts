'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe/client'
import { PRO_PRICE_ID } from '@/lib/stripe/products'
import type { ActionResult } from '@/types/actions'

export async function createCheckoutSession(): Promise<ActionResult<{ url: string }>> {
  if (!PRO_PRICE_ID?.trim()) return { success: false, error: 'Stripe product not configured.' }

  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Not authenticated.' }

  if (!user.email) return { success: false, error: 'Email address required for billing.' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_customer_id')
    .eq('id', user.id)
    .single()
  if (profileError || !profile) return { success: false, error: 'Profile not found.' }

  if (profile.subscription_tier === 'pro') return { success: false, error: 'Already on Pro.' }

  const stripe = getStripeClient()

  let customerId = profile.stripe_customer_id
  if (!customerId) {
    let customer: { id: string }
    try {
      customer = await stripe.customers.create(
        {
          email: user.email,
          metadata: { supabase_user_id: user.id },
        },
        { idempotencyKey: `cus-create-${user.id}` },
      )
    } catch {
      return { success: false, error: 'Failed to create billing account.' }
    }
    customerId = customer.id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (updateError) return { success: false, error: 'Failed to save billing account.' }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  let session: { url: string | null }
  try {
    session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      client_reference_id: user.id,
      success_url: `${origin}/projects`,
      cancel_url: `${origin}/projects`,
    })
  } catch {
    return { success: false, error: 'Failed to create checkout session.' }
  }

  if (!session.url) return { success: false, error: 'Checkout session URL unavailable.' }

  return { success: true, data: { url: session.url } }
}
