// ============================================
// RealEquityIQ — Profile Setup (Step 2)
//
// Collects user financial inputs, pre-filled
// with county medians. User can adjust any value.
// Currency fields format with commas as you type.
// Disclaimer touchpoint 2 shown here.
// ============================================

import { useState } from 'react';
import { theme, styles } from '../theme.js';

// Fields that should use currency formatting
const CURRENCY_FIELDS = ['homePrice', 'monthlyRent', 'downPayment', 'savings', 'monthlyIncome'];

// Format a number as a comma-separated string (no $ sign, no decimals for currency)
function formatCurrency(val) {
  if (val === '' || val == null) return '';
  const num = typeof val === 'string' ? val.replace(/[^0-9]/g, '') : String(Math.round(val));
  if (num === '') return '';
  return Number(num).toLocaleString();
}

// Parse a formatted currency string back to a number
function parseCurrency(str) {
  const raw = str.replace(/[^0-9]/g, '');
  return raw === '' ? 0 : Number(raw);
}

export default function ProfileSetup({ county, onNext, onBack }) {
  // Store raw numbers internally
  const [inputs, setInputs] = useState({
    homePrice:     county.median_home_price || 250000,
    monthlyRent:   county.median_rent       || 1200,
    downPayment:   20000,
    interestRate:  7.0,
    savings:       20000,
    monthlyIncome: 5833,
  });

  // Display values for currency fields (formatted strings)
  const [displayValues, setDisplayValues] = useState({
    homePrice:     formatCurrency(county.median_home_price || 250000),
    monthlyRent:   formatCurrency(county.median_rent       || 1200),
    downPayment:   formatCurrency(20000),
    savings:       formatCurrency(20000),
    monthlyIncome: formatCurrency(5833),
  });

  function handleCurrencyChange(field, raw) {
    // Strip everything except digits
    const digitsOnly = raw.replace(/[^0-9]/g, '');
    const num = digitsOnly === '' ? 0 : Number(digitsOnly);
    setInputs(prev => ({ ...prev, [field]: num }));
    setDisplayValues(prev => ({
      ...prev,
      [field]: digitsOnly === '' ? '' : Number(digitsOnly).toLocaleString(),
    }));
  }

  function handleCurrencyBlur(field) {
    // On blur, make sure display is properly formatted even if empty
    setDisplayValues(prev => ({
      ...prev,
      [field]: formatCurrency(inputs[field]),
    }));
  }

  function handleRateChange(value) {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    setInputs(prev => ({ ...prev, interestRate: isNaN(num) ? 0 : num }));
  }

  function handleSubmit() {
    onNext(inputs);
  }

  return (
    <div>

      {/* Back button */}
      <button onClick={onBack} style={s.backBtn}>
        ← Back
      </button>

      {/* Heading */}
      <div style={{ marginBottom: theme.space.lg }}>
        <h2 style={s.heading}>Your financial profile</h2>
        <p style={styles.helperText}>
          We've pre-filled these from {county.county_name} County averages.
          Adjust any value to match your actual situation.
        </p>
      </div>

      {/* Disclaimer touchpoint 2 */}
      <div style={{ ...styles.disclaimer, marginBottom: theme.space.md }}>
        <span style={{ fontSize: '13px', flexShrink: 0 }}>ℹ️</span>
        <p style={{ ...styles.helperText, margin: 0 }}>
          This simulation uses county-level market assumptions.
          Adjust inputs to match a specific property for more precision.
        </p>
      </div>

      {/* Input fields */}
      <div style={styles.card}>

        <div style={s.section}>
          <p style={s.sectionTitle}>HOUSING</p>

          <CurrencyField
            label="Target home price"
            value={displayValues.homePrice}
            onChange={v => handleCurrencyChange('homePrice', v)}
            onBlur={() => handleCurrencyBlur('homePrice')}
            prefix="$"
            hint="Pre-filled from county median"
          />
          <CurrencyField
            label="Current monthly rent"
            value={displayValues.monthlyRent}
            onChange={v => handleCurrencyChange('monthlyRent', v)}
            onBlur={() => handleCurrencyBlur('monthlyRent')}
            prefix="$"
            suffix="/mo"
            hint="Pre-filled from county median"
          />
          <CurrencyField
            label="Down payment available"
            value={displayValues.downPayment}
            onChange={v => handleCurrencyChange('downPayment', v)}
            onBlur={() => handleCurrencyBlur('downPayment')}
            prefix="$"
            hint={`${((inputs.downPayment / inputs.homePrice) * 100).toFixed(1)}% of home price`}
          />
          <RateField
            label="Current interest rate"
            value={inputs.interestRate}
            onChange={handleRateChange}
            suffix="%"
            hint="30-year fixed mortgage rate"
          />
        </div>

        <div style={{ ...s.section, borderTop: `1px solid ${theme.color.line}`, paddingTop: theme.space.md, marginTop: theme.space.md }}>
          <p style={s.sectionTitle}>FINANCES</p>

          <CurrencyField
            label="Total savings"
            value={displayValues.savings}
            onChange={v => handleCurrencyChange('savings', v)}
            onBlur={() => handleCurrencyBlur('savings')}
            prefix="$"
            hint="All liquid savings available"
          />
          <CurrencyField
            label="Monthly income (gross)"
            value={displayValues.monthlyIncome}
            onChange={v => handleCurrencyChange('monthlyIncome', v)}
            onBlur={() => handleCurrencyBlur('monthlyIncome')}
            prefix="$"
            suffix="/mo"
            hint={`~$${Math.round(inputs.monthlyIncome * 12).toLocaleString()}/year`}
          />
        </div>

      </div>

      {/* Continue button */}
      <button
        onClick={handleSubmit}
        style={{ ...styles.btnPrimary, marginTop: theme.space.md }}
      >
        Choose Your Scenario →
      </button>

    </div>
  );
}


// ── Currency input (text-based, formats as you type) ──

function CurrencyField({ label, value, onChange, onBlur, prefix, suffix, hint }) {
  return (
    <div style={{ marginBottom: theme.space.md }}>
      <label style={styles.label}>{label}</label>
      <div style={s.inputWrapper}>
        {prefix && <span style={s.inputAddon}>{prefix}</span>}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          style={{
            ...styles.input,
            paddingLeft:  prefix ? '36px' : '16px',
            paddingRight: suffix ? '48px' : '16px',
          }}
        />
        {suffix && <span style={s.inputAddonRight}>{suffix}</span>}
      </div>
      {hint && <p style={styles.helperText}>{hint}</p>}
    </div>
  );
}


// ── Rate input (numeric, allows decimals) ──

function RateField({ label, value, onChange, suffix, hint }) {
  return (
    <div style={{ marginBottom: theme.space.md }}>
      <label style={styles.label}>{label}</label>
      <div style={s.inputWrapper}>
        <input
          type="number"
          value={value}
          step="0.1"
          onChange={e => onChange(e.target.value)}
          style={{
            ...styles.input,
            paddingLeft:  '16px',
            paddingRight: suffix ? '48px' : '16px',
          }}
        />
        {suffix && <span style={s.inputAddonRight}>{suffix}</span>}
      </div>
      {hint && <p style={styles.helperText}>{hint}</p>}
    </div>
  );
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
  heading: {
    fontSize:      theme.font.size.xl,
    fontWeight:    '700',
    color:         theme.color.ink,
    margin:        '0 0 6px 0',
    letterSpacing: '-0.01em',
  },
  section: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize:      theme.font.size.xs,
    fontWeight:    '700',
    color:         theme.color.muted,
    letterSpacing: '0.08em',
    margin:        `0 0 ${theme.space.md} 0`,
  },
  inputWrapper: {
    position:   'relative',
    display:    'flex',
    alignItems: 'center',
  },
  inputAddon: {
    position:   'absolute',
    left:       '14px',
    color:      theme.color.muted,
    fontSize:   theme.font.size.base,
    fontWeight: '500',
    zIndex:     1,
  },
  inputAddonRight: {
    position:   'absolute',
    right:      '14px',
    color:      theme.color.muted,
    fontSize:   theme.font.size.sm,
    fontWeight: '500',
  },
};