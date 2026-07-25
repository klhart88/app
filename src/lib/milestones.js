// ============================================================================
// RealEquityIQ — Milestone awarding helper
//
// The single, scene-agnostic entry point for awarding an in-app milestone. The
// app awards milestones at the moment they happen (profile saved, first sim
// run, etc.); the Journey map only READS milestone_awards and reflects them.
// Keeping the award call here (not inline in a screen) is deliberate: the
// future "situational environment" phase will award the same milestones from a
// different surface, and it should call this exact function — not duplicate the
// logic. One helper, every caller.
//
// Mirrors the server contract of record_milestone (gamification schema):
//   - SECURITY DEFINER, Pro-gated server-side (has_active_subscription()).
//   - Journey-scoped, once-per-journey (unique(journey_id, milestone_key)).
//   - Returns { awarded, already_earned, total_points, ... } or a gate object
//     { awarded:false, reason:'no_active_subscription' }.
//
// This wrapper NEVER throws to the caller and NEVER blocks the user flow: a
// milestone award is a side effect of progress, not a gate on it. A free/anon
// user, an expired sub, or a transient RPC error all resolve to "not awarded"
// without disrupting the simulation, profile save, or navigation.
// ============================================================================

import { supabase } from '../supabase.js';

// Canonical in-app milestone keys (must match milestone_defs). Listed here so a
// typo'd key is caught in dev rather than silently no-op'ing server-side.
export const MILESTONE_KEYS = {
  complete_profile: 'complete_profile',
  first_simulation: 'first_simulation',
  compare_3_paths:  'compare_3_paths',
  run_all_5:        'run_all_5',
  second_session:   'second_session',
  // NOTE — 'email_unlock' is intentionally NOT wired to any milestone award.
  // The email-unlock flow (supabase/functions/email-unlock) serves account-less
  // LEADS, keyed by email, with a repeatable $1 a-la-carte path — so it is
  // neither an authenticated action nor a once-ever event, while record_milestone
  // requires an authenticated Pro user and awards once per journey. The two
  // belong to different user populations and must not be bridged here. If a
  // 'wait'-lens trigger or a Pro "viewed results" milestone is wanted later,
  // that is a separate, deliberate product decision — do not auto-wire it.
  // The self-report milestones (sr_preapproved, sr_toured, sr_offer, sr_closed)
  // are awarded directly by JourneyMap's self-report buttons, not through here.
};

// Award an in-app milestone for the current user's active journey.
//
// key   : a milestone_key string (use MILESTONE_KEYS.* to avoid typos)
// Returns the RPC result object on success, or null if nothing was awarded
// (not signed in, no active sub, or an error — all non-fatal). Callers may use
// the return to reflect new state (e.g. total_points) but should treat null as
// "no change" and carry on.
export async function awardMilestone(key) {
  if (!key) return null;
  try {
    const { data, error } = await supabase.rpc('record_milestone', { p_key: key });
    if (error) {
      // Most likely: not authenticated, or RLS/gate. Log, don't disrupt.
      console.warn(`awardMilestone(${key}) error:`, error.message);
      return null;
    }
    // Gate response is not an error — the user simply isn't eligible (free/anon
    // or expired). Treat as "no award", silently.
    if (data?.reason === 'no_active_subscription') return null;
    return data ?? null;
  } catch (e) {
    console.warn(`awardMilestone(${key}) threw:`, e?.message ?? e);
    return null;
  }
}