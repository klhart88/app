import { useState } from 'react';
import { theme, styles } from '../../theme.js';
import { useAuth } from '../../context/AuthContext.jsx';

// Rendered when AuthContext.recoveryMode is true (Supabase fired
// PASSWORD_RECOVERY after the user clicked the reset link in their email).
// At this point Supabase has already established a temporary session from the
// link, so updateUser({ password }) is authorized.
export default function ResetPassword({ onDone }) {
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.column }}>
        <div style={{ ...styles.card, boxShadow: theme.shadow.default }}>

          {/* Brand mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: theme.space.sm }}>
            <div style={{
              width: '30px', height: '30px', minWidth: '30px',
              background: theme.color.primary, borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '800', fontSize: '14px', color: '#fff',
            }}>R</div>
            <span style={{
              fontSize: theme.font.size.lg, fontWeight: '800',
              color: theme.color.ink, letterSpacing: '-0.02em',
            }}>
              RealEquity<span style={{ color: theme.color.primary }}>IQ</span>
            </span>
          </div>

          {done ? (
            <>
              <h2 style={{
                fontSize: theme.font.size.xl, fontWeight: theme.font.weight.bold,
                color: theme.color.ink, margin: '0 0 4px',
              }}>Password updated</h2>
              <p style={{ ...styles.helperText, margin: '0 0 18px' }}>
                Your password has been changed. You're all set.
              </p>
              <button onClick={onDone} style={styles.btnPrimary}>Continue →</button>
            </>
          ) : (
            <>
              <h2 style={{
                fontSize: theme.font.size.xl, fontWeight: theme.font.weight.bold,
                color: theme.color.ink, margin: '0 0 4px',
              }}>Set a new password</h2>
              <p style={{ ...styles.helperText, margin: '0 0 18px' }}>
                Choose a new password for your account.
              </p>

              {error && (
                <div style={{
                  ...styles.disclaimer, marginBottom: theme.space.sm,
                  background: theme.color.primarySoft,
                  border: `1px solid ${theme.color.lineStrong}`,
                }}>
                  <span style={{ fontSize: theme.font.size.sm, color: theme.color.primaryDark }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: theme.space.sm }}>
                  <label style={styles.label}>New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div style={{ marginBottom: theme.space.sm }}>
                  <label style={styles.label}>Confirm new password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    style={styles.input}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  style={{ ...styles.btnPrimary, marginTop: theme.space.xs, opacity: busy ? 0.65 : 1 }}
                >
                  {busy ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
