// ============================================
// RealWorldIQ — Progress Indicator
//
// Shows current step in the simulation flow.
// Used across all setup screens.
// ============================================

import { theme } from '../theme.js';

const STEPS = [
  { number: 1, label: 'Location' },
  { number: 2, label: 'Profile' },
  { number: 3, label: 'Scenario' },
  { number: 4, label: 'Results' },
];

export default function ProgressBar({ currentStep }) {
  return (
    <div style={s.wrapper}>
      {STEPS.map((step, i) => {
        const isComplete = currentStep > step.number;
        const isActive   = currentStep === step.number;
        const isLast     = i === STEPS.length - 1;

        return (
          <div key={step.number} style={s.stepRow}>
            {/* Step circle */}
            <div style={s.stepCol}>
              <div style={{
                ...s.circle,
                background:  isComplete ? theme.color.primary :
                             isActive   ? theme.color.primary : 'transparent',
                border:      isComplete || isActive
                             ? `2px solid ${theme.color.primary}`
                             : `2px solid ${theme.color.line}`,
                color:       isComplete || isActive ? '#fff' : theme.color.muted,
              }}>
                {isComplete ? '✓' : step.number}
              </div>
              {/* Connector line */}
              {!isLast && (
                <div style={{
                  ...s.line,
                  background: isComplete ? theme.color.primary : theme.color.line,
                }} />
              )}
            </div>
            {/* Label */}
            <span style={{
              ...s.label,
              color:      isActive ? theme.color.primary :
                          isComplete ? theme.color.ink : theme.color.muted,
              fontWeight: isActive ? '600' : '400',
            }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const s = {
  wrapper: {
    display:        'flex',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    marginBottom:   theme.space.lg,
    position:       'relative',
  },
  stepRow: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    flex:          1,
    position:      'relative',
  },
  stepCol: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    width:         '100%',
  },
  circle: {
    width:         '28px',
    height:        '28px',
    borderRadius:  '50%',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    fontSize:      '12px',
    fontWeight:    '700',
    zIndex:        1,
    flexShrink:    0,
  },
  line: {
    width:     '100%',
    height:    '2px',
    marginTop: '-15px',
    position:  'absolute',
    left:      '50%',
    top:       '14px',
    zIndex:    0,
  },
  label: {
    fontSize:   '11px',
    marginTop:  '6px',
    textAlign:  'center',
    letterSpacing: '0.02em',
  },
};