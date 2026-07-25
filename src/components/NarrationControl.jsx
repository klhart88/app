// ============================================================================
// RealEquityIQ — NarrationControl (Path B guided-audio UI, v1)
//
// The small, branded control that sits with a narrated beat. Pairs with
// useNarration. Shows a play affordance, a speaking indicator, and a replay.
// Mature/quiet by design — a financial audience, not a game: no bouncing icons,
// no color explosions. A calm speaker glyph in brand red.
//
// Reused on every narrated screen, so it takes its label/state from props and
// holds no journey logic.
// ============================================================================

import { theme } from '../theme.js';

// status: from useNarration — 'idle' | 'speaking' | 'done' | 'blocked' | 'unsupported'
export default function NarrationControl({ status, supported, onPlay, onReplay, onStop, label = 'Listen' }) {
  if (!supported) return null; // degrade silently where speech isn't available

  const speaking = status === 'speaking';
  const played = status === 'done';

  const handleClick = () => {
    if (speaking) { onStop?.(); return; }
    if (played)   { onReplay?.(); return; }
    onPlay?.();
  };

  const text = speaking ? 'Stop' : played ? 'Replay' : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={speaking ? 'Stop narration' : played ? 'Replay narration' : 'Play narration'}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '8px',
        background:     theme.color.primarySoft,
        color:          theme.color.primary,
        border:         `1.5px solid ${theme.color.lineStrong}`,
        borderRadius:   theme.radius.sm,
        padding:        '8px 14px',
        fontSize:       theme.font.size.sm,
        fontWeight:     theme.font.weight.semibold,
        fontFamily:     theme.font.family,
        cursor:         'pointer',
        letterSpacing:  '0.01em',
      }}
    >
      <Glyph speaking={speaking} />
      {text}
    </button>
  );
}

// Calm speaker glyph; shows quiet animated "waves" only while speaking.
function Glyph({ speaking }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <path d="M3 6 L6 6 L9 3 L9 13 L6 10 L3 10 Z" fill={theme.color.primary} />
      {speaking ? (
        <>
          <path d="M11 5.5 Q12.5 8 11 10.5" stroke={theme.color.primary} strokeWidth="1.2" strokeLinecap="round" fill="none">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.1s" repeatCount="indefinite" />
          </path>
          <path d="M12.7 4 Q15 8 12.7 12" stroke={theme.color.primary} strokeWidth="1.2" strokeLinecap="round" fill="none">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.1s" begin="0.2s" repeatCount="indefinite" />
          </path>
        </>
      ) : (
        <path d="M11 5.5 Q12.5 8 11 10.5" stroke={theme.color.primary} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />
      )}
    </svg>
  );
}