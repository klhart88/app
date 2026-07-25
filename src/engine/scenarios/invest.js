// ============================================
// RealWorldIQ — Scenario: Invest in Stock Market
//
// Models the outcome of skipping real estate
// entirely and investing the down payment plus
// monthly savings into a diversified portfolio.
//
// This is the honest alternative that prevents
// the app from feeling like a real estate ad.
// Sometimes investing beats buying — especially
// in short timeframes or high price markets.
//
// Key inputs:
//   savings           — total savings (fully invested)
//   monthlyRent       — ongoing rent payment
//   targetHomePrice   — what they'd buy (for comparison)
//   downPayment       — invested instead of used as down payment
//   interestRate      — current mortgage rate (for comparison)
//   county            — county parameter object
//   investReturnRate  — annual portfolio return (default 7%)
// ============================================

import { investmentValue, escalatedRent }  from '../utils/appreciation.js';
import { monthlyPayment, loanAmount }       from '../utils/amortization.js';
import { monthlyOwnerCost, buildSnapshot,
         buildScenarioResult,
         buildWealthComposition, buildPortfolioComposition,
         SNAPSHOT_YEARS }                   from '../utils/networth.js';
import { DEFAULT_INVEST_RETURN_RATE }       from '../utils/constants.js';


// ─── MAIN EXPORT ──────────────────────────────────
export function runInvestScenario(inputs) {
  const {
    savings           = 20000,
    monthlyRent       = 1800,
    monthlyIncome     = 5833,
    targetHomePrice   = 285000,
    downPayment       = 20000,
    interestRate      = 7.0,
    county,
    investReturnRate  = DEFAULT_INVEST_RETURN_RATE,
    rentIncreaseRate  = 3.0,
    years             = 20
  } = inputs;

  // ── What would they pay if they bought? ──────────
  // Retained for comparison stats only — no longer the basis for contributions.
  const loanAmt   = loanAmount(targetHomePrice, downPayment);
  const piPayment = monthlyPayment(loanAmt, interestRate, 30);
  const ownerCost = monthlyOwnerCost(piPayment, targetHomePrice, county.property_tax_rate);

  // ── Monthly amount invested ──────────────────────
  // GROUNDED-IN-MEANS model (28% DTI), identical basis to the rent scenario:
  // the investor sets aside a housing budget of 28% of gross income, spends
  // `monthlyRent` on housing, and invests the remainder. This replaces the old
  // "invest the owner-vs-rent gap" basis, which credited money defined by the
  // home's price rather than the user's income. Floored at 0 when rent ≥ budget.
  const HOUSING_BUDGET_RATIO = 0.28;
  const housingBudget  = round2((monthlyIncome || 0) * HOUSING_BUDGET_RATIO);
  const monthlySurplus = round2(Math.max(housingBudget - monthlyRent, 0));

  // All savings go into the market immediately; budget surplus invested monthly.
  const startingPortfolio    = savings; // full savings invested, not split for down payment
  const annualContribution   = Math.max(monthlySurplus * 12, 0);

  // ── Build snapshots ───────────────────────────────
  const snapshots = [];
  let cumulativeRentPaid = 0;

  for (let year = 1; year <= Math.max(...SNAPSHOT_YEARS); year++) {
    const rentThisYear = escalatedRent(monthlyRent, year, rentIncreaseRate) * 12;
    cumulativeRentPaid += rentThisYear;

    if (SNAPSHOT_YEARS.includes(year)) {
      const portfolioValue = investmentValue(
        startingPortfolio,
        annualContribution,
        investReturnRate,
        year
      );

      const currentRent = escalatedRent(monthlyRent, year, rentIncreaseRate);

      const snapshot = buildSnapshot(
        { homeValue: 0, portfolio: portfolioValue },
        { mortgageBalance: 0 },
        { monthly: Math.max(ownerCost - currentRent, 0) },
        { scenario: 'invest', year, county: county.county_name }
      );

      snapshot.portfolioValue     = portfolioValue;
      snapshot.currentMonthlyRent = currentRent;
      snapshot.cumulativeRentPaid = round2(cumulativeRentPaid);
      snapshot.investmentGain     = round2(portfolioValue - startingPortfolio - (annualContribution * year));

      // Wealth Composition — no real estate in this scenario, so this is
      // always a single-line breakdown (homeEquity fixed at 0, not omitted).
      // See buildSnapshot's CONTRACT note in networth.js.
      snapshot.netWorthComposition = buildWealthComposition(0, portfolioValue);

      // Sub-breakdown for the Net Worth Breakdown modal — no Home Equity
      // composition applies here (nothing to break down).
      snapshot.portfolioComposition = buildPortfolioComposition(
        startingPortfolio,
        annualContribution,
        year,
        portfolioValue
      );

      snapshots.push(snapshot);
    }
  }

  // ── Summary stats ─────────────────────────────────
  const finalSnapshot = snapshots[snapshots.length - 1];
  const yr10Snapshot  = snapshots.find(s => s.year === 10);

  const summary = {
    totalHousingCost:    finalSnapshot.cumulativeRentPaid,
    totalEquityBuilt:    0,
    opportunityCost:     0,
    startingPortfolio,
    annualContribution,
    monthlySurplus,

    // The UI-facing "what makes up this total" breakdown.
    netWorthComposition: finalSnapshot.netWorthComposition,

    teachingMoments: {
      // Key question: does market beat real estate here?
      portfolioAt10:       yr10Snapshot?.portfolioValue,
      portfolioAt20:       finalSnapshot.portfolioValue,
      totalRentPaid20:     finalSnapshot.cumulativeRentPaid,
      investmentGain20:    finalSnapshot.investmentGain,
      rentAt20:            finalSnapshot.currentMonthlyRent,
      // No leverage, no forced savings, no tax deduction
      // but full liquidity and no maintenance
      noLeverageNote:      'Portfolio is fully liquid. No leverage applied.',
      noForcedSavingsNote: 'Discipline required to invest surplus monthly.'
    }
  };

  return buildScenarioResult('invest', snapshots, summary, {
    savings,
    monthlyRent,
    targetHomePrice,
    downPayment,
    interestRate,
    county:            county.county_name,
    investReturnRate,
    startingPortfolio,
    annualContribution,
    monthlySurplus,
    ownerCostForComparison: ownerCost
  });
}


// ─── HELPER ───────────────────────────────────────
function round2(num) {
  return Math.round(num * 100) / 100;
}