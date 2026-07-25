// ============================================================================
// RealEquityIQ — Execution Paths (the env → real-milestone map)
//
// THE SINGLE SOURCE OF AWARD IDENTITY for the Execution Journey.
//
// Vocabulary (locked with owner):
//   - PATH        : the Discovery decision that sets the journey's undercurrent
//                   (rent | buy | househack | invest | wait). One per journey.
//   - STAGE       : one step in the Execution sequence. Every Path shares the
//                   SAME CORE STAGES; only the content inside differs by Path.
//   - ENVIRONMENT : the lived pop-up scene for one Stage (EnvironmentScene). It
//                   holds that Stage's checklist. Completing the whole checklist
//                   awards EXACTLY ONE milestone.
//   - STATION     : the dot on the map for one Stage/Environment.
//   - MILESTONE   : the awarded record (milestone_defs key) that lights when its
//                   Environment is completed.
//
// So the chain is:
//   Station (map) → opens Environment (a Stage's scene) → complete checklist →
//   ONE Milestone awarded → station lights, red line advances, IQ climbs.
//
// WHY THIS FILE EXISTS / WHY THE KEY LIVES HERE (not on the EnvironmentScene
// content row, not in the map): the Environment is now the ONLY surface that
// awards (the old loose JourneyMap self-report buttons are retired). The award
// identity must therefore resolve from a stable, code-side (Path, Stage) lookup
// — same Stage + different Path → different milestone key + different content.
// Resolving the key here (rather than trusting whatever `milestone.key` an
// arbitrary content row carries) keeps the award unambiguous and prevents a
// content edit from silently re-pointing an award.
//
// Keys below are the REAL keys from the content baseline (verified there). The
// Home/Buy path reuses the seeded self-report keys (sr_preapproved / sr_toured /
// sr_offer / sr_closed) exactly where they map — those were the keys the retired
// self-report buttons used, so no milestone_defs change is needed for Buy. The
// other paths' keys (hh_*, stk_*, wait_*, rent_*, define_home) are seeded as
// new milestone_defs rows (the baseline's 16 Execution rows). Until those rows
// exist server-side, awardMilestone() simply no-ops for them (record_milestone
// validates the key) — wiring is safe to ship ahead of the seed.
// ============================================================================

// Discovery's internal scenario key → Execution path key. The Discovery winner
// maps 1:1 to the execution path (handoff: rent→Flexibility, buy→Homeownership,
// househack→House Hack, invest→Investor, wait→Readiness). The Discovery side
// uses 'househack' internally (saveSimulation renames it to the 'house_hack'
// enum only at persist time), so we key on the INTERNAL form here.
export const SCENARIO_TO_PATH = {
  rent:      'rent',
  buy:       'buy',
  househack: 'househack',
  invest:    'invest',
  wait:      'wait',
};

// Each Path is an ORDERED list of Stages. A Stage carries:
//   - milestoneKey : the milestone_defs key this Environment awards (award identity)
//   - stage        : the canonical core-stage slot (shared shape across paths)
//   - label        : short map/station label
//   - eyebrow      : the Environment's "Path · Step N" eyebrow
//
// The map renders one Station per Stage in THIS order; the avatar/red-line ride
// the furthest-earned Stage exactly as before. Content (description, checklist,
// audio, scene) is loaded by the Environment from the content baseline keyed by
// milestoneKey — it is intentionally NOT duplicated here. This file owns
// SEQUENCE + IDENTITY; the baseline owns COPY.
export const EXECUTION_PATHS = {
  buy: {
    key:   'buy',
    shortLabel: 'Buy',
    label: 'Become a Homeowner',
    stages: [
      { stage: 'assess',  milestoneKey: 'sr_preapproved', label: 'Get pre-approved',           eyebrow: 'Become a Homeowner · Step 1' },
      { stage: 'define',  milestoneKey: 'define_home',     label: 'Define your home',           eyebrow: 'Become a Homeowner · Step 2' },
      { stage: 'act',     milestoneKey: 'sr_toured',       label: 'Tour homes',                 eyebrow: 'Become a Homeowner · Step 3' },
      { stage: 'commit',  milestoneKey: 'sr_offer',        label: 'Make an offer',              eyebrow: 'Become a Homeowner · Step 4' },
      { stage: 'arrive',  milestoneKey: 'sr_closed',       label: 'Close on a home',            eyebrow: 'Become a Homeowner · Step 5' },
    ],
  },

  househack: {
    key:   'househack',
    shortLabel: 'House hack',
    label: 'House Hack',
    stages: [
      { stage: 'assess',  milestoneKey: 'hh_preapproved', label: 'Get pre-approved',            eyebrow: 'House Hack · Step 1' },
      { stage: 'define',  milestoneKey: 'hh_define',       label: 'Define the property',         eyebrow: 'House Hack · Step 2' },
      { stage: 'act',     milestoneKey: 'hh_tour',         label: 'Tour properties',             eyebrow: 'House Hack · Step 3' },
      { stage: 'commit',  milestoneKey: 'hh_offer',        label: 'Make an offer',               eyebrow: 'House Hack · Step 4' },
      { stage: 'arrive',  milestoneKey: 'hh_close',        label: 'Close & place a tenant',      eyebrow: 'House Hack · Step 5' },
    ],
  },

  invest: {
    key:   'invest',
    shortLabel: 'Invest',
    label: 'Stock Investing',
    stages: [
      { stage: 'assess',  milestoneKey: 'stk_assess',   label: 'Assess readiness',              eyebrow: 'Stock Investing · Step 1' },
      { stage: 'define',  milestoneKey: 'stk_define',    label: 'Define your strategy',          eyebrow: 'Stock Investing · Step 2' },
      { stage: 'act',     milestoneKey: 'stk_research',  label: 'Research & choose',             eyebrow: 'Stock Investing · Step 3' },
      { stage: 'commit',  milestoneKey: 'stk_execute',   label: 'Execute your plan',             eyebrow: 'Stock Investing · Step 4' },
      { stage: 'arrive',  milestoneKey: 'stk_optimize',  label: 'Optimize & rebalance',          eyebrow: 'Stock Investing · Ongoing' },
    ],
  },

  // Positioning loops (Wait, Rent): same 5-slot shape, but Stage 5 is a
  // graduation gate, not a terminal milestone. The award shape is identical —
  // one milestone on Environment completion — so they wire the same way; only
  // the copy (monitor/reassess voice) differs, and that lives in the baseline.
  wait: {
    key:   'wait',
    shortLabel: 'Wait',
    label: 'Wait & Save',
    stages: [
      { stage: 'assess',  milestoneKey: 'wait_assess',   label: 'Assess your position',         eyebrow: 'Wait & Save · Setup' },
      { stage: 'define',  milestoneKey: 'wait_define',    label: 'Define your targets',          eyebrow: 'Wait & Save · Setup' },
      { stage: 'act',     milestoneKey: 'wait_monitor',   label: 'Monitor the market',           eyebrow: 'Wait & Save · Ongoing' },
      { stage: 'commit',  milestoneKey: 'wait_build',     label: 'Build your reserves',          eyebrow: 'Wait & Save · Ongoing' },
      { stage: 'arrive',  milestoneKey: 'wait_reassess',  label: 'Reassess & decide',            eyebrow: 'Wait & Save · Decision' },
    ],
  },

  rent: {
    key:   'rent',
    shortLabel: 'Rent',
    label: 'Rent & Invest',
    stages: [
      { stage: 'assess',  milestoneKey: 'rent_assess',    label: 'Assess your position',         eyebrow: 'Rent & Invest · Setup' },
      { stage: 'define',  milestoneKey: 'rent_define',     label: 'Define your plan',             eyebrow: 'Rent & Invest · Setup' },
      { stage: 'act',     milestoneKey: 'rent_invest',     label: 'Invest the difference',        eyebrow: 'Rent & Invest · Ongoing' },
      { stage: 'commit',  milestoneKey: 'rent_reassess',   label: 'Reassess your position',       eyebrow: 'Rent & Invest · Ongoing' },
      { stage: 'arrive',  milestoneKey: 'rent_graduate',   label: 'Graduate or continue',         eyebrow: 'Rent & Invest · Decision' },
    ],
  },
};

// Resolve a Path object from a Discovery scenario key (or a direct path key).
// Returns null if unknown — callers treat null as "no execution path yet".
export function getExecutionPath(scenarioOrPathKey) {
  if (!scenarioOrPathKey) return null;
  const pathKey = SCENARIO_TO_PATH[scenarioOrPathKey] ?? scenarioOrPathKey;
  return EXECUTION_PATHS[pathKey] ?? null;
}

// The "paths not taken": every execution path EXCEPT the active primary. Used by
// the world map's alternative-path spurs. Because the registry is fixed at five
// paths and exactly one is the primary, this is ALWAYS four entries when a
// primary exists — and an EMPTY array when none does (a standalone visit with no
// Discovery winner, where "not taken" is meaningless). Returns lightweight
// { key, shortLabel } objects in registry order, so the spur set is fully
// deterministic from the primary alone (no dependency on what was compared).
export function alternativePaths(primaryScenarioOrPathKey) {
  const primary = getExecutionPath(primaryScenarioOrPathKey);
  if (!primary) return [];                       // no primary → no "not taken"
  return Object.values(EXECUTION_PATHS)
    .filter((p) => p.key !== primary.key)
    .map((p) => ({ key: p.key, shortLabel: p.shortLabel ?? p.label }));
}

// Resolve the milestone key a given Station/Stage awards, for a given Path.
// This is THE award-identity lookup the orchestrator uses: never trust a
// content row's own `key`; resolve here from (path, stage) so the award is
// stable against content edits.
//   pathKey      : execution path key ('buy', 'househack', …) or a scenario key
//   stageOrKey   : either the canonical stage slot ('assess'…'arrive') OR the
//                  milestoneKey itself (the map passes the key it already holds)
// Returns the milestone_defs key string, or null if it can't be resolved.
export function resolveMilestoneKey(pathKey, stageOrKey) {
  const path = getExecutionPath(pathKey);
  if (!path || !stageOrKey) return null;
  const hit = path.stages.find(
    (s) => s.stage === stageOrKey || s.milestoneKey === stageOrKey
  );
  return hit ? hit.milestoneKey : null;
}

// The set of all milestone keys any Environment can award. Useful for the map
// to know which earned milestones are "execution" milestones vs. the in-app
// Discovery ones, and as a guard list.
export const EXECUTION_MILESTONE_KEYS = new Set(
  Object.values(EXECUTION_PATHS).flatMap((p) => p.stages.map((s) => s.milestoneKey))
);

// Find a stage definition by its milestone key, scanning across ALL paths.
// Used by the orchestrator to get a station's display copy (label/eyebrow) from
// the already-resolved key the map passes — without needing to know which path
// is active (which App can't reliably know for a DB-sourced standalone visit).
// Keys are globally unique across paths, so the first match is correct.
export function findStageByKey(milestoneKey) {
  if (!milestoneKey) return null;
  for (const path of Object.values(EXECUTION_PATHS)) {
    const hit = path.stages.find((s) => s.milestoneKey === milestoneKey);
    if (hit) return hit;
  }
  return null;
}

// ── Discovery prologue ────────────────────────────────────────────────────────
// The in-app milestones that precede execution. On the world map these are the
// valley-floor opening of the trail — the user walks from onboarding through the
// "choose your path" decision, then climbs into the Path's execution stages.
// This makes the map CONTINUOUS (Discovery → Execution), per the locked product
// decision, rather than two disconnected surfaces.
//
// These keys already exist in milestone_defs (system/action/behavior). They are
// NOT environment-backed — they're auto-awarded elsewhere in the app — so on the
// map they are read-only checkpoints, not tap-to-open stations. nodeType marks
// the editorial moments from the baseline concept: "Compare paths" reads as a
// decision, and the path choice is the gateway into execution.
export const DISCOVERY_STATIONS = [
  { milestone_key: 'complete_profile', label: 'Your profile',   nodeType: 'standard' },
  { milestone_key: 'first_simulation', label: 'First simulation', nodeType: 'standard' },
  { milestone_key: 'compare_3_paths',  label: 'Compare paths',   nodeType: 'decision' },
  { milestone_key: 'run_all_5',        label: 'Run all 5',       nodeType: 'standard' },
];

// Editorial nodeType overrides for execution stages, by canonical stage slot.
// State (locked/completed/current) is always derived; this only elevates the
// GLYPH for narrative moments. The arrival stage of an asset-builder path is the
// gold "landmark" (closing on a home is the headline); the "act"/tour stage of
// the home paths carries the lens-insight anchor, so it reads as an insight node.
// Anything not listed renders as a standard node.
const STAGE_NODE_TYPE = {
  // asset-builder arrival = landmark; everything else standard unless noted.
  arrive: 'landmark',
};

// Assemble the full CONTINUOUS ordered station list for a journey:
//   [ ...Discovery prologue, ...active Path's execution stages ]
// Each station is normalized to the shape the world map renders:
//   { milestone_key, label, nodeType, isEnvironment }
//   - isEnvironment=true  → tap opens an Environment (execution stages)
//   - isEnvironment=false → read-only checkpoint (Discovery prologue)
// If no path is resolvable yet (no Discovery winner), returns just the prologue
// so the map still shows the journey-so-far rather than an empty canvas.
export function buildJourneyStations(scenarioOrPathKey) {
  const prologue = DISCOVERY_STATIONS.map((d) => ({
    milestone_key: d.milestone_key,
    label:         d.label,
    nodeType:      d.nodeType ?? 'standard',
    isEnvironment: false,
  }));

  const path = getExecutionPath(scenarioOrPathKey);
  if (!path) return prologue;

  const execution = path.stages.map((s) => ({
    milestone_key: s.milestoneKey,
    label:         s.label,
    nodeType:      STAGE_NODE_TYPE[s.stage] ?? 'standard',
    isEnvironment: true,
  }));

  return [...prologue, ...execution];
}