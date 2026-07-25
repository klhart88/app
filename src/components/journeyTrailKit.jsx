// ============================================================================
// RealEquityIQ — Journey Trail Kit (shared presentation primitives)
//
// The single source of truth for the journey trail's LOOK and GEOMETRY, shared
// by the real interactive map (JourneyMap.jsx) and the marketing teaser
// (JourneyTeaser.jsx). Extracted so the two can never drift: change a palette
// token or the snake layout here and BOTH surfaces follow.
//
// What lives here: pure, side-effect-free presentation only —
//   - TRAIL palette + stationColors + CATEGORY_CAPTION
//   - geometry: layout constants, computeLayout(), buildSmoothPath(), safePointAt()
//   - label wrapping
//   - the pure SVG sub-components: GridBackdrop, TrailStation, TrailAvatar
//
// What does NOT live here (stays with each consumer): data loading, Supabase /
// auth, the earned-milestone logic, and each surface's own animation driver
// (the real map advances the avatar to the furthest-earned station; the teaser
// sweeps it through a scripted timeline). Those are behavior, not look.
// ============================================================================

import { theme } from '../theme.js';

// ── Palette ─────────────────────────────────────────────────────────────────
// Echoes the landing page: a champagne/rose line on a champagne wash with a
// faint grid, category-colored checkpoints from the landing scenario pills.
// Red (theme.color.primary) is reserved for the marker + the traveled line —
// it always means "you / progress", never a station category.
export const TRAIL = {
  line:       '#f0d4d0',   // champagne/rose winding line (calm, untraveled)
  grid:       'rgba(19, 15, 15, 0.05)', // faint chart grid
  wash:       '#fbf6f3',   // soft champagne wash behind the trail

  inAppFill:   '#cfe6d6',  // House-Hacking sage — in-app milestones
  inAppInk:    '#1a6b3c',  // sage text/ring
  realFill:    '#fbe3c4',  // Wait-for-Rates amber — real-world steps
  realInk:     '#9a5a00',  // amber text/ring

  inAppGhost:  '#eaf4ee',
  realGhost:   '#fdf3e6',
  ghostInk:    '#9a9090',
};

export const CATEGORY_CAPTION = {
  system:      'In-app',
  action:      'In-app',
  behavior:    'In-app',
  self_report: 'Real-world',
};

// Map a milestone category → its checkpoint colors (earned vs ghost).
export function stationColors(category) {
  const realWorld = category === 'self_report';
  return realWorld
    ? { fill: TRAIL.realFill,  ink: TRAIL.realInk,  ghost: TRAIL.realGhost }
    : { fill: TRAIL.inAppFill, ink: TRAIL.inAppInk, ghost: TRAIL.inAppGhost };
}

// ── Geometry ──────────────────────────────────────────────────────────────
// Boustrophedon (snake) layout constants. Shared so the teaser's path is
// byte-for-byte the same shape as the real map's.
export const LAYOUT = {
  COLS: 3,          // stations per row before the snake turns
  COL_W: 220,       // horizontal spacing
  ROW_H: 190,       // vertical spacing — room for 2-line labels + caption + avatar tag
  PAD_X: 70,
  PAD_Y: 60,
  PAD_BOTTOM: 96,   // extra room under the last row for labels
};

// Compute station centers (snake layout) + svg width/height for N stations.
export function computeLayout(count) {
  const { COLS, COL_W, ROW_H, PAD_X, PAD_Y, PAD_BOTTOM } = LAYOUT;
  const rows = Math.ceil(count / COLS);
  const width  = PAD_X * 2 + (COLS - 1) * COL_W;
  const height = PAD_Y + (rows - 1) * ROW_H + PAD_BOTTOM;
  const centers = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / COLS);
    const posInRow = i % COLS;
    const leftToRight = row % 2 === 0;
    const col = leftToRight ? posInRow : (COLS - 1 - posInRow);
    return { x: PAD_X + col * COL_W, y: PAD_Y + row * ROW_H };
  });
  return { centers, width, height, rows };
}

// Catmull-Rom through points → one smooth SVG path "d" string.
export function buildSmoothPath(pts) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function safePointAt(pathEl, len) {
  try {
    const p = pathEl.getPointAtLength(len);
    return { x: p.x, y: p.y };
  } catch {
    return { x: 0, y: 0 };
  }
}

// Measure a path element: total length + the length-along-path nearest to each
// center, so consumers can clip the traveled portion and place the avatar.
// Shared because both surfaces sample the path identically.
export function measurePath(pathEl, centers, samples = 600) {
  const total = pathEl.getTotalLength();
  const pts = [];
  for (let s = 0; s <= samples; s++) {
    const L = (s / samples) * total;
    const p = pathEl.getPointAtLength(L);
    pts.push({ L, x: p.x, y: p.y });
  }
  const lenAt = centers.map((c) => {
    let best = 0, bestD = Infinity;
    for (const sm of pts) {
      const d = (sm.x - c.x) ** 2 + (sm.y - c.y) ** 2;
      if (d < bestD) { bestD = d; best = sm.L; }
    }
    return best;
  });
  return { total, lenAt };
}

// Wrap a label to tidy lines for SVG text. Width 18 keeps lines clear of
// neighboring stations (~126px wide vs. 220px column spacing); the 3-line cap
// is a safety net so a long label never silently loses its last word (the old
// 16-char / 2-line cap dropped "profile", "home", "offer" from three real
// milestone labels). Current labels all fit in ≤2 lines at width 18.
export function wrapLabel(label) {
  const MAX_CHARS = 18;
  const MAX_LINES = 3;
  const words = label.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > MAX_CHARS && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, MAX_LINES);
}

// ── Pure SVG sub-components ──────────────────────────────────────────────────

export function GridBackdrop({ width, height }) {
  const step = 48;
  const cols = Math.floor(width / step);
  const rows = Math.floor(height / step);
  const lines = [];
  for (let i = 1; i <= cols; i++) {
    lines.push(<line key={`v${i}`} x1={i * step} y1="0" x2={i * step} y2={height} stroke={TRAIL.grid} strokeWidth="1" />);
  }
  for (let j = 1; j <= rows; j++) {
    lines.push(<line key={`h${j}`} x1="0" y1={j * step} x2={width} y2={j * step} stroke={TRAIL.grid} strokeWidth="1" />);
  }
  return (
    <g aria-hidden="true">
      <rect x="0" y="0" width={width} height={height} rx="16" fill={TRAIL.wash} />
      {lines}
    </g>
  );
}

// A single station in SVG coords. Colored by category; earned = full tone,
// upcoming = pale ghost of the same color.
export function TrailStation({ cx, cy, index, station, lit, isNext }) {
  const { label, points, category } = station;
  const labelLines = wrapLabel(label);
  const col = stationColors(category);
  const nodeFill   = lit ? col.fill : col.ghost;
  const nodeStroke = lit ? col.ink  : 'rgba(19,15,15,0.10)';
  const numFill    = lit ? col.ink  : TRAIL.ghostInk;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r="22"
        fill={nodeFill}
        stroke={nodeStroke}
        strokeWidth="2.5"
        style={{ transition: 'fill 450ms ease, stroke 450ms ease' }}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="15"
        fontWeight="700"
        fontFamily={theme.font.family}
        fill={numFill}
        style={{ transition: 'fill 450ms ease' }}
      >
        {lit ? '✓' : index + 1}
      </text>

      <text
        x={cx}
        y={cy + 40}
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="600"
        fontFamily={theme.font.family}
        fill={lit ? theme.color.ink : theme.color.muted}
        stroke={TRAIL.wash}
        strokeWidth="3.5"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {labelLines.map((line, li) => (
          <tspan key={li} x={cx} dy={li === 0 ? 0 : 15}>{line}</tspan>
        ))}
      </text>

      <text
        x={cx}
        y={cy + 40 + labelLines.length * 15 + 4}
        textAnchor="middle"
        fontSize="10"
        fontWeight="600"
        letterSpacing="0.5"
        fontFamily={theme.font.family}
        fill={isNext ? theme.color.primary : (lit ? col.ink : theme.color.muted)}
        stroke={TRAIL.wash}
        strokeWidth="3.5"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {isNext ? 'UP NEXT' : `${(CATEGORY_CAPTION[category] ?? 'In-app').toUpperCase()} · +${points}`}
      </text>
    </g>
  );
}

// The avatar: a ringed marker with a small IQ tag beneath. iqTag is the already
// -resolved string/number to show (the real map count-ups total_points; the
// teaser can pass a fixed label), so this stays pure and animation-free.
export function TrailAvatar({ x, y, iqTag }) {
  return (
    <g aria-label="You are here" style={{ pointerEvents: 'none' }}>
      <circle cx={x} cy={y} r="17" fill={theme.color.primary} opacity="0.12">
        <animate attributeName="r" values="15;19;15" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx={x} cy={y} r="10" fill={theme.color.primary} stroke="#fff" strokeWidth="3" />
      <g transform={`translate(${x}, ${y - 26})`}>
        <rect x="-27" y="-11" width="54" height="22" rx="11"
          fill="#fff" stroke={theme.color.primary} strokeWidth="1.5" />
        <text x="0" y="1" textAnchor="middle" dominantBaseline="central"
          fontSize="12" fontWeight="700" fontFamily={theme.font.family}
          fill={theme.color.primary} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {iqTag} IQ
        </text>
      </g>
    </g>
  );
}