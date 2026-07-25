import {
  monthlyOwnerCost, annualTaxSavings,
  downPaymentOpportunityCost, buildSnapshot
} from './networth.js';

// Test 1: Monthly owner cost on a $285,000 home
const monthly = monthlyOwnerCost(1597, 285000, 0.0088);
console.log('Monthly owner cost ($285k, 7%, IN tax):', monthly);
console.log('Expected: ~$2,100-$2,300  ✓ or ✗?');

// Test 2: Annual tax savings on interest
const savings = annualTaxSavings(16700);
console.log('\nAnnual tax savings on $16,700 interest:', savings);
console.log('Expected: ~$3,674  ✓ or ✗?');

// Test 3: Opportunity cost of $30k down at year 10
const oppCost = downPaymentOpportunityCost(30000, 10);
console.log('\nOpportunity cost of $30k down at year 10:', oppCost);
console.log('Expected: ~$28,966  ✓ or ✗?');

// Test 4: Snapshot structure
const snap = buildSnapshot(
  { homeValue: 320000, portfolio: 5000 },
  { mortgageBalance: 237000 },
  { monthly: -450 },
  { scenario: 'buy', year: 5, county: 'Marion' }
);
console.log('\nNet worth snapshot at year 5:', snap.netWorth);
console.log('Expected: $88,000  ✓ or ✗?');