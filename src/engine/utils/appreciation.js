// ============================================
// RealWorldIQ — Appreciation Utility
//
// Calculates property value growth over time
// using the three-band model confirmed in the
// product plan: Conservative / Base / Optimistic.
//
// Also handles rent escalation (rents rise over
// time too) and stock market compounding for the
// invest scenario.
//
// All functions are pure — input in, numbers out.
// ============================================

import { DEFAULT_INVEST_RETURN_RATE } from './constants.js';


// ─── PROPERTY VALUE OVER TIME ─────────────────────
// Returns home value at a given year using
// compound appreciation.
//
// appreciationRate: annual % (e.g. 4.0 for 4%)
// year: how many years from purchase
export function appreciatedValue(homePrice, appreciationRate, year) {
  if (year === 0) return homePrice;
  const rate = appreciationRate / 100;
  return round2(homePrice * Math.pow(1 + rate, year));
}


// ─── THREE-BAND PROJECTION ────────────────────────
// Returns Conservative / Base / Optimistic home
// values at a given year. Uses the county's
// appreciation_rate_low and appreciation_rate_high,
// with the midpoint as the base case.
//
// CONVENTION BOUNDARY: county rates are stored in the DB as DECIMALS
// (e.g. 0.0325 = 3.25%), but every utility here — appreciatedValue,
// escalatedRent, investmentValue — expects a PERCENT (e.g. 3.25). So we convert
// the county's decimal to a percent right here, at the one place the DB value
// enters the percent-based utility layer. (Without this the rate is divided by
// 100 twice and appreciation collapses to ~0.) `property_tax_rate` is also a
// DB decimal but is consumed directly as a decimal elsewhere, so it is NOT
// touched here.
//
// county: { appreciation_rate_low, appreciation_rate_high } (decimals)
// Returns: { conservative, base, optimistic }
export function appreciationBand(homePrice, county, year) {
  const low  = decimalRateToPercent(county.appreciation_rate_low);
  const high = decimalRateToPercent(county.appreciation_rate_high);
  const mid  = round1((low + high) / 2);

  return {
    conservative: appreciatedValue(homePrice, low,  year),
    base:         appreciatedValue(homePrice, mid,  year),
    optimistic:   appreciatedValue(homePrice, high, year),
    rates: { low, mid, high }
  };
}

// Convert a DB-stored decimal rate (0.0325) to the percent (3.25) the utility
// functions expect. Null/undefined → 0 so a missing rate yields flat (no
// appreciation) rather than NaN.
export function decimalRateToPercent(decimalRate) {
  return (decimalRate ?? 0) * 100;
}


// ─── APPRECIATION GAIN ────────────────────────────
// Returns the raw dollar gain from appreciation
// (not including equity from loan paydown).
// Useful for isolating the "market did this" portion
// of wealth creation.
export function appreciationGain(homePrice, appreciationRate, year) {
  return round2(appreciatedValue(homePrice, appreciationRate, year) - homePrice);
}


// ─── RENT ESCALATION ──────────────────────────────
// Projects monthly rent at a given year.
// National average rent growth ~3-4% annually.
// We use a conservative 3% default.
//
// Returns monthly rent at year N.
export function escalatedRent(monthlyRent, year, annualIncreasePercent = 3.0) {
  if (year === 0) return monthlyRent;
  const rate = annualIncreasePercent / 100;
  return round2(monthlyRent * Math.pow(1 + rate, year));
}


// ─── RENT ESCALATION SCHEDULE ─────────────────────
// Returns an array of monthly rent values for each
// year of the simulation, useful for cumulative
// rent cost calculations.
//
// Returns: [{ year, monthlyRent, annualRent }]
export function rentSchedule(startingRent, years, annualIncreasePercent = 3.0) {
  const schedule = [];
  for (let year = 1; year <= years; year++) {
    const monthly = escalatedRent(startingRent, year, annualIncreasePercent);
    schedule.push({
      year,
      monthlyRent: monthly,
      annualRent:  round2(monthly * 12)
    });
  }
  return schedule;
}


// ─── STOCK MARKET COMPOUNDING ─────────────────────
// Projects investment portfolio value over time.
// Used in the "invest instead" scenario.
//
// Default 7% annual return — S&P 500 long-run
// inflation-adjusted average.
//
// principal: initial lump sum invested
// annualContribution: additional invested each year
// returnRate: annual % return
// year: years of compounding
export function investmentValue(
  principal,
  annualContribution = 0,
  returnRate = DEFAULT_INVEST_RETURN_RATE,
  year
) {
  const r = returnRate / 100;

  // Future value of lump sum
  const fvLump = principal * Math.pow(1 + r, year);

  // Future value of annual contributions (annuity)
  // FV = C * [(1+r)^n - 1] / r
  let fvContributions = 0;
  if (annualContribution > 0 && r > 0) {
    fvContributions = annualContribution * (Math.pow(1 + r, year) - 1) / r;
  }

  return round2(fvLump + fvContributions);
}


// ─── INVESTMENT SCHEDULE ──────────────────────────
// Year-by-year investment portfolio growth.
// Returns: [{ year, portfolioValue, totalContributed, gain }]
export function investmentSchedule(
  principal,
  annualContribution = 0,
  returnRate = DEFAULT_INVEST_RETURN_RATE,
  years
) {
  const schedule = [];
  let totalContributed = principal;

  for (let year = 1; year <= years; year++) {
    totalContributed += (year > 1 ? annualContribution : 0);
    const value = investmentValue(principal, annualContribution, returnRate, year);
    schedule.push({
      year,
      portfolioValue:    value,
      totalContributed:  round2(totalContributed),
      gain:              round2(value - totalContributed)
    });
  }
  return schedule;
}


// ─── HELPERS ──────────────────────────────────────
function round2(num) {
  return Math.round(num * 100) / 100;
}

function round1(num) {
  return Math.round(num * 10) / 10;
}