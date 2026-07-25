// ============================================================================
// Plan definitions for the pricing UI + the checkout helper.
//
// These price IDs are the TEST-MODE ids. When you go live, swap them for the
// live price IDs (and ideally read them from an env var so you don't edit code).
// They must match the IDs in supabase/functions/_shared/stripe-config.ts.
// ============================================================================

import { supabase } from '../supabase.js';

export const PLANS = [
  {
    key: 'pro',
    name: 'Pathfinder',
    tierLabel: 'Pro',
    priceId: 'price_1TiJwKRquTR9NxMxhR8fFwTx',
    price: '$4.99',
    cadence: '/mo',
    blurb: 'Full 20-year results, save & compare runs, decision journey map, identity + milestones.',
    features: [
      'Full 20-year projections (Years 10 & 20)',
      'Save & compare multiple runs',
      'Decision journey map',
      'Identity + milestone tracking',
    ],
    highlight: false,
  },
  {
    key: 'elite',
    name: 'Market Expert',
    tierLabel: 'Elite',
    priceId: 'price_1TiK2aRquTR9NxMxjNShoQsk',
    price: '$9.99',
    cadence: '/mo',
    blurb: 'Everything in Pathfinder, plus multi-property and household tools.',
    features: [
      'Everything in Pathfinder',
      'Multi-property simulation',
      'Household mode',
      'AI coach nudges',
      'Verified identity badges',
    ],
    highlight: false,
  },
  {
    key: 'elite_annual',
    name: 'Market Expert',
    tierLabel: 'Elite · Annual',
    priceId: 'price_1TiKBVRquTR9NxMxaGBZhP5b',
    price: '$99.99',
    cadence: '/yr',
    blurb: 'All Elite features, prepaid for a year — the best value.',
    features: [
      'Everything in Elite',
      'Prepaid 12 months',
      'Best value — about 2 months free',
    ],
    highlight: true,            // visually featured
    savingsNote: 'Save ~$20/yr vs monthly',
  },
];

// Calls the create-checkout-session edge function with the user's access token
// and the chosen price id. Returns { url } to redirect to Stripe Checkout, OR
// { portal: true } if the user already has an active subscription and should be
// sent to the billing portal instead. Throws on error so the caller can show a
// message.
export async function startCheckout(priceId, accessToken) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ price_id: priceId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Could not start checkout. Please try again.');
  }
  // The guard may tell us to use the portal instead of a new checkout.
  if (data.portal) {
    return { portal: true, message: data.message };
  }
  if (!data.url) {
    throw new Error('Could not start checkout. Please try again.');
  }
  return { url: data.url };
}

// Opens the Stripe Billing Portal for an existing subscriber (change plan,
// update card, cancel). Returns the portal URL to redirect to.
export async function openBillingPortal(accessToken) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Could not open billing portal. Please try again.');
  }
  return data.url;
}