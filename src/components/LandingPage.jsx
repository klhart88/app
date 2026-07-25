import { theme } from '../theme.js';

const PILLS = [
  { label: 'Rent vs. Buy',   color: { bg: '#fff2f2', text: '#9d0000' } },
  { label: 'House Hacking',  color: { bg: '#d6efe1', text: '#1a6b3c' } },
  { label: 'Stock Market',   color: { bg: '#e8f4fd', text: '#1b4f8c' } },
  { label: 'Wait for Rates', color: { bg: '#fde8d0', text: '#c05a00' } },
];

const STATS = [
  { number: '92',   label: 'Counties covered' },
  { number: '5',    label: 'Scenarios modeled' },
  { number: '20yr', label: 'Net worth projection' },
];

const STEPS = [
  'Pick a county, choose a path.',
  'Run a 20-year simulation.',
];

export default function LandingPage({ onStart }) {
  return (
    <div style={s.page}>

      {/* Right panel */}
      <div style={s.rightPanel} aria-hidden="true">
        <svg viewBox="0 0 340 520" xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
          preserveAspectRatio="xMaxYMin meet">
          <rect x="16"  y="250" width="44" height="180" rx="4" fill="#c40000" opacity="0.09"/>
          <rect x="70"  y="200" width="44" height="230" rx="4" fill="#c40000" opacity="0.07"/>
          <rect x="124" y="130" width="44" height="300" rx="4" fill="#c40000" opacity="0.10"/>
          <rect x="178" y="170" width="44" height="260" rx="4" fill="#c40000" opacity="0.07"/>
          <rect x="232" y="90"  width="44" height="340" rx="4" fill="#c40000" opacity="0.13"/>
          <rect x="286" y="120" width="44" height="310" rx="4" fill="#c40000" opacity="0.09"/>
          <polyline points="38,250 92,200 146,130 200,170 254,90 308,120"
            fill="none" stroke="#c40000" strokeWidth="2" opacity="0.25"
            strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="254" cy="90"  r="5"   fill="#c40000" opacity="0.45"/>
          <circle cx="146" cy="130" r="3.5" fill="#c40000" opacity="0.3"/>
        </svg>
      </div>

      {/* Left panel */}
      <div style={s.leftPanel}>

        {/* Logo row */}
        <div style={s.logoRow}>
          <div style={s.logoBox}>R</div>
          <span style={s.logoText}>
            RealEquity<span style={{ color: theme.color.primary }}>IQ</span>
          </span>
        </div>

        {/* Tagline — flush left, outside logo row */}
        <p style={{ ...s.tagline, textAlign: 'left', marginLeft: 0, paddingLeft: 0 }}>Real - world insights for smarter real estate decisions.</p>

        {/* Headline */}
        <h1 style={s.headline}>
          See exactly what your housing decision does to your net worth.
        </h1>

        {/* Sub */}
        <p style={s.sub}>
          Pick a county, choose your path, and run a 20-year financial simulation — free to start.
        </p>

        {/* Scenario pills — 2x2 grid */}
        <div style={s.pillGrid}>
          {PILLS.map(pill => (
            <span
              key={pill.label}
              style={{ ...s.pill, background: pill.color.bg, color: pill.color.text }}
            >
              {pill.label}
            </span>
          ))}
        </div>

        {/* CTA — centered under pill grid */}
        <div style={s.btnWrap}>
          <button onClick={onStart} style={s.btn}>
            Run My Simulation
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* How it works — black feature panel (sibling-style structural anchor) */}
        <div style={s.howPanel}>
          <p style={s.howTitle}>How it works</p>
          {STEPS.map((step, i) => (
            <div key={i} style={{ ...s.howStep, marginBottom: i < STEPS.length - 1 ? '10px' : 0 }}>
              <span style={s.howNum}>{i + 1}</span>
              <span style={s.howText}>{step}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          {STATS.map((stat, i) => (
            <div key={stat.label} style={{
              ...s.stat,
              borderLeft: i > 0 ? `1px solid ${theme.color.line}` : 'none',
              paddingLeft: i > 0 ? '24px' : '0',
            }}>
              <p style={s.statNum}>{stat.number}</p>
              <p style={s.statLabel}>{stat.label}</p>
            </div>
          ))}
        </div>

      </div>

      <div style={s.badge}>Free to start</div>
    </div>
  );
}

const s = {
  page: {
    position: 'relative', minHeight: '520px',
    background: theme.color.card, borderRadius: theme.radius.default,
    overflow: 'hidden', display: 'flex',
    borderTop: `3px solid ${theme.color.primary}`,  // red top-bar accent (sibling-style)
  },
  rightPanel: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: '44%', background: `linear-gradient(90deg, ${theme.color.card} 0%, ${theme.color.soft} 45%)`, overflow: 'hidden',
  },
  leftPanel: {
    position: 'relative', zIndex: 2,
    padding: '40px 40px 44px', maxWidth: '520px', width: '100%',
  },
  logoRow: {
    display: 'flex', alignItems: 'center',
    gap: '8px', flexWrap: 'nowrap', marginBottom: '4px',
  },
  logoBox: {
    width: '34px', height: '34px', minWidth: '34px',
    background: theme.color.primary, borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '800', fontSize: '15px', color: '#fff', flexShrink: 0,
  },
  logoText: {
    fontSize: theme.font.size.xxl, fontWeight: '800',
    color: theme.color.ink, letterSpacing: '-0.02em',
    lineHeight: '1.1', whiteSpace: 'nowrap',
    fontFamily: theme.font.family,
  },
  tagline: {
    fontSize: '12px', color: theme.color.muted,
    margin: '0 0 24px', lineHeight: '1.4', paddingLeft: 0,
  },
  headline: {
    fontSize: '26px', fontWeight: '700', color: theme.color.ink,
    lineHeight: '1.25', letterSpacing: '-0.02em',
    margin: '0 0 14px', padding: 0, textAlign: 'left',
  },
  sub: {
    fontSize: '15px', color: theme.color.muted,
    lineHeight: '1.6', margin: '0 0 20px',
    padding: 0, textAlign: 'left', maxWidth: '380px',
  },
  pillGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '16px',
    maxWidth: '340px',
  },
  pill: {
    fontSize: '13px', fontWeight: '600',
    padding: '8px 14px', borderRadius: '20px',
    letterSpacing: '0.01em', textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  btnWrap: {
    display: 'flex', justifyContent: 'center',
    maxWidth: '340px', marginBottom: '0',
  },
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: theme.color.primary, color: '#fff', border: 'none',
    borderRadius: '12px', padding: '14px 28px',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
    width: '100%', justifyContent: 'center',
  },
  statsRow: {
    display: 'flex', marginTop: '28px',
    paddingTop: '24px', borderTop: `1px solid ${theme.color.line}`,
  },
  stat: { paddingRight: '24px' },
  howPanel: {
    marginTop: '16px',
    background: theme.color.ink,
    borderRadius: theme.radius.sm,
    padding: '18px 20px',
    maxWidth: '340px',
    boxSizing: 'border-box',
  },
  howTitle: {
    fontFamily: theme.font.display,
    fontWeight: theme.font.weight.heavy,
    fontSize: '13px',
    color: '#ffffff',
    margin: '0 0 12px',
    letterSpacing: '0.01em',
  },
  howStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
  },
  howNum: {
    flex: '0 0 auto',
    width: '22px', height: '22px',
    borderRadius: '50%',
    background: theme.color.primary,
    color: '#ffffff',
    fontFamily: theme.font.display,
    fontWeight: theme.font.weight.heavy,
    fontSize: '11px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  howText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: '1.45',
  },
  statNum: {
    fontSize: '22px', fontWeight: '700',
    color: theme.color.ink, margin: '0 0 2px',
  },
  statLabel: {
    fontSize: '11px', color: theme.color.muted,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    fontWeight: '600', margin: 0,
  },
  badge: {
    position: 'absolute', top: '16px', right: '16px',
    background: 'rgba(196,0,0,0.06)', border: '1px solid rgba(196,0,0,0.2)',
    borderRadius: '8px', padding: '6px 12px', fontSize: '11px',
    fontWeight: '700', color: '#9d0000', letterSpacing: '0.05em',
    textTransform: 'uppercase', zIndex: 3,
  },
};