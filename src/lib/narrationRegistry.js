// ============================================================================
// RealEquityIQ — Narration Registry (Path B guided-audio manifest)
//
// One place that imports every recorded narration clip and names it by the beat
// it narrates. Components import the named clip from here rather than reaching
// into assets directly — so the full audio manifest is visible at a glance and
// adding/renaming a clip is a one-line change in a single file.
//
// Files live at: app/src/assets/audio/<name>.mp3
// ============================================================================

import welcomeCounty        from '../assets/audio/welcome-county.mp3';
import financialProfile     from '../assets/audio/financial-profile.mp3';
import primaryScenario      from '../assets/audio/primary-scenario.mp3';
import secondaryScenarios   from '../assets/audio/secondary-scenarios.mp3';
import resultsFreeLocked    from '../assets/audio/results-free-locked.mp3';
import resultsFreeUnlockSpent from '../assets/audio/results-free-unlock-spent.mp3';
import resultsPro           from '../assets/audio/results-pro.mp3';
import resultsProCompare    from '../assets/audio/results-pro-compare.mp3';

export const NARRATION = {
  // Step 1 — Location
  welcomeCounty,
  // Step 2 — Profile
  financialProfile,
  // Step 3 — Scenario (3.1 primary always; 3.2 secondary is Pro-only)
  primaryScenario,
  secondaryScenarios,
  // Step 4 — Results (selected by tier / unlock / comparison state)
  resultsFreeLocked,        // free user, not yet unlocked (entry)
  resultsFreeUnlockSpent,   // free user, free unlock already spent (on submit-rejected)
  resultsPro,               // subscriber, no comparison
  resultsProCompare,        // subscriber, comparison was run
};

// Selector for the Results ENTRY clip (the once-on-mount narration). The
// "free-unlock-spent" clip is NOT here — it's event-driven (fires when an email
// submit comes back already-used), not an entry state.
export function resultsEntryClip({ isPro, comparisonRan }) {
  if (isPro) return comparisonRan ? NARRATION.resultsProCompare : NARRATION.resultsPro;
  return NARRATION.resultsFreeLocked; // free always enters locked
}