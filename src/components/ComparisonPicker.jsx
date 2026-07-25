// ============================================
// RealEquityIQ — Comparison Picker (Step 3 → handoff)
//
// The small, OPTIONAL, skippable screen that appears after the user commits
// their PRIMARY scenario. They may pick 1-2 SECONDARY lenses to compare
// against. Secondaries don't fork the map or inject wealth math — each later
// surfaces ONE curiosity-toned "aha" at its trigger milestone on the journey.
//
// Presentation-only, like ScenarioPicker: it captures the selection and hands
// it up via onContinue / onSkip. The supabase write (set_comparison_set) and
// the actual simulation run live in App.jsx, mirroring how ScenarioPicker
// delegates onRun upward.
// ============================================

import { useState } from 'react';
import { theme, styles } from '../theme.js';

// Same five scenarios as ScenarioPicker, kept in sync by key. Only the four
// non-primary ones are ever offered here (the primary is echoed, not pickable).
const SCENARIOS = [
  { key: 'rent',      icon: '🏢', title: 'Continue Renting',          blurb: 'Stay flexible, invest the difference' },
  { key: 'buy',       icon: '🏡', title: 'Buy a Starter Home',        blurb: 'Build equity, own your space' },
  { key: 'househack', icon: '🏘️', title: 'Buy a Duplex & House Hack', blurb: 'Let your tenant pay your mortgage' },
  { key: 'invest',    icon: '📈', title: 'Invest in the Stock Market', blurb: 'Skip real estate, go full portfolio' },
  { key: 'wait',      icon: '⏳', title: 'Wait for Lower Rates',       blurb: 'Hold cash, time the market' },
];

const MAX_SECONDARIES = 2;

export default function ComparisonPicker({ primaryKey, county, onContinue, onSkip, onBack }) {
  const [selected, setSelected] = useState([]);   // array of secondary keys
  const [saving, setSaving]     = useState(false);

  const primary = SCENARIOS.find((s) => s.key === primaryKey);
  const options = SCENARIOS.filter((s) => s.key !== primaryKey);

  function toggle(key) {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_SECONDARIES) return prev;   // cap at 2
      return [...prev, key];
    });
  }

  async function handleContinue() {
    setSaving(true);
    await onContinue(selected);   // App.jsx persists + runs the sim
    setSaving(false);
  }

  async function handleSkip() {
    setSaving(true);
    await onSkip();               // App.jsx clears selection + runs the sim
    setSaving(false);
  }

  const atCap = selected.length >= MAX_SECONDARIES;

  return (
    <div>
      {/* Back to the scenario picker */}
      <button onClick={onBack} style={s.backBtn} disabled={saving}>
        ← Back
      </button>

      {/* Heading */}
      <div style={{ marginBottom: theme.space.md }}>
        <h2 style={s.heading}>Want to see it through another lens?</h2>
        <p style={styles.helperText}>
          Optional. Pick one or two other scenarios and we'll surface a learning
          insight from each — a different way of looking at the same moment — as
          you move through your journey. Your main path stays{' '}
          <strong>{primary?.title ?? 'your scenario'}</strong>.
        </p>
      </div>

      {/* Primary echo — the path being walked, shown but not selectable */}
      {primary && (
        <div style={s.primaryEcho}>
          <span style={s.primaryEchoIcon}>{primary.icon}</span>
          <div>
            <div style={s.primaryEchoLabel}>Your path</div>
            <div style={s.primaryEchoTitle}>{primary.title}</div>
          </div>
          <span style={s.primaryBadge}>Primary</span>
        </div>
      )}

      {/* Secondary lens options */}
      <div style={s.optionList}>
        {options.map((sc) => {
          const isSel = selected.includes(sc.key);
          const dim   = atCap && !isSel;
          return (
            <button
              key={sc.key}
              onClick={() => toggle(sc.key)}
              disabled={dim || saving}
              style={{
                ...s.option,
                border: isSel
                  ? `2px solid ${theme.color.primary}`
                  : `1.5px solid ${theme.color.line}`,
                background: isSel ? theme.color.primarySoft : theme.color.card,
                opacity: dim ? 0.45 : 1,
                cursor: dim ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={s.optionIcon}>{sc.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ ...s.optionTitle, color: isSel ? theme.color.primary : theme.color.ink }}>
                  {sc.title}
                </div>
                <div style={s.optionBlurb}>{sc.blurb}</div>
              </div>
              <span style={{
                ...s.check,
                background: isSel ? theme.color.primary : 'transparent',
                border: isSel ? 'none' : `1.5px solid ${theme.color.line}`,
                color: '#fff',
              }}>
                {isSel ? '✓' : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selection hint */}
      <p style={{ ...styles.helperText, textAlign: 'center', marginTop: '12px' }}>
        {selected.length === 0
          ? 'Select up to two — or skip to walk your path on its own.'
          : `Comparing against ${selected.length} ${selected.length === 1 ? 'lens' : 'lenses'}.`}
      </p>

      {/* Actions */}
      <div style={s.actions}>
        <button
          onClick={handleSkip}
          disabled={saving}
          style={{ ...styles.btnGhost, opacity: saving ? 0.6 : 1 }}
        >
          Skip — no comparison
        </button>
        <button
          onClick={handleContinue}
          disabled={saving}
          style={{
            ...styles.btnPrimary,
            opacity: saving ? 0.6 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving
            ? 'Starting…'
            : selected.length > 0
              ? `Continue with ${selected.length === 1 ? 'this lens' : 'these lenses'} →`
              : 'Continue →'}
        </button>
      </div>
    </div>
  );
}

// ── Local styles ───────────────────────────
const s = {
  backBtn: {
    background:   theme.color.soft,
    border:       `1.5px solid ${theme.color.line}`,
    borderRadius: theme.radius.xs,
    color:        theme.color.ink,
    fontSize:     theme.font.size.sm,
    cursor:       'pointer',
    padding:      '8px 16px',
    fontWeight:   '600',
    marginBottom: '20px',
    display:      'inline-flex',
    alignItems:   'center',
    gap:          '6px',
  },
  heading: {
    fontSize:      theme.font.size.xl,
    fontWeight:    '700',
    color:         theme.color.ink,
    margin:        '0 0 6px 0',
    letterSpacing: '-0.01em',
  },
  primaryEcho: {
    display:      'flex',
    alignItems:   'center',
    gap:          '12px',
    padding:      theme.space.md,
    borderRadius: theme.radius.sm,
    background:   theme.color.primarySoft,
    border:       `1px solid ${theme.color.lineStrong}`,
    marginBottom: theme.space.md,
  },
  primaryEchoIcon:  { fontSize: '26px' },
  primaryEchoLabel: {
    fontSize:      theme.font.size.xs,
    color:         theme.color.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight:    '600',
  },
  primaryEchoTitle: {
    fontSize:   theme.font.size.md,
    fontWeight: '700',
    color:      theme.color.primary,
  },
  primaryBadge: {
    marginLeft:    'auto',
    fontSize:      '10px',
    fontWeight:    '700',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color:         theme.color.primary,
    border:        `1.5px solid ${theme.color.primary}`,
    borderRadius:  '20px',
    padding:       '2px 10px',
  },
  optionList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '10px',
  },
  option: {
    display:       'flex',
    alignItems:    'center',
    gap:           '12px',
    padding:       theme.space.md,
    borderRadius:  theme.radius.sm,
    textAlign:     'left',
    width:         '100%',
    transition:    'all 0.15s ease',
  },
  optionIcon:  { fontSize: '24px' },
  optionTitle: {
    fontSize:      theme.font.size.md,
    fontWeight:    '700',
    letterSpacing: '-0.01em',
  },
  optionBlurb: {
    fontSize: theme.font.size.sm,
    color:    theme.color.muted,
    marginTop: '2px',
  },
  check: {
    width:        '22px',
    height:       '22px',
    minWidth:     '22px',
    borderRadius: '50%',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    fontSize:     '12px',
    fontWeight:   '700',
  },
  actions: {
    display:           'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:               '12px',
    marginTop:         theme.space.md,
  },
};