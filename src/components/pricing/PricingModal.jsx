import { useState } from 'react';
import { theme, styles } from '../../theme.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { PLANS, startCheckout, openBillingPortal } from '../../lib/plans.js';

// Pricing modal. Open to everyone; clicking Subscribe while logged out triggers
// the auth flow first (via onNeedAuth), then the parent re-opens this modal.
//
// Props:
//   onClose()        - close the modal
//   onNeedAuth(plan) - called when a logged-out user clicks Subscribe; parent
//                      should open the auth modal and, on success, resume.
//   currentTier      - the signed-in user's tier ('free'|'pro'|'elite'|'elite_annual')
export default function PricingModal({ onClose, onNeedAuth, currentTier = 'free' }) {
  const { isAuthenticated, session } = useAuth();
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError]     = useState('');

  async function handleSubscribe(plan) {
    setError('');

    // Logged out → hand off to auth; parent resumes checkout after sign-in.
    if (!isAuthenticated) {
      onNeedAuth?.(plan);
      return;
    }

    try {
      setBusyKey(plan.key);
      const token = session?.access_token;
      if (!token) throw new Error('Your session expired. Please sign in again.');
      const result = await startCheckout(plan.priceId, token);
      if (result.portal) {
        // User already subscribed — send them to the billing portal to change
        // plans instead of stacking a duplicate subscription.
        const portalUrl = await openBillingPortal(token);
        window.location.href = portalUrl;
        return;
      }
      // Redirect the browser to Stripe's hosted checkout.
      window.location.href = result.url;
    } catch (err) {
      setError(err.message);
      setBusyKey(null);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(19, 15, 15, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: theme.space.md, overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...styles.card,
          width: '100%', maxWidth: '880px',
          position: 'relative',
          boxShadow: theme.shadow.default,
          margin: 'auto',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: '14px', right: '16px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: '22px', lineHeight: 1, color: theme.color.muted, zIndex: 2,
          }}
        >×</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: theme.space.lg }}>
          <h2 style={{
            fontSize: theme.font.size.xxl, fontWeight: theme.font.weight.bold,
            color: theme.color.ink, margin: '0 0 6px', letterSpacing: '-0.02em',
          }}>Unlock your full picture</h2>
          <p style={{ ...styles.helperText, margin: 0, fontSize: theme.font.size.base }}>
            See Years 10 & 20, compare every path, and track your journey.
          </p>
        </div>

        {error && (
          <div style={{
            ...styles.disclaimer, marginBottom: theme.space.md,
            background: theme.color.primarySoft,
            border: `1px solid ${theme.color.lineStrong}`,
          }}>
            <span style={{ fontSize: theme.font.size.sm, color: theme.color.primaryDark }}>{error}</span>
          </div>
        )}

        {/* Tier cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: theme.space.md,
        }}>
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.key;
            const featured = plan.highlight;
            return (
              <div
                key={plan.key}
                style={{
                  position: 'relative',
                  border: featured
                    ? `2px solid ${theme.color.primary}`
                    : `1.5px solid ${theme.color.line}`,
                  borderRadius: theme.radius.sm,
                  padding: theme.space.md,
                  background: featured ? theme.color.primarySoft : theme.color.card,
                  display: 'flex', flexDirection: 'column',
                }}
              >
                {featured && plan.savingsNote && (
                  <div style={{
                    position: 'absolute', top: '-11px', left: '50%',
                    transform: 'translateX(-50%)',
                    background: theme.color.primary, color: '#fff',
                    fontSize: theme.font.size.xs, fontWeight: theme.font.weight.bold,
                    padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap',
                  }}>{plan.savingsNote}</div>
                )}

                <div style={{ marginBottom: theme.space.sm }}>
                  <div style={{
                    fontSize: theme.font.size.xs, color: theme.color.muted,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    fontWeight: theme.font.weight.semibold,
                  }}>{plan.tierLabel}</div>
                  <div style={{
                    fontSize: theme.font.size.lg, fontWeight: theme.font.weight.bold,
                    color: theme.color.ink,
                  }}>{plan.name}</div>
                </div>

                <div style={{ marginBottom: theme.space.sm }}>
                  <span style={{
                    fontSize: theme.font.size.xxl, fontWeight: theme.font.weight.bold,
                    color: theme.color.ink,
                  }}>{plan.price}</span>
                  <span style={{ fontSize: theme.font.size.base, color: theme.color.muted }}>
                    {plan.cadence}
                  </span>
                </div>

                <ul style={{
                  listStyle: 'none', padding: 0, margin: `0 0 ${theme.space.md}`,
                  flex: 1,
                }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{
                      fontSize: theme.font.size.sm, color: theme.color.ink,
                      lineHeight: 1.5, marginBottom: '7px',
                      display: 'flex', gap: '8px', alignItems: 'flex-start',
                    }}>
                      <span style={{ color: theme.color.success, fontWeight: 700 }}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div style={{
                    textAlign: 'center', padding: '12px',
                    fontSize: theme.font.size.sm, fontWeight: theme.font.weight.semibold,
                    color: theme.color.success, background: theme.color.successSoft,
                    borderRadius: theme.radius.sm,
                  }}>Your current plan</div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={busyKey === plan.key}
                    style={{
                      ...(featured ? styles.btnPrimary : styles.btnGhost),
                      opacity: busyKey === plan.key ? 0.65 : 1,
                      cursor: busyKey === plan.key ? 'default' : 'pointer',
                    }}
                  >
                    {busyKey === plan.key ? 'Starting…' : 'Subscribe'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p style={{
          ...styles.helperText, textAlign: 'center',
          marginTop: theme.space.md, fontSize: theme.font.size.xs,
        }}>
          Secure checkout by Stripe · Cancel anytime · No charge until you confirm
        </p>
      </div>
    </div>
  );
}