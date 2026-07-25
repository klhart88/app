// ============================================
// RealEquityIQ — Comparison Results Screen
//
// Side-by-side projection of a comparison run: the PRIMARY path plus 1–2
// SECONDARY paths, simulated against identical inputs. Results-only — no path
// commitment here (the user may still be exploring / running more scenarios).
// The Decision/commitment handoff is a separate, later step.
//
// Structure (per the agreed design):
//   1. UNIVERSAL aligned section — the one thing every scenario shares:
//        • Year-20 projected net worth, one row per path
//        • Net-worth-over-time timeline, paths in columns
//      This is the heart of the comparison and works for ANY mix of paths.
//   2. PER-PATH insights — each path's OWN teaching moments, as full-width
//      stacked labeled blocks (robust at 2 OR 3 paths; rows differ per path,
//      so they are NOT force-aligned into a shared table).
//
// Pure presentation: no supabase, no auth, no saving. App owns the data.
// Renders only when there are 2–3 paths; App routes single-path runs to the
// normal ResultsScreen.
// ============================================

import { useState } from 'react';
import { theme, styles } from '../theme.js';
import { useNarration } from '../lib/useNarration.js';
import NarrationControl from './NarrationControl.jsx';
import { resultsEntryClip } from '../lib/narrationRegistry.js';
import NetWorthBreakdownModal from './NetWorthBreakdownModal.jsx';

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

// Per-scenario "key insights" — same definitions the single-path ResultsScreen
// uses, so a path shows the SAME insights whether viewed alone or compared.
const TEACHING_LABELS = {
  rent: [
    { key: 'totalRentPaid20',   label: 'Total rent paid (20 years)',   format: 'currency' },
    { key: 'portfolioAt20',     label: 'Portfolio value at year 20',   format: 'currency' },
    { key: 'portfolioAt10',     label: 'Portfolio value at year 10',   format: 'currency' },
  ],
  buy: [
    { key: 'equityAt20',         label: 'Total equity at year 20',       format: 'currency' },
    { key: 'appreciationGain20', label: 'Gained from appreciation',      format: 'currency' },
    { key: 'paydownGain20',      label: 'Gained from loan paydown',      format: 'currency' },
    { key: 'taxSavings20',       label: 'Mortgage tax savings',          format: 'currency' },
    { key: 'downPaymentOppCost', label: 'Down payment opportunity cost', format: 'currency' },
  ],
  househack: [
    { key: 'equityAt20',           label: 'Total equity at year 20',     format: 'currency' },
    { key: 'tenantContribution20', label: 'Tenant paid toward mortgage', format: 'currency' },
    { key: 'appreciationGain20',   label: 'Gained from appreciation',    format: 'currency' },
    { key: 'leverageRatio',        label: 'Leverage ratio',              format: 'multiplier' },
  ],
  invest: [
    { key: 'portfolioAt20',    label: 'Portfolio value at year 20', format: 'currency' },
    { key: 'portfolioAt10',    label: 'Portfolio value at year 10', format: 'currency' },
    { key: 'totalRentPaid20',  label: 'Total rent paid (20 years)', format: 'currency' },
    { key: 'investmentGain20', label: 'Total investment gain',      format: 'currency' },
  ],
  wait: [
    { key: 'homePriceIncreaseWhileWaiting', label: 'Home price increase while waiting', format: 'currency' },
    { key: 'rentPaidWhileWaiting',          label: 'Rent paid while waiting',           format: 'currency' },
    { key: 'totalCostOfWaiting',            label: 'Total cost of waiting',             format: 'currency' },
    { key: 'monthsToBreakEven',             label: 'Months to break even',              format: 'number' },
  ],
};

const TIMELINE_YEARS = [1, 3, 5, 10, 20];

// Roles in [primary, ...secondaries] order. Primary is visually distinguished.
function roleLabel(i) {
  return i === 0 ? 'Primary' : 'Alternative';
}

export default function ComparisonResultsScreen({
  comparison,           // [{ scenarioKey, result }, ...] length 2–3
  county,
  onBack,
  onRestart,
  currentTier = 'free',
  canDecide = false,    // run_all_5 met → offer the Decision Handoff
  onChoosePath,         // () => void — advance to the Decision Handoff
}) {
  const isPro = currentTier !== 'free';

  // ── Guided narration ─────────────────────────────────────────────────────
  // This screen is, by definition, a comparison — so comparisonRan is always
  // true. resultsEntryClip picks the right clip for the tier: a Pro user gets
  // results-pro-compare; a free user gets the locked-entry clip. Mirrors the
  // single-result ResultsScreen wiring. Autoplays if the audio session was
  // unlocked upstream (the Run My Simulation gesture); Listen is the fallback.
  const entryClip = resultsEntryClip({ isPro, comparisonRan: true });
  const entryNarration = useNarration(null, { audioSrc: entryClip, enabled: true });

  // Which path+year's Net Worth Breakdown modal is open, if any. Declared
  // here (before the early-return guard below) rather than after it, since
  // hooks must run unconditionally on every render — declaring state after
  // a conditional return caused a real crash elsewhere in this app when
  // that rule was violated (see JourneyMap.jsx's history).
  const [breakdown, setBreakdown] = useState(null); // { pathKey, year } | null

  // Defensive: this screen is for 2–3 paths. If somehow handed <2, render
  // nothing rather than a broken single column (App should route to
  // ResultsScreen in that case).
  if (!Array.isArray(comparison) || comparison.length < 2) return null;

  const paths = comparison.map(({ scenarioKey, result }, i) => {
    const yr20 = result.snapshots?.find((s) => s.year === 20);
    return {
      i,
      key:    scenarioKey,
      role:   roleLabel(i),
      label:  SCENARIO_LABELS[scenarioKey] || scenarioKey,
      icon:   SCENARIO_ICONS[scenarioKey] || '📊',
      result,
      snapshots: result.snapshots || [],
      yr20NetWorth: yr20?.netWorth ?? null,
    };
  });

  // Largest Year-20 net worth across paths → used to scale the timeline bars on
  // a SHARED axis so the columns are visually comparable (the whole point).
  const globalMaxNetWorth = Math.max(
    1,
    ...paths.flatMap((p) => p.snapshots.map((s) => s.netWorth || 0)),
  );

  // Which path leads at Year 20 — a quiet, factual marker (not a recommendation;
  // commitment happens later in the Decision step).
  const leaderIdx = paths.reduce(
    (best, p, idx) => (p.yr20NetWorth > (paths[best]?.yr20NetWorth ?? -Infinity) ? idx : best),
    0,
  );

  const colCount = paths.length;

  return (
    <div>
      {/* Back button + guided-narration control */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={s.backBtn}>← Back</button>
        {entryNarration.supported && (
          <NarrationControl
            status={entryNarration.status}
            supported={entryNarration.supported}
            onPlay={entryNarration.play}
            onReplay={entryNarration.replay}
            onStop={entryNarration.stop}
            label="Listen"
          />
        )}
      </div>

      {/* Header */}
      <div style={{ marginBottom: theme.space.md }}>
        <p style={s.eyebrow}>Side-by-side comparison</p>
        <h2 style={s.title}>
          {colCount === 2 ? 'Two paths, compared' : 'Three paths, compared'}
        </h2>
        <p style={styles.helperText}>{county?.name || county?.county_name} County · identical inputs</p>
      </div>

      {/* ── UNIVERSAL: Year-20 net worth per path (dark hero, multi-row) ─────── */}
      <div style={s.heroCard}>
        <p style={s.heroLabel}>Projected net worth at year 20</p>
        <div style={s.heroRows}>
          {paths.map((p) => (
            <div key={p.key} style={s.heroRow}>
              <span style={s.heroRowLabel}>
                <span style={s.heroIcon}>{p.icon}</span>
                <span style={s.heroRoleStack}>
                  <span style={s.heroRole}>{p.role}</span>
                  <span style={s.heroPathName}>{p.label}</span>
                </span>
              </span>
              <span style={{
                ...s.heroValue,
                filter: isPro ? 'none' : 'blur(9px)',
                userSelect: isPro ? 'auto' : 'none',
                color: p.i === leaderIdx ? '#fff' : 'rgba(255,255,255,0.82)',
              }}>
                {p.yr20NetWorth != null ? `$${p.yr20NetWorth.toLocaleString()}` : '—'}
                {isPro && p.i === leaderIdx && colCount > 1 && (
                  <span style={s.leadTag}>highest</span>
                )}
              </span>
            </div>
          ))}
        </div>
        <p style={s.heroHint}>
          {isPro ? 'Full results unlocked' : 'Subscribe to reveal full projections'}
        </p>
      </div>

      {/* ── UNIVERSAL: net-worth-over-time, paths in columns ────────────────── */}
      <div style={{ ...styles.card, marginTop: theme.space.md }}>
        <h3 style={{ ...styles.sectionHeading, textAlign: 'center', marginBottom: '4px' }}>
          Net worth over time
        </h3>
        <p style={s.timelineInstruction}>
          Select any year or projected value to view its net worth breakdown.
        </p>

        {/* Scoped interactive-state styling — see the identical block's
            comment in ResultsScreen.jsx for why this can't just be inline
            styles (no :hover/:focus-visible/:active there) and why it uses
            the --nw-primary custom property + color-mix() instead of a new
            hardcoded color. Distinct class name from ResultsScreen's
            (net-worth-result-cell vs. net-worth-result) purely to avoid any
            collision if both screens are ever mounted together — the
            visual treatment is identical. */}
        <style>{`
          .net-worth-result-cell {
            cursor: pointer;
            border-radius: 8px;
            transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
          }
          .net-worth-result-cell:hover,
          .net-worth-result-cell:focus-visible {
            background: color-mix(in srgb, var(--nw-primary) 5%, transparent);
            box-shadow: 0 0 0 1px color-mix(in srgb, var(--nw-primary) 18%, transparent);
            outline: none;
          }
          .net-worth-result-cell:active {
            transform: scale(0.99);
          }
        `}</style>

        {/* Column header: path roles */}
        <div style={{ ...s.timelineGrid(colCount), marginBottom: '8px' }}>
          <span />
          {paths.map((p) => (
            <span key={p.key} style={s.colHead}>
              <span style={s.colHeadRole}>{p.role}</span>
              <span style={s.colHeadName}>{p.label}</span>
            </span>
          ))}
        </div>

        {TIMELINE_YEARS.map((yr) => {
          const isFree = yr <= 5; // years 1/3/5 free, 10/20 pro
          const show = isPro || isFree;
          return (
            <div key={yr} style={{ ...s.timelineGrid(colCount), ...s.timelineRow }}>
              <span style={s.timelineYear}>Year {yr}</span>
              {paths.map((p) => {
                const snap = p.snapshots.find((sn) => sn.year === yr);
                const nw = snap?.netWorth ?? null;
                const pct = nw != null ? Math.max(2, Math.round((nw / globalMaxNetWorth) * 100)) : 0;
                return (
                  <button
                    key={p.key}
                    type="button"
                    className="net-worth-result-cell"
                    onClick={() => show && setBreakdown({ pathKey: p.key, year: yr })}
                    disabled={!show}
                    aria-label={`View ${p.label} net worth breakdown for Year ${yr}`}
                    style={{
                      ...s.timelineCell,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      font: 'inherit',
                      textAlign: 'left',
                      cursor: show ? 'pointer' : 'default',
                      '--nw-primary': theme.color.primary,
                    }}
                  >
                    <span style={s.barWrap}>
                      <span style={{
                        ...s.bar,
                        width: `${pct}%`,
                        background: p.i === leaderIdx ? theme.color.primary : 'rgba(196,0,0,0.5)',
                      }} />
                    </span>
                    <span style={{
                      ...s.cellValue,
                      filter: show ? 'none' : 'blur(5px)',
                    }}>
                      {nw != null ? `$${nw.toLocaleString()}` : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── PER-PATH insights: each path's OWN teaching moments, stacked ────── */}
      <div style={{ marginTop: theme.space.md }}>
        <h3 style={{ ...styles.sectionHeading, marginBottom: theme.space.sm }}>
          What each path is made of
        </h3>
        <p style={{ ...styles.helperText, marginTop: 0, marginBottom: theme.space.sm }}>
          Each card opens with the exact breakdown of that path's total —
          Home Equity and Investment Portfolio. Everything below "Net Worth
          Composition" is context on how that strategy plays out, not
          additional components of the total.
        </p>
        {paths.map((p) => {
          const defs = TEACHING_LABELS[p.key] || [];
          const teaching = p.result.summary?.teachingMoments || {};
          const composition = p.result.summary?.netWorthComposition || null;
          const rows = defs.filter((d) => teaching[d.key] != null);
          if (rows.length === 0 && !composition) return null;
          return (
            <div key={p.key} style={{ ...styles.card, marginBottom: theme.space.sm }}>
              <div style={s.insightHead}>
                <span style={s.heroIcon}>{p.icon}</span>
                <span style={s.insightHeadStack}>
                  <span style={s.colHeadRole}>{p.role}</span>
                  <span style={s.insightPathName}>{p.label}</span>
                </span>
              </div>

              {/* Wealth Composition — answers "what does this total consist
                  of" before the rows below answer "how was it built."
                  Home Equity row omitted (not $0) for paths that build none. */}
              {composition && (
                <div style={s.compositionBlock}>
                  <p style={s.compositionBlockLabel}>Net Worth Composition</p>
                  {composition.homeEquity > 0.5 && (
                    <div style={s.compositionBlockRow}>
                      <span style={s.compositionBlockRowLabel}>🏠 Home Equity</span>
                      <span style={{
                        ...s.compositionBlockRowValue,
                        filter: isPro ? 'none' : 'blur(5px)',
                      }}>
                        ${composition.homeEquity.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div style={s.compositionBlockRow}>
                    <span style={s.compositionBlockRowLabel}>📈 Investment Portfolio</span>
                    <span style={{
                      ...s.compositionBlockRowValue,
                      filter: isPro ? 'none' : 'blur(5px)',
                    }}>
                      ${composition.investmentPortfolio.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {rows.map((d) => (
                <div key={d.key} style={s.insightRow}>
                  <span style={styles.statLabel}>{d.label}</span>
                  <span style={{
                    ...s.insightValue,
                    filter: isPro ? 'none' : 'blur(5px)',
                  }}>
                    {formatValue(teaching[d.key], d.format)}
                  </span>
                </div>
              ))}
              {/* Dynamic disclaimer #1 — house-hack only. Explains WHY this path
                  lands where it does, adapting to whether the duplex cash-flows.
                  Driven by the engine's summary.cashFlows / surplusMonthly. */}
              {p.key === 'househack' && (() => {
                const sum = p.result.summary || {};
                const rent = Math.round(sum.grossRentalIncome ?? sum.derivedRentalIncome ?? 0);
                const surplus = Math.round(sum.surplusMonthly ?? 0);
                const ratioPct = ((sum.rentToPriceRatio ?? 0) * 100).toFixed(1);
                const flows = !!sum.cashFlows;
                return (
                  <div style={{
                    ...s.hhNote,
                    background: flows ? 'rgba(26,107,60,0.07)' : theme.color.soft,
                    borderColor: flows ? 'rgba(26,107,60,0.25)' : theme.color.line,
                  }}>
                    <span style={{ flexShrink: 0 }}>{flows ? '✅' : '⚠️'}</span>
                    <span style={s.hhNoteText}>
                      {flows ? (
                        <>This duplex cash-flows. The tenant unit rents for an
                        estimated ${rent.toLocaleString()}/mo (≈{ratioPct}% of half
                        the property value), covering enough that you invest about
                        ${surplus.toLocaleString()}/mo beyond your housing budget —
                        that invested surplus is what builds wealth here.</>
                      ) : (
                        <>At this purchase price and these local rents, the tenant
                        unit (est. ${rent.toLocaleString()}/mo, ≈{ratioPct}% of half
                        the property value) doesn't fully offset your costs, so
                        there's no surplus to invest and this tracks a plain purchase.
                        House-hacking builds the most wealth at a lower purchase price
                        or in a higher-rent area.</>
                      )}
                    </span>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Results-only footer — explicitly NOT a commitment. */}
      <div style={{ ...styles.disclaimer, marginTop: theme.space.md }}>
        <span style={{ fontSize: '13px', flexShrink: 0 }}>ℹ️</span>
        <p style={{ ...styles.helperText, margin: 0 }}>
          A side-by-side projection on identical inputs — explore freely. You can run
          more scenarios before choosing a path. County-level averages, directional
          only. Not financial advice.
        </p>
      </div>

      {/* Disclaimer #2 — methodology note, only when house-hack is in the mix. */}
      {paths.some((p) => p.key === 'househack') && (
        <div style={{ ...styles.disclaimer, marginTop: theme.space.sm }}>
          <span style={{ fontSize: '13px', flexShrink: 0 }}>🏘️</span>
          <p style={{ ...styles.helperText, margin: 0 }}>
            House-hack is modeled as cash-flow optimization: the tenant's rent lowers
            your monthly cost, and any surplus within a standard 28%-of-income housing
            budget is invested. It does not assume extra mortgage prepayment. Tenant
            rent is estimated from the purchase price, so results depend heavily on
            price and local rents.
          </p>
        </div>
      )}

      {/* Choose-my-path — gated on run_all_5 (canDecide). Advances to the
          Decision Handoff. Hidden until all distinct scenarios are run, so path
          commitment can't outrun the journey's stage unlocks. */}
      {canDecide && typeof onChoosePath === 'function' && (
        <button onClick={onChoosePath} style={{ ...styles.btnPrimary, marginTop: theme.space.md }}>
          Choose my path →
        </button>
      )}

      <button onClick={onRestart} style={{ ...styles.btnGhost, marginTop: theme.space.sm }}>
        Run another scenario
      </button>

      {/* Net Worth Breakdown modal — opened from an individual path+year
          cell in the timeline above. Only reachable when that cell was
          `show`-revealed, so it never displays blurred data. */}
      {breakdown && (() => {
        const p = paths.find((pp) => pp.key === breakdown.pathKey);
        const snap = p?.snapshots.find((sn) => sn.year === breakdown.year);
        return (
          <NetWorthBreakdownModal
            year={breakdown.year}
            snapshot={snap}
            scenarioLabel={p?.label}
            scenarioIcon={p?.icon}
            isPro={true}
            onClose={() => setBreakdown(null)}
          />
        );
      })()}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatValue(val, format) {
  if (val == null) return '—';
  switch (format) {
    case 'currency':   return `$${Number(val).toLocaleString()}`;
    case 'multiplier': return `${val}x`;
    case 'number':     return Number(val).toLocaleString();
    default:           return val;
  }
}

// ── Local styles ─────────────────────────────────────────────────────────────
// Reuses the app's tokens (theme/styles) so this reads as the SAME product as
// the single-path ResultsScreen, just structured for N paths.

const s = {
  backBtn: {
    background: theme.color.soft,
    border: `1.5px solid ${theme.color.line}`,
    borderRadius: theme.radius.xs,
    color: theme.color.ink,
    fontSize: theme.font.size.sm,
    cursor: 'pointer',
    padding: '8px 16px',
    fontWeight: '600',
    marginBottom: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  eyebrow: {
    fontSize: theme.font.size.xs,
    color: theme.color.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: '600',
    margin: '0 0 2px',
  },
  title: {
    fontSize: theme.font.size.lg,
    fontWeight: '700',
    color: theme.color.ink,
    margin: '0 0 2px',
    letterSpacing: '-0.01em',
  },

  // Hero (dark) — multi-row Year-20 net worth
  heroCard: {
    background: theme.color.ink,
    borderRadius: theme.radius.default,
    padding: theme.space.lg,
    marginBottom: theme.space.md,
  },
  heroLabel: {
    fontSize: theme.font.size.sm,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: '600',
    margin: '0 0 14px',
    textAlign: 'center',
  },
  heroRows: { display: 'flex', flexDirection: 'column', gap: '10px' },
  heroRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  heroRowLabel: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  heroIcon: { fontSize: '22px', flexShrink: 0 },
  heroRoleStack: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  heroRole: {
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  heroPathName: {
    fontSize: theme.font.size.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  heroValue: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: '-0.02em',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  leadTag: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: theme.color.ink,
    background: '#fff',
    borderRadius: '4px',
    padding: '2px 6px',
  },
  heroHint: {
    fontSize: theme.font.size.sm,
    color: 'rgba(255,255,255,0.45)',
    margin: '12px 0 0',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Timeline grid — label column + N path columns. Responsive: the value text
  // shrinks the bar at 3-up but the grid keeps columns equal.
  timelineGrid: (n) => ({
    display: 'grid',
    gridTemplateColumns: `52px repeat(${n}, 1fr)`,
    gap: '10px',
    alignItems: 'center',
  }),
  colHead: { display: 'flex', flexDirection: 'column', textAlign: 'center' },
  colHeadRole: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: theme.color.muted,
  },
  colHeadName: {
    fontSize: theme.font.size.sm,
    fontWeight: '700',
    color: theme.color.ink,
    lineHeight: 1.2,
  },
  timelineInstruction: {
    fontSize: theme.font.size.sm,
    color: theme.color.muted,
    textAlign: 'center',
    margin: '0 0 12px',
  },
  timelineRow: { padding: '10px 0', borderTop: `1px solid ${theme.color.line}` },
  timelineYear: {
    fontSize: theme.font.size.sm,
    color: theme.color.muted,
    fontWeight: '600',
  },
  timelineCell: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
  barWrap: {
    height: '6px',
    background: theme.color.soft,
    borderRadius: '3px',
    overflow: 'hidden',
    width: '100%',
  },
  bar: { display: 'block', height: '100%', borderRadius: '3px', transition: 'width 0.6s ease' },
  cellValue: {
    fontSize: theme.font.size.sm,
    fontWeight: '700',
    color: theme.color.ink,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    transition: 'filter 0.5s ease',
  },

  // Per-path insight blocks
  // Dynamic house-hack cash-flow note
  hhNote: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    marginTop: theme.space.sm,
    padding: '10px 12px',
    borderRadius: theme.radius.xs,
    border: '1px solid',
    fontSize: theme.font.size.sm,
  },
  hhNoteText: { color: theme.color.ink, lineHeight: 1.45 },

  insightHead: {    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: theme.space.sm,
    paddingBottom: theme.space.sm,
    borderBottom: `1px solid ${theme.color.line}`,
  },
  compositionBlock: {
    marginBottom: theme.space.sm,
    paddingBottom: theme.space.sm,
    borderBottom: `1px solid ${theme.color.line}`,
  },
  compositionBlockLabel: {
    fontSize:      '11px',
    color:         theme.color.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight:    '600',
    margin:        '0 0 8px',
  },
  compositionBlockRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        '4px 0',
  },
  compositionBlockRowLabel: {
    fontSize:   theme.font.size.sm,
    fontWeight: '600',
    color:      theme.color.ink,
  },
  compositionBlockRowValue: {
    fontSize:      theme.font.size.base,
    fontWeight:    '700',
    color:         theme.color.ink,
    transition:    'filter 0.5s ease',
  },
  insightHeadStack: { display: 'flex', flexDirection: 'column' },
  insightPathName: {
    fontSize: theme.font.size.base,
    fontWeight: '700',
    color: theme.color.ink,
  },
  insightRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${theme.color.line}`,
  },
  insightValue: {
    fontSize: theme.font.size.base,
    fontWeight: '700',
    color: theme.color.ink,
    transition: 'filter 0.5s ease',
  },
};