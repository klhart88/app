// ============================================================================
// RealEquityIQ — JourneyCompletionFlow
//
// v3: a PRESENTATIONAL ceremony-overlay component only — it no longer calls
// useJourneyCompletion itself. That hook call moved up to JourneyMap, because
// the CompletionBridge (attached directly to WorldMap) needs the same `stage`
// value JourneyMap uses to lay out the map+bridge block, and a stateful hook
// can only be called from one place safely. This component just renders
// whichever ceremony stage it's told about; JourneyMap renders
// CompletionBridge and CompletionSummary directly using the same hook result.
//
// v5 (Certificate stage removed): the CERTIFICATE stage that briefly sat
// between OUTCOME and SUMMARY has been removed entirely — the achievement
// is now shown as a plain SVG RankPill on the Promenade (journeyWorldKit.jsx)
// instead of a rendered certificate graphic. This component now renders
// ONLY: FINALIZING, CELEBRATING, OUTCOME, and the persistence-error state.
// SUMMARY/COMPLETED are still handled by JourneyMap directly (map + bridge +
// summary), not by this component. CertificateScene.jsx is no longer used
// anywhere and can be deleted from the project.
// ============================================================================

import { COMPLETION_STAGE } from '../hooks/useJourneyCompletion.js';
import { getCompletionConfig } from '../config/journeyCompletionConfig.js';
import CompletionCelebration from './CompletionCelebration.jsx';
import OutcomeScene from './OutcomeScene.jsx';
import { theme, styles } from '../../../theme.js';

// Matches the fixed/full-viewport overlay convention already used elsewhere
// in this app (EnvironmentScene: position fixed, inset 0, zIndex 350) — the
// ceremony is a modal-style takeover in the same family as that pattern.
const OVERLAY_STYLE = {
  position: 'fixed', inset: 0, zIndex: 350,
  background: 'rgba(255,255,255,0.98)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: theme.space.lg,
};

// A flex child's width defaults to shrink-to-fit ITS IN-FLOW CONTENT — but
// OutcomeScene's only children (the <img> and the corner Skip button) are
// both position:absolute, i.e. removed from flow entirely. Without an
// explicit width here, that stage collapses to ~0px wide and renders
// invisibly. This wrapper makes every stage's sizing explicit instead of
// relying on each child's internal layout to happen to produce non-zero width.
const OVERLAY_CONTENT_STYLE = { width: '100%', maxWidth: '720px' };

// Shared with JourneyMap.jsx's exit-fade timer — must stay in sync. Fades
// THIS overlay's own opacity down to 0 before the real stage transition
// happens, so the Outcome photo visibly dissolves into the Promenade/Summary
// — not a separate curtain swapped in after an instant cut. `exiting` is a
// single generic flag: JourneyMap sets it true while Outcome is mid-exit.
const EXIT_FADE_MS = 700;

export default function JourneyCompletionFlow({
  pathKey, stage, error, advance, skip, retry, exiting = false,
}) {
  const config = getCompletionConfig(pathKey);
  if (!config) return null; // unknown path_key — nothing sensible to render

  if (error) {
    return (
      <div style={OVERLAY_STYLE}>
        <div style={{ ...styles.card, ...OVERLAY_CONTENT_STYLE, textAlign: 'center' }}>
          <div style={styles.sectionHeading}>We couldn't save your completion</div>
          <p style={{ ...styles.helperText, marginTop: 0 }}>{error}</p>
          <button onClick={retry} style={{ ...styles.btnPrimary, marginTop: theme.space.md, width: 'auto' }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  switch (stage) {
    case COMPLETION_STAGE.FINALIZING:
      return (
        <div style={OVERLAY_STYLE}>
          <div style={OVERLAY_CONTENT_STYLE}>
            <CompletionCelebration phase="finalizing" config={config} onDone={advance} onSkip={skip} />
          </div>
        </div>
      );

    case COMPLETION_STAGE.CELEBRATING:
      return (
        <div style={OVERLAY_STYLE}>
          <div style={OVERLAY_CONTENT_STYLE}>
            <CompletionCelebration phase="celebrating" config={config} onDone={advance} onSkip={skip} />
          </div>
        </div>
      );

    case COMPLETION_STAGE.OUTCOME:
      return (
        <div style={{
          ...OVERLAY_STYLE,
          opacity: exiting ? 0 : 1,
          transition: `opacity ${EXIT_FADE_MS}ms ease`,
        }}>
          <div style={OVERLAY_CONTENT_STYLE}>
            <OutcomeScene config={config} onDone={advance} onSkip={skip} />
          </div>
        </div>
      );

    default:
      // ACTIVE, SUMMARY, or COMPLETED — nothing for this component to render;
      // JourneyMap handles the map+bridge+summary layout for those directly.
      return null;
  }
}
