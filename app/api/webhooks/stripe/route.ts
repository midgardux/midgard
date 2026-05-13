import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import type { Database } from '@/lib/supabase/types'
import { getStripeClient } from '@/lib/stripe/client'
import { getTierFromSubscription } from '@/lib/stripe/webhooks'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature') ?? ''

  const stripe = getStripeClient()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Stripe webhook: signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const handled = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ]

  if (!handled.includes(event.type)) {
    return new Response('OK', { status: 200 })
  }

  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string
  const tier = getTierFromSubscription(subscription)

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error, count } = await supabase
    .from('profiles')
    .update({ subscription_tier: tier }, { count: 'exact' })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Stripe webhook processing failed, event:', event.id, error)
    return new Response('Internal error', { status: 500 })
  }

  if (count === 0) {
    console.warn('Stripe webhook: no profile found for customer', customerId, 'event:', event.id)
  }

  return new Response('OK', { status: 200 })
}
