// ============================================
// RealEquityIQ — Results Screen (Step 4)
//
// Displays simulation results with:
// - Net worth timeline (Year 1/3/5/10/20)
// - FREE (Years 1,3,5) / PRO (Years 10,20) badges
// - Conservative/Base/Optimistic bands
// - Teaching moments
// - Email unlock for free tier
// - Green confirmation banner after unlock
// ============================================

import { useState } from 'react';
import { theme, styles } from '../theme.js';
import RealtorCard from './RealtorCard.jsx';
import { useNarration } from '../lib/useNarration.js';
import NarrationControl from './NarrationControl.jsx';
import { NARRATION, resultsEntryClip } from '../lib/narrationRegistry.js';
import NetWorthBreakdownModal from './NetWorthBreakdownModal.jsx';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const SCENARIO_LABELS = {
  rent:      'Continue Renting',
  buy:       'Buy a Starter Home',
  househack: 'Buy a Duplex & House Hack',
  invest:    'Invest in Stock Market',
  wait:      'Wait for Lower Rates',
};

const SCENARIO_ICONS = {
  rent:      '🏢',
  buy:       '🏡',
  househack: '🏘️',
  invest:    '📈',
  wait:      '⏳',
};

const TEACHING_LABELS = {
  rent: [
    { key: 'totalRentPaid20',   label: 'Total rent paid (20 years)',   format: 'currency' },
    { key: 'portfolioAt20',     label: 'Portfolio value at year 20',   format: 'currency' },
    { key: 'portfolioAt10',     label: 'Portfolio value at year 10',   format: 'currency' },
  ],
  buy: [
    { key: 'equityAt20',        label: 'Total equity at year 20',      format: 'currency' },
    { key: 'appreciationGain20',label: 'Gained from appreciation',     format: 'currency' },
    { key: 'paydownGain20',     label: 'Gained from loan paydown',     format: 'currency' },
    { key: 'taxSavings20',      label: 'Mortgage tax savings',         format: 'currency' },
    { key: 'downPaymentOppCost',label: 'Down payment opportunity cost',format: 'currency' },
  ],
  househack: [
    { key: 'equityAt20',        label: 'Total equity at year 20',      format: 'currency' },
    { key: 'tenantContribution20', label: 'Tenant paid toward mortgage', format: 'currency' },
    { key: 'appreciationGain20',label: 'Gained from appreciation',     format: 'currency' },
    { key: 'leverageRatio',     label: 'Leverage ratio',               format: 'multiplier' },
  ],
  invest: [
    { key: 'portfolioAt20',     label: 'Portfolio value at year 20',   format: 'currency' },
    { key: 'portfolioAt10',     label: 'Portfolio value at year 10',   format: 'currency' },
    { key: 'totalRentPaid20',   label: 'Total rent paid (20 years)',   format: 'currency' },
    { key: 'investmentGain20',  label: 'Total investment gain',        format: 'currency' },
  ],
  wait: [
    { key: 'homePriceIncreaseWhileWaiting', label: 'Home price increase while waiting', format: 'currency' },
    { key: 'rentPaidWhileWaiting',          label: 'Rent paid while waiting',           format: 'currency' },
    { key: 'totalCostOfWaiting',            label: 'Total cost of waiting',             format: 'currency' },
    { key: 'monthsToBreakEven',             label: 'Months to break even',              format: 'number' },
  ],
};

// Which years are free vs pro
const FREE_YEARS = [1, 3, 5];
const PRO_YEARS  = [10, 20];

export default function ResultsScreen({ result, county, onRestart, onBack, currentTier = 'free', onUpgrade, comparisonRan = false, canDecide = false, onChoosePath }) {
  const [email, setEmail]           = useState('');
  const [unlocked, setUnlocked]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent]   = useState(false);
  const [error, setError]           = useState(null);
  const [breakdownYear, setBreakdownYear] = useState(null); // which year's Net Worth Breakdown modal is open, if any

  // A paying subscriber (pro / elite / elite_annual) sees everything.
  // Only the 'free' tier is gated behind the email-unlock + paywall flow.
  const isPro = currentTier !== 'free';

  // ── Guided narration ─────────────────────────────────────────────────────
  // ENTRY clip: plays once on mount, chosen by tier + whether a comparison ran.
  // (Free always enters "locked".) Autoplays if the audio session was unlocked
  // upstream by the Run My Simulation gesture; Listen/Replay is the fallback.
  const entryClip = resultsEntryClip({ isPro, comparisonRan });
  const entryNarration = useNarration(null, { audioSrc: entryClip, enabled: true });
  // EVENT clip: the "free unlock already spent" narration. NOT an entry state —
  // it's fired from the email-submit handler when the unlock comes back used.
  // mode/enabled tap-only so it never autoplays; we call .play() explicitly.
  const spentNarration = useNarration(null, { audioSrc: NARRATION.resultsFreeUnlockSpent, enabled: false });

  // Opens the pricing modal (passed down from App). Falls back gracefully if
  // not provided.
  function handleUpgradeClick() {
    if (onUpgrade) onUpgrade();
  }

  const scenarioKey   = result.scenario;
  const scenarioLabel = SCENARIO_LABELS[scenarioKey] || scenarioKey;
  const scenarioIcon  = SCENARIO_ICONS[scenarioKey] || '📊';
  const snapshots     = result.snapshots;
  const teaching      = result.summary?.teachingMoments || {};
  const teachingDefs  = TEACHING_LABELS[scenarioKey] || [];
  const composition   = result.summary?.netWorthComposition || null;

  const yr20   = snapshots.find(s => s.year === 20);
  const hasBand = ['buy', 'househack'].includes(scenarioKey) && yr20?.homeValue;

  // NOTE: the simulation save (insert into `simulations`) used to live here as a
  // mount effect. It moved to App's run flow via lib/saveSimulation so this
  // component stays pure (no supabase/auth) and so run-count milestones can be
  // awarded right after the row is written. This component now only displays.

  // ── Email unlock → edge function ────────────────────────────
  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
  `${SUPABASE_URL}/functions/v1/email-unlock`,
  {
    method:  'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      email,
      unlock_type: 'free_email',
    }),
  }
);

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        // The free unlock for this email is already spent → narrate the
        // upgrade/$1 message. (already_unlocked is the edge function's signal;
        // it returns 200 with success:false and the explanatory error text.)
        if (data.already_unlocked) {
          spentNarration.play();
        }
        return;
      }

      setEmailSent(true);
      setSubmitting(false);
      // Keep the "Check your email!" confirmation visible for ~3s
      // before un-blurring results (flipping `unlocked` unmounts the message).
      setTimeout(() => setUnlocked(true), 3000);

    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

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

      {/* Scenario header */}
      <div style={s.scenarioHeader}>
        <span style={s.scenarioIcon}>{scenarioIcon}</span>
        <div>
          <p style={s.scenarioLabel}>Simulation result</p>
          <h2 style={s.scenarioTitle}>{scenarioLabel}</h2>
          <p style={styles.helperText}>{county.name || county.county_name} County</p>
        </div>
      </div>

      {/* Hero card — Year 20, blurred for free, revealed for pro */}
      <div style={s.heroCard}>
        <p style={s.heroLabel}>Projected net worth at year 20</p>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <p style={{ ...s.heroValue, filter: isPro ? 'none' : 'blur(10px)', userSelect: isPro ? 'auto' : 'none' }}>
            ${yr20?.netWorth.toLocaleString()}
          </p>
          {!isPro && <div style={s.lockIcon}>🔒</div>}
        </div>
        <p style={s.heroUnlockHint}>
          {isPro
            ? 'Full results unlocked'
            : 'Unlock Years 1–5 free · Subscribe for full results'}
        </p>

        {/* Wealth Composition — answers "what does this total consist of"
            BEFORE the appreciation band / Key Insights answer "how was my
            home equity built." Sourced from summary.netWorthComposition,
            which is the exact homeEquity + investmentPortfolio pair that
            reconciles to the hero total above — see networth.js's
            buildWealthComposition(). Home Equity row is omitted (not shown
            as $0) for strategies that build none, per the same
            zero-vs-omit distinction used in the engine layer. */}
        {composition && (
          <div style={s.compositionWrap}>
            <p style={s.compositionLabel}>Net Worth Composition</p>
            <div style={s.compositionRows}>
              {composition.homeEquity > 0.5 && (
                <div style={s.compositionRow}>
                  <span style={s.compositionRowLabel}>
                    <span style={s.compositionIcon}>🏠</span> Home Equity
                  </span>
                  <span style={{
                    ...s.compositionRowValue,
                    filter: isPro ? 'none' : 'blur(7px)',
                  }}>
                    ${composition.homeEquity.toLocaleString()}
                  </span>
                </div>
              )}
              <div style={s.compositionRow}>
                <span style={s.compositionRowLabel}>
                  <span style={s.compositionIcon}>📈</span> Investment Portfolio
                </span>
                <span style={{
                  ...s.compositionRowValue,
                  filter: isPro ? 'none' : 'blur(7px)',
                }}>
                  ${composition.investmentPortfolio.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Appreciation band for buy/househack */}
        {hasBand && (
          <div style={s.bandRow}>
            <BandItem label="Conservative" value={yr20.homeValue?.conservative} unlocked={isPro} color={theme.color.success} />
            <BandItem label="Base"         value={yr20.homeValue?.base}         unlocked={isPro} color={theme.color.primary} highlight />
            <BandItem label="Optimistic"   value={yr20.homeValue?.optimistic}   unlocked={isPro} color={theme.color.warning} />
          </div>
        )}
      </div>

      {/* Pro full-access banner */}
      {isPro && (
        <div style={s.unlockedBanner}>
          <span style={{ fontSize: '16px' }}>✨</span>
          <p style={{ margin: 0, fontWeight: '600', color: '#166534' }}>
            Full results unlocked
          </p>
          <p style={{ margin: 0, fontSize: theme.font.size.sm, color: '#166534' }}>
            All years and key insights are visible with your subscription
          </p>
        </div>
      )}

      {/* Green confirmation banner — shown after free email unlock */}
      {!isPro && unlocked && (
        <div style={s.unlockedBanner}>
          <span style={{ fontSize: '16px' }}>✅</span>
          <p style={{ margin: 0, fontWeight: '600', color: '#166534' }}>
            Years 1, 3 & 5 unlocked!
          </p>
          <p style={{ margin: 0, fontSize: theme.font.size.sm, color: '#166534' }}>
            Subscribe to see Years 10, 20 and key insights
          </p>
        </div>
      )}

      {/* Net worth timeline */}
      <div style={styles.card}>
        <h3 style={{ ...styles.sectionHeading, marginBottom: '4px' }}>
          Net worth over time
        </h3>
        <p style={s.timelineInstruction}>
          Select any year or projected value to view its net worth breakdown.
        </p>

        {/* Scoped interactive-state styling for each clickable result row.
            Inline style objects can't express :hover/:focus-visible/:active,
            so this small scoped <style> block carries just those three
            pseudo-states — everything else about the row stays as ordinary
            inline styles, unchanged. Uses the app's existing primary color
            TOKEN via the --nw-primary custom property (set per-row below)
            rather than a new hardcoded color, and color-mix() so it works
            regardless of whether that token is hex/rgb/named. */}
        <style>{`
          .net-worth-result {
            cursor: pointer;
            border-radius: 10px;
            transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
          }
          .net-worth-result:hover,
          .net-worth-result:focus-visible {
            background: color-mix(in srgb, var(--nw-primary) 5%, transparent);
            box-shadow: 0 0 0 1px color-mix(in srgb, var(--nw-primary) 18%, transparent);
            outline: none;
          }
          .net-worth-result:active {
            transform: scale(0.99);
          }
        `}</style>

        {snapshots.map((snap, i) => {
          const isFree   = FREE_YEARS.includes(snap.year);
          const isProYr  = PRO_YEARS.includes(snap.year);
          // Pro subscribers see every year. Free users see free years only
          // after the email unlock.
          const revealed = isPro || (unlocked && isFree);
          const pct = yr20?.netWorth > 0
            ? Math.min((snap.netWorth / yr20.netWorth) * 100, 100)
            : 0;

          return (
            <button
              key={snap.year}
              type="button"
              className="net-worth-result"
              onClick={() => (revealed ? setBreakdownYear(snap.year) : handleUpgradeClick())}
              aria-label={
                revealed
                  ? `View ${scenarioLabel} net worth breakdown for Year ${snap.year}`
                  : `Unlock Year ${snap.year} results for ${scenarioLabel}`
              }
              style={{
                ...s.timelineRow,
                border: 'none',
                borderBottom: i < snapshots.length - 1 ? `1px solid ${theme.color.line}` : 'none',
                background: 'none',
                width: '100%',
                textAlign: 'left',
                font: 'inherit',
                margin: 0,
                '--nw-primary': theme.color.primary,
              }}
            >
              <div style={s.timelineYearCol}>
                <span style={s.timelineYear}>Year {snap.year}</span>
                {/* Tier badges only matter to free users deciding to upgrade */}
                {!isPro && isFree && (
                  <span style={s.badgeFree}>FREE</span>
                )}
                {!isPro && isProYr && (
                  <span style={s.badgePro}>PRO</span>
                )}
              </div>
              <div style={s.timelineBarWrap}>
                <div style={{
                  ...s.timelineBar,
                  width:      `${pct}%`,
                  background: snap.year === 20 ? theme.color.primary : theme.color.primaryLight,
                  opacity:    revealed ? 1 : 0.4,
                }} />
              </div>
              <span style={{
                ...s.timelineValue,
                filter:     revealed ? 'none' : 'blur(6px)',
                transition: 'filter 0.5s ease',
              }}>
                ${snap.netWorth.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Net Worth Breakdown modal — "what does this total consist of,"
          not "how is it calculated." Only opened for a revealed year
          (clicking a locked year nudges toward unlock/upgrade instead —
          see the row's onClick above), so it's never shown with blurred
          figures inside it. */}
      {breakdownYear != null && (
        <NetWorthBreakdownModal
          year={breakdownYear}
          snapshot={snapshots.find((s) => s.year === breakdownYear)}
          scenarioLabel={scenarioLabel}
          scenarioIcon={scenarioIcon}
          isPro={true}
          onClose={() => setBreakdownYear(null)}
        />
      )}

      {/* Key insights — PRO gated */}
      {teachingDefs.length > 0 && (
        <div style={{ ...styles.card, marginTop: theme.space.md }}>
          <div style={s.insightsHeader}>
            <h3 style={{ ...styles.sectionHeading, margin: 0 }}>Key insights</h3>
            {!isPro && <span style={s.badgePro}>PRO</span>}
          </div>
          <p style={{ ...styles.helperText, marginTop: 0, marginBottom: theme.space.sm }}>
            Context on how this strategy plays out — these figures are not
            additional components of the Projected Net Worth above; see
            "Net Worth Composition" for the full breakdown of that total.
          </p>
          {teachingDefs.map(def => {
            const raw = teaching[def.key];
            if (raw == null) return null;
            return (
              <div key={def.key} style={s.teachingRow}>
                <span style={styles.statLabel}>{def.label}</span>
                <span style={{
                  ...s.teachingValue,
                  filter:     isPro ? 'none' : 'blur(5px)',
                  transition: 'filter 0.5s ease',
                }}>
                  {formatValue(raw, def.format)}
                </span>
              </div>
            );
          })}
          {!isPro && (
            <button
              onClick={handleUpgradeClick}
              style={{ ...styles.btnPrimary, marginTop: theme.space.md }}
            >
              Subscribe to Unlock →
            </button>
          )}
        </div>
      )}

      {/* Email unlock card — only for free users who haven't unlocked yet */}
      {!isPro && !unlocked && (
        <div style={s.unlockCard}>
          <div style={s.unlockIcon}>🔓</div>
          <h3 style={s.unlockTitle}>Unlock Years 1, 3 & 5 — free</h3>
          <p style={{ ...styles.helperText, textAlign: 'center', marginBottom: theme.space.md }}>
            Enter your email and unlock your first three years of simulation results with a free one-time access code.
            No credit card required.
          </p>
          <p style={{ ...styles.helperText, textAlign: 'center', marginBottom: theme.space.md, fontWeight: '600' }}>
            Want Years 10, 20 and key insights? Upgrade to Pro.
          </p>

          {!emailSent ? (
            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ ...styles.input, marginBottom: '10px', textAlign: 'center' }}
              />
              {error && (
                <p style={{ color: theme.color.primary, fontSize: theme.font.size.sm, textAlign: 'center', margin: '0 0 10px' }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{ ...styles.btnPrimary, opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Sending...' : 'Unlock Years 1, 3 & 5 Free →'}
              </button>
            </form>
          ) : (
            <div style={s.sentBox}>
              <p style={{ fontSize: '24px', margin: '0 0 8px' }}>📬</p>
              <p style={{ fontWeight: '600', color: theme.color.ink, margin: '0 0 4px' }}>
                Check your email!
              </p>
              <p style={styles.helperText}>
                Your access code is on its way. Unlocking your results now...
              </p>
            </div>
          )}

          <p style={{ ...styles.helperText, textAlign: 'center', marginTop: theme.space.sm }}>
            Want full access?{' '}
            <span
              onClick={handleUpgradeClick}
              style={{ color: theme.color.primary, fontWeight: '600', cursor: 'pointer' }}
            >
              Upgrade to Pro →
            </span>
          </p>
        </div>
      )}

      {/* Realtor card */}
      <RealtorCard />

      {/* Disclaimer */}
      <div style={{ ...styles.disclaimer, marginTop: theme.space.md }}>
        <span style={{ fontSize: '13px', flexShrink: 0 }}>ℹ️</span>
        <p style={{ ...styles.helperText, margin: 0 }}>
          Results are based on county-level averages and standardized assumptions.
          This tool is intended for educational purposes and directional comparison only.
          Not financial advice.
        </p>
      </div>

      {/* Choose-my-path — gated on run_all_5 (canDecide). Advances to the
          Decision Handoff. Hidden until all distinct scenarios are run. */}
      {canDecide && typeof onChoosePath === 'function' && (
        <button onClick={onChoosePath} style={{ ...styles.btnPrimary, marginTop: theme.space.md }}>
          Choose my path →
        </button>
      )}

      {/* Start over */}
      <button onClick={onRestart} style={{ ...styles.btnGhost, marginTop: canDecide ? theme.space.sm : theme.space.md }}>
        Run Another Simulation
      </button>
    </div>
  );
}


// ── Sub-components ─────────────────────────

function BandItem({ label, value, unlocked, color, highlight }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <p style={{ ...styles.statLabel, marginBottom: '4px' }}>{label}</p>
      <p style={{
        fontSize:   highlight ? theme.font.size.md : theme.font.size.base,
        fontWeight: '700',
        color,
        margin:     0,
        filter:     unlocked ? 'none' : 'blur(5px)',
        transition: 'filter 0.5s ease',
      }}>
        ${value?.toLocaleString()}
      </p>
    </div>
  );
}


// ── Helpers ────────────────────────────────

function formatValue(val, format) {
  if (val == null) return '—';
  switch (format) {
    case 'currency':   return `$${Number(val).toLocaleString()}`;
    case 'multiplier': return `${val}x`;
    case 'number':     return Number(val).toLocaleString();
    default:           return val;
  }
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
  scenarioHeader: {
    display:      'flex',
    alignItems:   'center',
    gap:          '14px',
    marginBottom: theme.space.md,
  },
  scenarioIcon:  { fontSize: '36px', flexShrink: 0 },
  scenarioLabel: {
    fontSize:      theme.font.size.xs,
    color:         theme.color.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight:    '600',
    margin:        '0 0 2px',
  },
  scenarioTitle: {
    fontSize:      theme.font.size.lg,
    fontWeight:    '700',
    color:         theme.color.ink,
    margin:        '0 0 2px',
    letterSpacing: '-0.01em',
  },
  heroCard: {
    background:   theme.color.ink,
    borderRadius: theme.radius.default,
    padding:      theme.space.lg,
    textAlign:    'center',
    marginBottom: theme.space.md,
    position:     'relative',
  },
  heroLabel: {
    fontSize:      theme.font.size.sm,
    color:         'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight:    '600',
    margin:        '0 0 8px',
  },
  heroValue: {
    fontSize:      '42px',
    fontWeight:    '800',
    color:         '#ffffff',
    margin:        '0',
    letterSpacing: '-0.02em',
  },
  heroUnlockHint: {
    fontSize:   theme.font.size.sm,
    color:      'rgba(255,255,255,0.45)',
    margin:     '12px 0 0',
    fontWeight: '500',
  },
  lockIcon: {
    position:  'absolute',
    top:       '50%',
    left:      '50%',
    transform: 'translate(-50%, -50%)',
    fontSize:  '28px',
  },
  bandRow: {
    display:        'flex',
    justifyContent: 'space-between',
    marginTop:      theme.space.md,
    paddingTop:     theme.space.md,
    borderTop:      '1px solid rgba(255,255,255,0.1)',
    gap:            '8px',
  },
  compositionWrap: {
    marginTop:  theme.space.md,
    paddingTop: theme.space.md,
    borderTop:  '1px solid rgba(255,255,255,0.1)',
  },
  compositionLabel: {
    fontSize:      theme.font.size.sm,
    color:         'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight:    '600',
    margin:        '0 0 10px',
    textAlign:     'center',
  },
  compositionRows: { display: 'flex', flexDirection: 'column', gap: '8px' },
  compositionRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    gap:            '12px',
  },
  compositionRowLabel: {
    display:    'inline-flex',
    alignItems: 'center',
    gap:        '8px',
    fontSize:   theme.font.size.sm,
    fontWeight: '600',
    color:      'rgba(255,255,255,0.85)',
  },
  compositionIcon: { fontSize: '16px' },
  compositionRowValue: {
    fontSize:      theme.font.size.md,
    fontWeight:    '700',
    color:         '#ffffff',
    letterSpacing: '-0.01em',
    transition:    'filter 0.5s ease',
  },
  unlockedBanner: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '4px',
    background:    '#dcfce7',
    border:        '1.5px solid #86efac',
    borderRadius:  theme.radius.sm,
    padding:       '14px 20px',
    marginBottom:  theme.space.md,
    textAlign:     'center',
  },
  timelineInstruction: {
    fontSize: theme.font.size.sm,
    color: theme.color.muted,
    margin: '0 0 12px',
  },
  timelineRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
    padding:    '12px 0',
  },
  timelineYearCol: {
    display:    'flex',
    flexDirection: 'column',
    gap:        '4px',
    minWidth:   '52px',
    flexShrink: 0,
  },
  timelineYear: {
    fontSize:   theme.font.size.sm,
    color:      theme.color.muted,
    fontWeight: '600',
  },
  badgeFree: {
    display:        'inline-block',
    fontSize:       '10px',
    fontWeight:     '700',
    color:          '#166534',
    background:     '#dcfce7',
    border:         '1px solid #86efac',
    borderRadius:   '4px',
    padding:        '1px 6px',
    letterSpacing:  '0.04em',
  },
  badgePro: {
    display:       'inline-block',
    fontSize:      '10px',
    fontWeight:    '700',
    color:         '#991b1b',
    background:    '#fee2e2',
    border:        '1px solid #fca5a5',
    borderRadius:  '4px',
    padding:       '1px 6px',
    letterSpacing: '0.04em',
  },
  timelineBarWrap: {
    flex:         1,
    height:       '6px',
    background:   theme.color.soft,
    borderRadius: '3px',
    overflow:     'hidden',
  },
  timelineBar: {
    height:       '100%',
    borderRadius: '3px',
    transition:   'width 0.6s ease',
  },
  timelineValue: {
    fontSize:   theme.font.size.base,
    fontWeight: '700',
    color:      theme.color.ink,
    minWidth:   '110px',
    textAlign:  'right',
    flexShrink: 0,
  },
  insightsHeader: {
    display:     'flex',
    alignItems:  'center',
    gap:         '8px',
    marginBottom: theme.space.md,
  },
  teachingRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        '10px 0',
    borderBottom:   `1px solid ${theme.color.line}`,
  },
  teachingValue: {
    fontSize:   theme.font.size.base,
    fontWeight: '700',
    color:      theme.color.ink,
  },
  unlockCard: {
    background:   theme.color.card,
    borderRadius: theme.radius.default,
    border:       `2px solid ${theme.color.lineStrong}`,
    padding:      theme.space.lg,
    textAlign:    'center',
    marginTop:    theme.space.md,
    boxShadow:    theme.shadow.default,
  },
  unlockIcon:  { fontSize: '32px', marginBottom: '8px' },
  unlockTitle: {
    fontSize:   theme.font.size.lg,
    fontWeight: '700',
    color:      theme.color.ink,
    margin:     '0 0 8px',
  },
  sentBox: {
    padding:      theme.space.md,
    background:   theme.color.soft,
    borderRadius: theme.radius.sm,
    textAlign:    'center',
  },
};