import type Stripe from 'stripe'

export function getTierFromSubscription(subscription: Stripe.Subscription): 'pro' | 'free' {
  return subscription.status === 'active' ? 'pro' : 'free'
}
