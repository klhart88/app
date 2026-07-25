// ============================================================================
// RealEquityIQ — EnvironmentScene (Path B "lived experience" pop-up)
//
// An environment = a pop-up scene tied to a milestone, three layers:
//   1. VISUAL SCENE     — the lived moment (editorial, warm, not cartoon)
//   2. NARRATED + WRITTEN DESCRIPTION — what the milestone IS in the user's
//      story (uses the SAME useNarration mechanic; environments are the visual
//      body around the audio voice, not a separate system)
//   3. START-TO-FINISH CHECKLIST — the milestone's internal steps
//
// Opens OVER the map (eventually); for now triggerable standalone. Narrates on
// open (rides the session unlock). The user checks off internal steps; when the
// milestone is finished they mark it complete and the component emits onComplete.
//
// PURE PRESENTATION: emits callbacks (onComplete, onClose). It does NOT write to
// the DB or call awardMilestone — that wiring is a later slice, kept out so this
// component stays pure like ProfileSetup / ScenarioPicker.
//
// DATA-DRIVEN LATER: content comes in via the `milestone` prop. Today one
// milestone (pre-approval) is passed in; later these come from milestone_defs.
// ============================================================================

import { useState, useEffect } from 'react';
import { theme, styles } from '../theme.js';
import { useNarration } from '../lib/useNarration.js';
import NarrationControl from './NarrationControl.jsx';
import AnimatedEnvironment from './environments/AnimatedEnvironment.jsx';
import { sceneConfig } from './environments/sceneConfig.js';

// ── Scene visual resolution (still-image + CSS animation) ───────────────────
// Each Environment's hero is a still photograph with lightweight CSS-driven
// ambient motion (steam / curtain light / tree shimmer), NOT a generated video
// — see the animation-approach writeup for why: AI-generated per-scene video
// cost ~12k credits for marginal gain over the CSS approach below, so all 25
// scenes ship as PNG + AnimatedEnvironment.
//
// milestoneKey -> sceneConfig key is an EXPLICIT table, not derived from
// EXECUTION_PATHS' (path, stage) naming, because the two systems' vocabularies
// don't share a single rename rule:
//   - path prefixes only partly line up (buy -> home, invest -> stock, but
//     househack -> hh matches as-is)
//   - stage slots (assess/define/act/commit/arrive) map to a DIFFERENT word in
//     a DIFFERENT order per path (act = "tour" for buy/hh, "research" for
//     invest, "monitor" for wait) — no positional formula covers all five.
// Being explicit here means a typo shows up as a missing scene (falls back to
// the placeholder), never a silently wrong one.
const MILESTONE_TO_SCENE_KEY = {
  // buy (EXECUTION_PATHS key) -> sceneConfig 'home' prefix
  sr_preapproved: 'env-home-preapproved',
  define_home:    'env-home-define',
  sr_toured:      'env-home-tour',
  sr_offer:       'env-home-offer',
  sr_closed:      'env-home-close',

  // househack -> sceneConfig 'hh' prefix
  hh_preapproved: 'env-hh-preapproved',
  hh_define:      'env-hh-define',
  hh_tour:        'env-hh-tour',
  hh_offer:       'env-hh-offer',
  hh_close:       'env-hh-close',

  // invest (EXECUTION_PATHS key) -> sceneConfig 'stock' prefix
  stk_assess:   'env-stock-assess',
  stk_define:   'env-stock-define',
  stk_research: 'env-stock-research',
  stk_execute:  'env-stock-execute',
  stk_optimize: 'env-stock-optimize',

  // wait -> sceneConfig 'wait' prefix (matches as-is)
  wait_assess:   'env-wait-assess',
  wait_define:   'env-wait-define',
  wait_monitor:  'env-wait-monitor',
  wait_build:    'env-wait-build',
  wait_reassess: 'env-wait-reassess',

  // rent -> sceneConfig 'rent' prefix (matches as-is)
  rent_assess:   'env-rent-assess',
  rent_define:   'env-rent-define',
  rent_invest:   'env-rent-invest',
  rent_reassess: 'env-rent-reassess',
  rent_graduate: 'env-rent-graduate',
};

// Resolve a milestone to its sceneConfig entry. Returns null if the milestone
// key isn't in the table (e.g. content drifts ahead of the map above) — the
// caller falls back to a neutral placeholder rather than crashing or fetching
// nothing silently.
export function resolveEnvironmentScene(milestone) {
  const sceneKey = milestone?.key && MILESTONE_TO_SCENE_KEY[milestone.key];
  return sceneKey ? sceneConfig[sceneKey] : null;
}

// Example content shape (pre-approval). Later this is a milestone_defs row.
// Exported so a caller / test harness can pass it straight in.
export const PREAPPROVAL_ENVIRONMENT = {
  key:        'sr_preapproved',
  eyebrow:    'Become a Homeowner · Step 1',
  title:      'Get pre-approved',
  keyQuestion: 'Can I buy now?',

  // ── Scene visual (still image + CSS animation) ────────────────────────────
  // Each environment's hero is a still photograph (public/environments/*.png)
  // with lightweight CSS-driven ambient motion (steam / curtain light / tree
  // shimmer), rendered via AnimatedEnvironment. The milestone `key` above is
  // resolved to a scene through the explicit MILESTONE_TO_SCENE_KEY table
  // (see resolveEnvironmentScene, above) — the key is never used as a
  // filename directly, so renaming/reorganizing scene assets can't touch
  // award identity.

  // The narrated + written description (what this milestone IS).
  description:
    'This is where a lender reviews your income, debts, credit, and cash ' +
    'reserves, and tells you what you can borrow. It\u2019s the moment your ' +
    'buying power becomes real \u2014 you stop guessing what you can afford ' +
    'and start knowing.',
  // audioSrc: NARRATION.preapproval,  // ← drop in a recorded clip later (one line)
  // The start-to-finish checklist (the milestone's internal steps).
  steps: [
    { id: 'income',   label: 'Gather income proof', hint: 'Pay stubs, W-2s, or tax returns' },
    { id: 'debts',    label: 'List your debts',     hint: 'Cards, loans, and monthly obligations' },
    { id: 'credit',   label: 'Check your credit',   hint: 'Know your score before the lender does' },
    { id: 'reserves', label: 'Confirm cash reserves', hint: 'Down payment plus a cushion' },
    { id: 'submit',   label: 'Submit to a lender',  hint: 'Apply and request your pre-approval letter' },
    { id: 'letter',   label: 'Receive pre-approval letter', hint: 'Your buying power, in writing' },
  ],
};

export default function EnvironmentScene({ milestone = PREAPPROVAL_ENVIRONMENT, onComplete, onClose }) {
  const [done, setDone] = useState(() => new Set());

  // Confirm-guard state for the one irreversible moment: marking the milestone
  // complete. The award (record_milestone) is once-per-journey and has no
  // un-award, so a stray tap permanently lights a real-world station and adds
  // IQ. We gate that single emit behind an explicit modal confirmation. This is
  // LOCAL UI only — the component stays pure: on confirm it still just calls
  // onComplete(milestone.key) exactly once, same contract as before.
  const [confirming, setConfirming] = useState(false);

  // Narrated description — autoplays on open. An Environment can only be opened
  // after the audio session is already unlocked (the journey gates entry on it),
  // so we force mode:'autoplay' rather than re-checking isUnlocked() here — the
  // gate would otherwise suppress the intended autoplay. The clip still falls
  // back to the Listen button if the browser refuses for any reason.
  const narration = useNarration(milestone.description, {
    audioSrc: milestone.audioSrc || null,
    mode: 'autoplay',
    enabled: true,
  });

  const total = milestone.steps.length;
  const completed = done.size;
  const allDone = completed === total;
  const pct = Math.round((completed / total) * 100);

  function toggleStep(id) {
    setDone(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    // Faux-viewport overlay: normal flow (no position:fixed) so it works as a
    // pop-up over the map without collapsing height.
    <div style={s.overlay}>
      <div style={s.modal}>

        {/* Close */}
        <button onClick={onClose} style={s.closeBtn} aria-label="Close">×</button>

        {/* ── Layer 1: the visual scene ───────────────────────────── */}
        {(() => {
          const scene = resolveEnvironmentScene(milestone);
          return scene
            ? <div style={s.scene}><AnimatedEnvironment {...scene} /></div>
            : <ScenePlaceholder title={milestone.title} />;
        })()}

        {/* ── Layer 2: narrated + written description ─────────────── */}
        <div style={s.body}>
          <p style={{ ...styles.eyebrow, marginBottom: theme.space.sm }}>{milestone.eyebrow}</p>
          <div style={s.titleRow}>
            <h2 style={s.title}>{milestone.title}</h2>
            <NarrationControl
              status={narration.status}
              supported={narration.supported}
              onPlay={narration.play}
              onReplay={narration.replay}
              onStop={narration.stop}
              label="Listen"
            />
          </div>

          <p style={s.description}>{milestone.description}</p>

          <div style={s.keyQuestion}>
            <span style={s.keyQuestionLabel}>The question this answers</span>
            <span style={s.keyQuestionText}>{milestone.keyQuestion}</span>
          </div>

          {/* ── Layer 3: start-to-finish checklist ───────────────── */}
          <div style={s.checklistHeader}>
            <p style={s.checklistTitle}>What happens, start to finish</p>
            <span style={s.progressText}>{completed} of {total}</span>
          </div>

          <div style={s.progressTrack}>
            <div style={{ ...s.progressFill, width: `${pct}%` }} />
          </div>

          <div style={s.steps}>
            {milestone.steps.map((step, i) => {
              const isDone = done.has(step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => toggleStep(step.id)}
                  style={{
                    ...s.step,
                    background: isDone ? theme.color.successSoft : theme.color.card,
                    borderColor: isDone ? theme.color.success : theme.color.line,
                  }}
                >
                  <span style={{
                    ...s.stepCheck,
                    background: isDone ? theme.color.success : 'transparent',
                    borderColor: isDone ? theme.color.success : theme.color.line,
                    color: isDone ? '#fff' : 'transparent',
                  }}>✓</span>
                  <span style={s.stepText}>
                    <span style={{
                      ...s.stepLabel,
                      color: isDone ? theme.color.success : theme.color.ink,
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>
                      {i + 1}. {step.label}
                    </span>
                    {step.hint && <span style={s.stepHint}>{step.hint}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Completion — opens the confirm guard (does NOT award directly).
              The single irreversible action in this component is gated behind an
              explicit modal so an accidental tap can't permanently claim a
              real-world milestone. */}
          <button
            onClick={() => allDone && setConfirming(true)}
            disabled={!allDone}
            style={{
              ...styles.btnPrimary,
              marginTop: theme.space.md,
              opacity: allDone ? 1 : 0.5,
              cursor: allDone ? 'pointer' : 'not-allowed',
            }}
          >
            {allDone ? 'Mark this milestone complete →' : 'Complete the steps above'}
          </button>
        </div>

        {/* Confirm guard — the one place this Environment can award. */}
        {confirming && (
          <ConfirmComplete
            milestone={milestone}
            onCancel={() => setConfirming(false)}
            onConfirm={() => {
              setConfirming(false);
              onComplete?.(milestone.key);
            }}
          />
        )}
      </div>
    </div>
  );
}


// ── Confirm guard ────────────────────────────────────────────────────────────
// A deliberate modal between "all steps checked" and the irreversible award.
// Owner-chosen over an inline two-step (which is as easy to overlook as the
// first tap). Names the milestone, shows the IQ it adds, and states plainly
// that it can't be undone — so the confirmation is informed, not reflexive.
// Esc / backdrop / Not yet all cancel; only the primary button awards.
function ConfirmComplete({ milestone, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const points = milestone.points;

  return (
    <div
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Mark "${milestone.title}" complete?`}
      style={s.confirmOverlay}
    >
      <div onClick={(e) => e.stopPropagation()} style={s.confirmModal}>
        <p style={s.confirmEyebrow}>Confirm milestone</p>
        <h3 style={s.confirmTitle}>Mark “{milestone.title}” complete?</h3>
        <p style={s.confirmBody}>
          This records the milestone on your journey{typeof points === 'number'
            ? <> and adds <strong style={{ color: theme.color.ink }}>+{points} IQ</strong></>
            : null}. It can’t be undone, so confirm only if you’ve really
          completed this step in real life.
        </p>
        <div style={s.confirmActions}>
          <button onClick={onCancel} style={{ ...styles.btnGhost, width: 'auto' }}>
            Not yet
          </button>
          <button onClick={onConfirm} style={{ ...styles.btnPrimary, width: 'auto' }}>
            Yes, mark it complete
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Layer 1 fallback: neutral placeholder ────────────────────────────────────
// Shown only if a milestone's key isn't in MILESTONE_TO_SCENE_KEY yet (content
// drifted ahead of the map, or a new milestone was added without its scene
// wired up). Never blocks the modal from rendering.
function ScenePlaceholder({ title }) {
  return (
    <div style={s.scene}>
      <div style={s.scenePlaceholderInner} aria-label={title ? `${title} — scene` : 'Scene'} />
    </div>
  );
}

// ── Local styles (matches ProfileSetup / ScenarioPicker conventions) ─────────
const s = {
  overlay: {
    minHeight:       '480px',
    flex:            '1 0 auto',
    background:      'rgba(19, 15, 15, 0.45)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         theme.space.md,
    borderRadius:    theme.radius.default,
  },
  modal: {
    background:    theme.color.card,
    borderRadius:  theme.radius.default,
    boxShadow:     theme.shadow.default,
    maxWidth:      theme.contentWidth,
    width:         '100%',
    maxHeight:     '90vh',
    display:       'flex',
    flexDirection: 'column',
    overflow:      'hidden',
    position:      'relative',
  },
  closeBtn: {
    position:     'absolute',
    top:          '12px',
    right:        '14px',
    zIndex:       2,
    width:        '30px',
    height:       '30px',
    borderRadius: '50%',
    border:       'none',
    background:   'rgba(255,255,255,0.85)',
    color:        theme.color.muted,
    fontSize:     '20px',
    lineHeight:   '1',
    cursor:       'pointer',
  },
  scene: {
    width:        '100%',
    // No fixed aspect-ratio here: AnimatedEnvironment's .env-stage sets its
    // own aspect-ratio (1537/1023, the real source image dimensions) via
    // environmentAnimations.css. Forcing 16/9 here would crop or letterbox
    // against that. This wrapper only supplies chrome (overflow/border).
    flexShrink:   0,
    overflow:     'hidden',
    background:   '#111',
    borderBottom: `1px solid ${theme.color.line}`,
  },
  scenePlaceholderInner: {
    width:      '100%',
    aspectRatio: '1537 / 1023',
    background: '#111',
  },
  body: {
    padding:    theme.space.lg,
    overflowY:  'auto',
    flex:       '1 1 auto',
  },
  eyebrow: {
    fontSize:      theme.font.size.xs,
    fontWeight:    '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color:         theme.color.warning,
    margin:        '0 0 6px 0',
  },
  titleRow: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            theme.space.sm,
    marginBottom:   theme.space.sm,
  },
  title: {
    fontFamily:    theme.font.display,
    fontSize:      theme.font.size.xl,
    fontWeight:    theme.font.weight.heavy,
    color:         theme.color.ink,
    margin:        0,
    letterSpacing: '-0.01em',
  },
  description: {
    fontSize:   theme.font.size.base,
    color:      theme.color.muted,
    lineHeight: '1.6',
    margin:     `0 0 ${theme.space.md} 0`,
  },
  keyQuestion: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '2px',
    padding:       '12px 16px',
    background:    theme.color.soft,
    borderRadius:  theme.radius.sm,
    marginBottom:  theme.space.lg,
  },
  keyQuestionLabel: {
    fontSize:      theme.font.size.xs,
    color:         theme.color.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight:    '600',
  },
  keyQuestionText: {
    fontSize:   theme.font.size.md,
    fontWeight: '700',
    color:      theme.color.ink,
  },
  checklistHeader: {
    display:        'flex',
    alignItems:     'baseline',
    justifyContent: 'space-between',
    marginBottom:   '8px',
  },
  checklistTitle: {
    fontSize:   theme.font.size.sm,
    fontWeight: '700',
    color:      theme.color.ink,
    margin:     0,
  },
  progressText: {
    fontSize:   theme.font.size.sm,
    color:      theme.color.muted,
    fontWeight: '600',
  },
  progressTrack: {
    width:        '100%',
    height:       '6px',
    borderRadius: '3px',
    background:   theme.color.soft,
    overflow:     'hidden',
    marginBottom: theme.space.md,
  },
  progressFill: {
    height:       '100%',
    background:   theme.color.success,
    borderRadius: '3px',
    transition:   'width 0.25s ease',
  },
  steps: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '8px',
  },
  step: {
    display:      'flex',
    alignItems:   'flex-start',
    gap:          '12px',
    padding:      '12px 14px',
    borderRadius: theme.radius.sm,
    border:       `1.5px solid ${theme.color.line}`,
    cursor:       'pointer',
    textAlign:    'left',
    width:        '100%',
    transition:   'all 0.15s ease',
  },
  stepCheck: {
    flexShrink:   0,
    width:        '20px',
    height:       '20px',
    borderRadius: '50%',
    border:       `1.5px solid ${theme.color.line}`,
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    fontSize:     '11px',
    fontWeight:   '700',
    marginTop:    '1px',
  },
  stepText: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '2px',
  },
  stepLabel: {
    fontSize:   theme.font.size.base,
    fontWeight: '600',
  },
  stepHint: {
    fontSize: theme.font.size.sm,
    color:    theme.color.muted,
  },

  // ── Confirm guard ──────────────────────────────────────────────────────────
  confirmOverlay: {
    position:       'absolute',
    inset:          0,
    zIndex:         5,
    background:     'rgba(19, 15, 15, 0.5)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        theme.space.md,
    borderRadius:   theme.radius.default,
  },
  confirmModal: {
    background:    theme.color.card,
    borderRadius:  theme.radius.default,
    boxShadow:     theme.shadow.default,
    border:        `1px solid ${theme.color.line}`,
    maxWidth:      '380px',
    width:         '100%',
    padding:       theme.space.lg,
  },
  confirmEyebrow: {
    fontSize:      theme.font.size.xs,
    fontWeight:    '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color:         theme.color.primary,
    margin:        '0 0 6px 0',
  },
  confirmTitle: {
    fontSize:      theme.font.size.lg,
    fontWeight:    '700',
    color:         theme.color.ink,
    margin:        '0 0 8px 0',
    letterSpacing: '-0.01em',
  },
  confirmBody: {
    fontSize:   theme.font.size.base,
    color:      theme.color.muted,
    lineHeight: '1.6',
    margin:     `0 0 ${theme.space.lg} 0`,
  },
  confirmActions: {
    display:        'flex',
    gap:            theme.space.sm,
    justifyContent: 'flex-end',
  },
};