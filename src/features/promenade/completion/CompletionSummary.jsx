// ============================================================================
// RealEquityIQ — CompletionSummary
//
// v2, per "Wait & Save Feedback Adjustments":
//   - Hierarchy is now Journey Complete -> journey name -> transformation
//     statement -> stats -> Journey Record line -> de-emphasized Replay ->
//     two-tier "Continue Your Financial Education."
//   - Replay Celebration is now a secondary text/outline action near the
//     bottom, not the largest control on the card (section 4).
//   - The next-journey area is two levels: one optionally-featured
//     "Suggested Learning Journey" (config-driven per path, never hard-coded
//     globally) plus a quieter "Explore Other Journeys" list for the rest
//     (section 3). Never uses the word "Compare" here (already compared,
//     pre-completion).
//   - Renders identically whether reached via the first-run ceremony
//     (isReturnVisit=false) or a later revisit (isReturnVisit=true) — this is
//     also now the component rendered ALONGSIDE the completed map, not in
//     place of it (see JourneyCompletionFlow's inline-vs-overlay split).
// ============================================================================

import { theme, styles } from '../../../theme.js';
import { JOURNEY_NAMES, RANK_SEALS, JOURNEY_RECORD_LINE, INST_MEDALLION_SRC } from '../config/journeyCompletionConfig.js';

const RANK_LABEL = {
  explorer: 'Explorer',
  scholar: 'Scholar',
  practitioner: 'Practitioner',
};

export default function CompletionSummary({
  config, rank, iqEarned, isReturnVisit, onReplay, onSelectJourney,
}) {
  const suggested = config.suggestedNext;
  const otherPaths = Object.keys(JOURNEY_NAMES).filter(
    (k) => k !== config.journeyId && k !== suggested?.pathKey
  );

  return (
    <div style={{ ...styles.card, textAlign: 'center' }}>
      {/* No heading/journey-name here anymore — CompletionBridge's
          integrated footer (attached to the map) now owns "Journey Complete"
          + the journey title. This card picks up right after that. */}
      <p style={{ ...styles.helperText, marginTop: 0, maxWidth: '46em', marginLeft: 'auto', marginRight: 'auto' }}>
        {config.transformationStatement}
      </p>

      {/* Recognition. */}
      {/* Universal medallion — always shown on completion, regardless of rank */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: `${theme.space.lg} 0 ${theme.space.sm}` }}>
        <img
          src={INST_MEDALLION_SRC}
          alt="RealEquityIQ Institution of Financial Intelligence seal"
          style={{ width: '120px', height: '120px', objectFit: 'contain' }}
        />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: theme.space.xl,
        margin: `0 0 ${theme.space.sm}`, flexWrap: 'wrap',
      }}>
        <StatBlock label="IQ earned" value={iqEarned ?? 0} />
        {rank && (
          <StatBlock label="Institution Rank" value={RANK_LABEL[rank] ?? rank} sealSrc={RANK_SEALS[rank]} />
        )}
      </div>
      <p style={{ fontSize: theme.font.size.sm, color: theme.color.muted, marginTop: 0 }}>
        {JOURNEY_RECORD_LINE}
      </p>

      {/* De-emphasized — a secondary text action, not the card's largest
          control. Still keyboard accessible (a real <button>), just styled
          quietly. Never re-persists anything (see useJourneyCompletion.replay). */}
      <button
        onClick={onReplay}
        style={{
          ...styles.btnGhost, width: 'auto', border: 'none',
          color: theme.color.muted, fontSize: theme.font.size.sm,
          textDecoration: 'underline', marginTop: theme.space.sm, marginBottom: theme.space.lg,
        }}
      >
        Replay celebration
      </button>

      {/* Primary section: the one configured suggestion (if any), styled
          with real visual weight — then a quieter secondary list for
          everything else. Two levels, not four equal buttons. */}
      <div style={{ borderTop: `1px solid ${theme.color.line}`, paddingTop: theme.space.lg, marginTop: theme.space.md }}>
        <div style={styles.sectionHeading}>Continue Your Financial Education</div>
        <p style={{ ...styles.helperText, marginTop: 0 }}>
          Choose another path to broaden your financial intelligence.
        </p>

        {suggested && (
          <div style={{ marginTop: theme.space.md }}>
            <div style={{ fontSize: theme.font.size.sm, color: theme.color.muted, marginBottom: '6px' }}>
              Suggested Learning Journey
            </div>
            <button
              onClick={() => onSelectJourney?.(suggested.pathKey)}
              style={{ ...styles.btnPrimary, width: '100%', textAlign: 'left', padding: '16px 20px' }}
            >
              <div style={{ fontWeight: theme.font.weight.bold }}>{JOURNEY_NAMES[suggested.pathKey]}</div>
              <div style={{ fontWeight: 400, fontSize: theme.font.size.sm, opacity: 0.9, marginTop: '2px' }}>
                {suggested.blurb}
              </div>
            </button>
          </div>
        )}

        {otherPaths.length > 0 && (
          <div style={{ marginTop: theme.space.md }}>
            <div style={{ fontSize: theme.font.size.sm, color: theme.color.muted, marginBottom: '6px' }}>
              Explore Other Journeys
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space.sm }}>
              {otherPaths.map((pathKey) => (
                <button
                  key={pathKey}
                  onClick={() => onSelectJourney?.(pathKey)}
                  style={{
                    ...styles.btnGhost, width: '100%',
                    border: `1px solid ${theme.color.line}`,
                  }}
                >
                  {JOURNEY_NAMES[pathKey]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isReturnVisit && (
        <p style={{ ...styles.helperText, marginTop: theme.space.md, fontSize: theme.font.size.sm }}>
          Completed — the celebration won't replay automatically on future visits.
        </p>
      )}
    </div>
  );
}

function StatBlock({ label, value, sealSrc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      {sealSrc && (
        <img src={sealSrc} alt="" aria-hidden="true" style={{ width: '32px', height: '32px' }} />
      )}
      <div style={{ fontSize: theme.font.size.lg, fontWeight: theme.font.weight.bold, color: theme.color.primary }}>
        {value}
      </div>
      <div style={{ fontSize: theme.font.size.sm, color: theme.color.muted }}>{label}</div>
    </div>
  );
}
