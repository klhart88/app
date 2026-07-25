// ============================================================================
// RealEquityIQ — Journey World Kit (painterly world-map presentation)
//
// The LOOK + GEOMETRY of the world-map journey, composited over the
// production Promenade asset (promenade-background.webp). v2: replaces the
// winding valley-to-skyline route with a STRAIGHT central progression —
// stations climb directly up the boulevard toward the main institution
// building in the distance, matching the new photoreal artwork's own
// composition (a straight formal walkway + fountain leading to the building).
//
// Design vocabulary is lifted straight from the baseline concept:
//   - Red is reserved for YOU / progress (the traveled line + the current marker).
//   - Nodes are a differentiated taxonomy, not uniform dots. Two axes compose:
//       STATE  (derived): locked · completed · current        ← journey progress
//       TYPE   (editorial, optional): standard · decision · landmark · insight
//     State drives color treatment; type drives glyph/shape. A landmark not yet
//     reached is a ghost-gold locked star; once earned, full gold. They compose.
//
// What lives here: pure, side-effect-free presentation only — palette, the
// terrain waypoint route, path building, the node renderers, and the chrome
// (progress panel, guide card, legend). No data, no auth, no animation driver.
// The consumer (JourneyWorldMap) owns those.
// ============================================================================

import { theme } from '../theme.js';
import { measurePath, safePointAt } from './journeyTrailKit.jsx';

// Re-export the path-measurement helpers the world map reuses unchanged — both
// surfaces sample a path identically to clip the traveled portion + place the
// avatar. (Only the LAYOUT differs: grid there, terrain here.)
export { measurePath, safePointAt };

// ── Canvas ──────────────────────────────────────────────────────────────────
// Matches the baseline concept's coordinate system exactly so the painted asset
// and all hand-tuned terrain features line up.
export const WORLD = {
  VIEW_W: 1020,
  VIEW_H: 760,
  // The painted asset is clipped into this rounded rect (from the baseline).
  ASSET: { x: 248, y: 8, w: 764, h: 672, r: 16 },
  // Reserved column on the left for the progress + guide panels.
  PANEL: { x: 16, w: 210 },
};

// ── Palette ─────────────────────────────────────────────────────────────────
// Echoes the baseline: a champagne/sand untraveled path, red traveled line,
// and the differentiated node colors (sage completed, gold landmark, amber
// decision, sage insight, ghosted locked).
export const WK = {
  pathHalo:    '#ffffff',  // soft white casing under the path
  pathBed:     '#dcc3b0',  // champagne/sand untraveled bed
  pathDash:    '#ffffff',  // dotted center line

  traveled:    theme.color.primary, // red — you/progress

  doneFill:    '#cfe6d6',  doneInk:  '#1a6b3c',   // completed (sage)
  landFill:    '#f7e3b0',  landInk:  '#9a6a14',  landHalo: '#efb13a', // landmark (gold)
  deciFill:    '#fbe3c4',  deciInk:  '#9a5a00',   // decision (amber)
  insFill:     '#eaf4ee',  insInk:   '#1a6b3c',   // insight (sage halo)

  lockFill:    '#f4f1ea',  lockInk:  '#b4b2a9',   // upcoming/locked (ghost)
  labelBg:     '#ffffff',
  panelBg:     '#ffffff',
  panelLine:   'rgba(19,15,15,0.08)',
  muted:       '#9a9089',
};

// ── Terrain route ─────────────────────────────────────────────────────────────
// The journey's stage positions on the painted landscape (asset coordinate
// space). v9 — LOCKED FOR PRODUCTION. Only stations 0, 2, and 3 changed from v8 — 1 and 4-8 are
// untouched, per explicit "no other changes" instruction.
//   - Station 0: pulled in to 85% of the rim radius (same angle, t=80°), so
//     it sits ON the plaza rather than right at its outer edge.
//   - Station 2: same treatment, 85% radius at its existing angle (t=260°) —
//     "within the ellipse" instead of on the literal rim.
//   - Station 3: nudged closer to station 2 (370 -> 385) to ease spacing for
//     stations 4-8, which are otherwise unchanged.
// The v8 tradeoff note still applies unchanged: station 2 approaching from
// near the ellipse's top keeps the station2->station4 direction close to
// vertical (minimizing, not eliminating, drift into the straight run) — see
// that version's comment for the full reasoning.
//
// Indices map to the continuous station order:
//   0 profile · 1 first sim · 2 compare(decision) · 3 run-all(on-centerline, base of the straight) ·
//   4 assess · 5 define · 6 act · 7 commit · 8 arrive(landmark, at the building)
export const TERRAIN = [
  { x: 652, y: 569 },  // 0 inset onto the plaza, 85% radius (t=80°) — Your profile
  { x: 485, y: 517 },  // 1 First simulation — unchanged
  { x: 608, y: 419 },  // 2 Compare paths (decision) — inset, 85% radius (t=260°)
  { x: 630, y: 385 },  // 3 Run all 5 — nudged closer to 2, easing spacing above
  { x: 630, y: 315 },  // 4 assess — unchanged
  { x: 630, y: 260 },  // 5 define — unchanged
  { x: 630, y: 205 },  // 6 act — unchanged
  { x: 630, y: 150 },  // 7 commit — unchanged
  { x: 630, y: 95  },  // 8 arrive (landmark) — unchanged
];

// Place N station centers on the terrain. For the canonical 9-station journey
// (and any count up to TERRAIN's length) we use the DELIBERATE positions
// directly — TERRAIN[0..N-1] — so each stage sits exactly where authored. For a
// shorter journey (e.g. the 4-station no-path prologue) this yields the first N
// authored positions, which still form a sensible valley-floor opening. For a
// longer-than-authored journey we fall back to interpolating across the spine so
// nothing runs off the map. Signature unchanged so the consumer is untouched.
export function placeStations(count) {
  if (count <= 0) return [];
  if (count <= TERRAIN.length) {
    return TERRAIN.slice(0, count);
  }
  return interpolateAlong(TERRAIN, count);
}

function interpolateAlong(pts, count) {
  const last = pts.length - 1;
  return Array.from({ length: count }, (_, i) => {
    const t = (i / (count - 1)) * last;
    const lo = Math.floor(t), hi = Math.min(lo + 1, last), f = t - lo;
    return {
      x: pts[lo].x + (pts[hi].x - pts[lo].x) * f,
      y: pts[lo].y + (pts[hi].y - pts[lo].y) * f,
    };
  });
}

// Catmull-Rom through the station centers → a smooth winding "d". (Same spline
// the trail kit uses; re-implemented here to keep terrain placement self-
// contained — the only shared bit is measurePath/safePointAt above.)
export function buildWorldPath(pts) {
  if (!pts.length) return '';
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

// ── Node taxonomy ─────────────────────────────────────────────────────────────
// STATE derived by the consumer; TYPE optionally authored. The renderer below
// composes them: type picks the glyph, state picks the treatment.
export const NODE_TYPE = { STANDARD: 'standard', DECISION: 'decision', LANDMARK: 'landmark', INSIGHT: 'insight' };
export const NODE_STATE = { LOCKED: 'locked', COMPLETED: 'completed', CURRENT: 'current' };

// A single station node on the world map. Pure SVG; click handling is added by
// the consumer via a wrapping <g> (keeps this themeable + animation-free).
export function WorldNode({ cx, cy, index, station, state, isInsightFired }) {
  const type = station.nodeType ?? NODE_TYPE.STANDARD;
  const label = station.label ?? '';

  // CURRENT (you) always renders as the red IQ marker regardless of type —
  // "you are here" outranks the editorial glyph for the active node.
  if (state === NODE_STATE.CURRENT) {
    return <CurrentMarker cx={cx} cy={cy} index={index} label={label} sublabel={station.sublabel} />;
  }

  const completed = state === NODE_STATE.COMPLETED;

  // Editorial glyphs (compose with state via fill treatment).
  if (type === NODE_TYPE.LANDMARK) return <LandmarkNode cx={cx} cy={cy} index={index} label={label} completed={completed} />;
  if (type === NODE_TYPE.DECISION) return <DecisionNode cx={cx} cy={cy} index={index} label={label} completed={completed} />;
  if (type === NODE_TYPE.INSIGHT)  return <InsightNode  cx={cx} cy={cy} index={index} label={label} completed={completed} fired={isInsightFired} />;

  return <StandardNode cx={cx} cy={cy} index={index} label={label} sublabel={station.sublabel} completed={completed} />;
}

// Pill label beside (or above) a node. 'left'/'right' sit vertically centered
// on the node, same as before. 'above' is new — used ONLY for the dynamic
// "Your profile" node (station 0): its name+journey identity reads as an
// anchor/hero label, not just another rotating station label, so it's
// centered directly above the node instead of joining the left/right
// alternation (see StandardNode/CurrentMarker's index===0 special-case).
function NodeLabel({ cx, cy, side = 'right', gap = 26, text, subtext, ink = theme.color.ink, weight = 600 }) {
  const w = Math.max(60, Math.max(text.length, (subtext ?? '').length) * 6.6 + 20);
  const h = subtext ? 30 : 17;
  let x, y;
  if (side === 'above') {
    x = cx - w / 2;
    y = cy - gap - h;
  } else {
    x = side === 'right' ? cx + gap : cx - gap - w;
    y = cy - h / 2;
  }
  const textX = x + w / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={WK.labelBg} opacity="0.85" />
      {subtext ? (
        <>
          <text x={textX} y={y + 12} textAnchor="middle" fontFamily={theme.font.family}
            fontSize="10" fontWeight={weight} fill={ink}>{text}</text>
          <text x={textX} y={y + 24} textAnchor="middle" fontFamily={theme.font.family}
            fontSize="9" fontWeight="500" fill={theme.color.muted}>{subtext}</text>
        </>
      ) : (
        <text x={textX} y={y + h / 2} dominantBaseline="central" textAnchor="middle" fontFamily={theme.font.family}
          fontSize="10" fontWeight={weight} fill={ink}>{text}</text>
      )}
    </g>
  );
}

// Alternates left/right by station index — index 0 starts right (matching
// the path's own "starting right" sweep around the plaza), then alternates.
function sideForIndex(index) {
  return index % 2 === 0 ? 'right' : 'left';
}

function StandardNode({ cx, cy, index, label, sublabel, completed }) {
  const fill   = completed ? WK.doneFill : WK.lockFill;
  const stroke = completed ? WK.doneInk  : 'rgba(19,15,15,0.10)';
  const ink    = completed ? WK.doneInk  : WK.lockInk;
  return (
    <g style={{ transition: 'opacity 300ms ease' }}>
      <circle cx={cx} cy={cy} r="18" fill={fill} stroke={stroke} strokeWidth="2.5"
        strokeDasharray={completed ? undefined : '2 2'} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontFamily={theme.font.family} fontSize="13" fontWeight="700" fill={ink}>
        {completed ? '✓' : index + 1}
      </text>
      <NodeLabel cx={cx} cy={cy} side={index === 0 ? 'above' : sideForIndex(index)} gap={index === 0 ? 30 : 26} text={label} subtext={sublabel} />
    </g>
  );
}

function LandmarkNode({ cx, cy, index, label, completed }) {
  const fill = completed ? WK.landFill : '#f4efe2';
  const ink  = completed ? WK.landInk  : WK.lockInk;
  return (
    <g>
      {completed && <circle cx={cx} cy={cy} r="26" fill={WK.landHalo} opacity="0.16" />}
      <circle cx={cx} cy={cy} r="24" fill="none" stroke={completed ? '#c9962f' : WK.lockInk}
        strokeWidth="1.25" opacity={completed ? 0.6 : 0.35} />
      <circle cx={cx} cy={cy} r="19" fill={fill} stroke={completed ? '#9a6a14' : WK.lockInk}
        strokeWidth="2.75" strokeDasharray={completed ? undefined : '2 2'} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontFamily={theme.font.family} fontSize="14" fontWeight="700" fill={ink}>★</text>
      <NodeLabel cx={cx} cy={cy} side={sideForIndex(index)} gap={34} text={label} ink={completed ? WK.landInk : theme.color.muted} />
    </g>
  );
}

function DecisionNode({ cx, cy, index, label, completed }) {
  const fill = completed ? WK.deciFill : '#f4efe6';
  const ink  = completed ? WK.deciInk  : WK.lockInk;
  return (
    <g>
      <rect x={cx - 15} y={cy - 15} width="30" height="30" rx="5"
        transform={`rotate(45 ${cx} ${cy})`} fill={fill}
        stroke={completed ? WK.deciInk : WK.lockInk} strokeWidth="2.5"
        strokeDasharray={completed ? undefined : '2 2'} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontFamily={theme.font.family} fontSize="12" fontWeight="700" fill={ink}>
        {completed ? '✓' : index + 1}
      </text>
      <NodeLabel cx={cx} cy={cy} side={sideForIndex(index)} gap={28} text={label} ink={completed ? theme.color.ink : theme.color.muted} />
    </g>
  );
}

function InsightNode({ cx, cy, index, label, completed, fired }) {
  return (
    <g>
      {fired && <circle cx={cx} cy={cy} r="24" fill="none" stroke={WK.insInk} strokeWidth="0.75" opacity="0.32" />}
      <circle cx={cx} cy={cy} r="18" fill={WK.insFill} stroke={WK.insInk} strokeWidth="2.5"
        strokeDasharray={completed || fired ? undefined : '2 2'} opacity={completed || fired ? 1 : 0.7} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontFamily="Georgia, serif" fontSize="15" fontStyle="italic" fontWeight="700" fill={WK.insInk}>i</text>
      <NodeLabel cx={cx} cy={cy} side={sideForIndex(index)} gap={26} text={label} />
    </g>
  );
}

// The red "you are here" marker — pulse halo + IQ chip. Used for the current
// node (the furthest-earned station's successor).
function CurrentMarker({ cx, cy, index, label, sublabel }) {
  // NOTE: this group must NOT set pointerEvents:'none'. The CURRENT station
  // renders ONLY as this marker, and JourneyMap wraps each station in a <g> with
  // the tap handler — but a <g> only receives clicks where it has hit-testable
  // children under the cursor. If this marker disabled pointer events, the
  // current station would have no clickable surface and taps would silently do
  // nothing (no handler, no overlay). The solid white core circle below is the
  // hit target. The decorative pulse ring is marked non-interactive so only the
  // core takes clicks, but the group itself stays interactive.
  return (
    <g aria-label="You are here">
      <circle cx={cx} cy={cy} r="22" fill={theme.color.primary} opacity="0.13"
        style={{ pointerEvents: 'none' }}>
        <animate attributeName="r" values="20;24;20" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r="17" fill="#fff" stroke={theme.color.primary} strokeWidth="2.5" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        style={{ pointerEvents: 'none' }}
        fontFamily={theme.font.family} fontSize="10" fontWeight="700" fill={theme.color.primary}>IQ</text>
      {label ? (
        <NodeLabel cx={cx} cy={cy} side={index === 0 ? 'above' : sideForIndex(index)} gap={index === 0 ? 30 : 28} text={label} subtext={sublabel} ink={theme.color.primary} weight={700} />
      ) : null}
    </g>
  );
}

// ── Chrome ────────────────────────────────────────────────────────────────────
// The left-rail panels + bottom legend from the baseline, now data-driven.

// Progress panel: % complete, a bar, and completed / in-progress / upcoming
// counts. All values are passed in (derived by the consumer from the station
// states) — this stays pure.
export function ProgressPanel({ pct, completed, inProgress, upcoming, iqTotal }) {
  const X = WORLD.PANEL.x, W = WORLD.PANEL.w;
  return (
    <g>
      <rect x={X} y="24" width={W} height="236" rx="14" fill={WK.panelBg} stroke={WK.panelLine} strokeWidth="1" />
      <text x={X + 24} y="54" fontFamily={theme.font.display} fontSize="10" fontWeight="800"
        letterSpacing="1.6" fill={WK.muted}>YOUR PROGRESS</text>

      <text x={X + 24} y="94" fontFamily={theme.font.family} fontSize="34" fontWeight="700"
        fill={theme.color.primary}>{pct}%</text>

      <rect x={X + 24} y="108" width={W - 40} height="6" rx="3" fill="#f0e4dd" />
      <rect x={X + 24} y="108" width={Math.round((W - 40) * (pct / 100))} height="6" rx="3"
        fill={theme.color.primary} style={{ transition: 'width 450ms ease' }} />

      <ProgressRow x={X} y={142} fill={WK.doneFill} stroke={WK.doneInk} glyph="✓"
        label={`${completed} Completed`} />
      <ProgressRow x={X} y={168} fill="#fff" stroke={theme.color.primary} dot
        label={`${inProgress} In progress`} />
      <ProgressRow x={X} y={194} fill={WK.lockFill} stroke="#b4b2a9"
        label={`${upcoming} Upcoming`} />

      <line x1={X + 24} y1="214" x2={X + W - 8} y2="214" stroke={WK.panelLine} strokeWidth="1" />
      <text x={X + 24} y="238" fontFamily={theme.font.family} fontSize="11" fill={WK.muted}>
        IQ earned
      </text>
      <text x={X + W - 8} y="238" textAnchor="end" fontFamily={theme.font.family} fontSize="13"
        fontWeight="700" fill={theme.color.ink} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {iqTotal}
      </text>
    </g>
  );
}

function ProgressRow({ x, y, fill, stroke, glyph, dot, label }) {
  return (
    <g>
      <circle cx={x + 32} cy={y} r="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
      {glyph && <text x={x + 32} y={y + 1} textAnchor="middle" dominantBaseline="central"
        fontFamily={theme.font.family} fontSize="9" fontWeight="700" fill={stroke}>{glyph}</text>}
      {dot && <circle cx={x + 32} cy={y} r="3" fill={stroke} />}
      <text x={x + 48} y={y + 4} fontFamily={theme.font.family} fontSize="12" fill={theme.color.ink}>{label}</text>
    </g>
  );
}

// Guide card ("Kelvin"). Static identity for now; the name/blurb are props so a
// later slice can vary the guide by path without touching the kit. `topY`
// stays fixed at its default now — the RankPill (below) renders underneath
// GuideCard instead of pushing it down, so GuideCard no longer needs to shift.
export function GuideCard({ name = 'Kelvin', blurb = ['Here to help you make', 'confident decisions.'], topY = 272 }) {
  const X = WORLD.PANEL.x, W = WORLD.PANEL.w;
  return (
    <g>
      <rect x={X} y={topY} width={W} height="110" rx="14" fill={theme.color.ink} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      <circle cx={X + 34} cy={topY + 36} r="18" fill="#ffffff" stroke="#ffffff" strokeWidth="1.5" />
      <text x={X + 34} y={topY + 36} textAnchor="middle" dominantBaseline="central"
        fontFamily={theme.font.family} fontSize="15" fill={theme.color.primary}>☺</text>
      <text x={X + 62} y={topY + 28} fontFamily={theme.font.display} fontSize="9" fontWeight="800"
        letterSpacing="1.4" fill="rgba(255,255,255,0.60)">YOUR GUIDE</text>
      <text x={X + 62} y={topY + 44} fontFamily={theme.font.family} fontSize="14" fontWeight="700"
        fill={theme.color.primary}>{name}</text>
      {blurb.map((line, i) => (
        <text key={i} x={X + 24} y={topY + 72 + i * 14} fontFamily={theme.font.family} fontSize="10.5"
          fill="rgba(255,255,255,0.75)">{line}</text>
      ))}
    </g>
  );
}

// Rank pill — sits directly below the Your Guide card (per the corrected
// placement: below BOTH Your Progress and Your Guide), showing the achieved
// Institution Rank. Replaces the earlier CertificatePill/certificate-graphic
// approach: that path had persistent layout bugs (text sitting on/below
// guide lines, fields not painting at award time) inherent to laying text
// over a generated certificate image — the same class of problem that
// already pushed the completion scenes onto flattened background art instead
// of React-driven layout. A plain SVG pill, drawn the same way every other
// panel in this kit is drawn, doesn't have that problem. The medallion glyph
// is the approved Institution Master Seal artwork (instMasterSealAsset.js),
// not a placeholder star. Only rendered by the consumer when a rank exists.
export function RankPill({ rank, sealDataUri, topY = 394 }) {
  const X = WORLD.PANEL.x, W = WORLD.PANEL.w;
  const Y = topY;
  const rankLabel = rank
    ? rank.charAt(0).toUpperCase() + rank.slice(1)
    : '';
  return (
    <g>
      <rect x={X} y={Y} width={W} height="50" rx="12" fill="#FBF3DC" stroke="#C9A227" strokeWidth="1" />
      {/* medallion — the approved institution seal, clipped to a circle */}
      <defs>
        <clipPath id="rankSealClip">
          <circle cx={X + 27} cy={Y + 25} r="14" />
        </clipPath>
      </defs>
      <circle cx={X + 27} cy={Y + 25} r="14" fill="#fff" stroke="#C9A227" strokeWidth="1.5" />
      {sealDataUri && (
        <image
          x={X + 27 - 13} y={Y + 25 - 13} width="26" height="26"
          href={sealDataUri} clipPath="url(#rankSealClip)"
          preserveAspectRatio="xMidYMid slice"
        />
      )}
      <text x={X + 52} y={Y + 20} fontFamily={theme.font.display} fontSize="8.5" fontWeight="800"
        letterSpacing="1.2" fill="#8a6d1f">ACHIEVED RANK</text>
      <text x={X + 52} y={Y + 38} fontFamily={theme.font.family} fontSize="13" fontWeight="700"
        fill={theme.color.ink}>{rankLabel}</text>
    </g>
  );
}

// Bottom legend — the node taxonomy key. Static; explains the glyphs.
export function Legend() {
  const X = WORLD.PANEL.x;
  const items = [
    { type: 'dot',  fill: WK.doneFill, stroke: WK.doneInk, label: 'Completed',     lx: 60 },
    { type: 'line', stroke: theme.color.primary,           label: 'In progress',   lx: 178, x1: 148, x2: 170 },
    { type: 'line', stroke: '#e6d8c8',                     label: 'Upcoming',      lx: 308, x1: 278, x2: 300 },
    { type: 'diam', fill: WK.deciFill, stroke: WK.deciInk, label: 'Decision',      lx: 430, dx: 413 },
    { type: 'dot',  fill: WK.insFill,  stroke: WK.insInk,  label: 'Insight',       lx: 532, cx: 520 },
    { type: 'dot',  fill: WK.landFill, stroke: WK.landInk, label: 'Landmark',      lx: 610, cx: 598 },
    { type: 'dot',  fill: WK.lockFill, stroke: '#b4b2a9',  label: 'Upcoming step', lx: 720, cx: 708, dash: true },
  ];
  return (
    <g>
      <rect x={X} y="696" width="996" height="40" rx="10" fill={WK.panelBg} stroke={WK.panelLine} strokeWidth="1" />
      {items.map((it, i) => (
        <g key={i}>
          {it.type === 'dot' && (
            <circle cx={it.cx ?? 48} cy="716" r="6" fill={it.fill} stroke={it.stroke} strokeWidth="1.5"
              strokeDasharray={it.dash ? '2 2' : undefined} />
          )}
          {it.type === 'line' && (
            <line x1={it.x1} y1="716" x2={it.x2} y2="716" stroke={it.stroke} strokeWidth="3" strokeLinecap="round" />
          )}
          {it.type === 'diam' && (
            <rect x={it.dx - 7} y="709" width="14" height="14" rx="3" transform={`rotate(45 ${it.dx} 716)`}
              fill={it.fill} stroke={it.stroke} strokeWidth="1.25" />
          )}
          <text x={it.lx} y="720" fontFamily={theme.font.family} fontSize="11" fill={theme.color.muted}>{it.label}</text>
        </g>
      ))}
    </g>
  );
}

// The painted world asset, clipped into the baseline's rounded rect.
export function WorldBackdrop({ dataUri }) {
  const { x, y, w, h, r } = WORLD.ASSET;
  return (
    <g>
      <defs>
        <clipPath id="worldClip"><rect x={x} y={y} width={w} height={h} rx={r} /></clipPath>
      </defs>
      <g clipPath="url(#worldClip)">
        <image x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" href={dataUri} />
        <rect x={x} y={y} width={w} height={h} fill="#fbf6f3" opacity="0.06" />
      </g>
      <text x={x + w / 2 - 22} y="70" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="13" fontStyle="italic" fill="#8a8478" opacity="0.9">your future</text>
    </g>
  );
}

// ── Alternative-path spurs ────────────────────────────────────────────────────
// The "paths not taken": dashed branches fanning from the decision node into
// two symmetric columns flanking the institution name at the lower level of
// the plaza, one per non-primary path. VISUAL-ONLY — decorative narrative,
// not interactive (aria-hidden, no pointer events, no handlers). Each is a
// ghosted house-marker (a place you could have gone) + the path's short
// name. The caption "paths not taken" labels the region, centered above them.
//
// Anchor: the decision node's REAL center (passed in), with a fixed fallback if
// absent, so the fan stays attached to wherever the decision station renders.
// Entries are passed in (from alternativePaths()), so this stays pure and the
// set is whatever the consumer resolved (always four when a primary exists).

// Fixed fan targets in the open lower hills (asset coords), kept clear of the
// "REALEQUITYIQ / INSTITUTE OF FINANCIAL INTELLIGENCE" engraving (roughly
// asset y >= 600) — both pairs sit well above that band now, and the curve
// itself bows UPWARD (see the -20 offset below) so it can't sag down into the
// text even at its midpoint.
// ── Alternative-path row ──────────────────────────────────────────────────────
// The "paths not taken": four evenly-spaced markers along the very bottom
// edge of the frame — no connecting lines to the decision node at all (the
// earlier dashed-fan treatment is gone entirely, per explicit request). Each
// is a small, pale compass-rosette crest (echoing the medallion at the
// plaza's center, not a house/pin glyph) + the path's short name. Still
// deliberately low-key (ghost fill/opacity, small size) — these are
// decorative narrative, not real destinations: aria-hidden, no pointer
// events, no handlers.
const BOTTOM_ROW_X = [344, 535, 726, 917]; // evenly spaced across the asset width (248-1012)
const BOTTOM_ROW_Y = 645;

// Small 8-point rosette (two overlapping 4-point stars) — a simplified echo
// of the compass medallion, standing in for the earlier house/pin icon.
function CrestGlyph({ cx, cy, ink }) {
  const outer = 8, inner = 3.2;
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return <polygon points={pts.join(' ')} fill={ink} opacity="0.6" />;
}

export function AlternativePaths({ alternatives }) {
  const items = (alternatives ?? []).slice(0, BOTTOM_ROW_X.length);
  if (items.length === 0) return null;
  const ink = WK.lockInk;
  const rowCenterX = (BOTTOM_ROW_X[0] + BOTTOM_ROW_X[BOTTOM_ROW_X.length - 1]) / 2;

  return (
    <g aria-hidden="true">
      <text x={rowCenterX} y={BOTTOM_ROW_Y - 18} textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="12" fontStyle="italic" fill="#8a8478" opacity="0.85">paths not taken</text>

      {items.map((alt, i) => {
        const cx = BOTTOM_ROW_X[i];
        const cy = BOTTOM_ROW_Y;
        return (
          <g key={alt.key} opacity="0.75">
            <circle cx={cx} cy={cy} r="15" fill={WK.lockFill} stroke={ink} strokeWidth="1.25" opacity="0.9" />
            <CrestGlyph cx={cx} cy={cy} ink={ink} />
            <rect x={cx - 44} y={cy + 20} width="88" height="17" rx="8" fill="#fff" opacity="0.88" />
            <text x={cx} y={cy + 32} textAnchor="middle" fontFamily={theme.font.family}
              fontSize="10.5" fontWeight="600" fill={ink}>{alt.shortLabel}</text>
          </g>
        );
      })}
    </g>
  );
}