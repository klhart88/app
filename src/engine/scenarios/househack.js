// ============================================
// RealWorldIQ — Scenario: Buy Duplex / House Hack
//
// Models purchasing a duplex, living in one unit
// and renting the other. Rental income offsets
// ownership costs, often making this the most
// powerful wealth-building path in the game.
//
// Key inputs:
//   homePrice         — duplex purchase price
//   downPayment       — cash down (dollars)
//   interestRate      — mortgage rate (annual %)
//   savings           — total savings before purchase
//   monthlyRent       — what they were paying (now $0)
//   rentalIncome      — monthly rent from tenant unit
//   county            — county parameter object
//   termYears         — loan term (default 30)
//   years             — simulation horizon (default 20)
//
// Key mechanics:
//   - Buyer lives in one unit (no more rent payment)
//   - Tenant pays rent into the equation
//   - Net monthly cost = owner costs - rental income
//   - Appreciation applies to full duplex value
//   - Rental income escalates at 3%/year
// ============================================

import { appreciationBand, escalatedRent,
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
export function runHouseHackScenario(inputs) {
  const {
    homePrice,
    downPayment       = 20000,
    interestRate      = 7.0,
    savings           = 0,
    monthlyRent       = 1800,   // what they used to pay — now $0
    monthlyIncome     = 5833,   // gross monthly income (for 28% DTI budget)
    rentalIncome      = null,   // tenant's monthly rent; if null, derived below
    county,
    termYears         = 30,
    years             = 20,
    rentIncreaseRate  = 3.0,    // annual rent escalation
    investReturnRate  = DEFAULT_INVEST_RETURN_RATE,
    vacancyRate       = 0.08    // 8% vacancy allowance
  } = inputs;

  // ── Tenant rent: derived from purchase price (rent-to-price ratio) ──
  // The tenant unit's market rent is tied to WHAT YOU BOUGHT, not the area
  // median (which is disconnected from the specific property). We use a monthly
  // rent-to-price ratio applied to HALF the building value, since the owner
  // occupies one unit of the duplex and rents the other. 0.7%/mo is a realistic
  // midpoint for these markets (the classic "1% rule" is rarely attainable at
  // today's prices; 0.6–0.8% is the practical band). Exposed in the summary so
  // the UI can show the derivation and disclaimer #1 can reference it.
  // An explicit rentalIncome input always overrides this estimate.
  const RENT_TO_PRICE_RATIO = 0.007;            // 0.7% per month
  const tenantUnitValue     = homePrice / 2;    // owner lives in the other half
  const derivedRentalIncome = round2(tenantUnitValue * RENT_TO_PRICE_RATIO);
  const grossRentalIncome   = rentalIncome != null ? rentalIncome : derivedRentalIncome;

  // ── Loan setup ────────────────────────────────────
  const loan      = loanAmount(homePrice, downPayment);
  const piPayment = monthlyPayment(loan, interestRate, termYears);

  // Full owner cost (taxes, insurance, maintenance on full duplex)
  // Duplex maintenance is slightly higher — use 1.2% vs 1%
  const monthlyTax         = round2((homePrice * county.property_tax_rate) / 12);
  const monthlyInsurance   = round2((homePrice * 0.006) / 12);
  const monthlyMaintenance = round2((homePrice * 0.012) / 12); // slightly higher for duplex
  const totalOwnerCost     = round2(piPayment + monthlyTax + monthlyInsurance + monthlyMaintenance);

  // Effective rental income after vacancy allowance
  const effectiveRentalIncome = round2(grossRentalIncome * (1 - vacancyRate));

  // Net monthly housing cost (what comes out of pocket)
  // Positive = cash flow positive (tenant covers more than costs)
  // Negative = still paying something but far less than renting alone
  const netMonthlyCost = round2(totalOwnerCost - effectiveRentalIncome);

  // Remaining savings after down payment
  const remainingSavings = Math.max((savings || 0) - downPayment, 0);

  // ── Investable surplus: CASH-FLOW OPTIMIZATION model (28% DTI) ──
  // House-hack wealth here builds through invested surplus, NOT accelerated
  // equity. Same grounded basis as the rent/invest scenarios: the owner has a
  // housing budget of 28% of gross income; the tenant's rent lowers their net
  // out-of-pocket cost (netMonthlyCost); whatever budget is left over after
  // covering that net cost is invested at the market return.
  //   surplus = housingBudget − netMonthlyCost   (floored at 0)
  // When the duplex cash-flows well (tenant covers a lot), net cost is low and
  // surplus is large → househack pulls ahead. When the property is expensive
  // relative to local rents, net cost exceeds budget → surplus is 0 and
  // househack ties a plain buy. That truth is surfaced via the dynamic
  // disclaimer (see summary.cashFlows / surplusMonthly below).
  const HOUSING_BUDGET_RATIO = 0.28;
  const housingBudget   = round2((monthlyIncome || 0) * HOUSING_BUDGET_RATIO);
  const surplusMonthly  = round2(Math.max(housingBudget - netMonthlyCost, 0));
  const cashFlows       = surplusMonthly > 0;
  const annualPortfolioContribution = Math.max(surplusMonthly * 12, 0);

  // Retained for comparison/reporting (was the old contribution basis).
  const monthlyBenefit = round2(monthlyRent - netMonthlyCost);

  // ── Amortization table ────────────────────────────
  const amortTable = buildAmortTable(loan, interestRate, termYears);

  // ── Build snapshots ───────────────────────────────
  const snapshots = [];
  let cumulativeHousingCost   = downPayment;
  let cumulativeRentalIncome  = 0;
  let cumulativeTaxSavings    = 0;

  for (let year = 1; year <= Math.max(...SNAPSHOT_YEARS); year++) {
    // Rental income escalates each year
    const rentalThisYear = escalatedRent(effectiveRentalIncome, year, rentIncreaseRate) * 12;
    cumulativeRentalIncome += rentalThisYear;

    // Annual gross owner costs
    const annualOwnerCost = totalOwnerCost * 12;
    cumulativeHousingCost += Math.max(annualOwnerCost - rentalThisYear, 0);

    // Tax savings on mortgage interest
    const amortYear = amortTable[year - 1];
    const interestThisYear   = amortYear?.interestPaid || 0;
    const taxSavingsThisYear = annualTaxSavings(interestThisYear);
    cumulativeTaxSavings += taxSavingsThisYear;

    if (SNAPSHOT_YEARS.includes(year)) {
      // Duplex appreciation — same county rates apply
      const band = appreciationBand(homePrice, county, year);

      // Mortgage balance
      const mortgageBalance = amortYear?.endBalance || 0;

      // Home equity at each scenario
      const homeEquityBase         = round2(band.base         - mortgageBalance);
      const homeEquityConservative = round2(band.conservative - mortgageBalance);
      const homeEquityOptimistic   = round2(band.optimistic   - mortgageBalance);

      // Portfolio: remaining savings + monthly benefit invested
      const portfolioValue = investmentValue(
        remainingSavings,
        annualPortfolioContribution,
        investReturnRate,
        year
      );

      // Current month rental income (escalated)
      const currentRentalIncome = escalatedRent(effectiveRentalIncome, year, rentIncreaseRate);

      const snapshot = buildSnapshot(
        { homeValue: band.base, portfolio: portfolioValue },
        { mortgageBalance },
        { monthly: round2(currentRentalIncome - netMonthlyCost) },
        { scenario: 'househack', year, county: county.county_name }
      );

      // Add house hack specific fields
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
      snapshot.mortgageBalance         = round2(mortgageBalance);
      snapshot.rentalIncomeMonthly     = round2(currentRentalIncome);
      snapshot.netMonthlyCost          = round2(netMonthlyCost);
      snapshot.cumulativeRentalIncome  = round2(cumulativeRentalIncome);
      snapshot.cumulativeHousingCost   = round2(cumulativeHousingCost);
      snapshot.cumulativeTaxSavings    = round2(cumulativeTaxSavings);
      snapshot.portfolioValue          = portfolioValue;
      snapshot.equityFromPaydown       = amortYear?.cumulativeEquity || 0;
      snapshot.equityFromAppreciation  = round2(band.base - homePrice);

      // Wealth Composition — the exact two figures that sum to
      // snapshot.netWorth. Cumulative rental income and tax savings are
      // NOT separate additive components — rental income already flows in
      // indirectly (it raises surplusMonthly, which raises the portfolio
      // contribution above), and tax savings never touches net worth at
      // all, same as every other scenario. See buildSnapshot's CONTRACT
      // note in networth.js.
      snapshot.netWorthComposition = buildWealthComposition(homeEquityBase, portfolioValue);

      // Sub-breakdowns for the Net Worth Breakdown modal — Home Equity's
      // three plain-language parts and Portfolio's three plain-language
      // parts. Both reconcile exactly to the totals above. Note the tenant's
      // rent isn't a fourth part here either — it already raised
      // annualPortfolioContribution above, so it's inside newContributions,
      // not a separate bucket.
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
  const yr5Snapshot   = snapshots.find(s => s.year === 5);

  const oppCost20 = downPaymentOpportunityCost(downPayment, 20, investReturnRate);

  const summary = {
    totalHousingCost:       finalSnapshot.cumulativeHousingCost,
    totalEquityBuilt:       finalSnapshot.homeEquity.base,
    totalRentalIncome:      finalSnapshot.cumulativeRentalIncome,
    // NOT part of net worth — see netWorthComposition below.
    totalTaxSavings:        finalSnapshot.cumulativeTaxSavings,
    opportunityCost:        oppCost20,
    netMonthlyCost,
    monthlyBenefit,
    piPayment:              round2(piPayment),
    totalOwnerCost:         round2(totalOwnerCost),
    effectiveRentalIncome:  round2(effectiveRentalIncome),

    // The UI-facing "what makes up this total" breakdown — reconcile any
    // displayed Projected Net Worth figure against this, not against
    // totalTaxSavings/opportunityCost/totalRentalIncome above. Rental
    // income's effect is already inside investmentPortfolio (it raised the
    // monthly contribution that grew that number); it is not a third bucket.
    netWorthComposition: finalSnapshot.netWorthComposition,

    // Cash-flow optimization model outputs (drive the dynamic disclaimer + UI)
    grossRentalIncome:      round2(grossRentalIncome),
    derivedRentalIncome:    round2(derivedRentalIncome),
    rentToPriceRatio:       RENT_TO_PRICE_RATIO,       // 0.007 → UI can show "0.7%"
    rentIsDerived:          rentalIncome == null,       // false if user supplied a value
    housingBudget:          round2(housingBudget),
    surplusMonthly,                                     // invested each month (0 if underwater)
    cashFlows,                                          // true ⇢ duplex cash-flows for this profile

    teachingMoments: {
      // Leverage: controlling a large asset with small down payment
      leverageRatio:          round2(homePrice / downPayment),
      // Tenant is paying down your mortgage
      tenantContribution20:   round2(finalSnapshot.cumulativeRentalIncome),
      equityAt5:              yr5Snapshot?.homeEquity.base,
      equityAt10:             yr10Snapshot?.homeEquity.base,
      equityAt20:             finalSnapshot.homeEquity.base,
      appreciationGain20:     finalSnapshot.equityFromAppreciation,
      paydownGain20:          finalSnapshot.equityFromPaydown,
      taxSavings20:           finalSnapshot.cumulativeTaxSavings,
      netWorthAt10:           yr10Snapshot?.netWorth,
      netWorthAt20:           finalSnapshot.netWorth,
      // House-hack cash-flow story
      tenantRentMonthly:      round2(grossRentalIncome),
      surplusInvestedMonthly: surplusMonthly,
      monthlyVsRenting:       monthlyBenefit
    }
  };

  return buildScenarioResult('househack', snapshots, summary, {
    homePrice,
    downPayment,
    interestRate,
    county:              county.county_name,
    loan:                round2(loan),
    piPayment:           round2(piPayment),
    totalOwnerCost:      round2(totalOwnerCost),
    rentalIncome,
    effectiveRentalIncome: round2(effectiveRentalIncome),
    netMonthlyCost:      round2(netMonthlyCost),
    monthlyBenefit:      round2(monthlyBenefit)
  });
}


// ─── HELPER ───────────────────────────────────────
function round2(num) {
  return Math.round(num * 100) / 100;
}