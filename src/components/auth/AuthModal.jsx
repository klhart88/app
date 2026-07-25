import { useState } from 'react';
import { theme, styles } from '../../theme.js';
import { useAuth } from '../../context/AuthContext.jsx';

// modes: 'signin' | 'signup' | 'forgot'
export default function AuthModal({ initialMode = 'signin', onClose, onSuccess }) {
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode]         = useState(initialMode);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [notice, setNotice]     = useState('');

  function resetMessages() { setError(''); setNotice(''); }

  function switchMode(next) {
    resetMessages();
    setPassword(''); setConfirm('');
    setMode(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    resetMessages();

    if (!email.trim()) { setError('Please enter your email.'); return; }

    if (mode === 'forgot') {
      setBusy(true);
      const { error } = await resetPassword(email);
      setBusy(false);
      // Always show the same confirmation, whether or not the email exists,
      // so we don't reveal which addresses have accounts.
      setNotice('If an account exists for that email, a reset link is on its way. Check your inbox.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    if (mode === 'signup') {
      const { data, error } = await signUp(email, password);
      setBusy(false);
      if (error) { setError(error.message); return; }
      // If email confirmation is on, there's no session yet.
      if (!data.session) {
        setNotice('Account created. Check your email to confirm your address, then sign in.');
        setMode('signin');
        return;
      }
      onSuccess?.();
    } else {
      const { error } = await signIn(email, password);
      setBusy(false);
      if (error) { setError(error.message); return; }
      onSuccess?.();
    }
  }

  const title =
    mode === 'signup' ? 'Create your account' :
    mode === 'forgot' ? 'Reset your password' :
    'Sign in';

  const subtitle =
    mode === 'signup' ? 'Save your journey, track milestones, and unlock full results.' :
    mode === 'forgot' ? "Enter your email and we'll send a reset link." :
    'Welcome back.';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(19, 15, 15, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: theme.space.md,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...styles.card,
          width: '100%', maxWidth: '420px',
          position: 'relative',
          boxShadow: theme.shadow.default,
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: '14px', right: '16px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: '22px', lineHeight: 1, color: theme.color.muted,
          }}
        >×</button>

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

        <h2 style={{
          fontSize: theme.font.size.xl, fontWeight: theme.font.weight.bold,
          color: theme.color.ink, margin: '0 0 4px',
        }}>{title}</h2>
        <p style={{ ...styles.helperText, margin: '0 0 18px' }}>{subtitle}</p>

        {error && (
          <div style={{
            ...styles.disclaimer, marginBottom: theme.space.sm,
            background: theme.color.primarySoft,
            border: `1px solid ${theme.color.lineStrong}`,
          }}>
            <span style={{ fontSize: theme.font.size.sm, color: theme.color.primaryDark }}>{error}</span>
          </div>
        )}
        {notice && (
          <div style={{
            ...styles.disclaimer, marginBottom: theme.space.sm,
            background: theme.color.successSoft,
            border: `1px solid ${theme.color.success}`,
          }}>
            <span style={{ fontSize: theme.font.size.sm, color: theme.color.success }}>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: theme.space.sm }}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {mode !== 'forgot' && (
            <div style={{ marginBottom: theme.space.sm }}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>
          )}

          {mode === 'signup' && (
            <div style={{ marginBottom: theme.space.sm }}>
              <label style={styles.label}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={styles.input}
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              ...styles.btnPrimary,
              marginTop: theme.space.xs,
              opacity: busy ? 0.65 : 1,
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            {busy ? 'Please wait…' :
              mode === 'signup' ? 'Create account' :
              mode === 'forgot' ? 'Send reset link' :
              'Sign in'}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ marginTop: theme.space.md, textAlign: 'center' }}>
          {mode === 'signin' && (
            <>
              <p style={{ ...styles.helperText, margin: '0 0 6px' }}>
                <LinkButton onClick={() => switchMode('forgot')}>Forgot password?</LinkButton>
              </p>
              <p style={{ ...styles.helperText, margin: 0 }}>
                New here?{' '}
                <LinkButton onClick={() => switchMode('signup')}>Create an account</LinkButton>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p style={{ ...styles.helperText, margin: 0 }}>
              Already have an account?{' '}
              <LinkButton onClick={() => switchMode('signin')}>Sign in</LinkButton>
            </p>
          )}
          {mode === 'forgot' && (
            <p style={{ ...styles.helperText, margin: 0 }}>
              <LinkButton onClick={() => switchMode('signin')}>← Back to sign in</LinkButton>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: theme.color.primary, fontWeight: theme.font.weight.semibold,
        fontSize: theme.font.size.sm, textDecoration: 'none',
      }}
    >{children}</button>
  );
}
