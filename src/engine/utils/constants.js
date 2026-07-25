// ============================================
// RealWorldIQ — Shared Financial Constants
//
// Single source of truth for assumptions that were previously re-declared
// as separate hardcoded defaults in multiple files (engine.js's
// DEFAULT_INPUTS, each scenario file's own destructure default, plus
// appreciation.js and networth.js's internal function defaults — four+
// separate copies of the same "7.0" that could silently drift out of sync,
// which is exactly how invest.js ended up with an unconfigurable return
// rate). Every file that needs the investment return assumption imports it
// from here instead of declaring its own fallback value.
// ============================================

// Long-run inflation-adjusted average return for a diversified U.S. stock
// portfolio. See appreciation.js's investmentValue() for the FV mechanics
// this feeds into, and the Discovery Journey's investment-assumption
// disclosure caption for the user-facing statement of this same figure.
export const DEFAULT_INVEST_RETURN_RATE = 7.0;
