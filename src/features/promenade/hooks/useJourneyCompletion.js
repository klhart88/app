// ============================================================================
// RealEquityIQ — useJourneyCompletion
//
// v3 (per the decision to abandon the animated Certificate stage): the
// state machine is back to ACTIVE -> FINALIZING -> CELEBRATING -> OUTCOME ->
// SUMMARY -> COMPLETED. This hook still owns ONLY the completion transaction
// and stage transitions. It never writes milestone_awards — that stays
// JourneyMap's / EnvironmentScene's job via record_milestone, per the
// existing convention this schema already follows.
//
// WHY THE CERTIFICATE STAGE WAS REMOVED:
//   The award_certificate RPC itself worked (confirmed on a fresh Wait & Save
//   completion — certificate row created, rank/IQ populated correctly server
//   side). The problem was entirely on the rendering side: the certificate
//   graphic (name, journey title, date, certificate number, rank ribbon) had
//   persistent layout bugs — text sitting on/below its guide lines, IQ/rank
//   not painting at award time, positioning that needed constant per-asset
//   correction. This is the same class of problem that was already the
//   reason the completion scenes moved away from React-driven layout onto
//   flattened background images (see Design System Guide, Promenade
//   Composition rule). Rather than keep fighting certificate-graphic layout,
//   the achievement is now represented the simple, reliable way this app
//   already does everything else that needs to render crisply: a pure SVG
//   pill (RankPill, in journeyWorldKit.jsx) sitting under the Your Progress
//   panel on the Promenade, showing just the achieved Institution Rank name.
//   No certificate is generated, stored, or fetched anymore.
//
// PERSISTENCE CONTRACT (unchanged):
//   - The completion record is persisted BEFORE the celebration begins.
//   - The full celebration auto-plays only once per journey+season: if
//     celebration_viewed_at is already set when this hook loads, it jumps
//     straight to COMPLETED — no auto-replay.
//   - Skip/reduced-motion only fast-forward the STAGE. They never roll back
//     what's already persisted (completion record, IQ, rank).
//   - A persistence failure shows a retry path rather than silently running
//     the ceremony over unconfirmed data.
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../supabase.js';

export const COMPLETION_STAGE = {
  ACTIVE:      'active',
  FINALIZING:  'finalizing',
  CELEBRATING: 'celebrating',
  OUTCOME:     'outcome',
  SUMMARY:     'summary',
  COMPLETED:   'completed',
};

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {object} params
 * @param {string|null} params.userId
 * @param {string|null} params.journeyRowId  - journeys.id (the active season row)
 * @param {string|null} params.pathKey       - 'buy' | 'househack' | 'invest' | 'wait' | 'rent'
 * @param {number} params.seasonNumber
 * @param {boolean} params.isFullyComplete   - true once every station on this path is earned
 * @param {number} params.iqEarned           - the account's cumulative IQ (profiles.total_points)
 *                                             at the moment of completion.
 */
export function useJourneyCompletion({
  userId, journeyRowId, pathKey, seasonNumber, isFullyComplete, iqEarned,
}) {
  const [stage, setStage] = useState(COMPLETION_STAGE.ACTIVE);
  const [rank, setRank] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0); // bumped by retry() to re-run the effect
  const viewedRef = useRef(false);

  const canRun = !!(userId && journeyRowId && pathKey && isFullyComplete);

  const refreshRank = useCallback(async () => {
    if (!userId) return null;
    try {
      const { data, error: rankErr } = await supabase.rpc('get_institution_rank', {
        p_user_id: userId,
      });
      if (rankErr) throw rankErr;
      setRank(data ?? null);
      return data ?? null;
    } catch (e) {
      console.warn('get_institution_rank failed:', e?.message ?? e);
      return null;
    }
  }, [userId]);

  // Institution Rank is an ACCOUNT-WIDE standing (get_institution_rank takes
  // only p_user_id — it isn't scoped to the active journey), so it must be
  // fetched independent of whether THIS journey is complete. Previously this
  // only ran inside the completion-transaction effect below, which is gated
  // by isFullyComplete — meaning rank silently disappeared the instant a new
  // journey/season started, even though the account had already earned it.
  // This fetches it unconditionally on mount / userId change instead.
  useEffect(() => {
    if (!userId) return;
    refreshRank();
  }, [userId, refreshRank]);

  // The completion transaction itself: check for an existing record first
  // (so a return visit skips straight to COMPLETED instead of re-persisting
  // or re-celebrating), then persist via the idempotent RPC if needed.
  useEffect(() => {
    if (!canRun) return;
    let cancelled = false;

    (async () => {
      setError(null);
      try {
        const { data: existing, error: existingErr } = await supabase
          .from('journey_completions')
          .select('id, celebration_viewed_at')
          .eq('user_id', userId)
          .eq('path_key', pathKey)
          .eq('season_number', seasonNumber)
          .maybeSingle();
        if (existingErr) throw existingErr;
        if (cancelled) return;

        if (existing?.celebration_viewed_at) {
          setStage(COMPLETION_STAGE.COMPLETED);
          await refreshRank();
          return;
        }

        // Not yet persisted (or persisted but never viewed) — persist now.
        // record_journey_completion is an idempotent upsert, so re-running
        // this after a retry is always safe.
        const { error: rpcErr } = await supabase.rpc('record_journey_completion', {
          p_journey_row_id: journeyRowId,
          p_path_key: pathKey,
          p_season_number: seasonNumber,
          p_iq_earned: iqEarned ?? 0,
        });
        if (rpcErr) throw rpcErr;
        if (cancelled) return;

        // Lock the season the moment its completion is persisted, not
        // whenever the user happens to next click something. Without this,
        // the journeys row stays is_active=true until "Continue Your
        // Financial Education" is clicked — meaning a reload of the Journey
        // view in between (or picking a different path from a stale
        // decision screen reached via "Back to app") writes into the SAME
        // journey_id as the just-finished season instead of a new one.
        // Non-fatal by design (matches refreshRank below): worst case here
        // is the old symptom (re-openable season) persists for this one
        // completion, not a broken ceremony.
        const { error: lockErr } = await supabase.rpc('lock_completed_journey', {
          p_journey_id: journeyRowId,
        });
        if (lockErr) console.warn('lock_completed_journey failed:', lockErr.message);
        if (cancelled) return;

        await refreshRank();
        if (cancelled) return;
        setStage(COMPLETION_STAGE.FINALIZING);
      } catch (e) {
        if (cancelled) return;
        console.warn('useJourneyCompletion: persistence failed:', e?.message ?? e);
        setError(e?.message ?? 'Could not save your completion.');
        // Stage stays ACTIVE — the caller shows a retry UI rather than the
        // ceremony running over an unconfirmed completion.
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun, userId, journeyRowId, pathKey, seasonNumber, attempt]);

  const retry = useCallback(() => { setAttempt((n) => n + 1); }, []);

  // Advance one stage forward — called by the celebration/outcome scenes as
  // each finishes its own timer/animation.
  const advance = useCallback(() => {
    setStage((s) => {
      switch (s) {
        case COMPLETION_STAGE.FINALIZING:  return COMPLETION_STAGE.CELEBRATING;
        case COMPLETION_STAGE.CELEBRATING: return COMPLETION_STAGE.OUTCOME;
        case COMPLETION_STAGE.OUTCOME:     return COMPLETION_STAGE.SUMMARY;
        default: return s;
      }
    });
  }, []);

  // Skip fast-forwards straight to SUMMARY — bypassing the animated ceremony
  // (Finalizing/Celebrating/Outcome). Persistence already happened above, so
  // this never affects the completion record or rank — only which stage
  // renders next.
  const skip = useCallback(() => { setStage(COMPLETION_STAGE.SUMMARY); }, []);

  // Reduced-motion sessions shouldn't sit through timed animation stages —
  // jump straight to SUMMARY (same reasoning as Skip, above) the moment
  // FINALIZING would otherwise start.
  useEffect(() => {
    if (stage === COMPLETION_STAGE.FINALIZING && prefersReducedMotion()) {
      setStage(COMPLETION_STAGE.SUMMARY);
    }
  }, [stage]);

  // Reaching SUMMARY — by the full ceremony, a skip+continue, or reduced
  // motion — records celebration_viewed_at exactly once, so it never
  // auto-replays on a later visit (acceptance criterion).
  useEffect(() => {
    if (stage !== COMPLETION_STAGE.SUMMARY || viewedRef.current) return;
    if (!userId || !journeyRowId || !pathKey) return;
    viewedRef.current = true;
    supabase.rpc('mark_celebration_viewed', {
      p_journey_row_id: journeyRowId,
      p_path_key: pathKey,
      p_season_number: seasonNumber,
    }).then(({ error: viewErr }) => {
      if (viewErr) console.warn('mark_celebration_viewed error:', viewErr.message);
    }).catch((e) => console.warn('mark_celebration_viewed threw:', e?.message ?? e));
  }, [stage, userId, journeyRowId, pathKey, seasonNumber]);

  // Explicit replay action (from the Passport or a completed summary) —
  // deliberately bypasses the "already viewed" guard, since this is a direct
  // user request rather than an autoplay.
  const replay = useCallback(() => {
    viewedRef.current = false;
    setStage(COMPLETION_STAGE.FINALIZING);
  }, []);

  return { stage, rank, error, advance, skip, replay, retry };
}
