// ============================================================================
// RealEquityIQ — Simulation save helper
//
// The single entry point for persisting a completed run to the `simulations`
// table. Lifted out of ResultsScreen so that presentation component stays pure
// (no supabase/auth) — the same house-style rule ProfileSetup / ScenarioPicker /
// ComparisonPicker follow. App calls this once, right after a run is produced.
//
// WHY THIS LIVES IN lib/ (not inline in App, not in ResultsScreen):
//   - ResultsScreen must not do data/auth work (purity rule).
//   - The save now has to attach identity (user_id + journey_id) for Pro users
//     so run-count milestones (compare_3_paths / run_all_5) can be scoped to the
//     active journey. That means an auth-aware RPC call — which belongs here,
//     beside awardMilestone, not in a render component.
//
// IDENTITY / RLS CONTRACT (verified against the live `simulations` policies):
//   - Lead / anon run  -> user_id = null, journey_id = null.
//       Satisfies the "Anon insert" policy (WITH CHECK user_id IS NULL).
//   - Pro / authed run -> user_id = auth user id, journey_id = active journey.
//       Satisfies the "Own sims" policy (auth.uid() = user_id).
//   We set user_id EXPLICITLY (not via a column default) so the row that gets
//   written is unambiguous to the next reader and matches the RLS policy it
//   will be checked against.
//
// SCENARIO ENUM: `simulations.scenario` is the Postgres enum `scenario_type`
//   (rent | buy | house_hack | invest | wait). The app's internal key for the
//   duplex path is 'househack'; the stored label is 'house_hack'. That single
//   rename is applied here, exactly as the original ResultsScreen insert did.
//
// This helper NEVER throws to the caller and NEVER blocks navigation on a
// failure: a failed save logs and resolves to null, just like the original
// fire-and-forget effect. It DOES await the insert, because the run-count
// milestone step that follows must see the row it just wrote.
// ============================================================================

import { supabase } from '../supabase.js';

// Internal scenario key -> stored enum label. Only 'househack' differs.
function toScenarioEnum(scenarioKey) {
  return scenarioKey === 'househack' ? 'house_hack' : scenarioKey;
}

// App tier key -> `subscription_tier` enum label (what access_tier_at_run wants).
// The DB enum is the FRIENDLY names (explorer | pathfinder | market_expert), not
// the app's internal tier keys (free | pro | elite | elite_annual). Writing a
// raw key like 'pro' is rejected: "invalid input value for enum
// subscription_tier". This maps every app tier to its valid enum label. Same
// rename pattern as toScenarioEnum (househack -> house_hack).
//   free          -> explorer       (the lead/free tier)
//   pro           -> pathfinder
//   elite         -> market_expert
//   elite_annual  -> market_expert  (same tier, billed annually)
// Unknown/missing tiers fall back to 'explorer' so a row is never rejected on
// this column — a mis-labeled tier is far less bad than a lost run.
function toTierEnum(tierKey) {
  switch (tierKey) {
    case 'pro':          return 'pathfinder';
    case 'elite':        return 'market_expert';
    case 'elite_annual': return 'market_expert';
    case 'explorer':     return 'explorer';   // already-friendly, pass through
    case 'pathfinder':   return 'pathfinder';
    case 'market_expert':return 'market_expert';
    default:             return 'explorer';   // free/anon/unknown
  }
}

// Persist one completed simulation run.
//
// Params (all from App's run context):
//   result      : the engine result object (stored as results_json; result.scenario is the key)
//   county      : the selected county row (needs fips_code, median_home_price)
//   isPro       : boolean — whether the current user is a paying subscriber
//   currentTier : the tier string, recorded as access_tier_at_run for Pro
//   userId      : auth user id (or null/undefined for leads)
//
// Returns the resolved active journey id for a Pro user (handy for the caller),
// or null when nothing journey-scoped was written (lead/anon, or on error).
export async function saveSimulation({ result, county, isPro, currentTier, userId }) {
  const scenarioKey = result?.scenario;
  if (!scenarioKey || !county) return null;

  // Resolve the active journey id for Pro users only. Leads have no journey and
  // must write journey_id = null (and user_id = null) to pass the Anon policy.
  let journeyId = null;
  if (isPro && userId) {
    try {
      const { data, error } = await supabase.rpc('get_or_create_active_journey');
      if (error) {
        // Non-fatal: fall back to a null journey_id. The run still saves under
        // the user (Own sims), it just won't be counted toward run milestones
        // this time rather than failing the whole save.
        console.warn('get_or_create_active_journey error:', error.message);
      } else {
        journeyId = data ?? null;
      }
    } catch (e) {
      console.warn('get_or_create_active_journey threw:', e?.message ?? e);
    }
  }

  try {
    const { error } = await supabase
      .from('simulations')
      .insert({
        user_id:            isPro && userId ? userId : null,
        journey_id:         journeyId, // null for leads, active journey for Pro
        county_fips:        county.fips_code,
        scenario:           toScenarioEnum(scenarioKey),
        purchase_price:     county.median_home_price,
        results_json:       result,
        access_tier_at_run: isPro ? toTierEnum(currentTier) : 'explorer',
        years_unlocked:     isPro ? [1, 3, 5, 10, 20] : [1, 3, 5],
      });

    if (error) {
      console.warn('Simulation save failed:', error.message);
      return null;
    }
  } catch (err) {
    console.warn('Simulation save error:', err?.message ?? err);
    return null;
  }

  return journeyId;
}