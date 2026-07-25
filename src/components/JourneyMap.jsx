// ============================================
// RealEquityIQ — Journey Map (Gamification)
//
// A self-contained "Journey" view: the user's avatar travels a path whose
// stations are the REAL seeded milestones (milestone_defs). Earned stations
// (milestone_awards) are lit; upcoming ones are dimmed. The avatar sits at the
// furthest-earned station and advances as progress is made. Shows the IQ total
// (profiles.total_points) with a "just for fun" disclaimer.
//
// Mature, motion-forward feel — smooth transitions, an advancing avatar, a
// counting IQ readout. No confetti, no cartoon board-game styling.
//
// Data model (from realequityiq_gamification_schema.sql):
//   - milestone_defs   : milestone_key, label, points, category  (path stations)
//   - milestone_awards : journey-scoped earned milestones (RLS: owner-read)
//   - journeys         : active journey + season_number
//   - profiles         : total_points = IQ total
//   - rpc record_milestone(p_key) : awards a milestone (Pro+ gated server-side)
//
// Self-reports (got pre-approved, toured, offer, closed) are the only writes
// this component makes, and only on explicit user action.
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { theme, styles } from '../theme.js';
import { supabase } from '../supabase.js';
import { LENS_INSIGHTS, getLensAha } from '../lensInsights.js';
import { EXECUTION_MILESTONE_KEYS, buildJourneyStations, alternativePaths } from '../lib/executionPaths.js';
import {
  WORLD, WK, NODE_STATE,
  placeStations, buildWorldPath, measurePath,
  WorldNode, WorldBackdrop, AlternativePaths, ProgressPanel, GuideCard, RankPill, Legend,
} from './journeyWorldKit.jsx';
import { WORLD_MAP_DATA_URI } from '../assets/worldMapAsset.js';
import { INST_MASTER_SEAL_DATA_URI } from '../assets/instMasterSealAsset.js';
import JourneyCompletionFlow from '../features/promenade/completion/JourneyCompletionFlow.jsx';
import CompletionBridge from '../features/promenade/completion/CompletionBridge.jsx';
import CompletionSummary from '../features/promenade/completion/CompletionSummary.jsx';
import { COMPLETION_STAGE, useJourneyCompletion } from '../features/promenade/hooks/useJourneyCompletion.js';
import { getCompletionConfig, JOURNEY_NAMES } from '../features/promenade/config/journeyCompletionConfig.js';
import { isMuted } from '../lib/audioSession.js';
import milestoneConfirmCue from '../assets/audio/milestone-confirm-cue.mp3';

// The station sequence is no longer a flat hardcoded list. It's assembled by
// buildJourneyStations() in lib/executionPaths.js: the Discovery prologue
// (in-app milestones) followed by the active Path's execution stages — one
// continuous journey from onboarding to the real-world close. The map READS
// milestone_awards to light stations and opens Environments where execution
// milestones are earned; it never writes milestone_awards itself.

// Category → small caption shown under each station label.
const DISCLAIMER =
  'IQ is an engagement score, just for fun — not a measure of intelligence or financial standing.';

// Trail palette, category colors, and the pure SVG primitives (GridBackdrop,
// TrailStation, TrailAvatar) now live in ./journeyTrailKit.jsx so the teaser
// and this map render from one source of truth. Red (theme.color.primary)
// stays reserved for the marker + traveled line — "you / progress".

// Fades an <audio> element's volume down to 0 over `durationMs`, then pauses
// it. Used only for the journey-complete interlude, so its end lines up with
// the same EXIT_FADE_MS visual fade rather than cutting off abruptly.
function fadeOutAndStop(audioEl, durationMs) {
  const steps = 10;
  const stepMs = Math.max(20, Math.floor(durationMs / steps));
  const startVolume = typeof audioEl.volume === 'number' ? audioEl.volume : 1;
  let i = 0;
  const iv = setInterval(() => {
    i += 1;
    try { audioEl.volume = Math.max(0, startVolume * (1 - i / steps)); } catch { /* ignore */ }
    if (i >= steps) {
      clearInterval(iv);
      try { audioEl.pause(); } catch { /* ignore */ }
    }
  }, stepMs);
}

export default function JourneyMap({ userId = null, comparisonSet: comparisonSetProp = null, identityPath: identityPathProp = null, onEnterEnvironment, onSelectJourney }) {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [defs, setDefs]         = useState([]);        // milestone_defs rows
  const [earned, setEarned]     = useState(new Set()); // earned milestone_keys
  const [journey, setJourney]   = useState(null);      // active journey row
  const [iqTotal, setIqTotal]   = useState(0);         // profiles.total_points
  const [displayName, setDisplayName] = useState(null); // profiles.display_name (falls back to email prefix, then a generic label)
  const [gated, setGated]       = useState(false);     // no active sub (Pro+ only)
  // True when the account has no active journey row at all — the expected
  // state right after a season completes (lock_completed_journey flips
  // is_active=false at that moment) but before the user has picked their
  // next path. load() no longer auto-creates a journey just to view this
  // page (see get_active_journey vs get_or_create_active_journey below), so
  // this is a real, renderable state rather than something papered over by
  // silently spawning the next season as a side effect of a page view.
  const [noActiveSeason, setNoActiveSeason] = useState(false);

  // The userId PROP isn't reliably fresh for every route this component is
  // mounted on (this exact symptom — rank silently empty with no RPC error —
  // is what a null/stale userId prop looks like from the outside). load()
  // already resolves the real signed-in user via supabase.auth.getUser() for
  // its own queries below; this captures that same value so the completion
  // hook can fall back to it instead of trusting the prop alone.
  const [resolvedUserId, setResolvedUserId] = useState(userId);

  // ── Past Journeys (archived seasons) ────────────────────────────────────
  // Every previously-completed path (celebration_viewed_at set) that isn't
  // the currently-active one — surfaced via the "Past Journeys" link next to
  // the Season header, per the decision to make old seasons reachable again
  // now that archive_and_reset_journey() has been archiving them all along
  // with no UI ever reading them back.
  const [pastJourneys, setPastJourneys] = useState([]);
  const [pastJourneysOpen, setPastJourneysOpen] = useState(false);

  // ── Lens-insights (secondary-scenario "aha") state ──────────────────────
  // comparisonSet = { primary, secondaries[] } describing what the user chose
  // to compare against. Sourced from a prop when arriving fresh from the funnel
  // (Q3), else read from the active journey's comparison_set column on a
  // standalone visit. firedInsights = insight_keys already in lens_insight_views
  // (the permanent re-readable markers). openInsight = the aha currently shown
  // in the modal (tap-to-close; no auto-timer).
  const [comparisonSet, setComparisonSet] = useState(comparisonSetProp);
  // The committed path (public.users.identity_path). Prop wins (fresh from the
  // Decision Handoff commit); else read from the DB on load. 'undecided' / null
  // mean "nothing committed" and the map falls back to comparison_set.primary.
  const [identityPath, setIdentityPath] = useState(identityPathProp);
  const [firedInsights, setFiredInsights] = useState(new Set());
  const [openInsight, setOpenInsight]     = useState(null);

  // ── Load everything for the active journey ──────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) { setGated(true); setLoading(false); return; }
      setResolvedUserId(user.id);

      // Gamification is Elite-only — mirror the server-side gate so the UI
      // explains itself rather than silently showing an empty/broken path.
      // CHANGED: was has_active_subscription (any paid tier). Pro stops at
      // full 20-year results; every RPC this page depends on
      // (record_milestone, get_run_progress, set_identity_path, etc.) is now
      // Elite-gated server-side too, so this must match or a Pro user would
      // get past this screen into a page where nothing actually works.
      const { data: hasSub, error: subErr } =
        await supabase.rpc('has_elite_access');
      if (subErr) throw subErr;
      if (!hasSub) { setGated(true); setLoading(false); return; }

      setNoActiveSeason(false);

      // Read the active journey WITHOUT creating one. Previously this called
      // get_or_create_active_journey() — fine for the Discovery-flow RPCs
      // (running a simulation genuinely should start a new season if none is
      // active), but wrong for a passive page view: after
      // lock_completed_journey() flips is_active=false at completion, simply
      // reloading this page to look at your finished stats must NOT silently
      // provision Season N+1. If nothing's active, render the "choose your
      // next journey" state below instead.
      const { data: jid, error: jidErr } =
        await supabase.rpc('get_active_journey');
      if (jidErr) throw jidErr;

      if (!jid) {
        setNoActiveSeason(true);
        setLoading(false);
        return;
      }

      const [defsRes, journeyRes, awardsRes, profileRes, lensRes, userRes, pastRes] = await Promise.all([
        supabase
          .from('milestone_defs')
          .select('milestone_key, label, points, category'),
        supabase
          .from('journeys')
          .select('id, season_number, started_at, last_active, session_count, comparison_set')
          .eq('id', jid)
          .maybeSingle(),
        supabase
          .from('milestone_awards')
          .select('milestone_key')
          .eq('journey_id', jid),
        supabase
          .from('profiles')
          .select('total_points, display_name, email')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('lens_insight_views')
          .select('insight_key')
          .eq('journey_id', jid),
        // identity_path lives on public.users, which is RLS-locked to
        // SECURITY DEFINER RPCs (a direct .from('users') read gets "permission
        // denied for table users"). Read it through get_identity_path(), the
        // mirror of set_identity_path's write path.
        supabase.rpc('get_identity_path'),
        // Past Journeys — every fully-viewed completion this account has, most
        // recent first. select('*') deliberately, rather than naming columns:
        // this table's exact shape (whether it carries an iq_earned/rank
        // snapshot column beyond path_key/season_number/celebration_viewed_at)
        // hasn't been confirmed yet, so the modal below reads each field
        // defensively (row.iq_earned ?? null, etc.) instead of assuming.
        supabase
          .from('journey_completions')
          .select('*')
          .eq('user_id', user.id)
          .not('celebration_viewed_at', 'is', null)
          .order('created_at', { ascending: false }),
      ]);

      if (defsRes.error)    throw defsRes.error;
      if (journeyRes.error) throw journeyRes.error;
      if (awardsRes.error)  throw awardsRes.error;
      if (profileRes.error) throw profileRes.error;
      if (lensRes.error)    throw lensRes.error;
      if (userRes.error)    throw userRes.error;
      // Non-fatal if this one fails — Past Journeys is additive, shouldn't
      // block the whole map from loading.
      if (pastRes.error) console.warn('journey_completions fetch failed:', pastRes.error.message);

      setDefs(defsRes.data ?? []);
      setJourney(journeyRes.data ?? null);
      setEarned(new Set((awardsRes.data ?? []).map((a) => a.milestone_key)));
      setIqTotal(profileRes.data?.total_points ?? 0);
      setDisplayName(
        profileRes.data?.display_name?.trim()
        || profileRes.data?.email?.split('@')[0]
        || null
      );
      setFiredInsights(new Set((lensRes.data ?? []).map((r) => r.insight_key)));
      setPastJourneys(pastRes.data ?? []);

      // Comparison selection: prop wins (fresh from funnel); else fall back to
      // the journey's stored comparison_set (standalone Journey-toggle visit).
      // An empty {} means "no comparison chosen" — handled as no secondaries.
      const dbSet = journeyRes.data?.comparison_set;
      const resolvedSet =
        comparisonSetProp && comparisonSetProp.primary
          ? comparisonSetProp
          : (dbSet && dbSet.primary ? dbSet : null);
      setComparisonSet(resolvedSet);

      // get_identity_path() returns the path as plain text (or 'undecided' /
      // null for "nothing committed"). Prop (fresh commit) wins; else the DB.
      const dbIdentity = userRes.data;
      const resolvedIdentity =
        identityPathProp && identityPathProp !== 'undecided'
          ? identityPathProp
          : (dbIdentity && dbIdentity !== 'undecided' ? dbIdentity : null);
      setIdentityPath(resolvedIdentity);

      setGated(false);
    } catch (e) {
      setError(e.message ?? 'Could not load your journey.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derive the CONTINUOUS station list (Discovery prologue → active Path) ──
  // The world map shows one continuous journey: the in-app Discovery milestones
  // as the valley-floor opening, then the active Path's execution stages
  // climbing toward the skyline. The active Path is the Discovery winner
  // (comparisonSet.primary); with none chosen yet, buildJourneyStations returns
  // just the prologue so the map still shows progress-so-far.
  //
  // Each station is enriched from milestone_defs (points/category) where a def
  // exists, and tagged with earned state. nodeType + isEnvironment come from the
  // journey definition (executionPaths), not defs.
  const defsByKey = Object.fromEntries(defs.map((d) => [d.milestone_key, d]));
  // The active Path is the COMMITTED path (identity_path) when the user has
  // committed one; otherwise the Discovery winner (comparisonSet.primary).
  // identity_path is "what I chose to pursue"; comparison_set.primary is "what
  // I explored first" — once committed, the commitment drives the Journey.
  const activePathKey = identityPath ?? comparisonSet?.primary ?? null;
  const stations = buildJourneyStations(activePathKey).map((st, i) => {
    const def = defsByKey[st.milestone_key];
    return {
      ...st,
      points:   def?.points ?? null,
      category: def?.category ?? null,
      earned:   earned.has(st.milestone_key),
      // Station 0 ("Your profile") is now dynamic: the signed-in user's name
      // on the main line, their selected journey's name as a second line —
      // rather than the static "Your profile" string from executionPaths.js.
      // Falls back to the original static label if the name hasn't loaded
      // yet (or genuinely has none), so there's never a blank node label.
      ...(i === 0 ? {
        label: displayName || st.label,
        sublabel: activePathKey ? JOURNEY_NAMES[activePathKey] : undefined,
      } : {}),
    };
  });

  // Avatar sits at the furthest *earned* station (index). If nothing earned,
  // it waits at the start (index -1 → rendered at station 0's doorstep).
  let avatarIndex = -1;
  stations.forEach((s, i) => { if (s.earned) avatarIndex = i; });

  const earnedCount = stations.filter((s) => s.earned).length;
  const totalCount  = stations.length;

  // ── Lens insights: which selected lenses live at which station ──────────
  // For each selected secondary (excluding the primary, never compared to
  // itself), resolve its single aha + trigger milestone. Build a map keyed by
  // the trigger milestone_key so the trail can render a pip on that station.
  const secondaries = comparisonSet?.secondaries ?? [];
  const primaryKey  = comparisonSet?.primary ?? null;

  const insightsByMilestone = {};   // milestone_key -> aha object (with .key)
  for (const lensKey of secondaries) {
    if (lensKey === primaryKey) continue;          // never compare to self
    const lens = LENS_INSIGHTS[lensKey];
    if (!lens) continue;
    const aha = getLensAha(lensKey, primaryKey);
    if (!aha) continue;
    insightsByMilestone[lens.triggerMilestone] = aha;
  }

  // An aha is "fired" once its key is in firedInsights. A pip only shows for a
  // milestone that (a) carries a selected lens AND (b) has fired — i.e. it's a
  // permanent re-readable marker. (Eligibility-but-not-yet-fired is handled by
  // the firing effect below, which records it, after which it becomes a pip.)
  function insightForStation(milestoneKey) {
    const aha = insightsByMilestone[milestoneKey];
    if (!aha) return null;
    return firedInsights.has(aha.key) ? aha : null;
  }

  // ── Live firing ─────────────────────────────────────────────────────────
  // An aha fires when its trigger beat is EARNED and its key is NOT yet in
  // lens_insight_views (Q1: no dead-zone — "earned + not yet recorded", not
  // "crossed after selecting"). On the first load where that's true we record
  // it via record_insight_view, mark it fired locally, and auto-open AT MOST
  // ONE modal (the earliest-beat eligible aha) so multiple simultaneous
  // unlocks don't stack modals. The rest become pips the user can tap.
  const firingRef = useRef(false);
  useEffect(() => {
    if (loading || gated || error) return;
    if (firingRef.current) return;          // guard against re-entrancy

    // Eligible = trigger earned, lens selected, not yet fired. Ordered by the
    // station sequence so "earliest beat" is well-defined.
    const eligible = stations
      .map((st) => insightsByMilestone[st.milestone_key])
      .filter((aha) => aha && earned.has(aha.triggerMilestone) && !firedInsights.has(aha.key));

    if (eligible.length === 0) return;
    firingRef.current = true;

    (async () => {
      const newlyFired = [];
      for (const aha of eligible) {
        try {
          const { data, error: rpcErr } =
            await supabase.rpc('record_insight_view', { p_key: aha.key });
          if (rpcErr) { console.warn('record_insight_view error:', rpcErr.message); continue; }
          // Gate response (no active sub) is not an error — just skip silently.
          if (data?.reason === 'no_active_subscription') continue;
          newlyFired.push(aha.key);
        } catch (e) {
          console.warn('record_insight_view threw:', e?.message ?? e);
        }
      }
      if (newlyFired.length > 0) {
        setFiredInsights((prev) => {
          const next = new Set(prev);
          newlyFired.forEach((k) => next.add(k));
          return next;
        });
        // Auto-open the earliest newly-fired aha (eligible is already in
        // station order, so the first newlyFired key maps to the earliest).
        const firstAha = eligible.find((a) => a.key === newlyFired[0]);
        if (firstAha) setOpenInsight(firstAha);
      }
      firingRef.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, gated, error, earned, firedInsights, comparisonSet]);


  // The "current" node is the furthest-earned station's successor — where the
  // user is headed next. If nothing earned yet, it's station 0. If everything
  // earned, there's no current node (journey complete). avatarIndex was the
  // furthest earned; current = avatarIndex + 1 (clamped).
  const currentIndex =
    avatarIndex + 1 < stations.length ? avatarIndex + 1 : -1;

  // The journey (this active path) is fully complete once nothing remains
  // ahead — the same signal MetaLine/WorldMap already derive above, just
  // named for what it now also triggers: the Promenade completion flow.
  //
  // "IQ earned" in the completion summary shows the account's CUMULATIVE
  // total (iqTotal / profiles.total_points) — the same number already shown
  // elsewhere in the app (e.g. the live Journey view's "IQ earned: 3330") —
  // rather than a per-path execution-only sum. Two different numbers for
  // "IQ earned" in the same app was the confusing part; this keeps it to one.
  const isFullyComplete = stations.length > 0 && currentIndex === -1;

  // Lifted up from JourneyCompletionFlow: CompletionBridge needs to be a DOM
  // sibling directly attached to WorldMap (see the wrapping div below), and
  // WorldMap lives here, not inside JourneyCompletionFlow's subtree. A
  // stateful hook can only be called from one place safely, so this is now
  // that place — JourneyCompletionFlow was slimmed down to a purely
  // presentational ceremony-overlay component driven by props from here.
  //
  // MUST stay above the loading/gated/error early returns below — hooks are
  // called unconditionally on every render, in the same order, regardless of
  // which branch this component's OWN early-return logic takes. Calling this
  // after those returns caused a real crash: on the first render (loading
  // still true) the hook was skipped entirely; once loading flipped false on
  // a later render, React saw a hook fire that hadn't fired before and threw
  // ("Rendered more hooks than during the previous render"), which — with no
  // error boundary anywhere in this app — crashed silently to a blank page.
  const completion = useJourneyCompletion({
    userId: resolvedUserId ?? userId,
    journeyRowId: journey?.id ?? null,
    pathKey: activePathKey,
    seasonNumber: journey?.season_number ?? 1,
    isFullyComplete,
    iqEarned: iqTotal,
  });
  const completionConfig = activePathKey ? getCompletionConfig(activePathKey) : null;
  const isCeremonyStage = [
    COMPLETION_STAGE.FINALIZING, COMPLETION_STAGE.CELEBRATING,
    COMPLETION_STAGE.OUTCOME,
  ].includes(completion.stage);
  const isPostCeremonyStage =
    completion.stage === COMPLETION_STAGE.SUMMARY || completion.stage === COMPLETION_STAGE.COMPLETED;

  // "Fade from [outcome photo] to whatever's next" — done by fading the
  // CURRENT overlay's own opacity to 0 BEFORE actually flipping the stage,
  // rather than cutting instantly and fading in something unrelated
  // afterward (that first version was a real bug — see JourneyCompletionFlow.jsx's
  // history). Outcome's photo dissolves straight into the Promenade/Summary
  // now that the Certificate stage has been removed — same mechanism, driven
  // by which stage is CURRENTLY exiting rather than a single outcome-only flag.
  //
  // This also naturally delays CompletionBridge's mount (and therefore its
  // glow/pulse) until the map has genuinely settled: isPostCeremonyStage
  // can't become true until the real advance() fires, which only happens
  // after the fade completes — no separate flag needed for that.
  const EXIT_FADE_MS = 700; // must match JourneyCompletionFlow.jsx
  const FADEABLE_STAGES = [COMPLETION_STAGE.OUTCOME];
  const [exitingStage, setExitingStage] = useState(null);
  const handleAdvance = useCallback(() => {
    if (FADEABLE_STAGES.includes(completion.stage)) {
      const leavingStage = completion.stage;
      setExitingStage(leavingStage);
      setTimeout(() => {
        setExitingStage(null);
        completion.advance();
      }, EXIT_FADE_MS);
    } else {
      completion.advance();
    }
  }, [completion.stage, completion.advance]);

  // ── Completion ceremony audio (single continuous track) ───────────────────
  // One file (milestone-confirm-cue.mp3, now ~10.8s long) starts right as the
  // ceremony begins and plays through every subsequent stage (celebrating,
  // outcome) without restarting. It has to be owned up here rather than
  // inside CompletionCelebration/OutcomeScene themselves, because
  // JourneyCompletionFlow fully unmounts one and mounts the other between
  // stages — audio scoped to either child's own lifecycle would cut off
  // right at that swap. journey-complete-interlude.mp3 is no longer used at
  // all (previously a second file meant to pick up where the first left off
  // — dropped in favor of one continuous track once two separate files
  // proved to overlap rather than hand off cleanly).
  const prevCeremonyStageRef = useRef(null);
  const ceremonyAudioRef = useRef(null);
  const CEREMONY_AUDIO_STAGES = [
    COMPLETION_STAGE.FINALIZING, COMPLETION_STAGE.CELEBRATING, COMPLETION_STAGE.OUTCOME,
  ];
  useEffect(() => {
    const stage = completion.stage;
    const prevStage = prevCeremonyStageRef.current;

    // Start once, exactly on entering FINALIZING — i.e. the instant the TRUE
    // final milestone of the whole path was just confirmed. Every other
    // station's confirm modal (EnvironmentScene.jsx) never touches this
    // stage machine at all, so there's no risk of this re-triggering on a
    // regular per-station confirm.
    if (
      stage === COMPLETION_STAGE.FINALIZING && prevStage !== COMPLETION_STAGE.FINALIZING
      && !ceremonyAudioRef.current && !isMuted()
    ) {
      try {
        const el = new window.Audio(milestoneConfirmCue);
        ceremonyAudioRef.current = el;
        el.play().catch(() => {});
      } catch { /* ignore — never block the ceremony on an audio failure */ }
    }

    // Fade out and stop the moment we leave the ceremony entirely — normal
    // advance into SUMMARY, or an early Skip at any point along the way.
    if (!CEREMONY_AUDIO_STAGES.includes(stage) && ceremonyAudioRef.current) {
      fadeOutAndStop(ceremonyAudioRef.current, EXIT_FADE_MS);
      ceremonyAudioRef.current = null;
    }

    prevCeremonyStageRef.current = stage;
  }, [completion.stage]);

  // Stop immediately (no fade) if this component unmounts mid-ceremony —
  // e.g. navigating away entirely, not just advancing the stage machine.
  useEffect(() => () => {
    if (ceremonyAudioRef.current) { try { ceremonyAudioRef.current.pause(); } catch { /* ignore */ } }
  }, []);

  // "Continue Your Financial Education" journey selection (Development
  // Implementation Update, Scene 3 -> Scene 4): picking a journey here now
  // does THREE things, in order — fade the summary card out, archive the
  // current journeys row + open a fresh one (archive_and_reset_journey),
  // THEN commit to the newly chosen path via the existing onSelectJourney
  // prop (App.jsx's handleCommit, unchanged — it already remounts JourneyMap
  // via journeyReloadKey, which naturally picks up the freshly-created
  // active journeys row on reload).
  //
  // ASSUMPTION worth flagging: this treats "pick a journey" as ONE atomic
  // action (reset + commit together) rather than landing on a neutral
  // browse view first and requiring a second tap — chosen because that's
  // what testing showed the four buttons already doing (just without the
  // reset), and changing to a two-step flow would need a real "browse mode"
  // UI state that doesn't exist yet. Flag if a two-step flow is actually
  // wanted instead.
  const JOURNEY_SWITCH_FADE_MS = 600;
  const [journeySwitchFading, setJourneySwitchFading] = useState(false);
  const handleSelectJourney = useCallback((pathKey) => {
    setJourneySwitchFading(true);
    setTimeout(async () => {
      try {
        const { error: resetErr } = await supabase.rpc('archive_and_reset_journey');
        if (resetErr) throw resetErr;
      } catch (e) {
        console.warn('archive_and_reset_journey failed:', e?.message ?? e);
        // Not fatal to navigation — worst case the old journeys row stays
        // active and the next journey's stations may show stale history,
        // same symptom as before this fix. Still proceed to onSelectJourney
        // rather than strand the user on a fading-out card.
      }
      setJourneySwitchFading(false);
      onSelectJourney?.(pathKey);
    }, JOURNEY_SWITCH_FADE_MS);
  }, [onSelectJourney]);

  if (loading) return <JourneyShell><LoadingState /></JourneyShell>;

  if (gated) return <JourneyShell><GatedState /></JourneyShell>;

  // No active journey — the prior season is locked (lock_completed_journey
  // ran when its journey_completions row was written) and nothing new has
  // been chosen yet. handleSelectJourney is reused as-is here: it's the
  // exact same "archive (no-op, already inactive) -> create next season ->
  // commit path" wrapper the Completion Summary's own tiles call, so a path
  // picked from this recovery screen behaves identically to one picked from
  // the celebration flow.
  if (noActiveSeason) {
    return (
      <JourneyShell>
        <SeasonLockedState onSelect={handleSelectJourney} fading={journeySwitchFading} />
      </JourneyShell>
    );
  }

  if (error) {
    return (
      <JourneyShell>
        <ErrorState message={error} onRetry={load} />
      </JourneyShell>
    );
  }

  return (
    <JourneyShell>
      <MetaLine
        season={journey?.season_number ?? 1}
        pathName={activePathKey ? JOURNEY_NAMES[activePathKey] : null}
        earnedCount={earnedCount}
        totalCount={totalCount}
        hasPastJourneys={pastJourneys.length > 0}
        onOpenPastJourneys={() => setPastJourneysOpen(true)}
      />

      {pastJourneysOpen && (
        <PastJourneysModal
          journeys={pastJourneys}
          currentRank={completion.rank}
          onClose={() => setPastJourneysOpen(false)}
        />
      )}

      {/* WorldMap + CompletionBridge share one container so the bridge reads
          as physically attached to the map (no gap, matching rounded bottom
          corners) rather than a separate card underneath it — per the
          "Completion Footer + Animated Bridge" spec. The completed trail
          always renders regardless of stage (Wait & Save Feedback
          Adjustments section 1/5); only the bridge's presence is conditional. */}
      <div style={{ borderRadius: theme.radius.default, overflow: 'hidden', position: 'relative' }}>
        <WorldMap
          stations={stations}
          currentIndex={currentIndex}
          iqTotal={iqTotal}
          activePathKey={activePathKey}
          insightForStation={insightForStation}
          onOpenInsight={setOpenInsight}
          onEnterEnvironment={onEnterEnvironment}
          rank={completion.rank}
        />
        {/* Bridge withheld until the curtain finishes — its pulse/glow
            should only begin once the map has fully rendered/settled, not
            the instant the ceremony overlay disappears. */}
        {isFullyComplete && completionConfig && isPostCeremonyStage && (
          <CompletionBridge
            journeyName={completionConfig.journeyName}
            animate={completion.stage === COMPLETION_STAGE.SUMMARY}
          />
        )}
      </div>

      {/* Ceremony overlay (Finalizing/Celebrating/Outcome/error) — a
          full-viewport takeover on top of everything above, exactly as
          before. Outcome fades its own opacity out via
          handleAdvance/exitingStage before the real stage transition fires
          — see the comment above. */}
      {isFullyComplete && activePathKey && (isCeremonyStage || completion.error) && (
        <JourneyCompletionFlow
          pathKey={activePathKey}
          stage={completion.stage}
          error={completion.error}
          advance={handleAdvance}
          skip={completion.skip}
          retry={completion.retry}
          exiting={exitingStage === completion.stage}
        />
      )}

      {/* Completion summary — a separate card below the attached map+bridge
          block, per the spec's layout structure. Fades out over
          JOURNEY_SWITCH_FADE_MS before the actual reset+switch fires — see
          handleSelectJourney above. */}
      {isFullyComplete && completionConfig && isPostCeremonyStage && (
        <div style={{
          opacity: journeySwitchFading ? 0 : 1,
          transition: `opacity ${JOURNEY_SWITCH_FADE_MS}ms ease`,
        }}>
          <CompletionSummary
            config={completionConfig}
            rank={completion.rank}
            iqEarned={iqTotal}
            isReturnVisit={completion.stage === COMPLETION_STAGE.COMPLETED}
            onReplay={completion.replay}
            onSelectJourney={handleSelectJourney}
          />
        </div>
      )}

      <Disclaimer />

      {openInsight && (
        <InsightModal aha={openInsight} onClose={() => setOpenInsight(null)} />
      )}
    </JourneyShell>
  );
}

// ── Layout shell ──────────────────────────────────────────────────────────
function JourneyShell({ children }) {
  return (
    <div style={{ maxWidth: '1020px', margin: '0 auto', width: '100%' }}>
      {children}
    </div>
  );
}

// ── Quiet meta line ───────────────────────────────────────────────────────
// The IQ number lives WITH the avatar on the trail now, so the top stays
// understated: just where you are in the season and how far along.
// pathName is derived from JOURNEY_NAMES[activePathKey] by the caller, so it
// updates automatically the instant identity_path/comparison_set changes —
// no separate state to keep in sync. Null/undefined (nothing committed yet,
// browse mode) simply omits the "· Path Name" suffix rather than showing a
// stale or placeholder value. Past Journeys sits on its OWN row below,
// rather than inline next to Season/path — that inline placement crowded
// the one label that's meant to track the CURRENT path, and read as if
// "Past Journeys" were part of the same live status rather than a separate,
// unrelated action.
function MetaLine({ season, pathName, earnedCount, totalCount, onOpenPastJourneys, hasPastJourneys }) {
  return (
    <div style={{ marginBottom: theme.space.md, textAlign: 'left' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: theme.space.md, flexWrap: 'wrap',
      }}>
        <span style={styles.statLabel}>
          Season {season}{pathName ? ` · ${pathName}` : ''}
        </span>
        <span style={{
          fontSize: theme.font.size.sm, color: theme.color.muted,
          fontWeight: theme.font.weight.semibold,
        }}>
          {earnedCount} of {totalCount} milestones reached
        </span>
      </div>
      {hasPastJourneys && (
        <div style={{ textAlign: 'left', marginTop: '4px' }}>
          <button
            onClick={onOpenPastJourneys}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: theme.font.size.sm, fontWeight: theme.font.weight.semibold,
              color: theme.color.primary, textDecoration: 'underline',
            }}
          >
            Past Journeys
          </button>
        </div>
      )}
    </div>
  );
}

// ── The Trail ─────────────────────────────────────────────────────────────
// One continuous winding path. Stations sit ON the line. Earned trail draws
// solid red; the rest is faint. The avatar rides the curve at its true
// position and ANIMATES ALONG the path when it advances — IQ rides beneath it.
//
// Geometry is generated for any station count: a serpentine that snakes down
// the page in rows, so 10–11 points have room to breathe without horizontal
// scrolling. We sample the real <path> with getPointAtLength so stations and
// the avatar sit exactly on the curve, not on an approximation.
// Kelvin's guide blurb, varied by the active execution path. Each is two short
// lines (matching GuideCard's layout) in Kelvin's warm, steadying voice — spoken
// to the path the user is actually on. Falls back to GUIDE_BLURB.default when no
// path is resolved yet (Discovery-only view). Keyed by execution path key.
const GUIDE_BLURB = {
  buy:       ['Every step brings you closer', 'to a place that’s yours.'],
  househack: ['Let’s make your first', 'property work for you.'],
  invest:    ['Steady moves, compounding', 'quietly in your favor.'],
  wait:      ['Patience is a strategy.', 'We’ll know when it’s time.'],
  rent:      ['Flexible now, building', 'wealth all the while.'],
  default:   ['Here to help you make', 'confident decisions.'],
};

function WorldMap({ stations, currentIndex, iqTotal, activePathKey, insightForStation, onOpenInsight, onEnterEnvironment, rank }) {
  const pathRef = useRef(null);
  const [geom, setGeom] = useState(null); // { total, lenAt: [..] }

  // Terrain-anchored placement: stations distributed along the painted valley →
  // skyline route, then a smooth winding path drawn through them. However many
  // stations the journey has, they land on believable terrain.
  const centers = placeStations(stations.length);
  const dPath = buildWorldPath(centers);

  // After render, measure the path so we can clip the traveled (red) portion and
  // place the avatar exactly — same sampling technique as the snake trail.
  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    setGeom(measurePath(el, centers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dPath]);

  // The red line travels to the CURRENT node (where you are headed). If the
  // journey is complete (no current), it fills to the last station. Before
  // anything is earned, current is station 0, so the line sits at the start.
  const travelIndex = currentIndex >= 0 ? currentIndex : stations.length - 1;
  const targetLen = geom ? (geom.lenAt[travelIndex] ?? 0) : 0;
  const animLen = useAnimatedAlong(targetLen, 900);
  const shownIQ = useCountUp(iqTotal, 700);

  // Derived chrome counts.
  const completedCount = stations.filter((s) => s.earned).length;
  const inProgressCount = currentIndex >= 0 ? 1 : 0;
  const upcomingCount = Math.max(0, stations.length - completedCount - inProgressCount);
  const pct = stations.length ? Math.round((completedCount / stations.length) * 100) : 0;

  // Resolve each station's STATE for the node renderer.
  function stateFor(i, earned) {
    if (i === currentIndex) return NODE_STATE.CURRENT;
    if (earned) return NODE_STATE.COMPLETED;
    return NODE_STATE.LOCKED;
  }

  // Alternative-path row ("paths not taken"): the four non-primary paths,
  // now rendered as an evenly-spaced row along the bottom edge of the frame
  // rather than fanning from the decision node — no anchor needed anymore.
  // Visual-only. Empty when there's no active path (standalone/browse
  // visit) — this is intentional: Discovery mode has no commitment, so
  // there's nothing to call "the paths not taken" against yet.
  const alternatives = alternativePaths(activePathKey);

  // Journey-complete = every station earned, so there is no "next" (current)
  // node. In that state the avatar has ARRIVED at the final station; the IQ tag
  // and an arrival marker ride there so the map doesn't go quiet at the finish.
  const allEarned = stations.length > 0 && stations.every((s) => s.earned);
  const arrivedIndex = stations.length - 1;

  // Where the IQ tag sits: the current node mid-journey, or the arrived final
  // node at completion. Null only when there are no stations at all.
  const iqAnchor =
    currentIndex >= 0 ? centers[currentIndex]
    : (allEarned && centers[arrivedIndex]) ? centers[arrivedIndex]
    : null;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${WORLD.VIEW_W} ${WORLD.VIEW_H}`}
        width="100%"
        style={{ display: 'block', maxWidth: `${WORLD.VIEW_W}px`, margin: '0 auto', overflow: 'visible' }}
        role="img"
        aria-label="Your wealth journey, across a painted world from your profile toward your future."
      >
        {/* Painterly world backdrop (clipped) + "your future" skyline tag. */}
        <WorldBackdrop dataUri={WORLD_MAP_DATA_URI} />

        {/* Alternative-path row — "paths not taken", an evenly-spaced row along
            the bottom edge (see journeyWorldKit.jsx). Drawn before the main
            path so the red line and stations sit above it. Visual-only. */}
        <AlternativePaths alternatives={alternatives} />

        {/* Untraveled path — soft white casing + champagne bed + dotted center,
            echoing the baseline's layered stroke so it reads as a walked trail. */}
        <path ref={pathRef} d={dPath} fill="none" stroke={WK.pathHalo}
          strokeWidth="17" strokeLinecap="round" opacity="0.55" />
        <path d={dPath} fill="none" stroke={WK.pathBed}
          strokeWidth="13" strokeLinecap="round" opacity="0.95" />
        <path d={dPath} fill="none" stroke={WK.pathDash}
          strokeWidth="2" strokeLinecap="round" strokeDasharray="1 13" opacity="0.6" />

        {/* Traveled red line — revealed up to the current position. */}
        {geom && (
          <path d={dPath} fill="none" stroke={theme.color.primary}
            strokeWidth="7" strokeLinecap="round"
            strokeDasharray={geom.total} strokeDashoffset={geom.total - animLen} />
        )}

        {/* Stations. Execution stations (isEnvironment) are tap targets that open
            their Environment; Discovery prologue stations are read-only. The kit's
            WorldNode is pure SVG; interactivity is a thin wrapping <g> here. */}
        {stations.map((s, i) => {
          const c = centers[i];
          const nodeState = stateFor(i, s.earned);
          // Both the CURRENT station and any COMPLETED (earned) station are
          // open-able: you can always look back at what you already did, but
          // a LOCKED future station still can't be skipped to (you can't tour
          // homes before pre-approval). This replaces the old CURRENT-only
          // gate, which made every completed station permanently
          // non-interactive instead of just forward-locking what's ahead.
          // Reopening an already-earned station is safe: EnvironmentScene is
          // pure presentation (doesn't award anything itself), and
          // awardMilestone() re-firing on an already-earned key safely
          // resolves to { awarded:false, already_earned:true } server-side —
          // no double-award, no IQ inflation, no progress ever removed.
          const canEnter =
            typeof onEnterEnvironment === 'function' &&
            s.isEnvironment &&
            EXECUTION_MILESTONE_KEYS.has(s.milestone_key) &&
            (nodeState === NODE_STATE.CURRENT || nodeState === NODE_STATE.COMPLETED);
          return (
            <g
              key={s.milestone_key}
              onClick={canEnter ? () => onEnterEnvironment(s.milestone_key, s.points) : undefined}
              role={canEnter ? 'button' : undefined}
              tabIndex={canEnter ? 0 : undefined}
              aria-label={canEnter ? `Open ${s.label}` : undefined}
              onKeyDown={canEnter ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEnterEnvironment(s.milestone_key, s.points); }
              } : undefined}
              style={{ cursor: canEnter ? 'pointer' : 'default' }}
            >
              <WorldNode
                cx={c.x}
                cy={c.y}
                index={i}
                station={s}
                state={nodeState}
                isInsightFired={!!(insightForStation && insightForStation(s.milestone_key))}
              />
            </g>
          );
        })}

        {/* Insight pips — additive markers on stations carrying a fired lens. */}
        {stations.map((s, i) => {
          const aha = insightForStation ? insightForStation(s.milestone_key) : null;
          if (!aha) return null;
          const c = centers[i];
          return (
            <InsightPip
              key={`pip-${s.milestone_key}`}
              cx={c.x + 18}
              cy={c.y - 18}
              aha={aha}
              onOpen={() => onOpenInsight(aha)}
            />
          );
        })}

        {/* Arrival marker — at completion, a red "you are here" pulse ring rides
            the final station (which already shows its earned landmark star), so
            the finish reads as "you reached your future" rather than going quiet. */}
        {allEarned && centers[arrivedIndex] && (
          <g style={{ pointerEvents: 'none' }} aria-label="You've arrived">
            <circle cx={centers[arrivedIndex].x} cy={centers[arrivedIndex].y} r="30"
              fill="none" stroke={theme.color.primary} strokeWidth="2.5" opacity="0.55">
              <animate attributeName="r" values="27;32;27" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0.25;0.55" dur="2.4s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* IQ tag — rides the avatar. Mid-journey that's the CURRENT node; at
            completion (no current node) it rides the final, arrived station so
            the IQ readout never vanishes from the map. */}
        {geom && iqAnchor && (
          <g style={{ pointerEvents: 'none' }}>
            <rect
              x={iqAnchor.x - 27}
              y={iqAnchor.y - 56}
              width="54" height="22" rx="11"
              fill="#fff" stroke={theme.color.primary} strokeWidth="1.5"
            />
            <text
              x={iqAnchor.x}
              y={iqAnchor.y - 45}
              textAnchor="middle" dominantBaseline="central"
              fontFamily={theme.font.family} fontSize="12" fontWeight="700"
              fill={theme.color.primary} style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {shownIQ} IQ
            </text>
          </g>
        )}

        {/* Left-rail chrome + bottom legend. */}
        <ProgressPanel
          pct={pct}
          completed={completedCount}
          inProgress={inProgressCount}
          upcoming={upcomingCount}
          iqTotal={shownIQ}
        />
        {rank && (
          <RankPill rank={rank} sealDataUri={INST_MASTER_SEAL_DATA_URI} />
        )}
        <GuideCard
          blurb={GUIDE_BLURB[activePathKey] ?? GUIDE_BLURB.default}
        />
        <Legend />
      </svg>
    </div>
  );
}

// ── Insight pip ───────────────────────────────────────────────────────────
// A small tappable marker on a station that has unlocked a lens-insight. In
// the lens's own category color (sage for in-app lenses, amber for real-world)
// so it reads as "another lens lives here" without introducing new palette.
// Purely additive — sits beside the station node, never alters it. The little
// pulse echoes the avatar's "alive" feel at a much smaller scale.
function InsightPip({ cx, cy, aha, onOpen }) {
  const lensDef = LENS_INSIGHTS[aha.lens];
  // Lens insights ride the in-app (sage) palette by default; this is a learning
  // marker, not a real-world step. Uses the world kit's insight sage tokens.
  const fill = WK.insFill;
  const ink  = WK.insInk;
  return (
    <g
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`Insight: ${lensDef?.label ?? 'another lens'} — tap to read`}
      style={{ cursor: 'pointer' }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}
    >
      {/* soft halo */}
      <circle cx={cx} cy={cy} r="11" fill={ink} opacity="0.12">
        <animate attributeName="r" values="9;12;9" dur="2.6s" repeatCount="indefinite" />
      </circle>
      {/* pip body */}
      <circle cx={cx} cy={cy} r="9" fill={fill} stroke={ink} strokeWidth="1.5" />
      {/* lightbulb-ish glyph: a small dot + base, reads as "idea" at tiny size */}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontSize="11" fontWeight="700" fontFamily={theme.font.family} fill={ink}>
        i
      </text>
    </g>
  );
}

// ── Insight modal ─────────────────────────────────────────────────────────
// Tap-to-close (X or backdrop), no auto-timer — it's a reading surface. The
// aha persists as a pip, so it's always re-openable. Curiosity-toned learning
// card; clearly framed as "another lens" so it never reads as advice on the
// primary path. Plain HTML overlay so the locked SVG map is untouched.
function InsightModal({ aha, onClose }) {
  const lensDef = LENS_INSIGHTS[aha.lens];

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={aha.headline}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(19,15,15,0.42)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: theme.space.md,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.color.card,
          borderRadius: theme.radius.default,
          boxShadow: theme.shadow.default,
          border: `1px solid ${theme.color.line}`,
          maxWidth: '440px', width: '100%',
          padding: theme.space.lg,
          position: 'relative',
        }}
      >
        {/* "another lens" eyebrow — keeps this clearly distinct from the
            primary path so it's a perspective, not a verdict. */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontFamily: theme.font.display,
          fontSize: '10px', fontWeight: theme.font.weight.heavy,
          textTransform: 'uppercase', letterSpacing: '0.18em', lineHeight: '1',
          color: WK.insInk, background: WK.insFill,
          border: `1px solid ${WK.insInk}22`,
          borderRadius: '999px', padding: '6px 13px', marginBottom: theme.space.sm,
        }}>
          Another lens · {lensDef?.label ?? 'A different view'}
        </div>

        <h3 style={{
          fontSize: theme.font.size.lg, fontWeight: theme.font.weight.bold,
          color: theme.color.ink, margin: '0 0 8px 0', letterSpacing: '-0.01em',
        }}>
          {aha.headline}
        </h3>

        <p style={{
          fontSize: theme.font.size.base, color: theme.color.muted,
          lineHeight: 1.6, margin: 0,
        }}>
          {aha.body}
        </p>

        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '20px', lineHeight: 1, color: theme.color.muted,
          }}
        >×</button>

        <button
          onClick={onClose}
          style={{ ...styles.btnGhost, marginTop: theme.space.lg }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ── Past Journeys modal ───────────────────────────────────────────────────
// One summary card per archived, completed season — path, date, rank, IQ,
// and the "learning moment" (the same transformation-statement flavor text
// CompletionSummary shows live, re-derived from the static per-path config
// rather than stored per row, since it never changes for a given path).
//
// FIELD-SOURCE NOTES:
//   - path / date: path_key + created_at, both confirmed present on
//     journey_completions.
//   - rank: deliberately NOT captured historically (decision: not worth a
//     schema change). Every card falls back to the account's CURRENT
//     institution rank (currentRank prop), since rank only moves forward
//     anyway.
//   - iqEarned: reads row.iq_earned if present; shows nothing if that column
//     doesn't exist rather than guessing a value — still worth confirming
//     via `select * from journey_completions limit 1;` once you get a
//     clean run of that query.
//   - learning moment: confirmed against journeyCompletionConfig.js —
//     config.transformationStatement, the same field CompletionSummary
//     reads live.
function PastJourneysModal({ journeys, currentRank, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Past Journeys"
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(19,15,15,0.42)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: theme.space.md,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.color.card,
          borderRadius: theme.radius.default,
          boxShadow: theme.shadow.default,
          border: `1px solid ${theme.color.line}`,
          maxWidth: '560px', width: '100%', maxHeight: '80vh',
          overflowY: 'auto',
          padding: theme.space.lg,
          position: 'relative',
        }}
      >
        <h3 style={{
          fontSize: theme.font.size.lg, fontWeight: theme.font.weight.bold,
          color: theme.color.ink, margin: '0 0 4px 0', letterSpacing: '-0.01em',
        }}>
          Past Journeys
        </h3>
        <p style={{ ...styles.helperText, marginTop: 0, marginBottom: theme.space.sm }}>
          Every completed path, kept as part of your permanent Journey Record.
        </p>
        <div style={{ height: '2px', background: '#C9A227', opacity: 0.5, marginBottom: theme.space.md, borderRadius: '1px' }} />

        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '20px', lineHeight: 1, color: theme.color.muted,
          }}
        >×</button>

        {journeys.length === 0 ? (
          <p style={{ ...styles.helperText, marginTop: 0 }}>
            Nothing archived yet — completed paths will show up here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space.sm }}>
            {journeys.map((row) => (
              <PastJourneyCard key={row.id} row={row} currentRank={currentRank} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Confirmed against journeyCompletionConfig.js: transformationStatement is
// the field name (same one CompletionSummary reads live). No more guessing.
function learningMomentFor(pathKey) {
  const config = getCompletionConfig(pathKey);
  return config?.transformationStatement ?? null;
}

function PastJourneyCard({ row, currentRank }) {
  const pathName = JOURNEY_NAMES[row.path_key] ?? row.path_key;
  const dateLabel = row.created_at
    ? new Date(row.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const iqEarned = row.iq_earned ?? null;
  const learningMoment = learningMomentFor(row.path_key);
  const rankLabel = (row.rank ?? currentRank);

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      border: `1px solid ${theme.color.line}`, borderRadius: theme.radius.default,
      padding: `${theme.space.md} ${theme.space.md} ${theme.space.md} calc(${theme.space.md} + 6px)`,
      background: theme.color.bg,
    }}>
      {/* gold rail — echoes the Rank pill's palette so this reads as part of
          the same institutional "achievement" language, not a generic card */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '5px', background: '#C9A227' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.space.sm, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: theme.font.weight.bold, color: theme.color.ink, fontSize: theme.font.size.base }}>
          {pathName}
        </span>
        {dateLabel && (
          <span style={{
            fontSize: '11px', fontWeight: theme.font.weight.semibold, color: '#8a6d1f',
            background: '#FBF3DC', border: '1px solid #C9A227', borderRadius: '999px',
            padding: '3px 10px', letterSpacing: '0.02em',
          }}>
            {dateLabel}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: theme.space.md, marginTop: '8px', flexWrap: 'wrap', alignItems: 'baseline' }}>
        {rankLabel && (
          <span style={{ fontSize: theme.font.size.sm, color: theme.color.muted }}>
            Rank: <strong style={{ color: '#8a6d1f' }}>
              {rankLabel.charAt(0).toUpperCase() + rankLabel.slice(1)}
            </strong>
          </span>
        )}
        {iqEarned != null && (
          <span style={{ fontSize: theme.font.size.sm, color: theme.color.muted }}>
            IQ: <strong style={{ color: theme.color.primary, fontVariantNumeric: 'tabular-nums' }}>{iqEarned}</strong>
          </span>
        )}
      </div>

      {learningMoment && (
        <p style={{
          fontSize: theme.font.size.sm, color: theme.color.muted, lineHeight: 1.5,
          marginTop: '10px', marginBottom: 0, paddingLeft: theme.space.sm,
          borderLeft: `2px solid #e6d8c8`, fontStyle: 'italic',
        }}>
          {learningMoment}
        </p>
      )}
    </div>
  );
}


function useAnimatedAlong(target, durationMs) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    const to = target;
    if (reduce || from === to) { setVal(to); fromRef.current = to; return; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, durationMs]);

  return val;
}

// ── Disclaimer ────────────────────────────────────────────────────────────
function Disclaimer() {
  return (
    <div style={{ ...styles.disclaimer, marginTop: theme.space.lg }}>
      <span style={{ color: theme.color.primary, fontWeight: theme.font.weight.bold }}>i</span>
      <span style={{ fontSize: theme.font.size.sm, color: theme.color.muted, lineHeight: 1.5 }}>
        {DISCLAIMER}
      </span>
    </div>
  );
}

// ── States ────────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ ...styles.card, textAlign: 'center', color: theme.color.muted }}>
      Loading your journey…
    </div>
  );
}

function GatedState() {
  return (
    <div style={{ ...styles.card, textAlign: 'center' }}>
      <div style={styles.sectionHeading}>Your journey unlocks with Elite</div>
      <p style={{ ...styles.helperText, marginTop: 0 }}>
        {/* CHANGED: was "Your journey unlocks with Pro" / "Sign in to a Pro
            plan..." — Pro is no longer sufficient (see the Elite-gating
            migration), and "sign in to a plan" was also wrong for someone
            already on Pro who simply hasn't upgraded. Kept tier-agnostic
            rather than threading a currentTier prop through here, since
            "Upgrade to Elite" reads correctly whether arriving from Free or
            Pro. */}
        Upgrade to Elite to start earning IQ and tracking milestones as you
        explore scenarios.
      </p>
    </div>
  );
}

// Shown when the account has no active journey — expected right after a
// season completes (lock_completed_journey already ran) and before a next
// path is chosen. This is deliberately plain rather than a restyled copy of
// CompletionSummary's "Continue Your Financial Education" tiles: it only
// needs to exist so a stray reload/back-nav in this gap has SOMETHING to
// land on instead of a blank map or (pre-fix) a silently auto-created
// season. Feel free to reskin to match CompletionSummary more closely later.
function SeasonLockedState({ onSelect, fading }) {
  return (
    <div style={{ ...styles.card, textAlign: 'center', opacity: fading ? 0 : 1, transition: 'opacity 300ms' }}>
      <div style={styles.sectionHeading}>Your last journey is complete</div>
      <p style={{ ...styles.helperText, marginTop: 0 }}>
        Choose a path to start your next journey.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space.sm, marginTop: theme.space.md }}>
        {Object.entries(JOURNEY_NAMES).map(([pathKey, name]) => (
          <button
            key={pathKey}
            onClick={() => onSelect(pathKey)}
            style={{ ...styles.btnPrimary, width: '100%' }}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ ...styles.card, textAlign: 'center' }}>
      <div style={styles.sectionHeading}>We couldn't load your journey</div>
      <p style={{ ...styles.helperText, marginTop: 0 }}>{message}</p>
      <button onClick={onRetry} style={{ ...styles.btnPrimary, marginTop: theme.space.md, width: 'auto' }}>
        Try again
      </button>
    </div>
  );
}

// ── Small hook: animate a number toward its target ────────────────────────
function useCountUp(target, durationMs) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    const to = target;
    if (reduce || from === to) { setValue(to); fromRef.current = to; return; }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, durationMs]);

  return value;
}
