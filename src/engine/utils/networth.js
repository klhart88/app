// ============================================
// RealWorldIQ — Net Worth Output Formatter
//
// Standardizes the output structure returned by
// every scenario. The UI always receives the same
// shape regardless of which scenario ran.
//
// Also contains shared cost calculations used
// across multiple scenarios (insurance, maintenance,
// HOA, tax savings, opportunity cost).
// ============================================

import { DEFAULT_INVEST_RETURN_RATE } from './constants.js';


// ─── SNAPSHOT YEARS ───────────────────────────────
// The time horizons we report on. Every scenario
// produces values at each of these years.
export const SNAPSHOT_YEARS = [1, 3, 5, 10, 20];


// ─── BUILD NET WORTH SNAPSHOT ─────────────────────
// Constructs a single year's output object.
// Called by each scenario for each snapshot year.
//
// assets:      { homeValue, portfolio, other }
// liabilities: { mortgageBalance, other }
// cashFlow:    { monthly (positive = surplus) }
// meta:        { scenario, year, county }
//
// CONTRACT: netWorth = sum(assets) - sum(liabilities), and nothing else.
// `other` exists as an extension point on both sides but is NEVER populated
// by any scenario today — every scenario's net worth is exactly
// homeValue - mortgageBalance + portfolio. Figures like mortgage tax savings
// and down-payment opportunity cost are deliberately NOT part of assets/
// liabilities anywhere in this codebase — they are teaching-stat
// comparisons, not components of the total. If a new component is ever
// meant to actually count toward net worth, it must be added into assets/
// liabilities here, not just displayed in a summary — otherwise it will
// silently be excluded from the total the same way tax savings and
// opportunity cost currently are. See buildWealthComposition() below for the
// UI-facing breakdown of what IS in the total.
export function buildSnapshot(assets, liabilities, cashFlow, meta) {
  const totalAssets      = sum(Object.values(assets));
  const totalLiabilities = sum(Object.values(liabilities));
  const netWorth         = round2(totalAssets - totalLiabilities);

  return {
    year:            meta.year,
    scenario:        meta.scenario,
    county:          meta.county || null,

    // Core output — what the UI displays prominently
    netWorth,
    totalAssets:     round2(totalAssets),
    totalLiabilities: round2(totalLiabilities),

    // Asset breakdown
    assets: {
      homeValue:   round2(assets.homeValue   || 0),
      portfolio:   round2(assets.portfolio   || 0),
      other:       round2(assets.other       || 0)
    },

    // Liability breakdown
    liabilities: {
      mortgageBalance: round2(liabilities.mortgageBalance || 0),
      other:           round2(liabilities.other           || 0)
    },

    // Cash flow (monthly)
    cashFlow: {
      monthly: round2(cashFlow.monthly || 0),
      annual:  round2((cashFlow.monthly || 0) * 12)
    }
  };
}


// ─── BUILD WEALTH COMPOSITION ──────────────────────
// The UI-facing "what does this total consist of" breakdown, per the
// results-screen transparency fix. Every scenario's net worth is exactly
// homeEquity + investmentPortfolio (see the CONTRACT note on buildSnapshot
// above) — this is the single place that packages those two numbers plus
// their sum, so every scenario file produces the breakdown the same way
// instead of five separate ad-hoc calculations that could drift apart.
//
// homeEquity: 0 for scenarios/phases with no home (Rent, Invest, Wait while
// still waiting) — always pass 0 explicitly rather than omitting the field,
// so the UI can render a "$0" Home Equity line rather than a missing one.
//
// Returns: { homeEquity, investmentPortfolio, total }
// `total` should always equal the snapshot's own `netWorth` field — these
// are computed independently as a deliberate reconciliation check; if they
// ever disagree, something has silently added or dropped a component.
export function buildWealthComposition(homeEquity, investmentPortfolio) {
  const he   = round2(homeEquity        || 0);
  const port = round2(investmentPortfolio || 0);
  return {
    homeEquity:          he,
    investmentPortfolio: port,
    total:               round2(he + port)
  };
}



// The complete object returned by every scenario.
// Contains snapshots at each SNAPSHOT_YEAR plus
// summary stats and teaching moment data.
//
// snapshots: array of buildSnapshot() results
// summary:   { totalHousingCost, totalEquityBuilt,
//              opportunityCost, teachingMoments }
export function buildScenarioResult(scenarioName, snapshots, summary, inputs) {
  return {
    scenario:   scenarioName,
    inputs:     inputs,
    snapshots:  snapshots,
    summary:    {
      totalHousingCost:  round2(summary.totalHousingCost  || 0),
      totalEquityBuilt:  round2(summary.totalEquityBuilt  || 0),
      opportunityCost:   round2(summary.opportunityCost   || 0),
      ...summary
    },
    // Convenience: net worth at each snapshot year as flat object
    // e.g. { yr1: 45000, yr3: 67000, yr5: 92000, yr10: 180000, yr20: 420000 }
    netWorthByYear: Object.fromEntries(
      snapshots.map(s => [`yr${s.year}`, s.netWorth])
    )
  };
}


// ─── BUILD HOME EQUITY COMPOSITION ────────────────
// The three plain-language components of Home Equity, for the Net Worth
// Breakdown modal — Down Payment, Principal Paid (paydown to date), Home
// Appreciation (gain to date). These three ALWAYS sum to exactly the same
// homeEquity figure used in buildWealthComposition() above — same identity
// buildSnapshot's CONTRACT describes, just one level more granular. No
// formula is exposed here, only the three dollar figures.
//
// downPayment: constant across all years (the original cash down)
// principalPaid: cumulative principal paid to date (amortTable's
//   cumulativeEquity — already tracked per scenario)
// appreciationGain: cumulative home-value gain to date (band.base - homePrice
//   — already tracked per scenario as equityFromAppreciation)
export function buildHomeEquityComposition(downPayment, principalPaid, appreciationGain) {
  const dp   = round2(downPayment      || 0);
  const pp   = round2(principalPaid    || 0);
  const app  = round2(appreciationGain || 0);
  return {
    downPayment:      dp,
    principalPaid:    pp,
    appreciationGain: app,
    total:            round2(dp + pp + app)
  };
}


// ─── BUILD PORTFOLIO COMPOSITION ──────────────────
// The three plain-language components of the Investment Portfolio, for the
// same modal — Starting Savings Invested, New Contributions, Investment
// Growth. These three sum to exactly the portfolio value produced by
// investmentValue() (see appreciation.js) for the same year — again, no
// formula exposed, just the three figures a curious user actually cares
// about.
//
// startingPrincipal: the lump sum invested at year 0 (remainingSavings or
//   savings, depending on the scenario/phase) — constant across years.
// annualContribution: the scenario's constant yearly contribution amount
//   (0 for Wait, which never contributes) — used with `year` to get the
//   NOMINAL cumulative amount contributed to date (no growth attributed to
//   contributions specifically; any compounding on them is folded into
//   `growth` below, since users don't need "growth on my growth" as a
//   separate concept).
// year: the snapshot year.
// portfolioValue: the actual computed value from investmentValue() for this
//   year — growth is derived as whatever's left over, so this always
//   reconciles exactly regardless of compounding specifics.
export function buildPortfolioComposition(startingPrincipal, annualContribution, year, portfolioValue) {
  const principal          = round2(startingPrincipal || 0);
  const nominalContributed = round2((annualContribution || 0) * (year || 0));
  const total              = round2(portfolioValue || 0);
  const growth             = round2(total - principal - nominalContributed);
  return {
    startingPrincipal: principal,
    newContributions:  nominalContributed,
    investmentGrowth:  growth,
    total
  };
}


// ─── SHARED COST CALCULATORS ──────────────────────

// Annual homeowner's insurance estimate
// Typically 0.5–1% of home value. We use 0.6%.
export function annualInsurance(homeValue) {
  return round2(homeValue * 0.006);
}

// Annual maintenance estimate
// Rule of thumb: 1% of home value per year.
export function annualMaintenance(homeValue) {
  return round2(homeValue * 0.01);
}

// Monthly property tax from annual rate
export function monthlyPropertyTax(homeValue, annualTaxRate) {
  return round2((homeValue * annualTaxRate) / 12);
}

// Monthly insurance
export function monthlyInsurance(homeValue) {
  return round2(annualInsurance(homeValue) / 12);
}

// Monthly maintenance
export function monthlyMaintenance(homeValue) {
  return round2(annualMaintenance(homeValue) / 12);
}

// Total monthly housing cost for a buyer
// (P&I payment + tax + insurance + maintenance)
export function monthlyOwnerCost(
  piPayment,
  homeValue,
  annualTaxRate
) {
  return round2(
    piPayment +
    monthlyPropertyTax(homeValue, annualTaxRate) +
    monthlyInsurance(homeValue) +
    monthlyMaintenance(homeValue)
  );
}

// Mortgage interest tax deduction savings (simplified)
// Assumes 22% federal marginal rate (middle bracket).
// Only interest is deductible, not full payment.
// Returns annual tax savings.
export function annualTaxSavings(annualInterestPaid, marginalRate = 0.22) {
  return round2(annualInterestPaid * marginalRate);
}

// Opportunity cost of down payment
// The down payment could have been invested instead.
// Returns what it would be worth at a given year.
export function downPaymentOpportunityCost(
  downPayment,
  year,
  returnRate = DEFAULT_INVEST_RETURN_RATE
) {
  const r = returnRate / 100;
  const futureValue = downPayment * Math.pow(1 + r, year);
  return round2(futureValue - downPayment);
}


// ─── HELPERS ──────────────────────────────────────
function round2(num) {
  return Math.round(num * 100) / 100;
}

function sum(arr) {
  return arr.reduce((acc, val) => acc + (val || 0), 0);
}