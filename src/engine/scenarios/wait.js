// ============================================
// RealWorldIQ — Scenario: Wait for Lower Rates
//
// Models the cost of deferring a home purchase
// while waiting for interest rates to drop.
//
// This scenario teaches the "time in market vs.
// timing the market" lesson. Waiting feels safe
// but has real costs: continued rent payments,
// rising home prices, and lost appreciation.
//
// Key mechanics:
//   - User waits N years before buying (default 2)
//   - During wait: renting + saving + investing
//   - After wait: buys at assumed lower rate
//   - Home price assumed to appreciate during wait
//   - Final net worth compared at same horizon
//
// Key inputs:
//   waitYears         — years before purchasing (default 2)
//   assumedFutureRate — rate they're hoping for (default 5.5%)
//   homePrice         — today's home price
//   downPayment       — current savings for down payment
//   interestRate      — current rate (what they're avoiding)
//   monthlyRent       — ongoing rent during wait
//   county            — county parameter object
// ============================================

import { appreciationBand, appreciatedValue,
         escalatedRent, investmentValue,
         decimalRateToPercent }            from '../utils/appreciation.js';
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
export function runWaitScenario(inputs) {
  const {
    waitYears         = 2,
    assumedFutureRate = 5.5,
    homePrice,
    downPayment       = 20000,
    interestRate      = 7.0,   // current rate being avoided
    savings           = 0,
    monthlyRent       = 1800,
    county,
    termYears         = 30,
    years             = 20,
    rentIncreaseRate  = 3.0,
    investReturnRate  = DEFAULT_INVEST_RETURN_RATE
  } = inputs;

  // ── During the wait period ────────────────────────
  // Home price will appreciate while they wait. County rates are DB decimals;
  // appreciatedValue expects a percent — convert at this boundary (same as
  // appreciationBand does internally).
  const baseAppreciationRate =
    (decimalRateToPercent(county.appreciation_rate_low) +
     decimalRateToPercent(county.appreciation_rate_high)) / 2;
  const futureHomePrice = round2(appreciatedValue(homePrice, baseAppreciationRate, waitYears));
  const priceIncrease   = round2(futureHomePrice - homePrice);

  // Savings grow during the wait (invested)
  const savingsAtPurchase = investmentValue(savings, 0, investReturnRate, waitYears);

  // But they keep paying rent during the wait
  let rentPaidDuringWait = 0;
  for (let y = 1; y <= waitYears; y++) {
    rentPaidDuringWait += escalatedRent(monthlyRent, y, rentIncreaseRate) * 12;
  }

  // ── After wait: buy at lower rate ─────────────────
  const loanAmt       = loanAmount(futureHomePrice, downPayment);
  const piPayment     = monthlyPayment(loanAmt, assumedFutureRate, termYears);
  const ownerCost     = monthlyOwnerCost(piPayment, futureHomePrice, county.property_tax_rate);
  const remainingSavings = Math.max(savingsAtPurchase - downPayment, 0);
  const monthlyCashFlow  = round2(monthlyRent - ownerCost);

  // Current rate comparison (what they'd pay if they bought today)
  const currentLoan       = loanAmount(homePrice, downPayment);
  const currentPIPayment  = monthlyPayment(currentLoan, interestRate, termYears);
  const currentOwnerCost  = monthlyOwnerCost(currentPIPayment, homePrice, county.property_tax_rate);
  const monthlyRateSaving = round2(currentOwnerCost - ownerCost); // lower rate = lower payment

  // Amortization from purchase date (offset by waitYears)
  const amortTable = buildAmortTable(loanAmt, assumedFutureRate, termYears);

  // ── Build snapshots ───────────────────────────────
  const snapshots = [];
  let cumulativeHousingCost = rentPaidDuringWait + downPayment;
  let cumulativeTaxSavings  = 0;

  for (let year = 1; year <= Math.max(...SNAPSHOT_YEARS); year++) {
    // Years in ownership (accounting for wait period)
    const ownershipYear = Math.max(year - waitYears, 0);

    if (ownershipYear === 0) {
      // Still waiting — only portfolio and rent
      if (SNAPSHOT_YEARS.includes(year)) {
        const portfolioValue = investmentValue(savings, 0, investReturnRate, year);
        const rentThisYear   = escalatedRent(monthlyRent, year, rentIncreaseRate);

        const snapshot = buildSnapshot(
          { homeValue: 0, portfolio: portfolioValue },
          { mortgageBalance: 0 },
          { monthly: 0 },
          { scenario: 'wait', year, county: county.county_name }
        );

        snapshot.phase              = 'waiting';
        snapshot.portfolioValue     = portfolioValue;
        snapshot.currentMonthlyRent = rentThisYear;
        snapshot.futureHomePrice    = futureHomePrice;
        snapshot.waitYearsRemaining = waitYears - year;

        // Wealth Composition — no home owned yet during the wait, so this
        // is always a single-line breakdown (homeEquity fixed at 0). See
        // buildSnapshot's CONTRACT note in networth.js.
        snapshot.netWorthComposition = buildWealthComposition(0, portfolioValue);

        // Sub-breakdown — Wait never contributes ongoing money (contribution
        // is hardcoded 0 in both phases), so newContributions will always be
        // $0 here; investmentGrowth is entirely compounding on savings.
        snapshot.portfolioComposition = buildPortfolioComposition(
          savings,
          0,
          year,
          portfolioValue
        );

        snapshots.push(snapshot);
      }
    } else {
      // Now owning — track from purchase date
      const annualOwnerCost    = ownerCost * 12;
      const amortYear          = amortTable[ownershipYear - 1];
      const interestThisYear   = amortYear?.interestPaid || 0;
      const taxSavingsThisYear = annualTaxSavings(interestThisYear);
      const rentThisYear       = escalatedRent(monthlyRent, year, rentIncreaseRate) * 12;

      cumulativeHousingCost += annualOwnerCost;
      cumulativeTaxSavings  += taxSavingsThisYear;

      if (SNAPSHOT_YEARS.includes(year)) {
        // Appreciate from purchase date (waitYears ago)
        const band = appreciationBand(futureHomePrice, county, ownershipYear);
        const mortgageBalance = amortYear?.endBalance || 0;

        const homeEquityBase         = round2(band.base         - mortgageBalance);
        const homeEquityConservative = round2(band.conservative - mortgageBalance);
        const homeEquityOptimistic   = round2(band.optimistic   - mortgageBalance);

        const portfolioValue = investmentValue(
          remainingSavings,
          0,
          investReturnRate,
          ownershipYear
        );

        const snapshot = buildSnapshot(
          { homeValue: band.base, portfolio: portfolioValue },
          { mortgageBalance },
          { monthly: monthlyCashFlow },
          { scenario: 'wait', year, county: county.county_name }
        );

        snapshot.phase = 'owning';
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
        snapshot.ownershipYear          = ownershipYear;
        snapshot.purchasePrice          = futureHomePrice;

        // Wealth Composition — the exact two figures that sum to
        // snapshot.netWorth once ownership begins. Tax savings is NOT part
        // of this breakdown, same as every other scenario. See
        // buildSnapshot's CONTRACT note in networth.js.
        snapshot.netWorthComposition = buildWealthComposition(homeEquityBase, portfolioValue);

        // Sub-breakdowns for the Net Worth Breakdown modal. ownershipYear
        // (not the wait-inclusive `year`) is the correct basis for both the
        // amortization data already used above AND the portfolio's implicit
        // "years compounding since purchase" — using `year` here would
        // double-count the wait years, which the amortTable lookup above
        // already excludes.
        snapshot.homeEquityComposition = buildHomeEquityComposition(
          downPayment,
          amortYear?.cumulativeEquity || 0,
          round2(band.base - futureHomePrice)
        );
        snapshot.portfolioComposition = buildPortfolioComposition(
          remainingSavings,
          0,
          ownershipYear,
          portfolioValue
        );

        snapshots.push(snapshot);
      }
    }
  }

  // ── Summary stats ─────────────────────────────────
  const finalSnapshot  = snapshots[snapshots.length - 1];
  const yr10Snapshot   = snapshots.find(s => s.year === 10);

  const summary = {
    totalHousingCost:  finalSnapshot.cumulativeHousingCost || rentPaidDuringWait,
    totalEquityBuilt:  finalSnapshot.homeEquity?.base || 0,
    // Opportunity cost here means something DIFFERENT than in Buy/House
    // Hack (it's the cost of waiting — home price increase — not the down
    // payment's foregone growth), but it is equally NOT part of net worth.
    opportunityCost:   round2(priceIncrease), // cost of waiting = home price increase
    waitYears,
    assumedFutureRate,
    futureHomePrice,
    priceIncrease,
    rentPaidDuringWait: round2(rentPaidDuringWait),
    monthlyRateSaving,

    // The UI-facing "what makes up this total" breakdown. Note this may be
    // a $0-home-equity single-line breakdown if the simulation horizon ends
    // before waitYears is reached — check finalSnapshot.phase if the UI
    // needs to distinguish "still waiting" from "purchased and owns."
    netWorthComposition: finalSnapshot.netWorthComposition,

    teachingMoments: {
      // The core lesson: what did waiting actually cost?
      homePriceIncreaseWhileWaiting: priceIncrease,
      rentPaidWhileWaiting:          round2(rentPaidDuringWait),
      totalCostOfWaiting:            round2(priceIncrease + rentPaidDuringWait),
      monthlyPaymentSavingFromRate:  monthlyRateSaving,
      // Break-even: how long until rate savings offset wait cost?
      monthsToBreakEven:             monthlyRateSaving > 0
                                       ? Math.ceil((priceIncrease + rentPaidDuringWait) / monthlyRateSaving)
                                       : null,
      netWorthAt10:                  yr10Snapshot?.netWorth,
      netWorthAt20:                  finalSnapshot?.netWorth
    }
  };

  return buildScenarioResult('wait', snapshots, summary, {
    homePrice,
    futureHomePrice,
    priceIncrease,
    waitYears,
    assumedFutureRate,
    currentRate:        interestRate,
    downPayment,
    county:             county.county_name,
    piPayment:          round2(piPayment),
    currentPIPayment:   round2(currentPIPayment),
    monthlyRateSaving:  round2(monthlyRateSaving),
    rentPaidDuringWait: round2(rentPaidDuringWait)
  });
}


// ─── HELPER ───────────────────────────────────────
function round2(num) {
  return Math.round(num * 100) / 100;
}