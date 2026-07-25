// ============================================================================
// RealEquityIQ — OutcomeScene
//
// Renders the configured completion image using PAN-ONLY motion (Table 3:
// "Existing single-image pan and optional subtle scale... no layer
// decomposition, no parallax objects, no object coordinates").
//
// Deliberately agnostic about which page/component hosts it: a plain CSS
// Ken-Burns pan on an <img>, with no dependency on the SVG world-map's
// geometry helpers (placeStations/buildWorldPath/measurePath) or on any
// future dedicated Promenade page's layout. Either can mount this component
// as-is once its outcome image exists.
//
// Image failure: shows a neutral fallback rather than a broken image, per
// the Error and Recovery table ("Outcome image fails: show the completion
// summary with a neutral fallback background").
// ============================================================================

import { useEffect, useState } from 'react';
import { theme, styles } from '../../../theme.js';

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const AUTO_ADVANCE_MS = 6200; // was 4200, then 5200 ("extend time on
// wait-save-complete.webp"), now +1000ms more — total ceremony sums to 10.8s
// (finalizing 2000 + celebrating 2600 + this 6200) to match
// milestone-confirm-cue.mp3's length, which now plays continuously through
// the whole ceremony (see JourneyMap.jsx).

export default function OutcomeScene({ config, onDone, onSkip }) {
  const reduced = prefersReducedMotion();
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => onDone(), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (imgFailed) {
    return (
      <div style={{
        ...styles.card, minHeight: '360px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: theme.color.line,
      }}>
        <button onClick={onSkip} style={styles.btnGhost}>Continue</button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative', minHeight: '360px', borderRadius: theme.radius.default,
      overflow: 'hidden', boxShadow: theme.shadow.card,
    }}>
      <img
        src={config.outcomeImageSrc}
        alt={config.outcomeImageAlt}
        onError={() => setImgFailed(true)}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          animation: reduced ? 'none' : 'promenadeOutcomePan 6s ease-out forwards',
        }}
      />
      {/* Skip: a small corner pill rather than a full-width bottom bar. A
          full-width bar claims an entire horizontal band of the image, which
          collides with whatever's compositionally grounding the shot (a
          closing table, a savings jar, a trading desk) on most outcome
          scenes — the same category of problem as the Promenade waterfall,
          just recurring per-image instead of once. A small anchored control
          only risks a minor corner, not a whole band. */}
      <button
        onClick={onSkip}
        style={{
          position: 'absolute', top: theme.space.md, right: theme.space.md,
          ...styles.btnGhost,
          width: 'auto',
          background: 'rgba(255,255,255,0.92)',
          padding: '6px 16px',
          boxShadow: theme.shadow.default,
        }}
      >
        Skip
      </button>
      <style>{`
        @keyframes promenadeOutcomePan {
          0%   { transform: scale(1.06) translate(0, 0); }
          100% { transform: scale(1.12) translate(-1.5%, -1.5%); }
        }
      `}</style>
    </div>
  );
}
