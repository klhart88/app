// ============================================================================
// RealEquityIQ — Page Help Content Registry
//
// One entry per screen/topic, read by <HelpIcon topic="..."> (see
// components/HelpIcon.jsx). Mirrors the narrationRegistry.js convention: a
// single named export, keyed by topic, so every "how this page works" blurb
// is visible at a glance in one file and adding a new one is a one-line change
// here plus a single <HelpIcon topic="..."/> drop-in wherever it's needed —
// no new component or state required per screen.
//
// Keep each body short (2-3 sentences). This renders inline, under the page
// title, so it competes with the page's own content for attention — it's a
// quick orientation note, not documentation.
// ============================================================================

export const PAGE_HELP = {
  location: {
    title: 'About this step',
    body: 'Pick the Indiana county you\u2019re evaluating. Every projection on the next few screens uses this county\u2019s home prices, rents, and tax rates as a starting point \u2014 you can still adjust any number to match a specific property.',
  },
  profile: {
    title: 'About this step',
    body: 'Tell us your income, savings, and monthly budget. This is what turns county-level averages into a simulation of your own finances \u2014 nothing here is shared or saved beyond your account.',
  },
  scenario: {
    title: 'About this step',
    body: 'Choose one path to simulate first. The comparison that follows is optional \u2014 you can run just this one path, or stack up to two more against it before seeing results.',
  },
  results: {
    title: 'About this page',
    body: 'Your projected net worth changes over time. Tap any result in the timeline for a detailed breakdown of what\u2019s driving that value.',
  },
  journey: {
    title: 'About your Journey',
    body: 'This tracks your milestones and IQ as you move through a path, season by season. IQ is an engagement score \u2014 just for fun, not a measure of intelligence or financial standing.',
  },
};
