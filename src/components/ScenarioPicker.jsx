// ============================================
// RealWorldIQ — Scenario Picker (Step 3)
//
// Five scenario cards with icons and descriptions.
// User selects one then runs the simulation.
// This is the gamification entry point.
// ============================================

import { useState } from 'react';
import { theme, styles } from '../theme.js';

const SCENARIOS = [
  {
    key:         'rent',
    icon:        '🏢',
    title:       'Continue Renting',
    subtitle:    'Stay flexible, invest the difference',
    description: 'Keep renting and invest what you would have spent on a down payment and ownership costs. Let compound returns do the work.',
    tag:         'Low commitment',
    tagColor:    { bg: '#e8f4fd', text: '#1b4f8c' },
  },
  {
    key:         'buy',
    icon:        '🏡',
    title:       'Buy a Starter Home',
    subtitle:    'Build equity, own your space',
    description: 'Purchase a primary residence and start building equity through appreciation and loan paydown. The classic path.',
    tag:         'Most common',
    tagColor:    { bg: '#d6efe1', text: '#1a6b3c' },
  },
  {
    key:         'househack',
    icon:        '🏘️',
    title:       'Buy a Duplex & House Hack',
    subtitle:    'Let your tenant pay your mortgage',
    description: 'Buy a duplex, live in one unit, rent the other. Rental income offsets your costs while you build equity on the full property.',
    tag:         'Highest return',
    tagColor:    { bg: '#fee2e2', text: '#9d0000' },
  },
  {
    key:         'invest',
    icon:        '📈',
    title:       'Invest in the Stock Market',
    subtitle:    'Skip real estate, go full portfolio',
    description: 'Put everything into a diversified index portfolio. No leverage, no maintenance — but full liquidity and compound growth.',
    tag:         'Full liquidity',
    tagColor:    { bg: '#fde8d0', text: '#c05a00' },
  },
  {
    key:         'wait',
    icon:        '⏳',
    title:       'Wait for Lower Rates',
    subtitle:    'Hold cash, time the market',
    description: 'Keep renting and saving while waiting for interest rates to drop. See exactly what that patience costs — and whether it pays off.',
    tag:         'Rate timing',
    tagColor:    { bg: '#ede9fe', text: '#5b21b6' },
  },
];

export default function ScenarioPicker({ county, inputs, onRun, onBack }) {
  const [selected, setSelected] = useState(null);
  const [running, setRunning]   = useState(false);

  async function handleRun() {
    if (!selected) return;
    setRunning(true);
    await onRun(selected);
    setRunning(false);
  }

  return (
    <div>

      {/* Back button */}
      <button onClick={onBack} style={s.backBtn}>
        ← Back
      </button>

      {/* Heading */}
      <div style={{ marginBottom: theme.space.lg }}>
        <h2 style={s.heading}>Choose your scenario</h2>
        <p style={styles.helperText}>
          Select a path to simulate. The winner is whoever builds the highest
          net worth — not whoever buys the most property.
        </p>
      </div>

      {/* Scenario cards */}
      <div style={s.cardGrid}>
        {SCENARIOS.map(scenario => {
          const isSelected = selected === scenario.key;
          return (
            <button
              key={scenario.key}
              onClick={() => setSelected(scenario.key)}
              style={{
                ...s.card,
                borderLeft: `4px solid ${scenario.tagColor.text}`,  // category-color accent (identity) — always matches this card's tag
                borderTop: isSelected
                  ? `2px solid ${theme.color.primary}`
                  : `1.5px solid ${theme.color.line}`,
                borderRight: isSelected
                  ? `2px solid ${theme.color.primary}`
                  : `1.5px solid ${theme.color.line}`,
                borderBottom: isSelected
                  ? `2px solid ${theme.color.primary}`
                  : `1.5px solid ${theme.color.line}`,
                background: isSelected ? theme.color.primarySoft : theme.color.card,
                transform: isSelected ? 'translateY(-2px)' : 'none',
                boxShadow: isSelected ? theme.shadow.default : theme.shadow.soft,
              }}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div style={s.selectedDot}>✓</div>
              )}

              {/* Icon */}
              <div style={s.iconBox}>{scenario.icon}</div>

              {/* Tag */}
              <span style={{ ...s.tag, background: scenario.tagColor.bg, color: scenario.tagColor.text }}>
                {scenario.tag}
              </span>

              {/* Text */}
              <h3 style={{ ...s.cardTitle, color: isSelected ? theme.color.primary : theme.color.ink }}>
                {scenario.title}
              </h3>
              <p style={s.cardSubtitle}>{scenario.subtitle}</p>
              <p style={s.cardDesc}>{scenario.description}</p>

            </button>
          );
        })}
      </div>

      {/* Run button */}
      <div style={{ marginTop: theme.space.lg }}>
        {!selected && (
          <p style={{ ...styles.helperText, textAlign: 'center', marginBottom: '12px' }}>
            Select a scenario above to continue
          </p>
        )}
        <button
          onClick={handleRun}
          disabled={!selected || running}
          style={{
            ...styles.btnPrimary,
            opacity:  !selected || running ? 0.5 : 1,
            cursor:   !selected || running ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? 'Running simulation...' : `Run Simulation →`}
        </button>

        {selected && (
          <p style={{ ...styles.helperText, textAlign: 'center', marginTop: '10px' }}>
            Simulating <strong>{SCENARIOS.find(s => s.key === selected)?.title}</strong> in {county.county_name} County
          </p>
        )}
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
    fontSize:     theme.font.size.xl,
    fontWeight:   '700',
    color:        theme.color.ink,
    margin:       '0 0 6px 0',
    letterSpacing: '-0.01em',
  },
  cardGrid: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '12px',
  },
  card: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'flex-start',
    padding:       theme.space.md,
    borderRadius:  theme.radius.sm,
    cursor:        'pointer',
    textAlign:     'left',
    position:      'relative',
    transition:    'all 0.15s ease',
    width:         '100%',
  },
  selectedDot: {
    position:     'absolute',
    top:          '12px',
    right:        '12px',
    width:        '22px',
    height:       '22px',
    borderRadius: '50%',
    background:   theme.color.primary,
    color:        '#fff',
    fontSize:     '11px',
    fontWeight:   '700',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
  },
  iconBox: {
    fontSize:     '28px',
    marginBottom: '8px',
  },
  tag: {
    display:      'inline-block',
    padding:      '2px 8px',
    borderRadius: '20px',
    fontSize:     '10px',
    fontWeight:   '700',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize:     theme.font.size.md,
    fontWeight:   '700',
    margin:       '0 0 3px 0',
    letterSpacing: '-0.01em',
  },
  cardSubtitle: {
    fontSize:   theme.font.size.sm,
    color:      theme.color.muted,
    margin:     '0 0 8px 0',
    fontWeight: '500',
  },
  cardDesc: {
    fontSize:   theme.font.size.sm,
    color:      theme.color.muted,
    margin:     0,
    lineHeight: '1.5',
  },
};