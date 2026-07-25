// ============================================================================
// RealEquityIQ — Lens Insights (secondary-scenario "aha" content)
//
// One curiosity-toned "aha" per secondary scenario, fired ONCE at the single
// milestone beat where that lens is most illuminating. Secondaries do NOT
// fork the map or inject wealth math — they inject PERSPECTIVE. This module
// is the content layer; persistence lives in the lens_insight_views table
// (record_insight_view RPC), and the map renders the tappable markers.
//
// ── KEY SCHEME ──────────────────────────────────────────────────────────────
// insight_key = `lens_<scenario>__<milestone>` (e.g. 'lens_wait__email_unlock')
// This is the same string passed to record_insight_view({ p_key }) and stored
// in lens_insight_views.insight_key. One aha per lens TODAY, but the key shape
// supports multiple-per-lens later with zero migration.
//
// ── CONTENT MODEL: per-lens now, per-primary override later ──────────────────
// Each lens has ONE default aha (shown regardless of which primary the user is
// walking). The `overrides` slot is the seam for per-primary tailoring later:
// drop in `overrides: { buy: { headline, body } }` for a specific pairing that
// earns sharper wording, WITHOUT restructuring anything. Empty now by design.
//
// ── SHAPE MIRRORS THE TABLE ──────────────────────────────────────────────────
// Structured so the eventual lift into a Supabase content table is a near
// copy-paste (lens, trigger milestone, default copy, optional overrides).
//

// ============================================================================

// Trigger-milestone choice rationale (one beat per lens, its most illuminating):
//   wait      → email_unlock      (results screen = the moment time-horizon bites)
//   invest    → compare_3_paths   (the beat the user is explicitly weighing paths)
//   rent      → first_simulation  (earliest beat; "flexibility has value" reframe)
//   househack → run_all_5         (the power-user beat; leverage idea lands deeper)
//   buy       → second_session    (returning intent = readiness-to-own reframe)
// All milestone keys verified against milestone_defs.

export const LENS_INSIGHTS = {

  // ── WAIT FOR LOWER RATES ────────────────────────────────────────────────
  wait: {
    lens: 'wait',
    triggerMilestone: 'email_unlock',
    key: 'lens_wait__email_unlock',
    label: 'The rate-watcher\u2019s view',
    default: {
      headline: 'What would waiting actually cost here?',
      // ⚠ VERIFIED: highlight that refinancing is a potential future option if rates improve, subject to market conditions and borrower eligibility.
      // ⚠ VERIFIED: emphasize that timing influences purchase price in either direction, depending on market conditions at the time of purchase.
      // ⚠ VERIFIED: keep framing centered on decision timing tradeoffs rather than predicting outcomes or implying guarantees.
      body:
        'Waiting for lower rates means balancing two things at once: ' +
        'financing terms and the purchase price can both shift over time, ' +
        'and the price is what locks in at the moment you decide to buy. ' +
        'Have you considered how market conditions might shift while you wait?',
    },
    overrides: {
      // Per-primary tailoring drops in later, e.g.:
      // buy: { headline, body }   // contrast locking now vs. waiting 12-24mo
      // rent: { headline, body }  // how long you'd keep renting while waiting
    },
  },

  // ── INVEST IN THE STOCK MARKET ──────────────────────────────────────────
  invest: {
    lens: 'invest',
    triggerMilestone: 'compare_3_paths',
    key: 'lens_invest__compare_3_paths',
    label: 'The market-investor\u2019s view',
    default: {
      headline: 'What is liquidity worth to you here?',
      // ⚠ VERIFIED: position real estate as a long-term, less immediately liquid asset compared to publicly traded investments, which generally offer faster access to capital.
      // ⚠ VERIFIED: acknowledge that higher liquidity in financial markets comes with exposure to price volatility and timing variability.
      // ⚠ VERIFIED: maintain focus on liquidity as a flexibility spectrum rather than a value judgment between asset classes.
      body:
        'A full-portfolio investor would notice the tradeoff here: real estate ' +
        'locks your capital into a less liquid form, while public assets let you ' +
        'access cash faster — though they carry higher market volatility risk. ' +
        'How important is flexibility to you versus long-term gain?',
    },
    overrides: {},
  },

  // ── CONTINUE RENTING ────────────────────────────────────────────────────
  rent: {
    lens: 'rent',
    triggerMilestone: 'first_simulation',
    key: 'lens_rent__first_simulation',
    label: 'The renter\u2019s view',
    default: {
      headline: 'What is flexibility worth here?',
      // ⚠ VERIFIED: renters generally shift ownership-related costs (taxes, maintenance, repairs) to the landlord, often in exchange for flexibility and mobility.
      // ⚠ VERIFIED: homeowners typically exchange greater long-term commitment for control, stability, and the ability to build equity over time.
      // ⚠ VERIFIED: “invest the difference” should be presented as a comparative scenario illustrating cash-flow allocation choices, not a directive or expected result.
      body:
        'Someone who keeps renting frames it differently: renting prioritizes ' +
        'mobility and a lower carrying burden, while owning shifts toward equity ' +
        'and commitment. Each path changes your risk and your long-term outcome. ' +
        'How much flexibility fits your time horizon right now?',
    },
    overrides: {},
  },

  // ── BUY A DUPLEX & HOUSE HACK ───────────────────────────────────────────
  househack: {
    lens: 'househack',
    triggerMilestone: 'run_all_5',
    key: 'lens_househack__run_all_5',
    label: 'The house-hacker\u2019s view',
    default: {
      headline: 'Could a tenant carry part of this?',
      // ⚠ VERIFIED: in eligible owner-occupied multifamily scenarios, rental income may contribute toward offsetting monthly housing costs, depending on rent potential, occupancy, and operating expenses.
      // ⚠ VERIFIED: financing structure, down payment requirements, and qualification criteria vary by loan type and occupancy guidelines.
      // ⚠ VERIFIED: frame as a scenario-based strategy that demonstrates possible income offsets under certain conditions, not a guaranteed outcome.
      body:
        'A house-hacker asks the question the others skip: some owner-occupied ' +
        'homes can include rental income, where rent offsets part of the monthly ' +
        'payment — though the structure depends on occupancy and financing. ' +
        'Have you considered how different occupancy cases change the math?',
    },
    overrides: {},
  },

  // ── BUY A STARTER HOME ──────────────────────────────────────────────────
  buy: {
    lens: 'buy',
    triggerMilestone: 'second_session',
    key: 'lens_buy__second_session',
    label: 'The buyer\u2019s view',
    default: {
      headline: 'What would owning start building here?',
      // ⚠ VERIFIED: ownership can build equity over time through principal reduction and potential appreciation, recognizing that both depend on loan structure and market conditions.
      // ⚠ VERIFIED: amortization schedules typically allocate more early payments toward interest, with principal paydown accelerating gradually over time.
      // ⚠ VERIFIED: present equity building as a progressive accumulation process tied to time, payments, and market dynamics rather than immediate value creation.
      body:
        'Coming back for another look, a buyer reframes the moment: ownership ' +
        'builds equity through principal paydown, and value may grow with ' +
        'appreciation over time — though loan structure shapes how that benefit ' +
        'flows. How does your time horizon change the way you see it?',
    },
    overrides: {},
  },

};

// ── HELPERS ─────────────────────────────────────────────────────────────────

// All five scenario keys, for validation against engine.js SCENARIO_NAMES.
export const LENS_KEYS = Object.keys(LENS_INSIGHTS);

// Resolve the aha copy for a given lens, honoring a per-primary override when
// one exists for the walked primary. Falls back to the default. This is the
// single read path the map should use, so adding an override later needs no
// change at the call site.
export function getLensAha(lensKey, primaryKey) {
  const lens = LENS_INSIGHTS[lensKey];
  if (!lens) return null;
  const override = primaryKey && lens.overrides ? lens.overrides[primaryKey] : null;
  return {
    key: lens.key,
    lens: lens.lens,
    label: lens.label,
    triggerMilestone: lens.triggerMilestone,
    ...lens.default,
    ...(override || {}), // override headline/body win when present
  };
}

// Given the user's selected secondaries and the milestone the avatar has
// reached, return the lens(es) whose trigger beat is this milestone — i.e.
// the ahas that should fire here. (A secondary is never its own primary.)
export function ahasForMilestone(milestoneKey, secondaryKeys = [], primaryKey = null) {
  return secondaryKeys
    .filter((k) => k !== primaryKey)
    .map((k) => LENS_INSIGHTS[k])
    .filter((lens) => lens && lens.triggerMilestone === milestoneKey)
    .map((lens) => getLensAha(lens.lens, primaryKey));
}