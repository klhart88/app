// ============================================
// RealEquityIQ — Decision Handoff ("Moment of Reflection")
//
// The bridge from Discovery (exploring scenarios) to Execution (committing to a
// path and starting the Journey). Its job is NOT to recommend — it's to help the
// user commit to a direction they've already been forming.
//
// Flow (single screen, top to bottom):
//   1. Guide message  — Kelvin's framing (on-screen text, no audio)
//   2. Recap          — condensed, always-visible cards of the path(s) explored;
//                       tap-to-expand for detail. No forced sequence.
//   3. Have You Considered — four reflection prompts; checking grays them out.
//                       ENCOURAGED but OPTIONAL — nothing is gated behind them.
//   4. Your Decision  — always-visible commit panel: pick a path to pursue first,
//                       or "Keep comparing" to return without committing.
//
// Pure presentation. Commitment is delegated to callbacks:
//   onCommit(pathKey)   — user chose a path to pursue first
//   onKeepComparing()   — user wants to keep exploring (no commitment)
// Persistence (writing identity_path, etc.) is wired by the parent later.
//
// Handles 1 path (single run) or 2–3 paths (comparison) gracefully.
// ============================================

import { useState } from 'react';
import { theme, styles } from '../theme.js';

const SCENARIO_LABELS = {
  rent:      'Continue Renting',
  buy:       'Buy a Starter Home',
  househack: 'Buy a Duplex & House Hack',
  invest:    'Invest in Stock Market',
  wait:      'Wait for Lower Rates',
};

const SCENARIO_ICONS = {
  rent: '🏢', buy: '🏡', househack: '🏘️', invest: '📈', wait: '⏳',
};

// One-line essence of each path — what the user is really choosing between.
// (Plain language, the user's side of the screen, not engine vocabulary.)
const SCENARIO_ESSENCE = {
  rent:      'Keep your flexibility while building toward what\'s next.',
  buy:       'A place to call yours, with equity growing along the way.',
  househack: 'Live in one door, let the other help move you forward.',
  invest:    'Let your money begin working while opportunity takes shape.',
  wait:      'Stay ready now, so you can move with confidence later.',
};

// Per-path detail rows shown when a recap card is expanded. Mirrors the
// comparison screen's teaching labels so a path reads consistently everywhere.
const DETAIL_LABELS = {
  rent: [
    ['portfolioAt20',    'Portfolio at year 20', 'currency'],
    ['totalRentPaid20',  'Total rent paid (20y)', 'currency'],
  ],
  buy: [
    ['equityAt20',         'Equity at year 20',    'currency'],
    ['appreciationGain20', 'From appreciation',    'currency'],
    ['paydownGain20',      'From loan paydown',    'currency'],
  ],
  househack: [
    ['equityAt20',         'Equity at year 20',     'currency'],
    ['tenantContribution20','Tenant paid to mortgage', 'currency'],
    ['surplusInvestedMonthly', 'Surplus invested / mo', 'currency'],
  ],
  invest: [
    ['portfolioAt20',    'Portfolio at year 20', 'currency'],
    ['investmentGain20', 'Total investment gain', 'currency'],
  ],
  wait: [
    ['totalCostOfWaiting', 'Total cost of waiting', 'currency'],
    ['monthsToBreakEven',  'Months to break even',  'number'],
  ],
};

const REFLECTION_QUESTIONS = [
  'Which scenario best balances opportunity with peace of mind?',
  'Which path aligns with your long-term goals — not just today’s emotions?',
  'If you delayed this decision another year, how would you feel?',
  'Which path are you most likely to actually follow through on?',
];

export default function DecisionHandoff({
  paths,                 // [{ scenarioKey, result }, ...] length 1–3 (primary first)
  county,
  onCommit,              // (pathKey) => void
  onKeepComparing,       // () => void
  onBack,
  currentTier = 'free',
}) {
  const isPro = currentTier !== 'free';
  const [expandedKey, setExpandedKey] = useState(null);
  const [consideredIdx, setConsideredIdx] = useState(() => new Set());
  const [selectedKey, setSelectedKey] = useState(null); // 'keep' or a path key

  if (!Array.isArray(paths) || paths.length === 0) return null;

  const items = paths.map(({ scenarioKey, result }, i) => {
    const yr20 = result.snapshots?.find((s) => s.year === 20);
    return {
      i,
      key:     scenarioKey,
      role:    i === 0 ? 'Primary' : 'Alternative',
      label:   SCENARIO_LABELS[scenarioKey] || scenarioKey,
      icon:    SCENARIO_ICONS[scenarioKey] || '📊',
      essence: SCENARIO_ESSENCE[scenarioKey] || '',
      result,
      yr20NetWorth: yr20?.netWorth ?? null,
    };
  });

  const multi = items.length > 1;

  function toggleConsidered(idx) {
    setConsideredIdx((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function handleConfirm() {
    if (!selectedKey) return;
    if (selectedKey === 'keep') onKeepComparing?.();
    else onCommit?.(selectedKey);
  }

  const consideredCount = consideredIdx.size;

  return (
    <div>
      <button onClick={onBack} style={s.backBtn}>← Back</button>

      {/* 1. Guide framing — Kelvin's voice, on screen */}
      <div style={s.guideCard}>
        <span style={s.guideIcon} aria-hidden="true">🧭</span>
        <div>
          <p style={s.guideEyebrow}>Moment of reflection</p>
          <p style={s.guideText}>
            You’ve explored the possibilities. Take a moment to consider which path
            best fits your goals, your finances, and your comfort level.
          </p>
        </div>
      </div>

      {/* 2. Recap — condensed, always visible, tap to expand */}
      <div style={{ marginTop: theme.space.md }}>
        <p style={s.sectionLabel}>
          {multi ? 'The paths you explored' : 'The path you explored'}
          <span style={s.sectionHint}> · tap a card for detail</span>
        </p>
        {items.map((it) => {
          const open = expandedKey === it.key;
          const detail = (DETAIL_LABELS[it.key] || [])
            .map(([k, lbl, fmt]) => [lbl, it.result.summary?.teachingMoments?.[k], fmt])
            .filter(([, v]) => v != null);
          return (
            <div key={it.key} style={s.recapCard}>
              <button
                onClick={() => setExpandedKey(open ? null : it.key)}
                style={s.recapHeadBtn}
                aria-expanded={open}
              >
                <span style={s.recapIcon}>{it.icon}</span>
                <span style={s.recapHeadText}>
                  {multi && <span style={s.recapRole}>{it.role}</span>}
                  <span style={s.recapLabel}>{it.label}</span>
                  <span style={s.recapEssence}>{it.essence}</span>
                </span>
                <span style={s.recapRight}>
                  <span style={{ ...s.recapValue, filter: isPro ? 'none' : 'blur(7px)' }}>
                    {it.yr20NetWorth != null ? `$${Math.round(it.yr20NetWorth).toLocaleString()}` : '—'}
                  </span>
                  <span style={s.recapValueCaption}>year 20</span>
                  <span style={{ ...s.chevron, transform: open ? 'rotate(180deg)' : 'none' }}>⌄</span>
                </span>
              </button>
              {open && detail.length > 0 && (
                <div style={s.recapDetail}>
                  {detail.map(([lbl, val, fmt]) => (
                    <div key={lbl} style={s.detailRow}>
                      <span style={styles.statLabel}>{lbl}</span>
                      <span style={{ ...s.detailVal, filter: isPro ? 'none' : 'blur(5px)' }}>
                        {fmt === 'currency' ? `$${Math.round(val).toLocaleString()}`
                          : fmt === 'number' ? Math.round(val).toLocaleString() : val}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Have You Considered — optional reflection */}
      <div style={{ marginTop: theme.space.lg }}>
        <p style={s.sectionLabel}>
          Have you considered
          {consideredCount > 0 && (
            <span style={s.sectionHint}> · {consideredCount} of {REFLECTION_QUESTIONS.length}</span>
          )}
        </p>
        <div style={styles.card}>
          {REFLECTION_QUESTIONS.map((q, idx) => {
            const checked = consideredIdx.has(idx);
            return (
              <button
                key={idx}
                onClick={() => toggleConsidered(idx)}
                style={{ ...s.questionRow, borderBottom: idx < REFLECTION_QUESTIONS.length - 1 ? `1px solid ${theme.color.line}` : 'none' }}
                aria-pressed={checked}
              >
                <span style={{ ...s.checkbox, ...(checked ? s.checkboxOn : {}) }}>
                  {checked ? '✓' : ''}
                </span>
                <span style={{ ...s.questionText, color: checked ? theme.color.muted : theme.color.ink, opacity: checked ? 0.6 : 1 }}>
                  {q}
                </span>
              </button>
            );
          })}
        </div>
        <p style={s.optionalNote}>Reflecting is optional — you can choose your path whenever you’re ready.</p>
      </div>

      {/* 4. Your Decision — always-visible commit panel */}
      <div style={{ marginTop: theme.space.lg }}>
        <div style={s.decisionHead}>
          <p style={s.decisionTitle}>Your decision</p>
          <p style={s.decisionSub}>
            Every journey begins with one committed direction. Choose the path you’ll
            pursue first — not because it’s permanent, but because every plan begins
            with a first step.
          </p>
        </div>

        <div role="radiogroup" aria-label="Choose your path">
          {items.map((it) => {
            const sel = selectedKey === it.key;
            return (
              <button
                key={it.key}
                onClick={() => setSelectedKey(it.key)}
                role="radio"
                aria-checked={sel}
                style={{ ...s.choiceRow, ...(sel ? s.choiceRowOn : {}) }}
              >
                <span style={{ ...s.radio, ...(sel ? s.radioOn : {}) }} />
                <span style={s.choiceIcon}>{it.icon}</span>
                <span style={s.choiceText}>
                  <span style={s.choiceLabel}>{it.label}</span>
                  <span style={s.choiceEssence}>{it.essence}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Keep comparing — separated from the committable paths above.
            Still selectable (preserves select-then-confirm), but set apart by a
            divider so it reads as a quieter escape hatch, not a fourth path. */}
        <div style={s.keepDivider}>
          <span style={s.keepDividerLine} />
          <span style={s.keepDividerLabel}>Not ready yet?</span>
          <span style={s.keepDividerLine} />
        </div>

        <button
          onClick={() => setSelectedKey('keep')}
          aria-pressed={selectedKey === 'keep'}
          style={{ ...s.choiceRow, marginBottom: 0, ...(selectedKey === 'keep' ? s.choiceRowOn : {}) }}
        >
          <span style={{ ...s.radio, ...(selectedKey === 'keep' ? s.radioOn : {}) }} />
          <span style={s.choiceIcon}>🔄</span>
          <span style={s.choiceText}>
            <span style={s.choiceLabel}>Keep comparing</span>
            <span style={s.choiceEssence}>I’m not ready to choose — let me explore more first.</span>
          </span>
        </button>

        <button
          onClick={handleConfirm}
          disabled={!selectedKey}
          style={{
            ...styles.btnPrimary,
            marginTop: theme.space.md,
            opacity: selectedKey ? 1 : 0.5,
            cursor: selectedKey ? 'pointer' : 'not-allowed',
          }}
        >
          {selectedKey === 'keep' ? 'Keep comparing'
            : selectedKey ? `Commit to ${SCENARIO_LABELS[selectedKey]}`
            : 'Select a path to continue'}
        </button>
      </div>
    </div>
  );
}

// ── Styles — reuse app tokens for visual cohesion with the rest of the product ──
const s = {
  backBtn: {
    background: theme.color.soft, border: `1.5px solid ${theme.color.line}`,
    borderRadius: theme.radius.xs, color: theme.color.ink, fontSize: theme.font.size.sm,
    cursor: 'pointer', padding: '8px 16px', fontWeight: '600', marginBottom: '20px',
    display: 'inline-flex', alignItems: 'center', gap: '6px',
  },

  guideCard: {
    display: 'flex', gap: '14px', alignItems: 'flex-start',
    background: theme.color.ink, borderRadius: theme.radius.default,
    padding: theme.space.lg,
  },
  guideIcon: { fontSize: '26px', flexShrink: 0, lineHeight: 1 },
  guideEyebrow: {
    fontSize: theme.font.size.xs, color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', margin: '0 0 6px',
  },
  guideText: { fontSize: theme.font.size.base, color: '#fff', margin: 0, lineHeight: 1.5, fontWeight: '500' },

  sectionLabel: {
    fontSize: theme.font.size.sm, fontWeight: '700', color: theme.color.ink,
    textTransform: 'uppercase', letterSpacing: '0.05em', margin: `0 0 ${theme.space.sm}`,
  },
  sectionHint: { fontWeight: '500', color: theme.color.muted, textTransform: 'none', letterSpacing: 0 },

  recapCard: {
    background: theme.color.card, border: `1px solid ${theme.color.line}`,
    borderRadius: theme.radius.sm, marginBottom: '8px', overflow: 'hidden',
  },
  recapHeadBtn: {
    display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
    background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', textAlign: 'left',
  },
  recapIcon: { fontSize: '24px', flexShrink: 0 },
  recapHeadText: { display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 },
  recapRole: {
    fontSize: '9px', fontWeight: '700', letterSpacing: '0.06em',
    textTransform: 'uppercase', color: theme.color.muted,
  },
  recapLabel: { fontSize: theme.font.size.base, fontWeight: '700', color: theme.color.ink },
  recapEssence: { fontSize: theme.font.size.sm, color: theme.color.muted, marginTop: '2px' },
  recapRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 },
  recapValue: { fontSize: theme.font.size.base, fontWeight: '800', color: theme.color.primary, letterSpacing: '-0.01em' },
  recapValueCaption: { fontSize: '10px', color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.04em' },
  chevron: { fontSize: '16px', color: theme.color.muted, transition: 'transform 0.2s ease', marginTop: '2px' },

  recapDetail: { padding: '0 16px 12px', borderTop: `1px solid ${theme.color.line}` },
  detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' },
  detailVal: { fontSize: theme.font.size.sm, fontWeight: '700', color: theme.color.ink },

  questionRow: {
    display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%',
    background: 'none', border: 'none', borderRadius: 0, cursor: 'pointer',
    padding: '14px 0', textAlign: 'left',
  },
  checkbox: {
    width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
    borderWidth: '2px', borderStyle: 'solid', borderColor: theme.color.muted,
    background: '#fff',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '13px', color: '#fff', fontWeight: '700',
    transition: 'all 0.15s ease', marginTop: '1px',
  },
  checkboxOn: { background: theme.color.success || '#1a6b3c', borderColor: theme.color.success || '#1a6b3c' },
  questionText: { fontSize: theme.font.size.base, lineHeight: 1.4, transition: 'all 0.2s ease' },
  optionalNote: { fontSize: theme.font.size.sm, color: theme.color.muted, margin: `${theme.space.sm} 0 0`, fontStyle: 'italic' },

  decisionHead: { marginBottom: theme.space.md },
  decisionTitle: {
    fontSize: theme.font.size.lg, fontWeight: '700', color: theme.color.ink,
    margin: '0 0 4px', letterSpacing: '-0.01em',
  },
  decisionSub: { fontSize: theme.font.size.sm, color: theme.color.muted, margin: 0, lineHeight: 1.5 },

  choiceRow: {
    display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
    background: theme.color.card, border: `1.5px solid ${theme.color.line}`,
    borderRadius: theme.radius.sm, cursor: 'pointer', padding: '14px 16px',
    textAlign: 'left', marginBottom: '8px', transition: 'all 0.15s ease',
  },
  choiceRowOn: { borderColor: theme.color.primary, background: 'rgba(196,0,0,0.03)' },
  radio: {
    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
    border: `2px solid ${theme.color.line}`, transition: 'all 0.15s ease',
  },
  radioOn: { borderColor: theme.color.primary, borderWidth: '6px' },
  choiceIcon: { fontSize: '22px', flexShrink: 0 },
  choiceText: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  choiceLabel: { fontSize: theme.font.size.base, fontWeight: '700', color: theme.color.ink },
  choiceEssence: { fontSize: theme.font.size.sm, color: theme.color.muted, marginTop: '2px' },

  keepDivider: {
    display: 'flex', alignItems: 'center', gap: '12px', margin: `${theme.space.md} 0`,
  },
  keepDividerLine: { flex: 1, height: '1px', background: theme.color.line },
  keepDividerLabel: {
    fontSize: theme.font.size.xs, color: theme.color.muted, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
  },
};