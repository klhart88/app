// ============================================
// RealEquityIQ — Net Worth Breakdown Modal
//
// Answers ONE question: "What makes up my projected net worth at this
// point in time?" — not "how is it calculated." Deliberately does not
// expose the 28%-housing-budget model, DTI logic, amortization formulas,
// or investment-growth formulas anywhere in this UI; it only ever displays
// the dollar figures those calculations already produced, via
// snapshot.netWorthComposition / homeEquityComposition / portfolioComposition
// (see networth.js's buildWealthComposition / buildHomeEquityComposition /
// buildPortfolioComposition — every figure shown here reconciles exactly to
// those, verified programmatically across all five scenarios and all five
// snapshot years).
//
// Purely presentational: takes one year's snapshot and renders it. No
// supabase, no calculation of its own — if a number needs deriving, that
// derivation belongs in the engine layer, not here.
// ============================================

import { useState } from 'react';
import { theme, styles } from '../theme.js';

const LEARN_MORE = {
  homeEquity:
    "The portion of your home that you own, built through your down payment, paying down your mortgage, and increases in your home's value.",
  investmentPortfolio:
    'The value of your invested savings, including any remaining savings, ongoing contributions, and projected investment growth.',
};

function fmt(val) {
  if (val == null) return '—';
  return `$${Math.round(val).toLocaleString()}`;
}

export default function NetWorthBreakdownModal({
  year,
  snapshot,          // the specific year's snapshot object
  scenarioLabel,     // optional — shown in the header for context
  scenarioIcon,
  isPro = true,      // blur gating, matches the rest of the results screens
  onClose,
}) {
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  if (!snapshot) return null;

  const nwc = snapshot.netWorthComposition;
  const hec = snapshot.homeEquityComposition;   // may be absent — no home equity in this scenario/phase
  const pc  = snapshot.portfolioComposition;

  const hasHomeEquity = nwc?.homeEquity > 0.5;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Projected Net Worth Breakdown, Year ${year}`}
      style={s.overlay}
    >
      <div onClick={(e) => e.stopPropagation()} style={s.card}>
        <button onClick={onClose} aria-label="Close" style={s.closeBtn}>×</button>

        <p style={s.eyebrow}>Projected Net Worth Breakdown — Year {year}</p>
        {scenarioLabel && (
          <p style={s.scenarioLine}>
            {scenarioIcon && <span style={{ marginRight: '6px' }}>{scenarioIcon}</span>}
            {scenarioLabel}
          </p>
        )}

        {/* ── Top-level total ─────────────────────────────────────── */}
        <div style={s.heroBlock}>
          <p style={s.heroLabel}>Projected Net Worth</p>
          <p style={{ ...s.heroValue, filter: isPro ? 'none' : 'blur(9px)' }}>
            {fmt(nwc?.total)}
          </p>
        </div>

        {/* "Net Worth Composition" — the two primary assets ───────────────── */}
        <div style={s.section}>
          <p style={s.sectionLabel}>Net Worth Composition</p>
          {hasHomeEquity && (
            <div style={s.row}>
              <span style={s.rowLabel}>🏠 Home Equity</span>
              <span style={{ ...s.rowValue, filter: isPro ? 'none' : 'blur(6px)' }}>
                {fmt(nwc.homeEquity)}
              </span>
            </div>
          )}
          <div style={s.row}>
            <span style={s.rowLabel}>📈 Investment Portfolio</span>
            <span style={{ ...s.rowValue, filter: isPro ? 'none' : 'blur(6px)' }}>
              {fmt(nwc?.investmentPortfolio)}
            </span>
          </div>
          <div style={{ ...s.row, ...s.totalRow }}>
            <span style={s.totalLabel}>Total Net Worth</span>
            <span style={{ ...s.totalValue, filter: isPro ? 'none' : 'blur(6px)' }}>
              {fmt(nwc?.total)}
            </span>
          </div>
        </div>

        {/* ── Home Equity supporting detail ───────────────────────── */}
        {hasHomeEquity && hec && (
          <div style={s.section}>
            <p style={s.sectionLabel}>Home Equity</p>
            <div style={s.row}>
              <span style={s.rowLabelPlain}>Initial Down Payment</span>
              <span style={{ ...s.rowValuePlain, filter: isPro ? 'none' : 'blur(6px)' }}>
                {fmt(hec.downPayment)}
              </span>
            </div>
            <div style={s.row}>
              <span style={s.rowLabelPlain}>Principal Paid</span>
              <span style={{ ...s.rowValuePlain, filter: isPro ? 'none' : 'blur(6px)' }}>
                {fmt(hec.principalPaid)}
              </span>
            </div>
            <div style={s.row}>
              <span style={s.rowLabelPlain}>Home Appreciation</span>
              <span style={{ ...s.rowValuePlain, filter: isPro ? 'none' : 'blur(6px)' }}>
                {fmt(hec.appreciationGain)}
              </span>
            </div>
            <div style={{ ...s.row, ...s.subtotalRow }}>
              <span style={s.subtotalLabel}>Home Equity</span>
              <span style={{ ...s.subtotalValue, filter: isPro ? 'none' : 'blur(6px)' }}>
                {fmt(hec.total)}
              </span>
            </div>
          </div>
        )}

        {/* ── Investment Portfolio supporting detail ──────────────── */}
        {pc && (
          <div style={s.section}>
            <p style={s.sectionLabel}>Investment Portfolio</p>
            <div style={s.row}>
              <span style={s.rowLabelPlain}>Beginning Investment Balance</span>
              <span style={{ ...s.rowValuePlain, filter: isPro ? 'none' : 'blur(6px)' }}>
                {fmt(pc.startingPrincipal)}
              </span>
            </div>
            <div style={s.row}>
              <span style={s.rowLabelPlain}>Investment Growth</span>
              <span style={{ ...s.rowValuePlain, filter: isPro ? 'none' : 'blur(6px)' }}>
                {fmt(pc.investmentGrowth)}
              </span>
            </div>
            <div style={s.row}>
              <span style={s.rowLabelPlain}>New Contributions</span>
              <span style={{ ...s.rowValuePlain, filter: isPro ? 'none' : 'blur(6px)' }}>
                {fmt(pc.newContributions)}
              </span>
            </div>
            <div style={{ ...s.row, ...s.subtotalRow }}>
              <span style={s.subtotalLabel}>Investment Portfolio</span>
              <span style={{ ...s.subtotalValue, filter: isPro ? 'none' : 'blur(6px)' }}>
                {fmt(pc.total)}
              </span>
            </div>
          </div>
        )}

        {/* ── Definitions — plain-language concepts, no formulas ───── */}
        <button
          onClick={() => setLearnMoreOpen((v) => !v)}
          style={s.learnMoreToggle}
          aria-expanded={learnMoreOpen}
        >
          {learnMoreOpen ? 'Hide definitions' : 'What do these terms mean?'} {learnMoreOpen ? '▲' : '▼'}
        </button>
        {learnMoreOpen && (
          <div style={s.learnMoreBlock}>
            {hasHomeEquity && (
              <p style={s.learnMoreItem}>
                <strong>Home Equity</strong> — {LEARN_MORE.homeEquity}
              </p>
            )}
            <p style={s.learnMoreItem}>
              <strong>Investment Portfolio</strong> — {LEARN_MORE.investmentPortfolio}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Local styles ───────────────────────────
const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 400,
    background: 'rgba(19,15,15,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: theme.space.md,
  },
  card: {
    position: 'relative',
    background: theme.color.card,
    borderRadius: theme.radius.default,
    boxShadow: theme.shadow.default,
    border: `1px solid ${theme.color.line}`,
    maxWidth: '480px', width: '100%', maxHeight: '85vh',
    overflowY: 'auto',
    padding: theme.space.lg,
  },
  closeBtn: {
    position: 'absolute', top: '14px', right: '14px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '20px', lineHeight: 1, color: theme.color.muted,
  },
  eyebrow: {
    fontSize: theme.font.size.xs,
    color: theme.color.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: '600',
    margin: '0 0 4px',
  },
  scenarioLine: {
    fontSize: theme.font.size.sm,
    color: theme.color.ink,
    fontWeight: '600',
    margin: '0 0 16px',
  },
  heroBlock: {
    textAlign: 'center',
    background: theme.color.ink,
    borderRadius: theme.radius.default,
    padding: theme.space.md,
    marginBottom: theme.space.md,
  },
  heroLabel: {
    fontSize: theme.font.size.sm,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: '600',
    margin: '0 0 6px',
  },
  heroValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  section: {
    marginBottom: theme.space.md,
    paddingBottom: theme.space.sm,
    borderBottom: `1px solid ${theme.color.line}`,
  },
  sectionLabel: {
    fontSize: '11px',
    color: theme.color.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: '700',
    margin: '0 0 8px',
  },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '5px 0',
  },
  rowLabel: {
    fontSize: theme.font.size.base,
    fontWeight: '600',
    color: theme.color.ink,
  },
  rowValue: {
    fontSize: theme.font.size.md,
    fontWeight: '700',
    color: theme.color.ink,
    transition: 'filter 0.5s ease',
  },
  rowLabelPlain: {
    fontSize: theme.font.size.sm,
    color: theme.color.muted,
  },
  rowValuePlain: {
    fontSize: theme.font.size.base,
    fontWeight: '600',
    color: theme.color.ink,
    transition: 'filter 0.5s ease',
  },
  totalRow: {
    borderTop: `1px solid ${theme.color.line}`,
    marginTop: '4px',
    paddingTop: '10px',
  },
  totalLabel: {
    fontSize: theme.font.size.base,
    fontWeight: '700',
    color: theme.color.ink,
  },
  totalValue: {
    fontSize: theme.font.size.md,
    fontWeight: '800',
    color: theme.color.primary,
    transition: 'filter 0.5s ease',
  },
  subtotalRow: {
    borderTop: `1px solid ${theme.color.line}`,
    marginTop: '4px',
    paddingTop: '8px',
  },
  subtotalLabel: {
    fontSize: theme.font.size.sm,
    fontWeight: '700',
    color: theme.color.ink,
  },
  subtotalValue: {
    fontSize: theme.font.size.base,
    fontWeight: '700',
    color: theme.color.ink,
    transition: 'filter 0.5s ease',
  },
  learnMoreToggle: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: theme.color.primary,
    fontSize: theme.font.size.sm,
    fontWeight: '600',
    padding: 0,
    marginTop: theme.space.sm,
  },
  learnMoreBlock: {
    marginTop: theme.space.sm,
    padding: theme.space.sm,
    background: theme.color.soft,
    borderRadius: theme.radius.sm,
  },
  learnMoreItem: {
    fontSize: theme.font.size.sm,
    color: theme.color.muted,
    lineHeight: 1.5,
    margin: '0 0 8px',
  },
};
