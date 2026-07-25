// ============================================
// RealEquityIQ — County Selector Component
//
// Fetches all 92 Indiana counties from Supabase
// and renders a branded dropdown. On selection,
// passes the full county object to the parent.
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { theme, styles } from '../theme.js';

export default function CountySelector({ onCountySelect, selectedCounty }) {
  const [counties, setCounties] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    async function fetchCounties() {
      const { data, error } = await supabase
        .from('counties')
        .select('*')
        .order('name', { ascending: true });   // ← was 'county_name'

      if (error) {
        setError('Could not load counties. Please try again.');
        console.error('Supabase error:', error);
      } else {
        setCounties(data);
      }
      setLoading(false);
    }
    fetchCounties();
  }, []);

  function handleChange(e) {
    const countyId = e.target.value;                          // ← removed parseInt (UUIDs)
    const county   = counties.find(c => c.id === countyId);
    if (county) onCountySelect(county);
  }

  if (loading) return (
    <div style={s.loadingBox}>
      <div style={s.spinner} />
      <p style={{ ...styles.helperText, margin: 0 }}>Loading Indiana counties...</p>
    </div>
  );

  if (error) return (
    <div style={{ ...styles.cardSm, borderColor: theme.color.primary }}>
      <p style={{ color: theme.color.primary, fontSize: theme.font.size.sm, margin: 0 }}>{error}</p>
    </div>
  );

  return (
    <div>

      {/* Dropdown */}
      <div style={styles.cardSm}>
        <label style={styles.label} htmlFor="county-select">
          Select your county
        </label>
        <select
          id="county-select"
          style={{ ...styles.input, cursor: 'pointer' }}
          value={selectedCounty?.id || ''}
          onChange={handleChange}
        >
          <option value="">— Choose a county —</option>
          {counties.map(county => (
            <option key={county.id} value={county.id}>
              {county.name} County              {/* ← was county.county_name */}
            </option>
          ))}
        </select>

        {/* Disclaimer touchpoint 1 */}
        {selectedCounty && (
          <div style={{ ...styles.disclaimer, marginTop: theme.space.sm }}>
            <span style={{ fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>ℹ️</span>
            <p style={{ ...styles.helperText, margin: 0 }}>
              All projections use county-level averages for housing and rental data.
              Your actual results will vary based on property, neighborhood, and timing.
            </p>
          </div>
        )}
      </div>

      {/* County baseline card */}
      {selectedCounty && (
        <div style={{ ...styles.card, marginTop: theme.space.md }}>

          <div style={s.cardHeader}>
            <div style={s.cardHeaderDot} />
            <h3 style={styles.sectionHeading}>
              {selectedCounty.name} County Baseline  {/* ← was county_name */}
            </h3>
          </div>

          <div style={{ marginBottom: theme.space.md }}>
            <span style={{
              ...s.badge,
              background: classificationColor(selectedCounty.market_tier).bg,
              color:      classificationColor(selectedCounty.market_tier).text,
            }}>
              {selectedCounty.market_tier}        {/* ← was classification */}
            </span>
          </div>

          <div style={s.statsGrid}>
            <StatItem label="Median Home Price"  value={`$${selectedCounty.median_home_price?.toLocaleString()}`} />
            <StatItem label="Median Rent"         value={`$${selectedCounty.median_rent?.toLocaleString()}/mo`} />
            <StatItem label="Property Tax Rate"   value={`${(selectedCounty.property_tax_rate * 100).toFixed(2)}%`} />
            <StatItem label="Appreciation Range"  value={`${(selectedCounty.appreciation_rate_low * 100).toFixed(1)}% – ${(selectedCounty.appreciation_rate_high * 100).toFixed(1)}%`} />
          </div>

          <p style={{ ...styles.helperText, marginTop: theme.space.sm, borderTop: `1px solid ${theme.color.line}`, paddingTop: theme.space.sm }}>
            These county-level averages pre-fill your simulation. You can adjust any value to match a specific property.
          </p>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function classificationColor(tier) {
  const map = {
    hot:  { bg: '#fee2e2', text: '#9d0000' },
    warm: { bg: '#fde8d0', text: '#c05a00' },
    cool: { bg: '#d6efe1', text: '#1a6b3c' },
    cold: { bg: '#e8f4fd', text: '#1b4f8c' },
  };
  return map[tier] || { bg: theme.color.soft, text: theme.color.muted };
}

const s = {
  loadingBox: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '20px', background: theme.color.card,
    borderRadius: theme.radius.sm, border: `1px solid ${theme.color.line}`,
  },
  spinner: {
    width: '18px', height: '18px',
    border: `2px solid ${theme.color.line}`,
    borderTop: `2px solid ${theme.color.primary}`,
    borderRadius: '50%', flexShrink: 0,
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  cardHeaderDot: { width: '8px', height: '8px', borderRadius: '50%', background: theme.color.primary, flexShrink: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', letterSpacing: '0.04em' },
};