import { monthlyPayment, buildAmortTable, loanAmount } from './amortization.js';

// Test 1: Standard 30-year mortgage
const payment = monthlyPayment(240000, 7.0, 30);
console.log('Monthly payment (240k @ 7%, 30yr):', payment);
console.log('Expected: ~$1,597  ✓ or ✗?');

// Test 2: Loan amount from down payment
const loan = loanAmount(300000, '10%');
console.log('\nLoan amount (300k, 10% down):', loan);
console.log('Expected: $270,000  ✓ or ✗?');

// Test 3: Year 1 amortization snapshot
const table = buildAmortTable(240000, 7.0, 30);
const yr1 = table[0];
console.log('\nYear 1 equity from paydown:', yr1.cumulativeEquity);
console.log('Year 1 interest paid:', yr1.interestPaid);
console.log('Expected equity ~$2,100, interest ~$16,700  ✓ or ✗?');