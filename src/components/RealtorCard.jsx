// ============================================
// RealEquityIQ — Realtor Card
// ============================================

import { theme, styles } from '../theme.js';
import fathomLogo from '../assets/FathomLogo-Full-RdSlvr-Vt-small.png';

const CONTACT = {
  name:       'Kelvin Hart',
  credential: 'REALTOR\u00ae',
  brokerage:  'Fathom Realty',
  phone:      '(317) 833-8419',
  email:      'khart@fathomrealty.com',
  website:    'https://realequityiq.com',
  calendar:   'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0zsOQiuH6AvfWU8Rqxfl51UdPiyNC32jY5t0y-_XLlFeMGSubTkABQXg4a9fb0jCEsli8l_u5V?gv=true',
};

function SmartIQLockup() {
  return (
    <div style={s.lockup}>
      <div style={s.lockupMark}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M4 14L14 5L24 14V24H18V18H10V24H4V14Z" fill="#c40000" stroke="#c40000" strokeWidth="1" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={s.lockupText}>
        <div style={s.lockupMain}>
          <span style={s.lockupSmart}>Smart</span>
          <span style={s.lockupIQ}>IQ</span>
          <span style={s.lockupRealty}>&nbsp;Realty</span>
        </div>
        <div style={s.lockupTagline}>Smarter moves start here</div>
      </div>
    </div>
  );
}

export default function RealtorCard() {
  return (
    <div style={s.card}>

      {/* Header */}
      <div style={s.header}>
        <SmartIQLockup />
        <div style={s.badge}>Your Agent</div>
      </div>

      {/* Agent name — left aligned */}
      <p style={s.agentName}>
        {CONTACT.name} &middot; {CONTACT.credential}
      </p>

      {/* Message */}
      <div style={s.message}>
        <p style={s.messageText}>
          These numbers are a starting point. I can show you properties
          that match your simulation profile — and guide you through the
          actual transaction with local market expertise.
        </p>
      </div>

      {/* Contact buttons */}
      <div style={s.contactRow}>

        <a href={`tel:${CONTACT.phone}`} style={s.contactBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 3a1 1 0 011-1h2.5a1 1 0 011 1v1.5a1 1 0 01-.293.707L5 6.414A11.042 11.042 0 008.586 10l1.207-1.207A1 1 0 0110.5 8.5H12a1 1 0 011 1V12a1 1 0 01-1 1C6.477 13 2 8.523 2 3z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Call
        </a>

        <a href={`mailto:${CONTACT.email}`} style={s.contactBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4a1 1 0 011-1h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 4l6 5 6-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Email
        </a>

        <a href={CONTACT.website} target="_blank" rel="noopener noreferrer" style={s.contactBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 2c0 0-2 2.5-2 6s2 6 2 6M8 2c0 0 2 2.5 2 6s-2 6-2 6M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Website
        </a>

        <a href={CONTACT.calendar} target="_blank" rel="noopener noreferrer" style={{ ...s.contactBtn, ...s.contactBtnPrimary }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Schedule a Conversation
        </a>

      </div>

      {/* Brokerage footer */}
      <div style={s.brokerageFooter}>
        <img src={fathomLogo} alt="Fathom Realty" style={s.brokerageLogo} />
        <p style={s.brokerageText}>Brokered by {CONTACT.brokerage}</p>
      </div>

    </div>
  );
}

const s = {
  card: {
    background:   '#130f0f',
    borderRadius: theme.radius.default,
    padding:      theme.space.lg,
    marginTop:    theme.space.md,
  },
  lockup: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
    flex:       1,
  },
  lockupMark: {
    flexShrink: 0,
    lineHeight: 0,
  },
  lockupText: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '2px',
  },
  lockupMain: {
    display:    'flex',
    alignItems: 'baseline',
    lineHeight: 1,
  },
  lockupSmart: {
    fontSize:      '18px',
    fontWeight:    '800',
    color:         '#c40000',
    letterSpacing: '-0.02em',
  },
  lockupIQ: {
    fontSize:      '18px',
    fontWeight:    '800',
    color:         '#ffffff',
    letterSpacing: '-0.02em',
  },
  lockupRealty: {
    fontSize:      '18px',
    fontWeight:    '800',
    color:         'rgba(255,255,255,0.4)',
    letterSpacing: '-0.02em',
  },
  lockupTagline: {
    fontSize:      '9px',
    fontWeight:    '700',
    color:         'rgba(255,255,255,0.4)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   '6px',
  },
  badge: {
    fontSize:     '11px',
    fontWeight:   '700',
    color:        '#c40000',
    background:   'rgba(196,0,0,0.12)',
    border:       '1px solid rgba(196,0,0,0.35)',
    borderRadius: '20px',
    padding:      '4px 10px',
    flexShrink:   0,
  },
  agentName: {
    fontSize:    theme.font.size.sm,
    fontWeight:  '600',
    color:       'rgba(255,255,255,0.55)',
    margin:      '0 0 14px',
    textAlign:   'left',
  },
  message: {
    background:   'rgba(255,255,255,0.05)',
    borderRadius: theme.radius.sm,
    padding:      '12px 14px',
    marginBottom: theme.space.md,
    borderLeft:   '3px solid #c40000',
  },
  messageText: {
    fontSize:   theme.font.size.sm,
    color:      'rgba(255,255,255,0.7)',
    lineHeight: '1.6',
    margin:     0,
  },
  contactRow: {
    display:  'flex',
    gap:      '8px',
    flexWrap: 'wrap',
  },
  contactBtn: {
    display:        'inline-flex',
    alignItems:     'center',
    gap:            '6px',
    padding:        '10px 16px',
    borderRadius:   theme.radius.xs,
    fontSize:       theme.font.size.sm,
    fontWeight:     '600',
    cursor:         'pointer',
    textDecoration: 'none',
    background:     'rgba(255,255,255,0.08)',
    color:          'rgba(255,255,255,0.85)',
    border:         '1px solid rgba(255,255,255,0.1)',
    flexShrink:     0,
  },
  contactBtnPrimary: {
    background:     '#c40000',
    color:          '#ffffff',
    border:         'none',
    flex:           1,
    justifyContent: 'center',
  },
  brokerageFooter: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    marginTop:  theme.space.md,
    paddingTop: theme.space.sm,
    borderTop:  '1px solid rgba(255,255,255,0.12)',
  },
  brokerageLogo: {
    width:        '26px',
    height:       '26px',
    borderRadius: '5px',
    objectFit:    'contain',
    flexShrink:   0,
  },
  brokerageText: {
    fontSize:   '13px',
    fontWeight: '600',
    color:      'rgba(255,255,255,0.55)',
    margin:     0,
  },
};