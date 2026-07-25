import { runAllScenarios, prepareInputs } from './engine.js';

const county = {
  county_name:            'Marion',
  property_tax_rate:      0.0088,
  appreciation_rate_low:  3.5,
  appreciation_rate_high: 6.0,
  median_home_price:      285000,
  median_rent:            1450,
  classification:         'urban'
};

const userInputs = {
  savings:      20000,
  monthlyRent:  1800,
  downPayment:  20000,
  interestRate: 7.0
};

const inputs = prepareInputs(userInputs, county);
const comparison = runAllScenarios(inputs, county);

console.log('=== REALWORLDIQ ENGINE — Full Comparison ===\n');
console.log('County:', comparison.county.name);
console.log('');
console.log('RANKED BY YEAR 20 NET WORTH:');
comparison.ranked.forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.scenario.padEnd(12)} $${r.netWorthAt20.toLocaleString()}`);
});
console.log('');
console.log('Winner:', comparison.winner.toUpperCase());
if (comparison.errors) {
  console.log('Errors:', comparison.errors);
}