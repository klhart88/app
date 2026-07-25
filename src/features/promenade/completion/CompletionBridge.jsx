// ============================================================================
// RealEquityIQ — CompletionBridge
//
// Replaces the earlier auto-scroll approach entirely. Sits directly beneath
// WorldMap (attached, no gap — see JourneyMap.jsx's wrapping container) so
// the completion content below reads as an obvious continuation of the map,
// not a hidden, scroll-to-discover afterthought.
//
// APPROXIMATION WORTH FLAGGING (revised): the spec's glow/pulse is meant to
// travel down from the actual "final landmark" node THROUGH the map itself.
// This component only wraps its own footer content in position:relative, not
// WorldMap above it — so the glow/pulse plays within the footer's own
// (short) height, near the top of this component, not literally down across
// the full map. A more faithful version would need JourneyMap.jsx to wrap
// WorldMap + this component together in one shared position:relative box.
// Left as-is for now: it happens to help the discoverability problem this
// footer exists to solve (see JourneyMap.jsx integration notes) — the glow
// sits right where the thin below-the-fold sliver actually is.
//
// FIRST-VIEW VS RETURN — no new state introduced; reuses the existing stage
// values from useJourneyCompletion:
//   - animate=true  when mounted because stage just became SUMMARY (the
//     ceremony just finished, OR was just replayed — "on return, the bridge
//     may replay visually" falls out of this for free).
//   - animate=false when mounted because stage is COMPLETED (a later visit
//     that never ran the ceremony this session) — renders in final state
//     immediately, per "do not replay the bridge automatically."
//
// THREE RENDER MODES:
//   'full'        — animate && no reduced motion: the full staged sequence.
//   'reducedFade' — animate && reduced motion: no pulse/glow, one short
//                   opacity fade for the whole footer, nothing staggered.
//   'immediate'   — !animate: final state, no animation attempted at all.
// ============================================================================

import { theme } from '../../../theme.js';
import { JOURNEY_COMPLETE_HEADING } from '../config/journeyCompletionConfig.js';

// Suggested placeholder tones. Ideally these reference real Design System
// tokens (e.g. the same gold already used for the map legend's "Landmark"
// dot) once those exist as exported values — hardcoded here as a reasonable
// stand-in so this doesn't block on a token that isn't defined yet.
const IVORY_BG = '#FAF5EA';
const GOLD = '#C9A227';

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function CompletionBridge({ journeyName, animate }) {
  const reduced = prefersReducedMotion();
  const mode = !animate ? 'immediate' : (reduced ? 'reducedFade' : 'full');

  return (
    <div style={{ position: 'relative' }}>
      {/* The bridge itself — landmark glow + downward pulse — only in
          'full' mode. Both keyframes fade to opacity 0 by the time they
          finish (forwards fill), so nothing lingers once the sequence ends;
          no separate unmount/cleanup logic needed. */}
      {mode === 'full' && (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)',
            width: '48px', height: '48px', borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}99, transparent 70%)`,
            opacity: 0,
            animation: 'bridgeLandmarkGlow 800ms ease-out 200ms forwards',
          }} />
          <div style={{
            position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)',
            width: '10px', height: '10px', borderRadius: '50%',
            background: GOLD, boxShadow: `0 0 12px 4px ${GOLD}aa`,
            opacity: 0,
            animation: 'bridgePulseTravel 500ms ease-in 500ms forwards',
          }} />
        </div>
      )}

      {/* The integrated footer — structurally present immediately in every
          mode (background/shape/rounded-bottom-corners never animate), so
          it always reads as "attached to the map," not a card that pops in.
          Top padding kept tight and the glow made prominent on purpose: on
          many viewport heights the map itself is tall enough that this
          footer starts right at the fold, so only a thin sliver is visible
          without scrolling. That sliver needs to read as "something is
          here" on its own — the star/glow sitting at the very top edge,
          bright enough to notice even mostly cropped, does that; a few
          quiet px of ivory background at the top would not. */}
      <div style={{
        background: IVORY_BG,
        borderTop: `3px solid ${mode === 'full' ? 'transparent' : GOLD}`,
        borderBottomLeftRadius: theme.radius.default,
        borderBottomRightRadius: theme.radius.default,
        padding: `${theme.space.sm} ${theme.space.lg} ${theme.space.lg}`,
        textAlign: 'center',
        boxShadow: `0 -10px 24px -8px ${GOLD}99`,
        animation: mode === 'full' ? 'bridgeRuleActivate 300ms ease-out 1100ms forwards' : undefined,
      }}>
        <div
          aria-hidden="true"
          style={{
            color: GOLD, fontSize: '26px', lineHeight: 1,
            opacity: mode === 'immediate' ? 1 : 0,
            animation:
              mode === 'full' ? 'bridgeFadeIn 300ms ease-out 1100ms forwards'
              : mode === 'reducedFade' ? 'bridgeFadeIn 300ms ease-out forwards'
              : undefined,
          }}
        >
          ★
        </div>
        <div style={{
          marginTop: '4px', fontSize: theme.font.size.sm, color: theme.color.muted,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          opacity: mode === 'immediate' ? 1 : 0,
          animation:
            mode === 'full' ? 'bridgeFadeIn 300ms ease-out 1250ms forwards'
            : mode === 'reducedFade' ? 'bridgeFadeIn 300ms ease-out forwards'
            : undefined,
        }}>
          {JOURNEY_COMPLETE_HEADING}
        </div>
        <div style={{
          fontSize: theme.font.size.xl, fontWeight: theme.font.weight.bold, color: theme.color.ink,
          marginTop: '2px',
          opacity: mode === 'immediate' ? 1 : 0,
          animation:
            mode === 'full' ? 'bridgeFadeIn 300ms ease-out 1450ms forwards'
            : mode === 'reducedFade' ? 'bridgeFadeIn 300ms ease-out forwards'
            : undefined,
        }}>
          {journeyName}
        </div>
      </div>

      <style>{`
        @keyframes bridgeLandmarkGlow {
          0%   { opacity: 0; transform: translateX(-50%) scale(0.8); }
          40%  { opacity: 1; transform: translateX(-50%) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) scale(1); }
        }
        @keyframes bridgePulseTravel {
          0%   { opacity: 1; top: 8%; }
          100% { opacity: 0; top: 96%; }
        }
        @keyframes bridgeRuleActivate {
          from { border-top-color: transparent; }
          to   { border-top-color: ${GOLD}; }
        }
        @keyframes bridgeFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
