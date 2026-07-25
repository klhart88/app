// ============================================
// RealWorldIQ — Brand Theme
//
// Single source of truth for all colors,
// spacing, typography, and visual tokens.
// Import this into every component.
//
// Based on SmartIQ by Hart brand system.
// ============================================

export const theme = {

  // ── Core Colors ───────────────────────────
  color: {
    primary:      '#c40000',
    primaryLight: '#d71920',
    primaryDark:  '#9d0000',
    primarySoft:  '#fff2f2',

    ink:          '#130f0f',
    muted:        '#625a5a',
    soft:         '#f7f5f3',  // subtle off-white SURFACE (insets/panels on the page). Kept faintly warm so panels stay distinct now that the page is white.
    card:         '#ffffff',

    line:         'rgba(19, 15, 15, 0.12)',
    lineStrong:   'rgba(196, 0, 0, 0.28)',

    // Semantic aliases
    text:         '#130f0f',
    textMuted:    '#625a5a',
    bg:           '#ffffff',  // PAGE background — white (was champagne #f7f4f2). Color-foundation lock, v20.
    border:       'rgba(19, 15, 15, 0.12)',

    // Status colors (for results, teaching moments)
    success:      '#1a6b3c',
    successSoft:  '#d6efe1',
    warning:      '#c05a00',
    warningSoft:  '#fde8d0',
    info:         '#1b4f8c',
    infoSoft:     '#e8f4fd',
  },

  // ── Shadows ───────────────────────────────
  shadow: {
    default: '0 18px 50px rgba(25, 15, 15, 0.08)',
    soft:    '0 10px 28px rgba(25, 15, 15, 0.06)',
    card:    '0 4px 16px rgba(25, 15, 15, 0.06)',
  },

  // ── Border Radius ─────────────────────────
  radius: {
    default: '22px',
    sm:      '12px',
    xs:      '6px',
  },

  // ── Spacing ───────────────────────────────
  space: {
    xs:  '0.5rem',
    sm:  '0.85rem',
    md:  '1.25rem',
    lg:  '2rem',
    xl:  '3rem',
  },

  // ── Typography ────────────────────────────
  // SmartIQ canonical type system: Montserrat (display) + Inter (body).
  // Fonts are loaded via <link> in index.html. `family` stays as the
  // default/body stack so existing usages inherit Inter automatically;
  // `display` is the Montserrat stack for headings, eyebrows, buttons.
  font: {
    family:  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body:    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    size: {
      xs:   '11px',
      sm:   '13px',
      base: '15px',
      md:   '17px',
      lg:   '20px',
      xl:   '24px',
      xxl:  '32px',
      hero: '42px',
    },
    weight: {
      normal:   '400',
      medium:   '500',
      semibold: '600',
      bold:     '700',
      heavy:    '800',
      black:    '850',
    }
  },

  // ── Max Width ─────────────────────────────
  maxWidth: '1120px',
  contentWidth: '520px', // for single-column forms/selectors
};


// ── Reusable style objects ─────────────────
// Pre-built style blocks for common UI patterns.
// Use these directly in component style props.

export const styles = {

  // Page wrapper
  page: {
    minHeight:   '100vh',
    background:  theme.color.bg,
    fontFamily:  theme.font.family,
    color:       theme.color.text,
    padding:     `${theme.space.xl} ${theme.space.md}`,
  },

  // Centered content column
  column: {
    maxWidth:  theme.contentWidth,
    margin:    '0 auto',
  },

  // Card
  card: {
    background:   theme.color.card,
    borderRadius: theme.radius.default,
    boxShadow:    theme.shadow.card,
    border:       `1px solid ${theme.color.line}`,
    padding:      theme.space.lg,
  },

  // Card small
  cardSm: {
    background:   theme.color.card,
    borderRadius: theme.radius.sm,
    boxShadow:    theme.shadow.soft,
    border:       `1px solid ${theme.color.line}`,
    padding:      theme.space.md,
  },

  // Primary button
  btnPrimary: {
    background:   theme.color.primary,
    color:        '#ffffff',
    border:       'none',
    borderRadius: theme.radius.sm,
    padding:      `14px ${theme.space.lg}`,
    fontFamily:   theme.font.display,
    fontSize:     theme.font.size.base,
    fontWeight:   theme.font.weight.heavy,
    cursor:       'pointer',
    width:        '100%',
    letterSpacing: '0.01em',
    boxShadow:    '0 12px 25px rgba(196, 0, 0, 0.18)',
  },

  // Ghost button
  btnGhost: {
    background:   'transparent',
    color:        theme.color.primary,
    border:       `1.5px solid ${theme.color.primary}`,
    borderRadius: theme.radius.sm,
    padding:      `12px ${theme.space.lg}`,
    fontSize:     theme.font.size.base,
    fontWeight:   theme.font.weight.semibold,
    cursor:       'pointer',
    width:        '100%',
  },

  // Form label
  label: {
    display:       'block',
    fontSize:      theme.font.size.sm,
    fontWeight:    theme.font.weight.semibold,
    color:         theme.color.ink,
    marginBottom:  '6px',
    letterSpacing: '0.01em',
  },

  // Form input / select
  input: {
    width:        '100%',
    padding:      '12px 16px',
    fontSize:     theme.font.size.base,
    border:       `1.5px solid ${theme.color.line}`,
    borderRadius: theme.radius.sm,
    background:   theme.color.card,
    color:        theme.color.ink,
    outline:      'none',
    boxSizing:    'border-box',
  },

  // Disclaimer / info box
  disclaimer: {
    display:      'flex',
    gap:          '10px',
    padding:      '12px 16px',
    background:   theme.color.primarySoft,
    borderRadius: theme.radius.sm,
    border:       `1px solid ${theme.color.lineStrong}`,
  },

  // Section heading
  sectionHeading: {
    fontSize:     theme.font.size.md,
    fontWeight:   theme.font.weight.bold,
    color:        theme.color.primary,
    margin:       '0 0 12px 0',
  },

  // Muted helper text
  helperText: {
    fontSize:  theme.font.size.sm,
    color:     theme.color.muted,
    margin:    '6px 0 0 0',
    lineHeight: '1.5',
  },

  // Stat grid item
  statLabel: {
    fontSize:      theme.font.size.xs,
    color:         theme.color.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight:    theme.font.weight.medium,
  },

  statValue: {
    fontSize:   theme.font.size.md,
    fontWeight: theme.font.weight.bold,
    color:      theme.color.ink,
    marginTop:  '2px',
  },

  // Eyebrow / badge pill — signature SmartIQ element.
  // Uppercase, wide tracking, Montserrat heavy, red on translucent white.
  // Use on light surfaces (cards, page backgrounds).
  eyebrow: {
    display:        'inline-flex',
    alignItems:     'center',
    padding:        '6px 13px',
    border:         `1px solid ${theme.color.lineStrong}`,
    borderRadius:   '999px',
    background:     'rgba(255, 255, 255, 0.75)',
    color:          theme.color.primary,
    fontFamily:     theme.font.display,
    fontSize:       '10px',
    fontWeight:     theme.font.weight.heavy,
    lineHeight:     '1',
    letterSpacing:  '0.18em',
    textTransform:  'uppercase',
  },

  // Eyebrow variant for dark surfaces (e.g. comparison results card).
  // #c40000 is too dark on near-black, so brighten the red and use a
  // translucent-white fill instead of white.
  eyebrowDark: {
    display:        'inline-flex',
    alignItems:     'center',
    padding:        '6px 13px',
    border:         '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius:   '999px',
    background:     'rgba(255, 255, 255, 0.08)',
    color:          '#ff6b6b',
    fontFamily:     theme.font.display,
    fontSize:       '10px',
    fontWeight:     theme.font.weight.heavy,
    lineHeight:     '1',
    letterSpacing:  '0.18em',
    textTransform:  'uppercase',
  },
};