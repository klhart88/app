// ============================================
// RealWorldIQ — Amortization Utility
//
// Core loan math used by every buying scenario.
// All functions are pure — no side effects,
// no external dependencies. Input in, numbers out.
//
// Functions:
//   monthlyPayment()     — fixed monthly P&I payment
//   amortizeYear()       — one year of loan payments
//   buildAmortTable()    — full loan life schedule
//   totalInterestPaid()  — lifetime interest cost
// ============================================


// ─── MONTHLY PAYMENT ──────────────────────────────
// Calculates the fixed monthly principal + interest
// payment for a fully amortizing loan.
//
// Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
//   P = principal (loan amount)
//   r = monthly interest rate (annual / 12)
//   n = total number of payments (years * 12)
//
// Returns 0 if rate is 0 (rare but valid edge case).
export function monthlyPayment(principal, annualRatePercent, termYears) {
  if (principal <= 0) return 0;
  if (annualRatePercent === 0) return principal / (termYears * 12);

  const r = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const payment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return round2(payment);
}


// ─── AMORTIZE ONE YEAR ────────────────────────────
// Runs 12 months of payments starting from a given
// balance, returning year-end figures.
//
// Returns:
//   startBalance    — balance at start of year
//   endBalance      — balance at end of year
//   principalPaid   — total principal paid this year
//   interestPaid    — total interest paid this year
//   payment         — monthly payment amount
export function amortizeYear(balance, annualRatePercent, payment) {
  const r = annualRatePercent / 100 / 12;
  let currentBalance = balance;
  let totalPrincipal = 0;
  let totalInterest = 0;

  for (let month = 0; month < 12; month++) {
    if (currentBalance <= 0) break;

    const interestThisMonth = currentBalance * r;
    const principalThisMonth = Math.min(payment - interestThisMonth, currentBalance);

    totalInterest += interestThisMonth;
    totalPrincipal += principalThisMonth;
    currentBalance -= principalThisMonth;
  }

  return {
    startBalance:  round2(balance),
    endBalance:    round2(Math.max(currentBalance, 0)),
    principalPaid: round2(totalPrincipal),
    interestPaid:  round2(totalInterest),
    payment:       round2(payment)
  };
}


// ─── BUILD FULL AMORTIZATION TABLE ────────────────
// Generates the complete payment schedule for a loan,
// year by year, up to the loan term.
//
// Returns an array of yearly objects:
// [
//   { year: 1, startBalance, endBalance, principalPaid,
//     interestPaid, cumulativeEquity, payment },
//   ...
// ]
export function buildAmortTable(loanAmount, annualRatePercent, termYears) {
  const payment = monthlyPayment(loanAmount, annualRatePercent, termYears);
  const table = [];
  let balance = loanAmount;
  let cumulativePrincipal = 0;

  for (let year = 1; year <= termYears; year++) {
    if (balance <= 0) break;

    const yearData = amortizeYear(balance, annualRatePercent, payment);
    cumulativePrincipal += yearData.principalPaid;

    table.push({
      year,
      startBalance:      yearData.startBalance,
      endBalance:        yearData.endBalance,
      principalPaid:     yearData.principalPaid,
      interestPaid:      yearData.interestPaid,
      cumulativeEquity:  round2(cumulativePrincipal), // equity from paydown only
      payment:           yearData.payment
    });

    balance = yearData.endBalance;
  }

  return table;
}


// ─── TOTAL INTEREST PAID ──────────────────────────
// Convenience function — total interest over the
// life of the loan. Useful for teaching moment:
// "You'll pay $X in interest over 30 years."
export function totalInterestPaid(loanAmount, annualRatePercent, termYears) {
  const payment = monthlyPayment(loanAmount, annualRatePercent, termYears);
  const totalPaid = payment * termYears * 12;
  return round2(totalPaid - loanAmount);
}


// ─── LOAN AMOUNT FROM INPUTS ──────────────────────
// Derives the loan amount from home price and
// down payment. Accepts down payment as either
// a dollar amount or a percentage string ("10%").
export function loanAmount(homePrice, downPayment) {
  let downDollars;

  if (typeof downPayment === 'string' && downPayment.includes('%')) {
    const pct = parseFloat(downPayment) / 100;
    downDollars = homePrice * pct;
  } else {
    downDollars = Number(downPayment);
  }

  return round2(Math.max(homePrice - downDollars, 0));
}


// ─── HELPER ───────────────────────────────────────
// Round to 2 decimal places — avoids floating point
// drift that compounds badly over 20-year projections.
function round2(num) {
  return Math.round(num * 100) / 100;
}
