import { runBuyScenario } from './buy.js';

const county = {
  county_name: 'Marion',
  property_tax_rate: 0.0088,
  appreciation_rate_low: 3.5,
  appreciation_rate_high: 6.0
};

const result = runBuyScenario({
  homePrice:    285000,
  downPayment:  20000,
  interestRate: 7.0,
  savings:      20000,
  monthlyRent:  1800,
  county
});

console.log('=== BUY SCENARIO — Marion County ===\n');
console.log('Loan amount:      $' + result.inputs.loan.toLocaleString());
console.log('Monthly P&I:      $' + result.inputs.piPayment.toLocaleString());
console.log('Total owner cost: $' + result.inputs.ownerCost.toLocaleString());
console.log('Monthly cash flow vs renting:', result.inputs.monthlyCashFlow);
console.log('');

result.snapshots.forEach(s => {
  console.log(`Year ${s.year}: Net Worth $${s.netWorth.toLocaleString()} | Equity $${s.homeEquity.base.toLocaleString()} | Home Value $${s.homeValue.base.toLocaleString()}`);
});

console.log('\n--- Teaching Moments ---');
const tm = result.summary.teachingMoments;
console.log('Equity at year 10:        $' + tm.equityAt10?.toLocaleString());
console.log('Equity at year 20:        $' + tm.equityAt20?.toLocaleString());
console.log('Appreciation gain yr 20:  $' + tm.appreciationGain20?.toLocaleString());
console.log('Loan paydown gain yr 20:  $' + tm.paydownGain20?.toLocaleString());
console.log('Tax savings over 20 yrs:  $' + tm.taxSavings20?.toLocaleString());
console.log('Down payment opp cost:    $' + tm.downPaymentOppCost?.toLocaleString());