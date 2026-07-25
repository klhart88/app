// ============================================
// RealWorldIQ — Scenario: Continue Renting
//
// Models the financial outcome of a user who
// continues renting and invests the difference
// between what they'd spend owning vs. renting.
//
// Key inputs:
//   monthlyRent       — current rent payment
//   savings           — current savings / net worth
//   monthlyIncome     — gross monthly income
//   targetHomePrice   — what they'd buy (for comparison)
//   downPayment       — what they'd put down (invested instead)
//   interestRate      — current mortgage rate (for comparison)
//   county            — county parameter object from Supabase
//   years             — simulation horizon (default 20)
//
// Key outputs at each snapshot year:
//   netWorth          — portfolio value minus liabilities
//   portfolioValue    — invested savings + ongoing contributions
//   totalRentPaid     — cumulative rent cost
//   monthlyRent       — rent at that year (escalated)
//   opportunityCost   — what buying would have built instead
// ============================================

import { escalatedRent, investmentValue } from '../utils/appreciation.js';
import { monthlyPayment, loanAmount }      from '../utils/amortization.js';
import { monthlyOwnerCost, downPaymentOpportunityCost,
         buildSnapshot, buildScenarioResult,
         buildWealthComposition, buildPortfolioComposition,
         SNAPSHOT_YEARS }                  from '../utils/networth.js';
import { DEFAULT_INVEST_RETURN_RATE }      from '../utils/constants.js';


// ─── MAIN EXPORT ──────────────────────────────────
export function runRentScenario(inputs) {
  const {
    monthlyRent,
    savings,
    monthlyIncome,
    targetHomePrice,
    downPayment       = 20000,
    interestRate      = 7.0,
    county,
    years             = 20,
    rentIncreaseRate  = 3.0,
    investReturnRate  = DEFAULT_INVEST_RETURN_RATE
  } = inputs;

  // ── What would they pay if they bought? ──────────
  // Kept for the side-by-side comparison stats (ownerCost is still reported),
  // but it is NO LONGER the basis for how much the renter invests. See below.
  const loanAmt   = loanAmount(targetHomePrice, downPayment);
  const piPayment = monthlyPayment(loanAmt, interestRate, 30);
  const ownerCost = monthlyOwnerCost(piPayment, targetHomePrice, county.property_tax_rate);

  // ── How much does the renter actually invest each month? ──
  // GROUNDED-IN-MEANS model (28% DTI). The amount a renter can realistically
  // invest is NOT "the gap between a mortgage they didn't take and their rent"
  // — that gap is defined by the home's price, not by the renter's wallet, and
  // assuming they bank all of it credits money the profile never contained.
  // Instead we anchor to a defensible housing budget: the classic 28% front-end
  // debt-to-income ratio applied to gross income. The renter spends `monthlyRent`
  // on housing and invests whatever of that budget is left over.
  //   housingBudget      = 28% of gross monthly income
  //   monthlySurplus     = housingBudget − rent   (floored at 0)
  // If rent meets or exceeds 28% of income, there is no surplus to invest (they
  // are housing-stretched), so we floor at 0 rather than letting it go negative.
  const HOUSING_BUDGET_RATIO = 0.28;
  const housingBudget  = round2((monthlyIncome || 0) * HOUSING_BUDGET_RATIO);
  const monthlySurplus = round2(Math.max(housingBudget - monthlyRent, 0));

  // Annual investment contribution from the budget surplus.
  const annualContribution = Math.max(monthlySurplus * 12, 0);

  // Starting portfolio = the renter's liquid savings, invested.
  // NOTE: we do NOT add downPayment here. The down payment is not a separate
  // pile of cash — it is part of `savings`. A renter simply keeps their full
  // savings invested; a buyer (see buy.js) DEPLETES savings by the down payment
  // (remainingSavings = savings − downPayment) and puts that into the home. So
  // the fair mirror is: renter invests `savings`; buyer invests
  // `savings − downPayment` + builds home equity. Adding downPayment here
  // double-counted it, inflating the renter's net worth by the down payment.
  const startingPortfolio = savings;

  // ── Build snapshots ───────────────────────────────
  const snapshots = [];
  let cumulativeRentPaid = 0;

  // Track rent paid year by year
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

      const currentMonthlyRent = escalatedRent(monthlyRent, year, rentIncreaseRate);

      const snapshot = buildSnapshot(
        { homeValue: 0, portfolio: portfolioValue },
        { mortgageBalance: 0 },
        { monthly: Math.max(ownerCost - currentMonthlyRent, 0) },
        { scenario: 'rent', year, county: county.county_name }
      );

      // Add rent-specific fields
      snapshot.monthlyRent       = currentMonthlyRent;
      snapshot.cumulativeRentPaid = round2(cumulativeRentPaid);
      snapshot.portfolioValue    = portfolioValue;

      // Wealth Composition — renters build no home equity, so this is
      // always a single-line breakdown (homeEquity fixed at 0, not omitted,
      // so the UI can render a "$0 Home Equity" row rather than a missing
      // one). See buildSnapshot's CONTRACT note in networth.js.
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
    totalHousingCost:  finalSnapshot.cumulativeRentPaid,
    totalEquityBuilt:  0, // renters build no home equity
    opportunityCost:   0, // renting IS the opportunity cost baseline
    monthlySurplus:    monthlySurplus,
    startingPortfolio,
    annualContribution,
    finalPortfolioValue: finalSnapshot.portfolioValue,

    // The UI-facing "what makes up this total" breakdown.
    netWorthComposition: finalSnapshot.netWorthComposition,

    // Teaching moment data
    teachingMoments: {
      rentAt10Years:   yr10Snapshot?.monthlyRent,
      rentAt20Years:   finalSnapshot.monthlyRent,
      totalRentPaid20: finalSnapshot.cumulativeRentPaid,
      portfolioAt10:   yr10Snapshot?.portfolioValue,
      portfolioAt20:   finalSnapshot.portfolioValue,
      investedVsRented: round2(
        finalSnapshot.portfolioValue - finalSnapshot.cumulativeRentPaid
      )
    }
  };

  return buildScenarioResult('rent', snapshots, summary, {
    monthlyRent,
    savings,
    targetHomePrice,
    downPayment,
    interestRate,
    county:           county.county_name,
    monthlySurplus,
    ownerCostForComparison: ownerCost
  });
}


// ─── HELPER ───────────────────────────────────────
function round2(num) {
  return Math.round(num * 100) / 100;
}