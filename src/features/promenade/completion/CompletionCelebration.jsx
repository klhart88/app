// ============================================================================
// RealEquityIQ — CompletionCelebration
//
// The universal celebration overlay — the SAME component for every journey,
// per the tech spec's "one reusable confetti/light overlay over the map
// container" (Table 3). Must NOT know coordinates inside the environment
// image (section 6.2's "Must Not Do" for this component) — it renders as a
// full-container overlay, never an effect anchored to a point in artwork.
//
// Two phases, driven by the `phase` prop. JourneyCompletionFlow mounts this
// component twice — once per stage — passing the matching phase:
//   - 'finalizing'  : quiet seal entrance, no sound
//   - 'celebrating' : light/confetti-lite overlay, no sound of its own
//
// Reduced motion: shortens both phases to a brief static fade instead of
// skipping them outright, so there's still a moment of acknowledgement
// (Table 3's accessibility row).
//
// Audio: the confirm SFX and the continuous journey-complete interlude both
// now live in JourneyMap.jsx, NOT here — this component gets fully unmounted
// when the stage advances from 'celebrating' to OutcomeScene's 'outcome'
// (JourneyCompletionFlow swaps entirely different children per stage), so
// any audio started here would cut off abruptly rather than playing through
// the outcome scene. JourneyMap orchestrates the stage machine directly, so
// it's the one place audio can survive that swap. config.completionCueSrc is
// therefore intentionally unused here now — see journeyCompletionConfig.js's
// comment on COMPLETION_CUE_SRC.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { theme, styles } from '../../../theme.js';
import { JOURNEY_COMPLETE_HEADING } from '../config/journeyCompletionConfig.js';

const PHASE_DURATION_MS = {
  finalizing: 2000,
  celebrating: 2600,
};

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function CompletionCelebration({ phase, config, onDone, onSkip }) {
  const [visible, setVisible] = useState(false);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    setVisible(true);
    const duration = reduced ? 500 : (PHASE_DURATION_MS[phase] ?? 1200);
    const timer = setTimeout(() => onDone(), duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '360px', padding: theme.space.xl,
        opacity: visible ? 1 : 0,
        transition: reduced ? 'opacity 0.3s ease' : 'opacity 0.5s ease',
      }}
    >
      {/* Seal — one institution seal shared by every journey (the per-journey
          art is the outcome scene's job, not this component's). Falls back
          to a plain mark until Priority 3's rank seals ship. */}
      <div
        aria-hidden="true"
        style={{
          width: '96px', height: '96px', borderRadius: '50%',
          background: theme.color.primary, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '40px', fontWeight: theme.font.weight.bold,
          boxShadow: theme.shadow.default,
          transform: (reduced || phase === 'finalizing') ? 'scale(1)' : 'scale(1.08)',
          transition: 'transform 0.6s ease',
        }}
      >
        ★
      </div>

      <div style={{
        marginTop: theme.space.md, fontSize: theme.font.size.xl,
        fontWeight: theme.font.weight.bold, color: theme.color.ink, textAlign: 'center',
      }}>
        {JOURNEY_COMPLETE_HEADING}
      </div>

      {/* Lightweight, container-scoped glow — CSS only, no confetti library,
          no coordinates into any background image. Skipped under reduced
          motion. */}
      {phase === 'celebrating' && !reduced && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(circle at 50% 35%, ${theme.color.primary}22, transparent 60%)`,
            animation: 'promenadeGlow 1.8s ease-out',
          }}
        />
      )}

      <button onClick={onSkip} style={{ ...styles.btnGhost, width: 'auto', marginTop: theme.space.lg }}>
        Skip
      </button>

      <style>{`
        @keyframes promenadeGlow {
          0%   { opacity: 0; }
          30%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
