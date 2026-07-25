// ============================================
// RealWorldIQ — Scenario: Buy Starter Home
//
// Models the financial outcome of purchasing
// a primary residence. Tracks equity from both
// loan paydown AND appreciation, net of all
// ownership costs.
//
// Key inputs:
//   homePrice         — purchase price
//   downPayment       — cash down (dollars)
//   interestRate      — mortgage rate (annual %)
//   savings           — remaining savings after down payment
//   monthlyRent       — what they were paying (for comparison)
//   monthlyIncome     — gross monthly income (drives the investment floor)
//   county            — county parameter object from Supabase
//   termYears         — loan term (default 30)
//   years             — simulation horizon (default 20)
//
// Key outputs at each snapshot year:
//   netWorth          — equity + portfolio - liabilities
//   homeEquity        — appreciated value minus loan balance
//   mortgageBalance   — remaining loan balance
//   appreciation band — conservative / base / optimistic
//   totalHousingCost  — cumulative ownership costs
//
// INVESTMENT CONTRIBUTION (Release Candidate directive): homeownership
// should not model investing as fully replaced by the mortgage. See the
// contribution block below for the floor-vs-surplus mechanics.
// ============================================

import { appreciationBand, appreciatedValue,
         investmentValue }                 from '../utils/appreciation.js';
import { monthlyPayment, loanAmount,
         buildAmortTable }                 from '../utils/amortization.js';
import { monthlyOwnerCost, annualTaxSavings,
         downPaymentOpportunityCost,
         buildSnapshot, buildScenarioResult,
         buildWealthComposition,
         buildHomeEquityComposition, buildPortfolioComposition,
         SNAPSHOT_YEARS }                  from '../utils/networth.js';
import { DEFAULT_INVEST_RETURN_RATE }      from '../utils/constants.js';


// ─── MAIN EXPORT ──────────────────────────────────
export function runBuyScenario(inputs) {
  const {
    homePrice,
    downPayment       = 20000,
    interestRate      = 7.0,
    savings           = 0,
    monthlyRent       = 1800,   // for opportunity cost comparison
    monthlyIncome     = 5833,   // gross monthly income (28% budget + investment floor)
    county,
    termYears         = 30,
    years             = 20,
    investReturnRate  = DEFAULT_INVEST_RETURN_RATE
  } = inputs;

  // ── Loan setup ────────────────────────────────────
  const loan        = loanAmount(homePrice, downPayment);
  const piPayment   = monthlyPayment(loan, interestRate, termYears);
  const ownerCost   = monthlyOwnerCost(piPayment, homePrice, county.property_tax_rate);

  // Remaining savings after down payment (invested)
  const remainingSavings = Math.max((savings || 0) - downPayment, 0);

  // Monthly surplus/deficit vs. renting — retained purely as a comparison
  // display figure (e.g. "you'll pay $X more/less than renting"). It no
  // longer drives the investment contribution below; see that block for why.
  const monthlyCashFlow = round2(monthlyRent - ownerCost);

  // ── Ongoing investment contribution ───────────────────────────────
  // Per the Release Candidate directive: Home Purchase should not model
  // homeownership as replacing investing altogether. Two components:
  //
  //   1) budgetSurplus — the same 28%-of-gross-income housing-budget model
  //      already used by Rent/Invest/House Hack (housingBudget - ownerCost,
  //      floored at 0). Often $0 for a starter-home purchase, since P&I +
  //      tax + insurance + maintenance frequently exceeds 28% of income on
  //      its own — that's expected, not a bug.
  //   2) minimumHabit — a deliberate floor representing a homeowner who
  //      reduces, but does not eliminate, investing while adjusting to a
  //      mortgage. Modeled as a fixed percentage of gross income
  //      (HOME_PURCHASE_MIN_INVEST_RATE), per the approved 3–5% range.
  //
  // The two are NOT additive — a homeowner with genuine budget surplus
  // beyond the floor should see that larger number, not the floor stacked
  // on top of it. Monthly contribution = the greater of the two, so a
  // favorable budget surplus is honored, and a $0/negative one still
  // guarantees the floor.
  const HOME_PURCHASE_MIN_INVEST_RATE = 0.04; // 4% of gross income — midpoint of the approved 3–5% range
  const HOUSING_BUDGET_RATIO          = 0.28;
  const housingBudget  = round2((monthlyIncome || 0) * HOUSING_BUDGET_RATIO);
  const budgetSurplus  = round2(Math.max(housingBudget - ownerCost, 0));
  const minimumHabit   = round2((monthlyIncome || 0) * HOME_PURCHASE_MIN_INVEST_RATE);
  const monthlyInvestContribution   = round2(Math.max(budgetSurplus, minimumHabit));
  const usingMinimumFloor           = minimumHabit > budgetSurplus;
  const annualPortfolioContribution = Math.max(monthlyInvestContribution * 12, 0);

  // ── Amortization table ────────────────────────────
  const amortTable = buildAmortTable(loan, interestRate, termYears);

  // ── Build snapshots ───────────────────────────────
  const snapshots = [];
  let cumulativeHousingCost = downPayment; // down payment is a cost
  let cumulativeTaxSavings  = 0;

  for (let year = 1; year <= Math.max(...SNAPSHOT_YEARS); year++) {
    // Annual ownership costs
    const annualPIPayment   = piPayment * 12;
    const annualTax         = homePrice * county.property_tax_rate;
    const annualInsurance   = homePrice * 0.006;
    const annualMaintenance = homePrice * 0.01;
    const annualOwnerCost   = annualPIPayment + annualTax + annualInsurance + annualMaintenance;

    cumulativeHousingCost += annualOwnerCost;

    // Tax savings on mortgage interest
    const amortYear = amortTable[year - 1];
    const interestThisYear = amortYear?.interestPaid || 0;
    const taxSavingsThisYear = annualTaxSavings(interestThisYear);
    cumulativeTaxSavings += taxSavingsThisYear;

    if (SNAPSHOT_YEARS.includes(year)) {
      // Home value — three band projection
      const band = appreciationBand(homePrice, county, year);

      // Mortgage balance at this year
      const mortgageBalance = amortYear?.endBalance || 0;

      // Home equity = appreciated value minus remaining loan (base case)
      const homeEquityBase         = round2(band.base         - mortgageBalance);
      const homeEquityConservative = round2(band.conservative - mortgageBalance);
      const homeEquityOptimistic   = round2(band.optimistic   - mortgageBalance);

      // Portfolio: remaining savings compounding
      const portfolioValue = investmentValue(
        remainingSavings,
        annualPortfolioContribution,
        investReturnRate,
        year
      );

      const snapshot = buildSnapshot(
        { homeValue: band.base, portfolio: portfolioValue },
        { mortgageBalance },
        { monthly: monthlyCashFlow },
        { scenario: 'buy', year, county: county.county_name }
      );

      // Wealth Composition — the exact two figures that sum to snapshot.netWorth.
      // Mortgage tax savings and down-payment opportunity cost (below) are
      // NOT part of this breakdown and never have been — they're teaching
      // comparisons, not components of the total. See buildSnapshot's
      // CONTRACT note in networth.js.
      snapshot.netWorthComposition = buildWealthComposition(homeEquityBase, portfolioValue);

      // Add buy-specific fields
      snapshot.homeEquity = {
        conservative: homeEquityConservative,
        base:         homeEquityBase,
        optimistic:   homeEquityOptimistic
      };
      snapshot.homeValue = {
        conservative: band.conservative,
        base:         band.base,
        optimistic:   band.optimistic
      };
      snapshot.mortgageBalance        = round2(mortgageBalance);
      snapshot.cumulativeHousingCost  = round2(cumulativeHousingCost);
      snapshot.cumulativeTaxSavings   = round2(cumulativeTaxSavings);
      snapshot.portfolioValue         = portfolioValue;
      snapshot.equityFromPaydown      = amortYear?.cumulativeEquity || 0;
      snapshot.equityFromAppreciation = round2(
        band.base - homePrice // appreciation gain only
      );

      // Sub-breakdowns for the Net Worth Breakdown modal — Home Equity's
      // three plain-language parts and Portfolio's three plain-language
      // parts. Both reconcile exactly to the totals above.
      snapshot.homeEquityComposition = buildHomeEquityComposition(
        downPayment,
        snapshot.equityFromPaydown,
        snapshot.equityFromAppreciation
      );
      snapshot.portfolioComposition = buildPortfolioComposition(
        remainingSavings,
        annualPortfolioContribution,
        year,
        portfolioValue
      );

      snapshots.push(snapshot);
    }
  }

  // ── Summary stats ─────────────────────────────────
  const finalSnapshot = snapshots[snapshots.length - 1];
  const yr10Snapshot  = snapshots.find(s => s.year === 10);

  // Opportunity cost of down payment at year 20
  const oppCost20 = downPaymentOpportunityCost(downPayment, 20, investReturnRate);

  const summary = {
    totalHousingCost:    finalSnapshot.cumulativeHousingCost,
    totalEquityBuilt:    finalSnapshot.homeEquity.base,
    // NOT part of net worth — see the comment on the two fields below.
    totalTaxSavings:     finalSnapshot.cumulativeTaxSavings,
    opportunityCost:     oppCost20,
    monthlyCashFlow,
    piPayment:           round2(piPayment),
    ownerCost:           round2(ownerCost),
    loanAmount:          round2(loan),

    // The UI-facing "what makes up this total" breakdown — reconcile any
    // displayed Projected Net Worth figure against this, not against
    // totalTaxSavings/opportunityCost above. Those two are real, useful
    // teaching numbers, but they are NOT added into net worth anywhere in
    // this calculation — they never have been. Surfacing them in the same
    // card as the total without this distinction is what caused the
    // "where does the rest of the $2.58M come from" confusion.
    netWorthComposition: finalSnapshot.netWorthComposition,

    // Investment-contribution transparency (mirrors House Hack's
    // cashFlows/surplusMonthly pattern) — lets the results screen show
    // WHY the contribution is what it is, rather than a bare portfolio
    // number with no context, especially when budgetSurplus is $0 and
    // the floor is doing all the work.
    housingBudget:              housingBudget,
    budgetSurplus:              budgetSurplus,
    minimumInvestHabit:         minimumHabit,
    monthlyInvestContribution:  monthlyInvestContribution,
    usingMinimumFloor:          usingMinimumFloor,

    teachingMoments: {
      equityAt5:          snapshots.find(s => s.year === 5)?.homeEquity.base,
      equityAt10:         yr10Snapshot?.homeEquity.base,
      equityAt20:         finalSnapshot.homeEquity.base,
      appreciationGain20: finalSnapshot.equityFromAppreciation,
      paydownGain20:      finalSnapshot.equityFromPaydown,
      taxSavings20:       finalSnapshot.cumulativeTaxSavings,
      downPaymentOppCost: oppCost20,
      netWorthAt10:       yr10Snapshot?.netWorth,
      netWorthAt20:       finalSnapshot.netWorth,
      // House-purchase investing-habit story (mirrors House Hack's
      // surplusInvestedMonthly teaching moment)
      monthlyInvestContribution,
      usingMinimumFloor
    }
  };

  return buildScenarioResult('buy', snapshots, summary, {
    homePrice,
    downPayment,
    interestRate,
    county:        county.county_name,
    loan:          round2(loan),
    piPayment:     round2(piPayment),
    ownerCost:     round2(ownerCost),
    monthlyCashFlow,
    monthlyIncome,
    monthlyInvestContribution
  });
}


// ─── HELPER ───────────────────────────────────────
function round2(num) {
  return Math.round(num * 100) / 100;
}