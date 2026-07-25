import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]               = useState(null);
  const [user, setUser]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [recoveryMode, setRecoveryMode]     = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState(null); // 'free' | 'pro' | 'elite' | 'elite_annual' | null

  // Fetch the user's profile row from the profiles table to get tier.
  // CHANGED: this previously queried `.from('users').select('subscription_tier')`
  // — but public.users has no subscription_tier column at all (its own tier
  // column is named `tier`), and more importantly the Stripe webhook never
  // writes to `users` in the first place; it writes to profiles.tier
  // (reconciled live against Stripe on every subscription event — see
  // stripe-webhook/index.ts's reconcileUserTier). That mismatch meant this
  // query errored on every load and silently fell through to the 'explorer'
  // default below, every single time — so isPro/isElite never reflected a
  // real subscription regardless of what Stripe or the webhook did correctly.
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setSubscriptionTier(null); return; }
    const { data, error } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setSubscriptionTier(data.tier ?? 'free');
    } else {
      // Row may not exist yet for brand-new accounts — default to free.
      setSubscriptionTier('free');
    }
  }, []);

  useEffect(() => {
    // Get any existing session on first load.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      fetchProfile(data.session?.user?.id ?? null);
      setLoading(false);
    });

    // Subscribe to auth state changes (login, logout, token refresh, recovery).
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      fetchProfile(newSession?.user?.id ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Derived tier helpers ──────────────────────────────────────
  // Use these in any component instead of string-comparing the tier directly.
  // CHANGED: 'pathfinder'/'market_expert' were the users.tier enum's values
  // (a different, unrelated column — see the fetchProfile fix above).
  // profiles.tier — what fetchProfile now actually reads, and what the
  // Stripe webhook actually writes — uses 'pro' / 'elite' / 'elite_annual'
  // (see supabase/functions/_shared/stripe-config.ts's PRICE_TO_PLAN).
  const isPro   = subscriptionTier === 'pro' || subscriptionTier === 'elite' || subscriptionTier === 'elite_annual';
  const isElite = subscriptionTier === 'elite' || subscriptionTier === 'elite_annual';

  // ── Auth actions ──────────────────────────────────────────────

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/?recovery=1` }
    );
    return { data, error };
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setRecoveryMode(false);
    return { data, error };
  }, []);

  // Allows any component to refresh the tier after a Stripe checkout completes.
  const refreshProfile = useCallback(() => {
    if (user?.id) fetchProfile(user.id);
  }, [user, fetchProfile]);

  const value = {
    session,
    user,
    loading,
    isAuthenticated: !!user,
    recoveryMode,
    setRecoveryMode,
    subscriptionTier,   // 'explorer' | 'pathfinder' | 'market_expert' | null
    isPro,              // true for pathfinder + market_expert
    isElite,            // true for market_expert only
    refreshProfile,     // call after Stripe checkout to re-read tier
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
