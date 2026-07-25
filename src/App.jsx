import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage.jsx';
import CountySelector from './components/CountySelector.jsx';
import { useNarration } from './lib/useNarration.js';
import { unlock as unlockAudio, initSoundPreference } from './lib/audioSession.js';
import NarrationControl from './components/NarrationControl.jsx';
import { NARRATION } from './lib/narrationRegistry.js';
import ProfileSetup from './components/ProfileSetup.jsx';
import ScenarioPicker from './components/ScenarioPicker.jsx';
import ComparisonPicker from './components/ComparisonPicker.jsx';
import ResultsScreen from './components/ResultsScreen.jsx';
import ComparisonResultsScreen from './components/ComparisonResultsScreen.jsx';
import DecisionHandoff from './components/DecisionHandoff.jsx';
import JourneyMap from './components/JourneyMap.jsx';
import EnvironmentScene from './components/EnvironmentScene.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import HelpIcon from './components/HelpIcon.jsx';
import AuthModal from './components/auth/AuthModal.jsx';
import ResetPassword from './components/auth/ResetPassword.jsx';
import PricingModal from './components/pricing/PricingModal.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { supabase } from './supabase.js';
import { openBillingPortal } from './lib/plans.js';
import { awardMilestone, MILESTONE_KEYS } from './lib/milestones.js';
import { findStageByKey } from './lib/executionPaths.js';
import { getEnvironmentContent } from './lib/environmentContent.js';
import { saveSimulation } from './lib/saveSimulation.js';
import { theme, styles } from './theme.js';
import { runScenario, prepareInputs } from './engine/engine.js';


// The provider must wrap everything that calls useAuth().
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const { isAuthenticated, user, session, signOut, recoveryMode, setRecoveryMode } = useAuth();

  const [step, setStep]             = useState(0);

  // Scroll to the top whenever the funnel step changes. Without this, advancing
  // from a screen the user scrolled down (e.g. tapping "Choose my path" at the
  // bottom of results) lands them mid-page on the next screen. Keyed on step so
  // every transition starts at the top.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);
  const [selectedCounty, setCounty] = useState(null);
  const [profileInputs, setProfile] = useState(null);
  const [results, setResults]       = useState(null);

  // Comparison (lens-insights) selection. After the user commits a PRIMARY
  // scenario in the picker, we show an optional, skippable comparison screen
  // BEFORE running the sim. Kept as separate state (not a new step number) so
  // it never collides with the 0-4 step machine or ProgressBar — same
  // convention as showJourney below.
  const [pendingPrimary, setPendingPrimary] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  // The committed comparison selection { primary, secondaries[] }, passed to
  // JourneyMap as a prop so a fresh-from-funnel Journey view knows the lenses
  // without a DB round-trip. Null = no comparison this run (map falls back to
  // reading comparison_set from the active journey).
  const [activeComparison, setActiveComparison] = useState(null);
  // The path the user COMMITTED to in the Decision Handoff (Option B): mirrors
  // public.users.identity_path. Passed to JourneyMap so a fresh-from-handoff
  // Journey prefers it over comparison_set.primary without a DB round-trip
  // (JourneyMap also reads identity_path from the DB as a fallback). null =
  // nothing committed this session.
  const [identityPath, setIdentityPath] = useState(null);
  // The per-path simulation results for a comparison run: an array of
  // { scenarioKey, result } in [primary, ...secondaries] order. Populated only
  // when secondaries were chosen; null for single-path runs. Drives the
  // ComparisonResultsScreen (results-only side-by-side). The single-path
  // `results` state still holds the PRIMARY's result so the normal ResultsScreen
  // and downstream save/award logic are unaffected.
  const [comparisonResults, setComparisonResults] = useState(null);
  // True once the user has run all distinct scenarios (run_all_5 rule) in the
  // active journey — the gate for offering the Decision Handoff. Sourced from
  // award_run_milestones' authoritative count (counted >= target_all), which is
  // recomputed from the simulations table every run, so it stays true on every
  // run AFTER the threshold is crossed (not just the crossing run). Gating the
  // handoff here keeps path-commitment from outrunning the journey's stage
  // unlocks. Resets with the journey/session like other run-derived state.
  const [canDecide, setCanDecide] = useState(false);

  // Auth modal state. authMode: 'signin' | 'signup' | null
  const [authMode, setAuthMode]     = useState(null);

  // Pricing/subscription state.
  const [showPricing, setShowPricing]   = useState(false);
  const [currentTier, setCurrentTier]   = useState('free');
  // When a logged-out user clicks Subscribe, remember the plan so we can resume
  // checkout automatically after they authenticate.
  const [pendingPlan, setPendingPlan]   = useState(null);
  // Post-checkout success banner.
  const [checkoutBanner, setCheckoutBanner] = useState(null);

  // Journey (gamification) view — a self-contained overlay over the funnel.
  // Kept separate from `step` so it never collides with the step-machine.
  const [showJourney, setShowJourney] = useState(false);

  // ── Execution Journey: the open Environment (the only award surface) ──────
  // The map is read-only + a launcher; tapping a station opens that station's
  // Environment here. activeEnvironment is the resolved milestone object handed
  // to <EnvironmentScene> (key + points + copy + checklist). null = none open.
  // journeyReloadKey bumps after an award so <JourneyMap> remounts and re-reads
  // milestone_awards — relighting the just-earned station, advancing the avatar
  // and red line, and counting up IQ, with no in-map write.
  const [activeEnvironment, setActiveEnvironment] = useState(null);
  const [journeyReloadKey, setJourneyReloadKey]   = useState(0);

  function handleStart()             { unlockAudio(); setStep(1); }
  function handleCountySelect(c)     { setCounty(c); }
  function handleCountyContinue()    { setStep(2); }
  function handleProfileNext(inputs) {
    setProfile(inputs);
    setStep(3);
  }

  // The picker commits a PRIMARY scenario. For Pro+ users we stash it and show
  // the optional comparison screen (the actual sim run is deferred to
  // runWithComparison after continue/skip). For FREE users we skip the
  // comparison screen entirely and run immediately with no secondaries.
  //
  // ENTRY-MODEL DECISION (#5): the secondary-scenario picker is Pro-gated. The
  // secondary drives the lens insights, which are a Pro/journey feature — a Free
  // lead picking a secondary would generate a comparison_set selection with
  // nowhere to land (no journey, no map, no lens fires). Hiding it from Free is
  // cleaner and makes "compare paths side-by-side" a concrete Pro carrot. We
  // gate HERE (in App), not inside ComparisonPicker, to keep that component pure.
  async function handlePrimaryChosen(scenarioKey) {
    // Always fetch a fresh tier before the Pro check — currentTier can be stale
    // ('free') if fetchTier()'s async useEffect hasn't resolved yet when this
    // fires. Awaiting here guarantees we read the real DB value, not a race
    // condition artifact. The fetch is fast (single row, indexed) so the delay
    // is imperceptible.
    const freshTier = await fetchTier();
    const isPro = freshTier !== 'free' && freshTier !== null;
    if (!isPro) {
      // Free: no comparison step. Run the primary alone. Return the promise so
      // ScenarioPicker's await (and its loading state) resolve correctly.
      setPendingPrimary(scenarioKey);
      return runWithComparison(scenarioKey, []);
    }
    setPendingPrimary(scenarioKey);
    setShowComparison(true);
  }

  // Shared finish path: persist the primary + chosen secondaries on the active
  // journey, then run the sim and advance to results. Persistence is Pro-gated
  // server-side (set_comparison_set mirrors record_milestone) and best-effort
  // from the UI's side — a free/anon user simply gets no comparison saved, and
  // the sim still runs. We never block the core funnel on the comparison write.
  async function runWithComparison(primaryKey, secondaries) {
    const sec = secondaries ?? [];
    try {
      const { error } = await supabase.rpc('set_comparison_set', {
        p_primary: primaryKey,
        p_secondaries: sec,
      });
      // A gate response ({ saved:false, reason:'no_active_subscription' }) is
      // not an error — it just means nothing was saved. Only real RPC errors
      // are worth logging; they must not stop the simulation.
      if (error) console.warn('set_comparison_set error:', error.message);
    } catch (e) {
      console.warn('set_comparison_set threw:', e?.message ?? e);
    }

    // Remember the selection for the Journey view (prop path, Q3).
    setActiveComparison({ primary: primaryKey, secondaries: sec });

    setShowComparison(false);
    setPendingPrimary(null);

    const inputs = prepareInputs(profileInputs, selectedCounty);

    // Run the PRIMARY plus each chosen secondary against IDENTICAL inputs/county,
    // so the paths are compared on equal footing. The primary's result remains
    // the single-path `results` (drives the normal ResultsScreen + the save/award
    // logic below, both of which are primary-only by design). The full array
    // feeds the side-by-side ComparisonResultsScreen.
    const result = runScenario(primaryKey, inputs, selectedCounty);
    setResults(result);

    if (sec.length > 0) {
      // [primary, ...secondaries], each a fresh run. runScenario is pure given
      // (key, inputs, county), so this is just N independent projections.
      const perPath = [primaryKey, ...sec].map((key) => ({
        scenarioKey: key,
        result: key === primaryKey ? result : runScenario(key, inputs, selectedCounty),
      }));
      setComparisonResults(perPath);
    } else {
      setComparisonResults(null); // single-path run → no side-by-side
    }

    setStep(4);

    // ── Persist the run, THEN award the milestones that depend on it ──────────
    // The save was previously a fire-and-forget effect inside ResultsScreen.
    // It now lives here (lib/saveSimulation) for two reasons:
    //   1. ResultsScreen stays a pure presentation component (no supabase/auth).
    //   2. run-count milestones (compare_3_paths / run_all_5) COUNT rows in
    //      `simulations` scoped to the active journey — so the row for THIS run
    //      must be written before we ask the server to count. Hence we await the
    //      save and only then call award_run_milestones.
    // The save is resilient: it logs and resolves on failure, never blocking the
    // user. For leads/anon it writes a null-owner row (Anon insert policy) and
    // the awards below all no-op. We intentionally do NOT await the awards — they
    // are background side effects of progress, not gates on the results view,
    // which is already rendered above.
    const isPro = currentTier !== 'free' && currentTier !== null;
    saveSimulation({
      result,
      county: selectedCounty,
      isPro,
      currentTier,
      userId: user?.id ?? null,
    }).then(() => {
      // complete_profile + first_simulation: profile first PUT TO USE in a run.
      // complete_profile co-fires here (not at profile-submit) because the
      // profile only becomes meaningful when it produces a real projection, and
      // an authed Pro user is the only one a milestone can land on. All of these
      // no-op for leads/anon and on repeat (once-per-journey, server-side).
      awardMilestone(MILESTONE_KEYS.complete_profile);
      awardMilestone(MILESTONE_KEYS.first_simulation);
      // compare_3_paths / run_all_5: derived from the DISTINCT scenarios run in
      // this journey. Runs AFTER the save so the just-written row is counted.
      // Server-side gated + idempotent per journey (see award_run_milestones).
      // We also read the returned count to gate the Decision Handoff: the button
      // appears once all distinct scenarios have been run (counted >= target_all).
      // We gate on the COUNT, not the run_all_5 award field — the award is
      // idempotent and returns null on runs after the threshold, whereas the
      // count is recomputed every call and stays accurate.
      supabase.rpc('award_run_milestones').then(({ data, error }) => {
        if (error) { console.warn('award_run_milestones error:', error.message); return; }
        const counted = data?.counted ?? 0;
        const targetAll = data?.target_all ?? 0;
        if (targetAll > 0 && counted >= targetAll) setCanDecide(true);
      }).catch((e) => console.warn('award_run_milestones threw:', e?.message ?? e));
    });
  }

  // Continue from the comparison screen WITH 1-2 secondary lenses.
  async function handleComparisonContinue(secondaries) {
    await runWithComparison(pendingPrimary, secondaries);
  }

  // Skip the comparison: clear any saved selection (p_primary keeps the path,
  // empty secondaries = "no comparison"), then run.
  async function handleComparisonSkip() {
    await runWithComparison(pendingPrimary, []);
  }

  // Back out of the comparison screen to the picker without running.
  function handleComparisonBack() {
    setShowComparison(false);
    setPendingPrimary(null);
  }

  // ── Decision Handoff: commit to a path ───────────────────────────────────
  // Writes the chosen path to public.users.identity_path via set_identity_path
  // (Pro-gated, auth.uid()-scoped — best-effort: a gate response is a no-save,
  // not an error, and never blocks the UI). On success we update local
  // identityPath so the Journey prefers it immediately, then route into the
  // Journey view and bump journeyReloadKey so <JourneyMap> remounts and re-reads.
  async function handleCommit(pathKey) {
    try {
      const { data, error } = await supabase.rpc('set_identity_path', {
        p_path: pathKey,
      });
      if (error) {
        console.warn('set_identity_path error:', error.message);
      } else if (data && data.saved === false) {
        console.warn('set_identity_path not saved:', data.reason);
      }
    } catch (e) {
      console.warn('set_identity_path threw:', e?.message ?? e);
    }

    // Optimistically reflect the commitment locally regardless of the write's
    // server-side fate (free/anon simply won't have it persisted). The Journey
    // reads this prop first.
    setIdentityPath(pathKey);

    // Show the Journey, freshly remounted so it also re-reads identity_path
    // from the DB (keeps prop and DB paths consistent).
    setShowJourney(true);
    setJourneyReloadKey((k) => k + 1);
    setStep(4);
  }

  function handleRestart() {
    setStep(0); setCounty(null); setProfile(null); setResults(null);
    setShowComparison(false); setPendingPrimary(null); setActiveComparison(null);
    setIdentityPath(null);
    // canDecide is deliberately a one-way flag elsewhere (see the
    // get_run_progress effect above — "we only ever flip canDecide ON,
    // never off") so an in-session unlock survives a slow reload-check.
    // That's correct for THAT effect, but it means nothing else in the app
    // ever resets it either — so without this line, starting a new season
    // here would inherit "Choose my path" already unlocked from whatever
    // season last earned it, letting you commit after one simulation
    // instead of five.
    setCanDecide(false);
  }

  // ── Execution Journey: open an Environment from a map station ─────────────
  // The map hands us the station's milestone_key AND its points (the map already
  // holds milestone_defs, so it is the single source for points — App no longer
  // guesses). We resolve the key against the active Path into the Environment
  // content object EnvironmentScene renders. For now the active Path is inferred
  // from the run's primary scenario (the Execution path is the Discovery
  // winner); a standalone journey visit with no run this session falls back to
  // the Buy path so the keys still resolve. The resolved object carries the REAL
  // milestone key — the single source of award identity — plus the passed points
  // (for the confirm guard's "+N IQ") and whatever copy we have. EnvironmentScene
  // stays pure; App owns this assembly.
  function handleEnterEnvironment(milestoneKey, points) {
    const env = buildEnvironment(milestoneKey, points);
    if (env) setActiveEnvironment(env);
  }

  function handleEnvironmentClose() {
    setActiveEnvironment(null);
  }

  // The ONE award path. EnvironmentScene emits this (post confirm-guard) when a
  // milestone's checklist is fully completed. Mirrors runWithComparison's
  // orchestrator pattern: the pure component emits, App awards. awardMilestone
  // is safe — it no-ops for free/anon, on no active sub, and on repeat
  // (record_milestone is once-per-journey server-side), so a re-completed
  // Environment can't double-award. After the award we bump journeyReloadKey so
  // the map re-reads milestone_awards and reflects the new state.
  async function handleEnvironmentComplete(milestoneKey) {
    setActiveEnvironment(null);
    await awardMilestone(milestoneKey);
    setJourneyReloadKey((k) => k + 1);
  }

  // Resolve a milestone_key → the Environment content object for EnvironmentScene.
  // Identity (key) comes from the active Path's definition; points are passed in
  // by the map (the single source — milestone_defs, which the map loads). Copy/
  // checklist come from the authored content module (environmentContent.js, all
  // 25 cells extracted from the content baseline). A key with no authored cell
  // falls back to a minimal generated Environment so the award path still works.
  function buildEnvironment(milestoneKey, points) {
    // The map already resolved this key against the correct active Path when it
    // built its stations (buildJourneyStations), so milestoneKey is ALREADY the
    // real milestone_defs key — App does not re-resolve (re-resolving here would
    // require App to know the path, which it can't for a DB-sourced standalone
    // visit, and would risk disagreeing with what the map showed).

    // Authored content (the common case now — all 25 execution cells are
    // covered). Spread so we can attach the map-sourced points for the confirm
    // guard's "+N IQ" line without mutating the shared module object.
    const authored = getEnvironmentContent(milestoneKey);
    if (authored) {
      return { ...authored, points };
    }

    // Fallback: no authored cell for this key (e.g. a future/unseeded station).
    // Minimal valid Environment — real identity + a single confirming step —
    // so the award path is exercised rather than crashing on missing copy.
    const stageDef = findStageByKey(milestoneKey);
    return {
      key:         milestoneKey,
      eyebrow:     stageDef?.eyebrow ?? 'Your journey',
      title:       stageDef?.label ?? 'Milestone',
      keyQuestion: 'Have you completed this step?',
      description:
        'This step is part of your execution journey. Work through it in real ' +
        'life, then mark it complete to record it on your journey.',
      points,
      steps: [
        { id: 'done', label: `Complete: ${stageDef?.label ?? 'this step'}`, hint: 'Mark when finished in real life' },
      ],
    };
  }

  // Tidy the address bar: Supabase auth redirects can leave a bare "#" or a
  // leftover token hash in the URL. Once we're NOT in recovery mode, strip any
  // hash and the ?recovery=1 marker so the URL reads cleanly as the domain.
  useEffect(() => {
    if (recoveryMode) return; // keep the hash while the reset flow needs it
    const hasHash = window.location.hash.length > 0;
    const hasRecoveryParam = window.location.search.includes('recovery=');
    if (hasHash || hasRecoveryParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [recoveryMode]);

  // Fetch the signed-in user's tier from their profile. Re-runs when auth
  // changes. Exposed via fetchTier() so the checkout-return flow can poll.
  async function fetchTier() {
    if (!user) { setCurrentTier('free'); return 'free'; }
    const { data, error } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      // Don't silently downgrade to 'free' on a transient error — keep whatever
      // we had and log it so the button doesn't flicker back to "Upgrade".
      console.warn('fetchTier error:', error.message);
      return currentTier;
    }
    const t = data?.tier ?? 'free';
    setCurrentTier(t);
    return t;
  }

  // Trigger on the access token, not just `user`. On a fresh page load `user`
  // can briefly be set before the session token is attached to the supabase
  // client; querying then runs unauthenticated and RLS returns nothing,
  // defaulting the tier to 'free'. Waiting for the token avoids that race.
  useEffect(() => {
    fetchTier();
    // Record this arrival for session tracking. touch_session is Pro-gated and
    // self-no-ops for free/anon server-side, so we can fire it as soon as the
    // token settles without waiting on the (async) tier fetch. It bumps
    // last_active + session_count on a real return and awards second_session
    // once on the first qualifying return (which also fires the buy lens aha).
    // Fire-and-forget: it must never block or disrupt load.
    if (session?.access_token) {
      // Load the persisted sound preference (profiles.sound_muted) before
      // anything tries to check isMuted() — narration and the Promenade's
      // completion cues both read that cache. Fire-and-forget like the calls
      // below; it defaults to unmuted internally if this hasn't resolved yet.
      initSoundPreference(user?.id ?? null).catch((e) =>
        console.warn('initSoundPreference threw:', e?.message ?? e)
      );

      supabase.rpc('touch_session').then(({ error }) => {
        if (error) console.warn('touch_session error:', error.message);
      }).catch((e) => console.warn('touch_session threw:', e?.message ?? e));

      // Re-derive canDecide on load so the Decision Handoff gate survives a
      // reload. get_run_progress is the READ-ONLY twin of award_run_milestones'
      // count (no awards fired on a passive load), Pro-gated server-side. We only
      // ever flip canDecide ON here, never off, so an in-session unlock from a run
      // isn't clobbered by a slower load check.
      supabase.rpc('get_run_progress').then(({ data, error }) => {
        if (error) { console.warn('get_run_progress error:', error.message); return; }
        const counted = data?.counted ?? 0;
        const targetAll = data?.target_all ?? 0;
        if (targetAll > 0 && counted >= targetAll) setCanDecide(true);
      }).catch((e) => console.warn('get_run_progress threw:', e?.message ?? e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session?.access_token]);

  // Handle the return from Stripe Checkout: /?checkout=success|cancelled.
  // On success, show a banner and poll the tier briefly, since the webhook
  // that upgrades the profile may land a moment after the redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;

    // Clean the URL right away so a refresh doesn't re-trigger this.
    window.history.replaceState({}, '', window.location.pathname);

    if (checkout === 'cancelled') {
      setCheckoutBanner({ kind: 'info', text: 'Checkout cancelled — no charge was made.' });
      return;
    }
    if (checkout === 'success') {
      setCheckoutBanner({ kind: 'success', text: 'Payment received! Activating your subscription…' });
      // Poll up to ~8s for the webhook to flip the tier.
      let tries = 0;
      const iv = setInterval(async () => {
        tries += 1;
        const t = await fetchTier();
        if (t !== 'free' || tries >= 5) {
          clearInterval(iv);
          if (t !== 'free') {
            setCheckoutBanner({ kind: 'success', text: `You're subscribed. Welcome to ${tierName(t)}!` });
          } else {
            setCheckoutBanner({ kind: 'success', text: 'Payment received! Your access will activate shortly.' });
          }
        }
      }, 1500);
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Open the pricing modal (from the results paywall, or for free users).
  function openPricing() { setShowPricing(true); }

  // Top-bar button handler. Free users see the pricing modal ("Upgrade").
  // Existing subscribers go straight to the billing portal ("Change plan") to
  // change/cancel their plan — never into a fresh checkout.
  async function handleTopBarPlanClick() {
    if (currentTier === 'free') {
      openPricing();
      return;
    }
    try {
      const token = session?.access_token;
      if (!token) { openPricing(); return; }
      const portalUrl = await openBillingPortal(token);
      window.location.href = portalUrl;
    } catch (err) {
      // If the portal fails (e.g. not enabled yet), fall back to the modal.
      console.warn('billing portal error:', err.message);
      openPricing();
    }
  }

  // A logged-out user clicked Subscribe inside the pricing modal: stash the plan,
  // close pricing, open auth. After auth succeeds we resume checkout.
  function handleNeedAuth(plan) {
    setPendingPlan(plan);
    setShowPricing(false);
    setAuthMode('signup');
  }

  // Called when auth completes. If a plan is pending, resume checkout; else
  // just close the auth modal.
  async function handleAuthSuccess() {
    setAuthMode(null);
    if (pendingPlan) {
      // Reopen pricing so the user lands back in context; the modal will have a
      // session now and can start checkout. We briefly defer to allow the
      // session to settle.
      setShowPricing(true);
      setPendingPlan(null);
    }
  }

  // If the user followed a password-reset link, show the reset screen
  // over everything else until they finish.
  if (recoveryMode) {
    return (
      <ResetPassword
        onDone={() => {
          setRecoveryMode(false);
          // Clean the ?recovery=1 marker from the URL.
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }

  return (
    <div style={styles.page}>

      {/* ── Auth control (top-right) ── */}
      {/* CHANGED (superseded the previous fixed-position patch): this was
          `position: fixed` with a hardcoded per-view paddingTop guess to
          keep content clear of it (110px for Journey, the page's flat 48px
          everywhere else). That approach couldn't work: a fixed header
          floats over the viewport permanently, so (a) it re-covers content
          the instant you scroll on ANY screen — not just at first paint —
          and (b) every screen needed its own correct padding number, which
          only Journey had ever gotten. Mobile screenshots showed it sitting
          on top of the results card, the Journey title, and the environment
          modals once signed in. Moving it into normal document flow fixes
          all of that at once: it now just occupies whatever height it
          actually needs (1–3 wrapped rows) and pushes the rest of the page
          down by exactly that much, on every screen, at every viewport
          width, with zero hardcoded numbers. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        flexWrap: 'wrap', gap: '10px', marginBottom: theme.space.lg,
      }}>
        {/* flexWrap above still matters: on a narrow phone the signed-in
            header (Change plan + Journey toggle + email + Sign out, plus
            Run Another Simulation in Journey view) has more items than fit
            on one line. Now that it's in normal flow, wrapping just makes
            it 2–3 rows tall in place — never overflow, never overlap. */}
        {/* Upgrade button — visible to everyone. For subscribers it acts as a
            passive upsell (e.g. Pro -> Elite). Hidden only when already on the
            top tier. */}
        {currentTier !== 'elite_annual' && (
          <button
            onClick={handleTopBarPlanClick}
            style={{
              background: theme.color.primary, color: '#fff',
              border: 'none', borderRadius: theme.radius.xs,
              padding: '6px 14px', cursor: 'pointer',
              fontSize: theme.font.size.sm, fontWeight: theme.font.weight.semibold,
            }}
          >{currentTier === 'free' ? 'Upgrade' : 'Change plan'}</button>
        )}

        {isAuthenticated ? (
          <>
            {/* Journey (gamification) view toggle. Self-contained; the map
                itself gates to Pro+ and explains itself for free users. */}
            <button
              onClick={() => setShowJourney((v) => !v)}
              style={{
                background: showJourney ? theme.color.primary : 'transparent',
                border: `1.5px solid ${theme.color.primary}`,
                borderRadius: theme.radius.xs, padding: '6px 14px', cursor: 'pointer',
                fontSize: theme.font.size.sm,
                color: showJourney ? '#fff' : theme.color.primary,
                fontWeight: theme.font.weight.semibold,
              }}
            >{showJourney ? 'Back to app' : 'Journey'}</button>

            {/* Escape hatch out of the Journey view into a genuinely fresh
                Discovery run. Previously the ONLY function that resets the
                funnel (step -> 0, clears county/profile/results/identityPath)
                was handleRestart, and it was wired to just two screens
                (the upsell screen and ResultsScreen) — neither reachable from
                here. After committing to a new season, "Back to app" just
                toggles showJourney off and re-shows whatever `step` was left
                at, which is stale for a season that was just committed via
                handleCommit (step 4). That left users with no in-app path
                back to Discovery, forcing a hard refresh. Shown only in the
                Journey view since it's meaningless anywhere else. */}
            {showJourney && (
              <button
                onClick={() => { handleRestart(); setShowJourney(false); }}
                style={{
                  background: 'transparent',
                  border: `1.5px solid ${theme.color.line}`,
                  borderRadius: theme.radius.xs, padding: '6px 14px', cursor: 'pointer',
                  fontSize: theme.font.size.sm,
                  color: theme.color.ink,
                  fontWeight: theme.font.weight.semibold,
                }}
              >Run Another Simulation</button>
            )}
            <span style={{ fontSize: theme.font.size.sm, color: theme.color.muted }}>
              {user?.email}
            </span>
            <button
              onClick={signOut}
              style={{
                background: 'transparent', border: `1.5px solid ${theme.color.line}`,
                borderRadius: theme.radius.xs, padding: '6px 12px', cursor: 'pointer',
                fontSize: theme.font.size.sm, color: theme.color.ink,
                fontWeight: theme.font.weight.semibold,
              }}
            >Sign out</button>
          </>
        ) : (
          <button
            onClick={() => setAuthMode('signin')}
            style={{
              background: 'transparent', border: `1.5px solid ${theme.color.primary}`,
              borderRadius: theme.radius.xs, padding: '6px 14px', cursor: 'pointer',
              fontSize: theme.font.size.sm, color: theme.color.primary,
              fontWeight: theme.font.weight.semibold,
            }}
          >Sign in</button>
        )}
      </div>

      {/* ── Checkout result banner ── */}
      {/* CHANGED: was `position: fixed, top: 54px` — a hardcoded offset that
          only cleared a single-row header. Same bug class as the header
          itself (see note above). Now in normal flow, directly under the
          header, so it always sits right below it no matter how many rows
          the header wraps to, on any screen. */}
      {checkoutBanner && (
        <div style={{
          maxWidth: '480px', width: '100%', margin: `0 auto ${theme.space.lg}`,
          background: checkoutBanner.kind === 'success' ? theme.color.successSoft : theme.color.infoSoft,
          border: `1px solid ${checkoutBanner.kind === 'success' ? theme.color.success : theme.color.info}`,
          color: checkoutBanner.kind === 'success' ? theme.color.success : theme.color.info,
          borderRadius: theme.radius.sm, padding: '12px 16px',
          fontSize: theme.font.size.sm, fontWeight: theme.font.weight.semibold,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
          boxShadow: theme.shadow.soft,
        }}>
          <span>{checkoutBanner.text}</span>
          <button
            onClick={() => setCheckoutBanner(null)}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'inherit', lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* ── Journey (gamification) view ── */}
      {showJourney ? (
        <div style={{ maxWidth: '760px', margin: '0 auto', width: '100%' }}>
          {/* CHANGED: dropped the 110px paddingTop hack. It existed only to
              clear the (formerly fixed) header floating on top of this
              title. The header is in normal flow now and already occupies
              its own space above this div, so no compensating padding is
              needed here — on any screen size, not just the one this
              number happened to be tuned for. */}
          <div style={{ marginBottom: theme.space.lg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{
                width: '34px', height: '34px', minWidth: '34px',
                background: theme.color.primary, borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '800', fontSize: '15px', color: '#fff', flexShrink: 0,
              }}>R</div>
              <span style={{
                fontSize: theme.font.size.xxl, fontWeight: '800',
                color: theme.color.ink, letterSpacing: '-0.02em', lineHeight: '1.1',
              }}>
                Your <span style={{ color: theme.color.primary }}>Journey</span>
              </span>
              <HelpIcon topic="journey" />
            </div>
            <p style={{ ...styles.helperText, margin: '2px 0 0', textAlign: 'left' }}>
              Track your milestones and IQ as you explore.
            </p>
          </div>
          <JourneyMap
            key={journeyReloadKey}
            userId={user?.id ?? null}
            comparisonSet={activeComparison}
            identityPath={identityPath}
            onEnterEnvironment={handleEnterEnvironment}
            onSelectJourney={handleCommit}
          />
        </div>
      ) : (
      <div style={{
        maxWidth:  step === 0 ? '760px' : theme.contentWidth,
        margin:    '0 auto',
        width:     '100%',
        ...(step > 0 ? {
          background:   theme.color.card,
          border:       `1px solid ${theme.color.line}`,
          borderTop:    `3px solid ${theme.color.primary}`,
          borderRadius: theme.radius.default,
          boxShadow:    theme.shadow.card,
          padding:      theme.space.xl,
          marginTop:    theme.space.lg,
        } : {
          paddingTop: '0',
        }),
      }}>

        {/* Step 0 — Landing */}
        {step === 0 && <LandingPage onStart={handleStart} />}

        {/* Steps 1–4: header + progress */}
        {step > 0 && (
          <>
            <div style={{ marginBottom: theme.space.lg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{
                  width: '34px', height: '34px', minWidth: '34px',
                  background: theme.color.primary, borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '800', fontSize: '15px', color: '#fff', flexShrink: 0,
                }}>R</div>
                <span style={{
                  fontSize: theme.font.size.xxl, fontWeight: '800',
                  color: theme.color.ink, letterSpacing: '-0.02em', lineHeight: '1.1',
                }}>
                  RealEquity<span style={{ color: theme.color.primary }}>IQ</span>
                </span>
                {/* One HelpIcon covers all four steps here — topic is derived
                    from `step` (the same state ProgressBar already reads), so
                    no per-step component needs its own copy of this. Step 5
                    (Decision Handoff) has no PAGE_HELP entry yet; HelpIcon
                    just renders nothing for an unknown topic rather than
                    showing a broken/empty icon. */}
                <HelpIcon topic={['location','profile','scenario','results'][step - 1]} />
              </div>
              <p style={{ ...styles.helperText, margin: '2px 0 0', textAlign: 'left' }}>
                Real - world insights for smarter real estate decisions.
              </p>
            </div>
            <ProgressBar currentStep={step} />
          </>
        )}

        {/* Step 1 — County Selector */}
        {step === 1 && (
          <div>
            <CountyNarration />
            <CountySelector selectedCounty={selectedCounty} onCountySelect={handleCountySelect} />
            {selectedCounty && (
              <button onClick={handleCountyContinue} style={{ ...styles.btnPrimary, marginTop: theme.space.md }}>
                Continue →
              </button>
            )}
          </div>
        )}

        {/* Step 2 — Profile Setup */}
        {step === 2 && selectedCounty && (
          <div>
            <ProfileNarration />
            <ProfileSetup county={selectedCounty} onNext={handleProfileNext} onBack={() => setStep(1)} />
          </div>
        )}

        {/* Step 3 — Scenario Picker, then the optional Comparison screen.
            Both live at step 3 (no renumber); showComparison toggles between
            them, mirroring the separate-state convention used for showJourney. */}
        {step === 3 && selectedCounty && profileInputs && !showComparison && (
          <div>
            <ScenarioNarration />
            <ScenarioPicker county={selectedCounty} inputs={profileInputs} onRun={handlePrimaryChosen} onBack={() => setStep(2)} />
          </div>
        )}

        {step === 3 && selectedCounty && profileInputs && showComparison && pendingPrimary && (
          <div>
            <ComparisonNarration />
            <ComparisonPicker
              primaryKey={pendingPrimary}
              county={selectedCounty}
              onContinue={handleComparisonContinue}
              onSkip={handleComparisonSkip}
              onBack={handleComparisonBack}
            />
          </div>
        )}

        {/* Step 4 — Results. A multi-path comparison run (2–3 paths) shows the
            side-by-side ComparisonResultsScreen; a single-path run shows the
            normal ResultsScreen. Both read the SAME `results` (primary) for the
            single-path screen; the comparison screen reads the per-path array. */}
        {step === 4 && comparisonResults && comparisonResults.length >= 2 && (
          <ComparisonResultsScreen
            comparison={comparisonResults}
            county={selectedCounty}
            onBack={() => setStep(3)}
            onRestart={handleRestart}
            currentTier={currentTier}
            canDecide={canDecide}
            onChoosePath={() => setStep(5)}
          />
        )}
        {step === 4 && results && !(comparisonResults && comparisonResults.length >= 2) && (
          <ResultsScreen result={results} county={selectedCounty} onRestart={handleRestart} onBack={() => setStep(3)} currentTier={currentTier} onUpgrade={openPricing} comparisonRan={!!(activeComparison && activeComparison.secondaries && activeComparison.secondaries.length > 0)} canDecide={canDecide} onChoosePath={() => setStep(5)} />
        )}

        {/* Step 5 — Decision Handoff ("Moment of Reflection"). Reached via the
            "Choose my path" button on a results screen, which is gated on the
            run_all_5 rule (canDecide). Receives the path(s) the user explored:
            the comparison array when present, else the single primary result
            wrapped as a one-element array. Commit writes identity_path via
            handleCommit; keep-comparing returns to results. */}
        {step === 5 && (() => {
          const decisionPaths = (comparisonResults && comparisonResults.length >= 2)
            ? comparisonResults
            : (results ? [{ scenarioKey: results.scenario, result: results }] : []);
          if (decisionPaths.length === 0) return null;
          return (
            <DecisionHandoff
              paths={decisionPaths}
              county={selectedCounty}
              currentTier={currentTier}
              onBack={() => setStep(4)}
              onCommit={(pathKey) => handleCommit(pathKey)}
              onKeepComparing={() => { setStep(4); }}
            />
          );
        })()}

      </div>
      )}

      {/* ── Auth modal overlay ── */}
      {authMode && (
        <AuthModal
          initialMode={authMode}
          onClose={() => { setAuthMode(null); setPendingPlan(null); }}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* ── Pricing modal overlay ── */}
      {showPricing && (
        <PricingModal
          currentTier={currentTier}
          onClose={() => setShowPricing(false)}
          onNeedAuth={handleNeedAuth}
        />
      )}

      {/* ── Execution Environment overlay (the award surface) ──
          Opened from a JourneyMap station. Fixed layer so it pops OVER the map.
          EnvironmentScene renders its OWN dimmed scrim + centered modal, so this
          wrapper only makes that fill the viewport (no second scrim — that would
          double-dim). EnvironmentScene is pure: it emits onComplete (after its
          own confirm guard) and onClose; App owns the award + map refresh. */}
      {activeEnvironment && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 350, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', minHeight: '100vh',
        }}>
          <EnvironmentScene
            milestone={activeEnvironment}
            onComplete={handleEnvironmentComplete}
            onClose={handleEnvironmentClose}
          />
        </div>
      )}
    </div>
  );
}

// Friendly label for a tier key.
function tierName(tier) {
  switch (tier) {
    case 'pro':          return 'Pathfinder';
    case 'elite':        return 'Market Expert';
    case 'elite_annual': return 'Market Expert (Annual)';
    default:             return 'your plan';
  }
}
// ── Path B: per-step guided narration ────────────────────────────────────────
// One small wrapper per narrated beat. Each mounts with its step's screen, so
// narration autoplays on entry (riding the session unlock from Run My
// Simulation) and offers a Listen/Replay control. All clips come from the shared
// NARRATION registry. Pattern for any new beat: add a clip to the registry, then
// render <StepNarration clip={NARRATION.x} line="..."/> at that step.
function StepNarration({ clip, line }) {
  const { status, supported, play, replay, stop } = useNarration(line, {
    audioSrc: clip,
    enabled: true,
  });
  if (!supported) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: theme.space.sm }}>
      <NarrationControl
        status={status}
        supported={supported}
        onPlay={play}
        onReplay={replay}
        onStop={stop}
        label="Listen"
      />
    </div>
  );
}

function CountyNarration() {
  return (
    <StepNarration
      clip={NARRATION.welcomeCounty}
      line={'Welcome — let\u2019s start your journey. Select a county, review its data profile, then continue.'}
    />
  );
}

function ProfileNarration() {
  return <StepNarration clip={NARRATION.financialProfile} line={'Build your financial profile.'} />;
}

function ScenarioNarration() {
  return <StepNarration clip={NARRATION.primaryScenario} line={'Choose your primary scenario.'} />;
}

function ComparisonNarration() {
  return <StepNarration clip={NARRATION.secondaryScenarios} line={'Add up to two scenarios to compare.'} />;
}
