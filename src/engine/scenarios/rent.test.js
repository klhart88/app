import { runRentScenario } from './rent.js';

const county = {
  county_name: 'Marion',
  property_tax_rate: 0.0088,
  appreciation_rate_low: 3.5,
  appreciation_rate_high: 6.0
};

const result = runRentScenario({
  monthlyRent:      1800,
  savings:          20000,
  monthlyIncome:    5833,
  targetHomePrice:  285000,
  downPayment:      20000,
  interestRate:     7.0,
  county
});

console.log('=== RENT SCENARIO — Marion County ===\n');
console.log('Monthly surplus (renting vs owning):', result.inputs.monthlySurplus);
console.log('Owner cost for comparison:', result.inputs.ownerCostForComparison);
console.log('');

result.snapshots.forEach(s => {
  console.log(`Year ${s.year}: Net Worth $${s.netWorth.toLocaleString()} | Portfolio $${s.portfolioValue.toLocaleString()} | Rent $${s.monthlyRent}/mo`);
});

console.log('\n--- Teaching Moments ---');
console.log('Total rent paid over 20 years:', result.summary.teachingMoments.totalRentPaid20?.toLocaleString());
console.log('Portfolio at year 20:', result.summary.teachingMoments.portfolioAt20?.toLocaleString());