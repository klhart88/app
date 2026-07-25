// ============================================================================
// RealEquityIQ — EnvironmentScene TEST HARNESS (temporary)
//
// A complete, self-contained page for previewing the pre-approval environment
// pop-up WITHOUT touching App.jsx or your real flow. It just gives you a button
// that opens the environment so you can feel the experience.
//
// HOW TO USE (one of two ways):
//
//   OPTION A — quickest, temporary: in App.jsx, at the very top of what App
//   returns, render <EnvironmentTest /> instead of your normal app for a minute:
//       import EnvironmentTest from './components/EnvironmentTest.jsx';
//       return <EnvironmentTest />;
//   Look at it, then delete that one line to restore your app.
//
//   OPTION B — see it alongside your app: drop <EnvironmentTest /> anywhere in
//   your render tree temporarily; it shows a single button.
//
// When you're done previewing, delete this file (and the import). It's a
// scaffold, not part of the product.
// ============================================================================

import { useState } from 'react';
import { theme } from '../theme.js';
import EnvironmentScene from './EnvironmentScene.jsx';

export default function EnvironmentTest() {
  const [open, setOpen] = useState(false);
  const [lastCompleted, setLastCompleted] = useState(null);

  return (
    <div style={{
      minHeight:   '100vh',
      background:  theme.color.bg,
      fontFamily:  theme.font.family,
      padding:     theme.space.xl,
      display:     'flex',
      flexDirection: 'column',
      alignItems:  'center',
      justifyContent: 'center',
      gap:         theme.space.md,
    }}>
      <h1 style={{ fontSize: theme.font.size.lg, color: theme.color.ink, margin: 0 }}>
        Environment preview
      </h1>
      <p style={{ fontSize: theme.font.size.sm, color: theme.color.muted, margin: 0, textAlign: 'center', maxWidth: '420px' }}>
        Click below to open the pre-approval environment. Listen to the narration,
        check off the steps, and see how the "lived moment" feels.
      </p>

      <button
        onClick={() => setOpen(true)}
        style={{
          background:    theme.color.primary,
          color:         '#fff',
          border:        'none',
          borderRadius:  theme.radius.sm,
          padding:       `14px ${theme.space.lg}`,
          fontSize:      theme.font.size.base,
          fontWeight:    theme.font.weight.semibold,
          cursor:        'pointer',
        }}
      >
        Open pre-approval environment
      </button>

      {lastCompleted && (
        <p style={{ fontSize: theme.font.size.sm, color: theme.color.success, margin: 0 }}>
          ✓ Completed: {lastCompleted}
        </p>
      )}

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EnvironmentScene
            onComplete={(key) => { setLastCompleted(key); setOpen(false); }}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
