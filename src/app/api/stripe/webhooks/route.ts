import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

const PLAN_BY_PRICE: Record<string, string> = {
  [process.env.STRIPE_PRO_PRICE_ID!]: 'pro',
  [process.env.STRIPE_BUSINESS_PRICE_ID!]: 'business',
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const planSlug = session.metadata?.plan
        if (userId && planSlug) {
          await supabase.from('profiles').update({ plan: planSlug }).eq('id', userId)
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        const priceId = sub.items.data[0]?.price.id
        const plan = PLAN_BY_PRICE[priceId] || 'free'

        if (userId) {
          await supabase.from('profiles').update({ plan: sub.status === 'active' ? plan : 'free' }).eq('id', userId)
          const subData = sub as unknown as { current_period_start: number; current_period_end: number }
          await supabase.from('subscriptions').upsert({
            id: sub.id,
            user_id: userId,
            status: sub.status,
            price_id: priceId,
            current_period_start: new Date(subData.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (userId) {
          await supabase.from('profiles').update({ plan: 'free' }).eq('id', userId)
          await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
