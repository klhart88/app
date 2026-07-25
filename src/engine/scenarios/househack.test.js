import { runHouseHackScenario } from './househack.js';

const county = {
  county_name: 'Marion',
  property_tax_rate: 0.0088,
  appreciation_rate_low: 3.5,
  appreciation_rate_high: 6.0
};

const result = runHouseHackScenario({
  homePrice:     320000,
  downPayment:   20000,
  interestRate:  7.0,
  savings:       20000,
  monthlyRent:   1800,
  rentalIncome:  1100,
  county
});

console.log('=== HOUSE HACK SCENARIO — Marion County ===\n');
console.log('Total owner cost:      $' + result.inputs.totalOwnerCost.toLocaleString());
console.log('Rental income (net):   $' + result.inputs.effectiveRentalIncome.toLocaleString());
console.log('Net monthly cost:      $' + result.inputs.netMonthlyCost.toLocaleString());
console.log('Monthly benefit vs renting: $' + result.inputs.monthlyBenefit.toLocaleString());
console.log('');

result.snapshots.forEach(s => {
  console.log(`Year ${s.year}: Net Worth $${s.netWorth.toLocaleString()} | Equity $${s.homeEquity.base.toLocaleString()} | Rental Income $${s.rentalIncomeMonthly}/mo`);
});

console.log('\n--- Teaching Moments ---');
const tm = result.summary.teachingMoments;
console.log('Leverage ratio:            ' + tm.leverageRatio + 'x');
console.log('Tenant contributed yr 20:  $' + tm.tenantContribution20?.toLocaleString());
console.log('Net worth at year 20:      $' + tm.netWorthAt20?.toLocaleString());
console.log('Monthly savings vs renting: $' + tm.monthlyVsRenting?.toLocaleString());