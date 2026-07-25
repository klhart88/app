// ============================================================================
// RealEquityIQ — journeyCompletionConfig
//
// One config object per foundational journey (path_key), read by the
// completion flow (JourneyCompletionFlow + children). Filenames follow the
// naming-stability convention already established for the Promenade
// background (Design System Guide, section 4.1): production art lands under
// these exact names later, with no code changes required.
//
// path_key values match what's already in use elsewhere in the app —
// profiles.identity_path, GUIDE_BLURB in JourneyMap.jsx, and the
// journey_completions.path_key column. No new taxonomy introduced here.
//
// v2 (per "Wait & Save Feedback Adjustments"): Wait & Save's completion copy
// is approved design language, not placeholder.
//
// v3 (per "Journey Completion Framework v1.0" authorization): all four
// remaining journeys got draft transformationStatement/suggestedNext values
// so every path was functionally complete end to end.
//
// v4 (Production v1.0 approvals): "RealEquityIQ Journey Completion
// Transformation Statements" approved final transformationStatement copy for
// all five journeys (Wait & Save's pilot statement is explicitly superseded
// per that doc's note). "Suggested Next Journey Configuration v1.0" approved
// the next-journey chain and blurbs for all five — note this changed the
// mapping from the earlier draft (e.g. buy now points to househack, not
// invest; invest now points to rent, not buy). Both are production content
// now, not draft. No other file in the framework should need to change for
// content updates — see the Developer Integration Guide.
// ============================================================================

// Display names — matches the Design System Guide's Journey Documentation
// list order (Home Purchase, House Hack, Stock Investing, Wait & Save,
// Strategic Renting) 1:1 against the five path_key values.
export const JOURNEY_NAMES = {
  buy:       'Home Purchase',
  househack: 'House Hack',
  invest:    'Stock Investing',
  wait:      'Wait & Save',
  rent:      'Strategic Renting',
};

// Shared, non-per-journey copy (Feedback Adjustments doc, sections 2 and 5).
// "Journey Complete" replaces "You did it" everywhere in the ceremony/summary
// so the language stays consistent with the institutional framing throughout,
// not just in the final card.
export const JOURNEY_COMPLETE_HEADING = 'Journey Complete';
export const JOURNEY_RECORD_LINE =
  'This journey is now part of your permanent RealEquityIQ Journey Record.';

// Institution rank seals (Priority 3 — "not yet produced" per the Design
// System Guide's asset manifest). Stable filenames now so no code change is
// needed once art lands; a missing/not-yet-produced file just renders as a
// blank alt-texted image, not an error.
export const RANK_SEALS = {
  explorer:     '/assets/institution/rank_explorer.png',
  scholar:      '/assets/institution/rank_scholar.png',
  practitioner: '/assets/institution/rank_practitioner.png',
};

// Universal institution medallion — shown above the rank badge on completion.
export const INST_MEDALLION_SRC = '/assets/institution/inst_master_seal.png';

// Per-path fields. outcomeImageSrc is the Priority 1 deliverable for 'wait'
// (the pilot, produced); the other four reuse the same naming pattern —
// files land at these exact paths once produced, per the naming-stability
// rule (Design System Guide 4.1), no code changes needed.
//
// transformationStatement and suggestedNext are both PRODUCTION APPROVED
// (v1.0) for all five paths — see the two source documents referenced
// per-entry below. Philosophy for suggestedNext, per that doc: this is an
// invitation to broaden financial intelligence via a complementary
// strategy, never an implication that the completed journey was incomplete
// or that another path is "better."
const BASE_CONFIG = {
  buy: {
    outcomeImageSrc: '/home-purchase-complete.webp',
    outcomeImageAlt: 'A warmly lit home at dusk, keys in hand — the Home Purchase journey complete.',
    // APPROVED — "Journey Completion Transformation Statements v1.0."
    // Design intent: not celebrating the purchase itself, but the
    // confidence and knowledge gained through the whole buying process.
    transformationStatement:
      "You didn't just buy a home—you learned how preparation, confident " +
      'decisions, and disciplined execution can transform homeownership ' +
      'into a lasting foundation for financial security and long-term wealth.',
    // APPROVED — "Suggested Next Journey Configuration v1.0."
    // Reasoning: the user already understands buying a home; House Hack
    // expands that knowledge into optimization.
    suggestedNext: {
      pathKey: 'househack',
      blurb: 'Discover how a home can become more than a place to live by exploring strategies that combine homeownership with income generation.',
    },
  },
  househack: {
    outcomeImageSrc: '/house-hack-complete.webp',
    outcomeImageAlt: 'A duplex with a welcoming porch light on — the House Hack journey complete.',
    // APPROVED — "Journey Completion Transformation Statements v1.0."
    // Design intent: the transformation is recognizing a home can be both
    // a place to live and a wealth-building asset.
    transformationStatement:
      "You didn't just purchase a property—you learned how living " +
      'intentionally, sharing wisely, and creating income from where you ' +
      'live can accelerate your journey toward financial independence.',
    // APPROVED — "Suggested Next Journey Configuration v1.0."
    // Reasoning: broadens wealth-building beyond real estate.
    suggestedNext: {
      pathKey: 'invest',
      blurb: "See how the principles of long-term investing can complement the equity you're building through real estate.",
    },
  },
  invest: {
    outcomeImageSrc: '/stock-investing-complete.webp',
    outcomeImageAlt: 'A steady upward chart bathed in morning light — the Stock Investing journey complete.',
    // APPROVED — "Journey Completion Transformation Statements v1.0."
    // Design intent: not about picking stocks — about patience, consistency,
    // and compounding as enduring financial habits.
    transformationStatement:
      "You didn't just invest money—you learned that consistent decisions, " +
      'long-term thinking, and the discipline to stay invested allow time ' +
      'to become one of your greatest wealth-building assets.',
    // APPROVED — "Suggested Next Journey Configuration v1.0."
    // Reasoning: introduces another wealth-building strategy that challenges
    // assumptions without implying one path is superior.
    suggestedNext: {
      pathKey: 'rent',
      blurb: 'Learn how housing decisions and investment decisions can work together to maximize flexibility and long-term financial growth.',
    },
  },
  wait: {
    // Pilot journey (Design System Guide 4.4 / Technical Design Spec section 14).
    outcomeImageSrc: '/wait-save-complete.webp',
    outcomeImageAlt: 'A quiet, patient scene at golden hour — the Wait & Save journey complete.',
    // APPROVED — "Journey Completion Transformation Statements v1.0."
    // This explicitly SUPERSEDES the earlier pilot statement ("You learned
    // that waiting isn't standing still—it can be a deliberate wealth-
    // building strategy.") per that doc's note: the updated version aligns
    // with the five-journey narrative structure while preserving the same
    // philosophy (waiting as active preparation, not inactivity).
    transformationStatement:
      "You didn't just wait—you learned that patience, preparation, and " +
      'financial discipline can position you to recognize and seize the ' +
      'right opportunity with confidence when the time is right.',
    // APPROVED — "Suggested Next Journey Configuration v1.0."
    // Reasoning: continues the natural progression from preparing to acting.
    suggestedNext: {
      pathKey: 'buy',
      blurb: "Explore how your financial preparation can translate into a confident path toward homeownership when the timing is right.",
    },
  },
  rent: {
    outcomeImageSrc: '/strategic-renting-complete.webp',
    outcomeImageAlt: 'A bright rented apartment with moving boxes half-unpacked — the Strategic Renting journey complete.',
    // APPROVED — "Journey Completion Transformation Statements v1.0."
    // Design intent: reframing renting as a strategic financial decision
    // rather than a temporary compromise.
    transformationStatement:
      "You didn't simply continue renting—you learned that flexibility, " +
      'intentional planning, and disciplined investing can become a ' +
      'powerful strategy for building wealth while keeping your future ' +
      'options open.',
    // APPROVED — "Suggested Next Journey Configuration v1.0."
    // Reasoning: reinforces that Strategic Renting is not an endpoint — it
    // can be a deliberate stage before ownership.
    suggestedNext: {
      pathKey: 'buy',
      blurb: "Explore how the financial flexibility you've built can prepare you for homeownership when it aligns with your goals.",
    },
  },
};

// SUPERSEDED — celebration/interlude audio now lives in JourneyMap.jsx
// (milestone-confirm-cue.mp3 + journey-complete-interlude.mp3), not here.
// CompletionCelebration only gets mounted for ONE of the two ceremony stages
// that need continuous audio (it's fully unmounted when the stage advances
// from 'celebrating' to OutcomeScene's 'outcome'), so audio scoped to this
// component's own lifecycle can't survive that swap. Left as null/unused
// rather than deleted, in case a per-path celebration variant is wanted later.
const COMPLETION_CUE_SRC = null;

// TODO(design): placeholder pending Priority 2 — real per-journey community
// share copy. "awarenessLabel"/"invitationCopy" are used by the ACTIVE-journey
// (non-completion) awareness panel elsewhere, kept separate from the
// completion-only "Continue Your Financial Education" copy per the doc's
// distinction between neutral in-journey awareness and post-completion invitation.
const SHARED_PLACEHOLDER_COPY = {
  communityMessage: 'Share this milestone with the community.',
  awarenessLabel: 'Other Learning Paths',
};

export function getCompletionConfig(pathKey) {
  const base = BASE_CONFIG[pathKey];
  if (!base) return null;
  return {
    journeyId: pathKey,
    journeyName: JOURNEY_NAMES[pathKey] ?? pathKey,
    sealSrc: null, // journey seals are Priority 3/4 — not yet produced
    completionCueSrc: COMPLETION_CUE_SRC,
    ...base,
    ...SHARED_PLACEHOLDER_COPY,
  };
}
