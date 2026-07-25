// ============================================
// RealWorldIQ — Main Engine Entry Point
//
// Single import for the UI. Accepts user inputs
// and county data, runs one or all scenarios,
// returns standardized results ready to display.
//
// Usage:
//   import { runScenario, runAllScenarios } from './engine.js';
//
//   // Run one scenario
//   const result = runScenario('buy', inputs, county);
//
//   // Run all five and compare
//   const comparison = runAllScenarios(inputs, county);
// ============================================

import { runRentScenario }      from './scenarios/rent.js';
import { runBuyScenario }       from './scenarios/buy.js';
import { runHouseHackScenario } from './scenarios/househack.js';
import { runInvestScenario }    from './scenarios/invest.js';
import { runWaitScenario }      from './scenarios/wait.js';
import { DEFAULT_INVEST_RETURN_RATE } from './utils/constants.js';


// ─── SCENARIO REGISTRY ────────────────────────────
const SCENARIOS = {
  rent:      runRentScenario,
  buy:       runBuyScenario,
  househack: runHouseHackScenario,
  invest:    runInvestScenario,
  wait:      runWaitScenario
};

export const SCENARIO_NAMES = Object.keys(SCENARIOS);


// ─── RUN SINGLE SCENARIO ──────────────────────────
// scenarioKey: 'rent' | 'buy' | 'househack' | 'invest' | 'wait'
// inputs: user input object (see below)
// county: county row from Supabase
//
// Returns a standardized scenario result object.
export function runScenario(scenarioKey, inputs, county) {
  const runner = SCENARIOS[scenarioKey];
  if (!runner) {
    throw new Error(`Unknown scenario: "${scenarioKey}". Valid options: ${SCENARIO_NAMES.join(', ')}`);
  }

  // Validate required inputs
  validateInputs(inputs, county);

  return runner({ ...inputs, county });
}


// ─── RUN ALL SCENARIOS ────────────────────────────
// Runs all five scenarios with the same inputs and
// returns a comparison object sorted by Year 20
// net worth (highest to lowest).
//
// Returns:
// {
//   results:    { rent, buy, househack, invest, wait },
//   ranked:     [ { scenario, netWorthAt20, result }, ... ],
//   winner:     'househack',
//   inputs:     { ...userInputs },
//   county:     { ...countyData }
// }
export function runAllScenarios(inputs, county) {
  validateInputs(inputs, county);

  const results = {};
  const errors  = {};

  for (const [key, runner] of Object.entries(SCENARIOS)) {
    try {
      results[key] = runner({ ...inputs, county });
    } catch (err) {
      errors[key] = err.message;
      console.warn(`Scenario "${key}" failed:`, err.message);
    }
  }

  // Rank by Year 20 net worth
  const ranked = Object.entries(results)
    .map(([scenario, result]) => ({
      scenario,
      netWorthAt20: result.netWorthByYear?.yr20 || 0,
      netWorthAt10: result.netWorthByYear?.yr10 || 0,
      result
    }))
    .sort((a, b) => b.netWorthAt20 - a.netWorthAt20);

  return {
    results,
    ranked,
    winner:  ranked[0]?.scenario || null,
    errors:  Object.keys(errors).length > 0 ? errors : null,
    inputs:  { ...inputs },
    county:  {
      name:           county.county_name,
      medianHomePrice: county.median_home_price,
      medianRent:      county.median_rent,
      classification:  county.classification
    }
  };
}


// ─── DEFAULT INPUTS (Wealth Builder starting profile) ──
// The confirmed starting profile from the product plan.
// Used as defaults when inputs are partially provided.
export const DEFAULT_INPUTS = {
  // Player profile
  savings:          20000,
  monthlyIncome:    5833,   // $70,000 / 12
  monthlyRent:      1800,
  age:              30,

  // Purchase assumptions
  targetHomePrice:  null,   // defaults to county median if null
  homePrice:        null,   // same
  downPayment:      20000,
  interestRate:     7.0,
  termYears:        30,

  // Duplex / house hack
  rentalIncome:     null,   // defaults to ~40% of median rent if null

  // Wait scenario
  waitYears:        2,
  assumedFutureRate: 5.5,

  // Return assumptions
  investReturnRate: DEFAULT_INVEST_RETURN_RATE,
  rentIncreaseRate: 3.0,

  // Simulation horizon
  years:            20
};


// ─── MERGE WITH DEFAULTS ──────────────────────────
// Merges user-provided inputs with defaults and
// county data. Call this before runScenario().
export function prepareInputs(userInputs, county) {
  const merged = { ...DEFAULT_INPUTS, ...userInputs };

  // Default home price to county median if not provided
  if (!merged.targetHomePrice) {
    merged.targetHomePrice = county.median_home_price;
  }
  if (!merged.homePrice) {
    merged.homePrice = county.median_home_price;
  }

  // NOTE: rentalIncome is intentionally NOT defaulted here. It is consumed only
  // by the house-hack scenario, which derives a realistic tenant rent from the
  // purchase price (rent-to-price ratio) when it is null. Pre-filling a value
  // here would defeat that derivation (househack treats a non-null value as a
  // user-supplied override). A user-entered rentalIncome still flows through and
  // overrides the estimate.

  return merged;
}


// ─── INPUT VALIDATION ─────────────────────────────
function validateInputs(inputs, county) {
  if (!county) {
    throw new Error('County data is required. Pass a county object from Supabase.');
  }
  if (!county.property_tax_rate) {
    throw new Error('County is missing property_tax_rate.');
  }
  if (!county.appreciation_rate_low || !county.appreciation_rate_high) {
    throw new Error('County is missing appreciation rate band.');
  }
  if (inputs.downPayment > (inputs.savings || 0) + 1000) {
    console.warn('Warning: down payment exceeds savings. Simulation may show negative remaining savings.');
  }
}