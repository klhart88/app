import { appreciationBand, escalatedRent, investmentValue } from './appreciation.js';

// Test 1: Appreciation band on a $285,000 home (Marion County-ish)
const county = { appreciation_rate_low: 3.5, appreciation_rate_high: 6.0 };
const band10 = appreciationBand(285000, county, 10);
console.log('Year 10 appreciation band on $285,000:');
console.log('  Conservative (3.5%):', band10.conservative);
console.log('  Base (4.75%):', band10.base);
console.log('  Optimistic (6.0%):', band10.optimistic);
console.log('Expected roughly: $402k / $453k / $510k  ✓ or ✗?');

// Test 2: Rent escalation
const rent5 = escalatedRent(1800, 5);
console.log('\nRent after 5 years ($1,800 @ 3%):', rent5);
console.log('Expected: ~$2,087  ✓ or ✗?');

// Test 3: Investment compounding
const invest10 = investmentValue(20000, 500, 7.0, 10);
console.log('\nInvestment after 10 years ($20k + $500/yr @ 7%):', invest10);
console.log('Expected: ~$46,000-$47,000  ✓ or ✗?');