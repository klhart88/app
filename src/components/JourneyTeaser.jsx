// ============================================================================
// RealEquityIQ — Journey Teaser (marketing surface)
//
// A looping, non-interactive PREVIEW of the Pro journey map, for the landing
// page. It is NOT the real map: no data, no auth, no awarding. It reuses the
// shared trail kit (journeyTrailKit) so its look + geometry are byte-for-byte
// the real map's — change a token there and this follows. The ONLY thing this
// adds over the kit is a scripted, looping timeline that walks the avatar
// through a curated marketing sequence:
//
//   walk → milestone → walk → milestone → environment scene → walk →
//   milestone → lens "aha" → settle → loop
//
// Motion/timing was locked in journey_teaser_preview_v2.html. This is that
// timing, re-expressed on the real kit primitives.
//
// ── OPEN PRODUCT DECISION (see handoff) ──────────────────────────────────────
// The environment scene depicts the deferred "situational environments" feature
// (not built). As a polished animation it can read as "this exists". The
// `showEnvironmentScene` prop defaults to TRUE but exists so the scene can be
// turned OFF for a built-features-only teaser without code changes. Decide
// deliberately before publishing to leads.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { theme } from '../theme.js';
import {
  TRAIL,
  computeLayout, buildSmoothPath, safePointAt, measurePath,
  GridBackdrop, TrailStation, TrailAvatar,
} from './journeyTrailKit.jsx';

// Curated marketing stations — a 5-beat subset of the real STATION_ORDER, using
// REAL milestone labels/points/categories (from milestone_defs) so the teaser
// shows the true product vocabulary. Not the full 10 — a teaser tells a tight
// story. Order: a couple of in-app wins, then the headline real-world close.
const TEASER_STATIONS = [
  { milestone_key: 'complete_profile', label: 'Complete financial profile', points: 10,  category: 'system'      },
  { milestone_key: 'first_simulation', label: 'Run first simulation',       points: 15,  category: 'system'      },
  { milestone_key: 'compare_3_paths',  label: 'Compare 3 decision paths',   points: 25,  category: 'action'      },
  { milestone_key: 'run_all_5',        label: 'Run all 5 scenarios',        points: 40,  category: 'action'      },
  { milestone_key: 'sr_closed',        label: 'Closed on a home',           points: 500, category: 'self_report' },
];

// The lens aha shown mid-loop (the renter's view — matches the real lens copy).
const TEASER_AHA = {
  label: 'The renter\u2019s view',
  line1: 'What is flexibility worth',
  line2: 'over the next few years?',
};

// IQ tag the avatar carries through the teaser (static — no live points).
const TEASER_IQ = 90;

export default function JourneyTeaser({ showEnvironmentScene = true }) {
  const pathRef = useRef(null);
  const [geom, setGeom] = useState(null);   // { total, lenAt }
  const [t, setT] = useState(0);            // current loop time (seconds)

  const stations = TEASER_STATIONS;
  const { centers, width, height } = computeLayout(stations.length);
  const dPath = buildSmoothPath(centers);

  // Measure the real path once (same sampling the real map uses).
  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    setGeom(measurePath(el, centers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dPath]);

  // ── Looping clock ──────────────────────────────────────────────────────────
  // Respects reduced-motion: if the user prefers reduced motion, we hold a
  // single completed frame (avatar at the end, all lit) instead of animating.
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setT(DUR - 0.01); return; }   // static "finished" frame
    let raf, start = null;
    const tick = (now) => {
      if (start === null) start = now;
      setT(((now - start) / 1000) % TOTAL);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Station path-fractions (0..1), derived from the measured geometry.
  const fracs = geom ? geom.lenAt.map((l) => l / geom.total) : stations.map(() => 0);

  // ── Timeline (seconds) — the locked sequence ───────────────────────────────
  // Fractions F0..F4 = the five stations. Avatar pauses at each; the
  // environment scene interrupts between station 3 and 4; the aha fires at the
  // final station. (Mirrors journey_teaser_preview_v2.html, generalized to the
  // real geometry.)
  const F = fracs;
  const FW = geom ? F[2] + (F[3] - F[2]) * 0.5 : 0; // env waypoint between st2 and st3

  // progress fraction at time t
  const frac = computeFrac(t, F, FW, showEnvironmentScene);

  const len = geom ? geom.total * frac : 0;
  const avatarPt = geom && pathRef.current
    ? safePointAt(pathRef.current, len)
    : (centers[0] ?? { x: 0, y: 0 });

  // Which stations are "lit" — earned as the avatar passes them.
  const litThrough = geom
    ? fracs.map((f) => frac >= f - 0.004 && t < DUR)
    : fracs.map(() => false);

  // Scene + aha visibility windows.
  const envOn  = showEnvironmentScene && t >= TL.env[0] && t < TL.env[1];
  const envHalf = (TL.env[0] + TL.env[1]) / 2;
  const ahaOn  = t >= TL.aha[0] && t < TL.aha[1];

  // Place the env + aha cards in clear space relative to the measured layout.
  // Env: centered horizontally, in the band just below the top row. Aha:
  // anchored near the final station, offset up-and-left into open space.
  const envX = width / 2 - 95;
  const envY = TRAIL_TOP + 34;
  const finalC = centers[centers.length - 1] ?? { x: width / 2, y: height / 2 };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ display: 'block', maxWidth: `${width}px`, margin: '0 auto', overflow: 'visible' }}
        role="img"
        aria-label="A preview of your RealEquityIQ journey: an avatar walks a trail, lighting milestones and surfacing insights."
      >
        <GridBackdrop width={width} height={height} />

        {/* Untraveled champagne line (carries the ref for measurement). */}
        <path
          ref={pathRef}
          d={dPath}
          fill="none"
          stroke={TRAIL.line}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Traveled red line — revealed to the avatar's position. */}
        {geom && (
          <path
            d={dPath}
            fill="none"
            stroke={theme.color.primary}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={geom.total}
            strokeDashoffset={geom.total - len}
          />
        )}

        {/* Stations (reused kit component) — lit as the avatar passes. */}
        {stations.map((s, i) => (
          <TrailStation
            key={s.milestone_key}
            cx={centers[i].x}
            cy={centers[i].y}
            index={i}
            station={s}
            lit={litThrough[i]}
            isNext={false}
          />
        ))}

        {/* Environment scene (teaser-only; the deferred feature, previewed). */}
        {envOn && (
          <EnvironmentScene x={envX} y={envY} showHome={t >= envHalf} />
        )}

        {/* Lens aha (teaser-only card), anchored near the final station. */}
        {ahaOn && (
          <AhaCard x={Math.max(8, finalC.x - 210)} y={Math.max(8, finalC.y - 92)} />
        )}

        {/* Avatar (reused kit component) with a static IQ tag. */}
        {geom && <TrailAvatar x={avatarPt.x} y={avatarPt.y} iqTag={TEASER_IQ} />}
      </svg>
    </div>
  );
}

// ── Timeline constants ────────────────────────────────────────────────────────
// Seconds. The walk segments interpolate between station fractions; pauses hold.
const TL = {
  w0:[0.0, 1.6],  pE:[1.6, 2.2],           // walk to st1, quick pause
  w1:[2.2, 3.8],  p1:[3.8, 5.2],           // walk to st2, pause
  w2:[5.2, 6.6],                            // walk to st3
  env:[6.6, 10.6],                          // environment scene (avatar holds at st3)
  w3:[10.6, 12.8], p3:[12.8, 13.4],         // walk to final station
  aha:[13.4, 16.8],                         // lens aha at final station
  settle:[16.8, 18.0],
};
const DUR = 18.0;
const GAP = 1.6;            // rewind
const TOTAL = DUR + GAP;
const TRAIL_TOP = 60;       // matches kit PAD_Y

function ease(x){ return x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x+2, 2)/2; }
function seg(t,a,b){ if(t<=a) return 0; if(t>=b) return 1; return (t-a)/(b-a); }

// Progress fraction along the path at time t. Five stations F[0..4].
// When showEnvironmentScene is false, the env hold collapses to a short pause
// so the loop stays smooth without the scene.
function computeFrac(t, F, FW, withEnv){
  if (F.length < 5) return 0;
  const [F0,F1,F2,F3,F4] = F;
  if (t < TL.w0[1]) return F0 + (F1-F0)*ease(seg(t,TL.w0[0],TL.w0[1]));
  if (t < TL.w1[0]) return F1;                                  // quick pause st1
  if (t < TL.w1[1]) return F1 + (F2-F1)*ease(seg(t,TL.w1[0],TL.w1[1]));
  if (t < TL.w2[0]) return F2;                                  // pause st2
  if (t < TL.w2[1]) return F2 + (F3-F2)*ease(seg(t,TL.w2[0],TL.w2[1]));
  if (t < TL.w3[0]) return F3;                                  // hold at st3 (env scene)
  if (t < TL.w3[1]) return F3 + (F4-F3)*ease(seg(t,TL.w3[0],TL.w3[1]));
  if (t < DUR)      return F4;                                  // final station: aha + settle
  return F4 - ease((t-DUR)/GAP)*F4;                            // rewind
}

// ── Teaser-only cards (not part of the kit — marketing chrome) ────────────────

function EnvironmentScene({ x, y, showHome }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width="190" height="84" rx="14" fill="#ffffff" stroke={TRAIL.line} strokeWidth="2" />
      <text x={x + 95} y={y + 18} textAnchor="middle" fontSize="11" fontWeight="700"
        fontFamily={theme.font.family} fill={TRAIL.realInk}>
        A glimpse of what&#39;s coming
      </text>
      {!showHome ? (
        <g>
          <circle cx={x + 62} cy={y + 48} r="12" fill={TRAIL.inAppFill} />
          <circle cx={x + 62} cy={y + 44} r="4" fill={TRAIL.inAppInk} />
          <path d={`M ${x+54} ${y+54} Q ${x+62} ${y+48} ${x+70} ${y+54} Z`} fill={TRAIL.inAppInk} />
          <rect x={x + 82} y={y + 42} width="54" height="6" rx="3" fill={TRAIL.line} />
          <rect x={x + 82} y={y + 52} width="38" height="6" rx="3" fill={TRAIL.line} />
          <text x={x + 95} y={y + 78} textAnchor="middle" fontSize="12" fontWeight="500"
            fontFamily={theme.font.family} fill={theme.color.ink}>Meet your agent</text>
        </g>
      ) : (
        <g>
          <polygon points={`${x+95},${y+34} ${x+73},${y+48} ${x+117},${y+48}`}
            fill={TRAIL.realFill} stroke={TRAIL.realInk} strokeWidth="1.5" />
          <rect x={x + 79} y={y + 48} width="32" height="20" fill="#fff" stroke={TRAIL.realInk} strokeWidth="1.5" />
          <rect x={x + 83} y={y + 53} width="9" height="9" fill={TRAIL.inAppFill} />
          <rect x={x + 99} y={y + 53} width="8" height="15" fill={TRAIL.inAppInk} />
          <text x={x + 95} y={y + 78} textAnchor="middle" fontSize="12" fontWeight="500"
            fontFamily={theme.font.family} fill={theme.color.ink}>Tour the home</text>
        </g>
      )}
    </g>
  );
}

function AhaCard({ x, y }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width="200" height="64" rx="12" fill="#ffffff" stroke={TRAIL.inAppFill} strokeWidth="1.5" />
      <circle cx={x + 20} cy={y + 22} r="8" fill={TRAIL.inAppFill} stroke={TRAIL.inAppInk} strokeWidth="1.5" />
      <text x={x + 16} y={y + 26} fontSize="11" fontWeight="700" fontFamily={theme.font.family} fill={TRAIL.inAppInk}>i</text>
      <text x={x + 36} y={y + 20} fontSize="13" fontWeight="700" fontFamily={theme.font.family} fill={theme.color.ink}>
        {TEASER_AHA.label}
      </text>
      <text x={x + 16} y={y + 42} fontSize="11" fontFamily={theme.font.family} fill={theme.color.muted}>
        {TEASER_AHA.line1}
      </text>
      <text x={x + 16} y={y + 56} fontSize="11" fontFamily={theme.font.family} fill={theme.color.muted}>
        {TEASER_AHA.line2}
      </text>
    </g>
  );
}