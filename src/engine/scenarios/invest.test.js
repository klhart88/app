import { runInvestScenario } from './invest.js';

const county = {
  county_name: 'Marion',
  property_tax_rate: 0.0088,
  appreciation_rate_low: 3.5,
  appreciation_rate_high: 6.0
};

const result = runInvestScenario({
  savings: 20000, monthlyRent: 1800,
  targetHomePrice: 285000, downPayment: 20000,
  interestRate: 7.0, county
});

console.log('=== INVEST SCENARIO — Marion County ===\n');
console.log('Starting portfolio:   $' + result.inputs.startingPortfolio.toLocaleString());
console.log('Monthly surplus invested: $' + result.inputs.monthlySurplus.toLocaleString());
console.log('');
result.snapshots.forEach(s => {
  console.log(`Year ${s.year}: Net Worth $${s.netWorth.toLocaleString()} | Portfolio $${s.portfolioValue.toLocaleString()}`);
});