// ============================================================================
// RealEquityIQ — Environment Content (all 25 cells)
//
// THE COPY + AUDIO SOURCE for every Execution Environment. Copy extracted
// verbatim from RealEquityIQ_Environment_Content_Baseline.md; each cell also
// carries audioSrc, its recorded narration clip (src/assets/audio/env-*.mp3),
// imported so Vite fingerprints it and returns a resolved URL for <audio>.
//
// Pairs with executionPaths.js, which owns SEQUENCE + AWARD IDENTITY; this file
// owns COPY + AUDIO. Shape per cell matches PREAPPROVAL_ENVIRONMENT:
//   { key, eyebrow, title, keyQuestion, description, audioSrc, steps:[{id,label,hint}] }
//
// `description` is BOTH the recorded-audio script AND the on-screen text.
// audioSrc plays via useNarration's <audio> engine (the Listen button + autoplay
// on unlock). title / keyQuestion / steps are screen-only.
//
// AUDIO FILENAME MAP (filenames don't 1:1 the keys, so it's explicit):
//   Buy path uses legacy sr_* keys → env-home-* files (preapproved/define/
//     tour/offer/close). define_home → env-home-define.
//   hh_*→env-hh-*, stk_*→env-stock-*, wait_*→env-wait-*, rent_*→env-rent-*.
// Verified bijective against the audio folder (25 keys ↔ 25 files, no orphans).
//
// Keyed by milestone_defs key. App's buildEnvironment looks up here by resolved
// key; a missing key falls back to a minimal generated Environment (no audio).
// ⚠ DRAFT COPY: checklists are owner-review pending. Copy/audio edits here never
// change award identity (that's executionPaths.js), so they're safe.
// ============================================================================

import audio_sr_preapproved from '../assets/audio/env-home-preapproved.mp3';
import audio_define_home from '../assets/audio/env-home-define.mp3';
import audio_sr_toured from '../assets/audio/env-home-tour.mp3';
import audio_sr_offer from '../assets/audio/env-home-offer.mp3';
import audio_sr_closed from '../assets/audio/env-home-close.mp3';
import audio_hh_preapproved from '../assets/audio/env-hh-preapproved.mp3';
import audio_hh_define from '../assets/audio/env-hh-define.mp3';
import audio_hh_tour from '../assets/audio/env-hh-tour.mp3';
import audio_hh_offer from '../assets/audio/env-hh-offer.mp3';
import audio_hh_close from '../assets/audio/env-hh-close.mp3';
import audio_stk_assess from '../assets/audio/env-stock-assess.mp3';
import audio_stk_define from '../assets/audio/env-stock-define.mp3';
import audio_stk_research from '../assets/audio/env-stock-research.mp3';
import audio_stk_execute from '../assets/audio/env-stock-execute.mp3';
import audio_stk_optimize from '../assets/audio/env-stock-optimize.mp3';
import audio_wait_assess from '../assets/audio/env-wait-assess.mp3';
import audio_wait_define from '../assets/audio/env-wait-define.mp3';
import audio_wait_monitor from '../assets/audio/env-wait-monitor.mp3';
import audio_wait_build from '../assets/audio/env-wait-build.mp3';
import audio_wait_reassess from '../assets/audio/env-wait-reassess.mp3';
import audio_rent_assess from '../assets/audio/env-rent-assess.mp3';
import audio_rent_define from '../assets/audio/env-rent-define.mp3';
import audio_rent_invest from '../assets/audio/env-rent-invest.mp3';
import audio_rent_reassess from '../assets/audio/env-rent-reassess.mp3';
import audio_rent_graduate from '../assets/audio/env-rent-graduate.mp3';

// Each entry is the authored content object for one Environment, keyed by the
// milestone it awards.
export const ENVIRONMENT_CONTENT = {
  'sr_preapproved': {
    key: 'sr_preapproved',
    eyebrow: 'Become a Homeowner · Step 1',
    title: 'Get pre-approved',
    keyQuestion: 'Can I buy now?',
    description: 'This is where a lender reviews your income, debts, credit, and cash reserves, and tells you what you can borrow. It\'s the moment your buying power becomes real — you stop guessing what you can afford and start knowing.',
    audioSrc: audio_sr_preapproved,
    steps: [
      { id: 'income', label: 'Gather income proof', hint: 'Pay stubs, W-2s, or tax returns' },
      { id: 'debts', label: 'List your debts', hint: 'Cards, loans, and monthly obligations' },
      { id: 'credit', label: 'Check your credit', hint: 'Know your score before the lender does' },
      { id: 'reserves', label: 'Confirm cash reserves', hint: 'Down payment plus a cushion' },
      { id: 'submit', label: 'Submit to a lender', hint: 'Apply and request your pre-approval letter' },
      { id: 'letter', label: 'Receive pre-approval letter', hint: 'Your buying power, in writing' },
    ],
  },

  'define_home': {
    key: 'define_home',
    eyebrow: 'Become a Homeowner · Step 2',
    title: 'Define your home & lifestyle',
    keyQuestion: 'What am I looking for?',
    description: 'Before you tour a single home, you decide what "home" actually means for your life — where you want to be, how much space you need, what your daily routine should feel like. This is where a vague wish becomes a clear set of must-haves, so every home you see afterward is measured against the life you\'re building.',
    audioSrc: audio_define_home,
    steps: [
      { id: 'location', label: 'Set your location', hint: 'Neighborhoods, commute, schools' },
      { id: 'size', label: 'Define size & layout', hint: 'Bedrooms, baths, must-have spaces' },
      { id: 'musthave', label: 'List your non-negotiables', hint: 'The features you won\'t compromise on' },
      { id: 'nicehave', label: 'Note your nice-to-haves', hint: 'What you\'d love but could live without' },
      { id: 'ceiling', label: 'Set your budget ceiling', hint: 'The most you\'ll comfortably spend' },
    ],
  },

  'sr_toured': {
    key: 'sr_toured',
    eyebrow: 'Become a Homeowner · Step 3',
    title: 'Tour homes & evaluate',
    keyQuestion: 'Which option fits best?',
    description: 'Now the search becomes real. You walk through homes, stand in the rooms, and feel which ones fit and which ones don\'t. Each tour sharpens your sense of what matters — and brings you closer to recognizing the one that\'s worth an offer.',
    audioSrc: audio_sr_toured,
    steps: [
      { id: 'search', label: 'Search active listings', hint: 'Filter to your criteria' },
      { id: 'showings', label: 'Schedule showings', hint: 'See your top candidates in person: best with your own agent' },
      { id: 'compare', label: 'Compare neighborhoods', hint: 'Beyond the house: the area around it' },
      { id: 'score', label: 'Score each home', hint: 'Rate against your must-haves' },
      { id: 'shortlist', label: 'Shortlist your favorites', hint: 'Narrow to the real contenders' },
    ],
  },

  'sr_offer': {
    key: 'sr_offer',
    eyebrow: 'Become a Homeowner · Step 4',
    title: 'Make an offer',
    keyQuestion: 'Am I ready to commit?',
    description: 'This is the moment you stop looking and start acting. You put a number on the table, set your terms, and tell a seller you\'re serious. It can feel like a leap — but it\'s the step where a house you like becomes a home you\'re fighting for.',
    audioSrc: audio_sr_offer,
    steps: [
      { id: 'price', label: 'Decide your offer price', hint: 'Grounded in comps and your budget' },
      { id: 'terms', label: 'Set your terms', hint: 'Contingencies, timeline, earnest money' },
      { id: 'submit', label: 'Submit the offer', hint: 'Through your agent, in writing' },
      { id: 'negotiate', label: 'Negotiate', hint: 'Counteroffers are normal: hold your priorities' },
      { id: 'agreement', label: 'Reach agreement', hint: 'A signed, accepted offer' },
    ],
  },

  'sr_closed': {
    key: 'sr_closed',
    eyebrow: 'Become a Homeowner · Step 5',
    title: 'Close & take ownership',
    keyQuestion: 'How do I maximize my outcome?',
    description: 'The final stretch turns a signed offer into keys in your hand. Inspections, appraisal, financing, and paperwork all come together — and then you sign your name and the home is yours. This is where the journey to *become* a homeowner ends, and the journey to *build wealth as one* begins.',
    audioSrc: audio_sr_closed,
    steps: [
      { id: 'inspect', label: 'Complete inspections', hint: 'Know exactly what you\'re buying' },
      { id: 'appraisal', label: 'Clear the appraisal', hint: 'Confirm the home\'s value' },
      { id: 'financing', label: 'Finalize financing', hint: 'Lock your loan and terms' },
      { id: 'walkthrough', label: 'Final walkthrough', hint: 'Verify condition before closing' },
      { id: 'sign', label: 'Sign at closing', hint: 'The paperwork that makes it yours' },
      { id: 'keys', label: 'Get your keys', hint: '🏠 You\'re a homeowner' },
    ],
  },

  'hh_preapproved': {
    key: 'hh_preapproved',
    eyebrow: 'House Hack · Step 1',
    title: 'Get pre-approved (multi-unit)',
    keyQuestion: 'Can I buy — and rent part of it?',
    description: 'House hacking starts the same way as any purchase, with one twist: the lender looks not just at what you can afford, but at the rental income the property could bring in. This is where you learn how much further your money goes when a tenant helps carry the mortgage.',
    audioSrc: audio_hh_preapproved,
    steps: [
      { id: 'income', label: 'Gather income proof', hint: 'Pay stubs, W-2s, or tax returns' },
      { id: 'debts', label: 'List your debts', hint: 'Cards, loans, and monthly obligations' },
      { id: 'credit', label: 'Check your credit', hint: 'Know your score before the lender does' },
      { id: 'reserves', label: 'Confirm cash reserves', hint: 'Down payment plus a cushion' },
      { id: 'rentcredit', label: 'Ask about rental-income credit', hint: 'How projected rent boosts your approval' },
      { id: 'letter', label: 'Receive pre-approval letter', hint: 'Your multi-unit buying power, in writing' },
    ],
  },

  'hh_define': {
    key: 'hh_define',
    eyebrow: 'House Hack · Step 2',
    title: 'Define the property & rental plan',
    keyQuestion: 'What am I looking for — to live in and rent out?',
    description: 'A house hack has to work twice: as your home and as an income property. Here you define both sides — the unit you\'ll live in and the unit you\'ll rent — so you\'re choosing a property that fits your life *and* pays you back.',
    audioSrc: audio_hh_define,
    steps: [
      { id: 'location', label: 'Set your location', hint: 'Strong rental demand matters here' },
      { id: 'unittype', label: 'Choose your unit type', hint: 'Duplex, triplex, or a home with an ADU' },
      { id: 'living', label: 'Define your living unit', hint: 'Where you\'ll actually live' },
      { id: 'rentest', label: 'Estimate rental income', hint: 'What the other unit(s) can earn' },
      { id: 'ceiling', label: 'Set your budget ceiling', hint: 'Net of expected rent' },
    ],
  },

  'hh_tour': {
    key: 'hh_tour',
    eyebrow: 'House Hack · Step 3',
    title: 'Tour & evaluate as an investment',
    keyQuestion: 'Which property fits best — for living and earning?',
    description: 'You\'re not just touring homes — you\'re evaluating small businesses you\'ll live inside. As you walk each property, you weigh the comfort of your unit against the rentability of the others, learning to see a place the way both a homeowner and a landlord would.',
    audioSrc: audio_hh_tour,
    steps: [
      { id: 'search', label: 'Search multi-unit listings', hint: 'Filter to your criteria' },
      { id: 'tourboth', label: 'Tour both sides', hint: 'Your unit and the rental unit(s)' },
      { id: 'rentcond', label: 'Assess rental condition', hint: 'What tenants will expect' },
      { id: 'numbers', label: 'Run the numbers', hint: 'Rent vs. mortgage, taxes, upkeep' },
      { id: 'shortlist', label: 'Shortlist the best fits', hint: 'Live-in comfort + rental return' },
    ],
  },

  'hh_offer': {
    key: 'hh_offer',
    eyebrow: 'House Hack · Step 4',
    title: 'Make an offer',
    keyQuestion: 'Am I ready to commit?',
    description: 'Committing to a house hack means committing to two roles at once — owner and landlord. You make your offer knowing the rental income is part of the plan, and that this property is both where you\'ll live and the first engine of your wealth.',
    audioSrc: audio_hh_offer,
    steps: [
      { id: 'price', label: 'Decide your offer price', hint: 'Grounded in comps and rental value' },
      { id: 'terms', label: 'Set your terms', hint: 'Contingencies, timeline, earnest money' },
      { id: 'submit', label: 'Submit the offer', hint: 'Through your agent, in writing' },
      { id: 'negotiate', label: 'Negotiate', hint: 'Hold your priorities on both sides' },
      { id: 'agreement', label: 'Reach agreement', hint: 'A signed, accepted offer' },
    ],
  },

  'hh_close': {
    key: 'hh_close',
    eyebrow: 'House Hack · Step 5',
    title: 'Close, move in & place a tenant',
    keyQuestion: 'How do I maximize my outcome?',
    description: 'Closing day makes you an owner; placing your first tenant makes you an operator. You move into your unit, prepare the other, and welcome the renter whose payments help build your equity. From here, the journey shifts from buying to running — and growing — what you own.',
    audioSrc: audio_hh_close,
    steps: [
      { id: 'close', label: 'Close on the property', hint: 'Sign, fund, and take ownership' },
      { id: 'movein', label: 'Move into your unit', hint: 'Settle into your home' },
      { id: 'preprent', label: 'Prepare the rental unit', hint: 'Clean, repair, make it ready' },
      { id: 'screen', label: 'List & screen tenants', hint: 'Find a reliable renter' },
      { id: 'lease', label: 'Sign a lease & collect first rent', hint: 'Your wealth engine starts' },
    ],
  },

  'stk_assess': {
    key: 'stk_assess',
    eyebrow: 'Stock Investing · Step 1',
    title: 'Assess readiness & capacity',
    keyQuestion: 'Can I invest now?',
    description: 'Before you put a dollar in the market, you take honest stock of where you stand — your emergency fund, your comfort with risk, and how long your money can stay invested. This is where investing stops being something other people do and becomes something you\'re ready for.',
    audioSrc: audio_stk_assess,
    steps: [
      { id: 'efund', label: 'Confirm your emergency fund', hint: 'Months of expenses set aside first' },
      { id: 'risk', label: 'Gauge your risk tolerance', hint: 'How much swing can you stomach?' },
      { id: 'horizon', label: 'Set your time horizon', hint: 'When will you need this money?' },
      { id: 'accounts', label: 'Choose account types', hint: 'Taxable, IRA, 401(k), and why' },
      { id: 'cash', label: 'Confirm investable cash', hint: 'What you can commit without strain' },
    ],
  },

  'stk_define': {
    key: 'stk_define',
    eyebrow: 'Stock Investing · Step 2',
    title: 'Define goals & strategy',
    keyQuestion: 'What am I trying to achieve?',
    description: 'Investing without a goal is just gambling with extra steps. Here you decide what your money is *for* — growth, income, retirement — and choose a strategy that matches. This is the plan that will keep you steady when the market gets loud.',
    audioSrc: audio_stk_define,
    steps: [
      { id: 'goal', label: 'Name your goal', hint: 'Growth, income, retirement, or a mix' },
      { id: 'target', label: 'Set a target & timeline', hint: 'How much, by when' },
      { id: 'alloc', label: 'Choose your allocation', hint: 'Stocks, bonds, diversification' },
      { id: 'approach', label: 'Pick your approach', hint: 'Index funds, active, or both' },
      { id: 'rhythm', label: 'Set your contribution rhythm', hint: 'How much you\'ll add, how often' },
    ],
  },

  'stk_research': {
    key: 'stk_research',
    eyebrow: 'Stock Investing · Step 3',
    title: 'Research & evaluate',
    keyQuestion: 'Which opportunity fits best?',
    description: 'Now you do the homework. You look past the headlines at what you\'d actually be buying — the funds, the companies, the costs — and match them to the strategy you set. This is where confidence replaces guesswork, so your first move is a deliberate one.',
    audioSrc: audio_stk_research,
    steps: [
      { id: 'research', label: 'Research funds & sectors', hint: 'What fits your allocation' },
      { id: 'costs', label: 'Compare costs', hint: 'Expense ratios and fees add up' },
      { id: 'diversify', label: 'Check diversification', hint: 'Avoid putting it all in one basket' },
      { id: 'history', label: 'Review historical behavior', hint: 'How it moved, not just how it grew' },
      { id: 'choose', label: 'Choose your investments', hint: 'A shortlist you believe in' },
    ],
  },

  'stk_execute': {
    key: 'stk_execute',
    eyebrow: 'Stock Investing · Step 4',
    title: 'Execute your investment',
    keyQuestion: 'Am I ready to commit?',
    description: 'This is the moment your plan becomes a position. You open the account, place the order, and put your capital to work. It can feel strangely small for such a big decision — a few clicks — but it\'s the step that turns an investor-in-waiting into an investor.',
    audioSrc: audio_stk_execute,
    steps: [
      { id: 'fund', label: 'Open or fund your account', hint: 'Get your capital in place' },
      { id: 'order', label: 'Place your first order', hint: 'Buy according to your plan' },
      { id: 'auto', label: 'Set up auto-contributions', hint: 'Make investing a habit, not a decision' },
      { id: 'confirm', label: 'Confirm your allocation', hint: 'Everything where you intended' },
      { id: 'records', label: 'Save your records', hint: 'Confirmations and cost basis' },
    ],
  },

  'stk_optimize': {
    key: 'stk_optimize',
    eyebrow: 'Stock Investing · Ongoing',
    title: 'Monitor, manage & optimize',
    keyQuestion: 'How do I maximize my outcome?',
    description: 'Investing isn\'t a thing you finish — it\'s a thing you tend. You check in (without overreacting), rebalance when life or markets drift, and let time and consistency do the heavy lifting. This is the long game, where patience quietly compounds into real wealth.',
    perpetual: true,
    graduationOffer: { prompt: 'Ready to convert some of your wealth into property?', routesTo: 'discovery:home' },
    audioSrc: audio_stk_optimize,
    steps: [
      { id: 'review', label: 'Review on a schedule', hint: 'Quarterly beats daily' },
      { id: 'rebalance', label: 'Rebalance when needed', hint: 'Bring allocation back to target' },
      { id: 'reinvest', label: 'Reinvest dividends', hint: 'Let returns earn returns' },
      { id: 'increase', label: 'Increase contributions over time', hint: 'Grow with your income' },
      { id: 'reassess', label: 'Reassess your strategy', hint: 'Adjust as goals and life change' },
    ],
  },

  'wait_assess': {
    key: 'wait_assess',
    eyebrow: 'Wait & Save · Setup',
    title: 'Assess capacity & set the plan',
    keyQuestion: 'Is waiting financially advantageous?',
    description: 'Waiting only works if it\'s a strategy, not a stall. You start by looking honestly at where you stand — income, expenses, debts, and how fast you can save — so the time you spend waiting is time that actually moves you forward.',
    audioSrc: audio_wait_assess,
    steps: [
      { id: 'review', label: 'Review income & expenses', hint: 'What\'s coming in and going out' },
      { id: 'saveops', label: 'Find savings opportunities', hint: 'Where you can free up cash' },
      { id: 'debt', label: 'Spot debt to reduce', hint: 'Lower obligations, stronger position' },
      { id: 'pace', label: 'Calculate monthly savings potential', hint: 'Your real pace' },
    ],
  },

  'wait_define': {
    key: 'wait_define',
    eyebrow: 'Wait & Save · Setup',
    title: 'Define your waiting targets',
    keyQuestion: 'What am I waiting for?',
    description: '"Waiting" is vague; a target is powerful. Here you name exactly what you\'re waiting for — a savings number, a down-payment goal, a rate you\'re hoping to see — so you\'ll know the moment the wait has done its job.',
    audioSrc: audio_wait_define,
    steps: [
      { id: 'savetarget', label: 'Set your savings target', hint: 'The number that changes things' },
      { id: 'dpgoal', label: 'Define your down-payment goal', hint: 'What you\'re building toward' },
      { id: 'expect', label: 'Set rate/price expectations', hint: 'The market conditions you\'re watching' },
      { id: 'timeline', label: 'Choose your timeline', hint: 'Roughly how long you\'ll give it' },
    ],
  },

  'wait_monitor': {
    key: 'wait_monitor',
    eyebrow: 'Wait & Save · Ongoing',
    title: 'Monitor conditions',
    keyQuestion: 'Are conditions improving?',
    description: 'While you wait, you watch. You keep an eye on rates, prices, and your own progress — not obsessively, but enough to recognize the moment things tip in your favor. This is patience with its eyes open.',
    loop: true,
    audioSrc: audio_wait_monitor,
    steps: [
      { id: 'rates', label: 'Track interest rates', hint: 'The cost of borrowing' },
      { id: 'prices', label: 'Watch home prices & inventory', hint: 'What your money will buy' },
      { id: 'rentbuy', label: 'Compare rent vs. buy', hint: 'Is waiting still cheaper?' },
      { id: 'progress', label: 'Review your savings progress', hint: 'Are you on pace?' },
    ],
  },

  'wait_build': {
    key: 'wait_build',
    eyebrow: 'Wait & Save · Ongoing',
    title: 'Build your reserves',
    keyQuestion: 'Is patience creating value?',
    description: 'This is where waiting earns its keep. Every month you save more, pay down debt, and strengthen your credit, you\'re not just passing time — you\'re becoming a stronger buyer. The wait isn\'t empty; it\'s compounding into purchasing power.',
    loop: true,
    audioSrc: audio_wait_build,
    steps: [
      { id: 'save', label: 'Grow your savings', hint: 'Hit your monthly target' },
      { id: 'paydown', label: 'Pay down debt', hint: 'Improve your debt-to-income' },
      { id: 'credit', label: 'Strengthen your credit', hint: 'A better rate when you\'re ready' },
      { id: 'power', label: 'Track your purchasing power', hint: 'Watch it climb' },
    ],
  },

  'wait_reassess': {
    key: 'wait_reassess',
    eyebrow: 'Wait & Save · Decision',
    title: 'Reassess & re-enter the market',
    keyQuestion: 'Is it time to act?',
    description: 'Every so often, you step back and ask the real question: has the wait done its work? If your savings, the rates, and your readiness have lined up, this is the moment the waiting ends — and your homeownership journey begins. If not, you keep building, knowing you\'re closer than you were.',
    graduationGate: { routesTo: 'discovery:home', onNo: 'loop' },
    audioSrc: audio_wait_reassess,
    steps: [
      { id: 'reeval', label: 'Re-evaluate rates & prices', hint: 'Have conditions improved?' },
      { id: 'ready', label: 'Check your readiness', hint: 'Savings, credit, stability' },
      { id: 'compare', label: 'Compare waiting vs. acting', hint: 'Which now wins?' },
      { id: 'decide', label: 'Decide: continue or graduate', hint: 'Keep waiting, or step into buying' },
    ],
  },

  'rent_assess': {
    key: 'rent_assess',
    eyebrow: 'Rent & Invest · Setup',
    title: 'Assess Your Financial Position',
    keyQuestion: 'How can renting support my financial goals?',
    description: 'Strategic renting begins with understanding your financial foundation. Rather than focusing only on your housing costs, take a complete look at your income, expenses, savings, and financial obligations. The goal isn\'t to justify renting—it\'s to understand how your current situation can best support your long-term financial goals.',
    audioSrc: audio_rent_assess,
    steps: [
      { id: 'costs', label: 'Review your monthly cash flow', hint: 'Know what comes in, what goes out, and what\'s left' },
      { id: 'diff', label: 'Evaluate your housing costs', hint: 'Understand how rent fits within your overall budget' },
      { id: 'efund', label: 'Confirm your emergency savings', hint: 'Build financial stability before pursuing bigger goals' },
      { id: 'capacity', label: 'Identify available financial capacity', hint: 'Determine how much can realistically be directed toward future goals' },
    ],
  },

  'rent_define': {
    key: 'rent_define',
    eyebrow: 'Rent & Invest · Setup',
    title: 'Define your priorities',
    keyQuestion: 'What am I working toward during this season of renting?',
    description: 'Renting creates flexibility, but flexibility is only valuable when it has a purpose. Define what success looks like over the next few years, whether that\'s saving for a home, investing, reducing debt, advancing your career, or simply creating greater financial security.',
    audioSrc: audio_rent_define,
    steps: [
      { id: 'flex', label: 'Clarify your financial priorities', hint: 'Decide what matters most right now' },
      { id: 'invtarget', label: 'Choose your primary objective', hint: 'Saving, investing, debt reduction, homeownership, or flexibility' },
      { id: 'horizon', label: 'Define your planning horizon', hint: 'Consider how long your current strategy fits your goals' },
      { id: 'change', label: 'Identify potential life changes', hint: 'Recognize events that could shift your financial direction' },
    ],
  },

  'rent_invest': {
    key: 'rent_invest',
    eyebrow: 'Rent & Invest · Ongoing',
    title: 'Execute Your Financial Plan',
    keyQuestion: 'Am I making consistent progress toward my goals?',
    description: 'This is where your strategy becomes action. Maintain housing costs that support your plan and consistently direct available resources toward your highest financial priorities. Progress doesn\'t require perfection—it requires consistency.',
    loop: true,
    audioSrc: audio_rent_invest,
    steps: [
      { id: 'efficient', label: 'Keep housing costs aligned with your plan', hint: 'Avoid lifestyle creep that limits future choices' },
      { id: 'investdiff', label: 'Direct surplus toward your priorities', hint: 'Save, invest, reduce debt, or prepare for a future purchase' },
      { id: 'efund', label: 'Maintain financial resilience', hint: 'Protect your emergency fund while making progress' },
      { id: 'track', label: 'Measure your progress regularly', hint: 'Track the goals you\'ve chosen to pursue' },
    ],
  },

  'rent_reassess': {
    key: 'rent_reassess',
    eyebrow: 'Rent & Invest · Ongoing',
    title: 'Review & Adjust',
    keyQuestion: 'Is my current strategy still serving me well?',
    description: 'Your financial plan should evolve as your life changes. Periodically review your progress, reassess your priorities, and determine whether strategic renting continues to support your goals or whether another path deserves consideration.',
    loop: true,
    audioSrc: audio_rent_reassess,
    steps: [
      { id: 'growth', label: 'Review your financial progress', hint: 'Evaluate how far you\'ve come' },
      { id: 'needs', label: 'Reassess your personal priorities', hint: 'Make sure your plan still reflects your life today' },
      { id: 'recompare', label: 'Compare your available options', hint: 'Consider whether renting remains your best strategy' },
      { id: 'confirm', label: 'Refine your financial plan', hint: 'Stay the course or prepare for your next chapter' },
    ],
  },

  'rent_graduate': {
    key: 'rent_graduate',
    eyebrow: 'Rent & Invest · Decision',
    title: 'Choose Your Next Wealth-Building Journey',
    keyQuestion: 'What path best supports my next stage of financial growth?',
    description: 'Strategic renting isn\'t a destination—it\'s a season of intentional financial preparation. As your financial position strengthens, periodically evaluate the opportunities in front of you. Whether your next step is purchasing a home, house hacking, investing in the stock market, or continuing to rent with purpose, the goal is making a deliberate decision based on your circumstances rather than feeling pressured into one path.',
    graduationGate: { routesTo: 'discovery:stock', onNo: 'loop' },
    audioSrc: audio_rent_graduate,
    steps: [
      { id: 'review', label: 'Review your financial foundation', hint: 'Assess your savings, cash flow, and overall readiness' },
      { id: 'formal', label: 'Explore your available paths', hint: 'Compare homeownership, house hacking, investing, or continued renting' },
      { id: 'weigh', label: 'Evaluate the trade-offs', hint: 'Understand which strategy best aligns with your current goals' },
      { id: 'decide', label: 'Choose your next journey', hint: 'Move forward with confidence—or continue strengthening your position' },
    ],
  },
};

// Look up authored Environment content by milestone key. Returns the content
// object (key/eyebrow/title/keyQuestion/description/audioSrc/steps) or null if
// no authored cell exists for that key (caller falls back to a generated one).
export function getEnvironmentContent(milestoneKey) {
  if (!milestoneKey) return null;
  return ENVIRONMENT_CONTENT[milestoneKey] ?? null;
}

// The set of keys that have authored content — coverage guard (should match
// EXECUTION_MILESTONE_KEYS from executionPaths.js).
export const AUTHORED_ENVIRONMENT_KEYS = new Set(Object.keys(ENVIRONMENT_CONTENT));