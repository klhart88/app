import { runWaitScenario } from './wait.js';

const county = {
  county_name: 'Marion',
  property_tax_rate: 0.0088,
  appreciation_rate_low: 3.5,
  appreciation_rate_high: 6.0
};

const result = runWaitScenario({
  waitYears: 2, assumedFutureRate: 5.5,
  homePrice: 285000, downPayment: 20000,
  interestRate: 7.0, savings: 20000,
  monthlyRent: 1800, county
});

console.log('=== WAIT SCENARIO — Marion County ===\n');
console.log('Future home price:         $' + result.inputs.futureHomePrice.toLocaleString());
console.log('Price increase while waiting: $' + result.inputs.priceIncrease.toLocaleString());
console.log('Rent paid while waiting:   $' + result.inputs.rentPaidDuringWait.toLocaleString());
console.log('Monthly payment savings:   $' + result.inputs.monthlyRateSaving.toLocaleString());
console.log('');
result.snapshots.forEach(s => {
  console.log(`Year ${s.year} (${s.phase}): Net Worth $${s.netWorth.toLocaleString()}`);
});
console.log('\nMonths to break even on waiting:', result.summary.teachingMoments.monthsToBreakEven);