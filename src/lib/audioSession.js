// ============================================================================
// RealEquityIQ — audioSession (Path B guided-audio unlock, v2)
//
// Browsers block audio that isn't tied to a user gesture. This module turns ONE
// real gesture (the "Run My Simulation" click) into a session-wide audio unlock,
// so later narration can autoplay on screen entry without each screen needing
// its own tap.
//
// HOW THE UNLOCK WORKS (and why the tone matters):
//   The reliable way to "warm" the audio context is to actually EMIT sound from
//   inside the gesture handler. So unlock() plays a short, soft tone via the Web
//   Audio API (the most dependable unlocker — more so than SpeechSynthesis). That
//   act of producing audio during the click is what flips the browser to "this
//   session may play audio". We also resume() the AudioContext, which some
//   browsers require.
//
// SWAP-FOR-REAL-SOUND: replace playTone() with an <audio>/AudioBufferSource that
//   plays a designed transition sound file. Keep calling it from inside the
//   gesture handler. The PUBLIC API (unlock, isUnlocked) stays the same.
//
// HONEST LIMIT: even after unlock, SpeechSynthesis specifically can be re-gated
//   by some browsers across navigation. Real recorded <audio> clips carry the
//   unlock far more reliably. So callers should always keep a tap fallback
//   (the Listen button) for any autoplay that's still refused.
//
// ── v2: SOUND PREFERENCE ────────────────────────────────────────────────────
// unlock()/isUnlocked() answer "is the browser ALLOWED to play audio this
// session" — a one-time permission flag that resets on reload and carries no
// user intent. isMuted()/setMuted() answer a different question: "does this
// user WANT sound," persisted to profiles.sound_muted so it holds across
// devices and sessions, mirroring how profiles.identity_path and
// profiles.total_points already persist per-user state.
//
// This is the SINGLE shared preference for all audio in the app — narration
// (useNarration) and the Promenade's milestone/celebration cues both check
// isMuted() before playing, rather than each maintaining its own flag that
// could disagree with the other.
// ============================================================================

import { supabase } from '../supabase.js';

let _unlocked = false;
let _audioCtx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_audioCtx) _audioCtx = new AC();
  return _audioCtx;
}

// A short, soft two-note tone — calm and premium, not a game chime. Placeholder
// for a real designed transition sound (swap this body for buffer playback).
function playTone(ctx) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.connect(ctx.destination);

  // gentle fade in/out so it reads as a soft "whoosh-tone", never a beep
  master.gain.exponentialRampToValueAtTime(0.06, now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

  const notes = [392.0, 523.25]; // G4 → C5, a calm rising pair
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, now);
    osc.connect(g);
    g.connect(master);
    osc.start(now + i * 0.08);
    osc.stop(now + 0.55);
  });
}

// Call this FROM A USER GESTURE handler (e.g. the Run My Simulation onClick).
// Plays the unlock tone and marks the session audio-enabled. Safe to call more
// than once; only the first does the work. Never throws.
export function unlock() {
  if (_unlocked) return true;
  try {
    const ctx = getCtx();
    if (!ctx) { _unlocked = true; return true; } // no Web Audio: mark unlocked, rely on tap fallback
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    playTone(ctx);
    // Also nudge SpeechSynthesis awake within the gesture (helps some browsers).
    if (window.speechSynthesis) {
      try { window.speechSynthesis.resume(); } catch { /* ignore */ }
    }
    _unlocked = true;
    return true;
  } catch {
    _unlocked = true; // don't block the flow; tap fallback still works
    return true;
  }
}

export function isUnlocked() {
  return _unlocked;
}

// For testing/reset only.
export function _resetForTest() {
  _unlocked = false;
}

// ============================================================================
// Sound preference (profiles.sound_muted)
// ============================================================================

let _muted = false;         // in-memory cache; default unmuted until loaded
let _mutedLoaded = false;   // true once we've attempted a load (success or not)
let _userId = null;         // the profile row this cache belongs to

// Call once after auth resolves (e.g. in AppInner, when `user` becomes
// available) so the cache reflects this user's stored preference before
// anything tries to play a cue. Signed-out / anonymous sessions get a
// session-only default of unmuted (nothing to persist to).
export async function initSoundPreference(userId) {
  _userId = userId ?? null;

  if (!_userId) {
    _muted = false;
    _mutedLoaded = true;
    return _muted;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('sound_muted')
      .eq('id', _userId)
      .maybeSingle();
    if (error) throw error;
    _muted = data?.sound_muted ?? false;
  } catch (e) {
    console.warn('initSoundPreference: could not load sound_muted, defaulting to unmuted:', e?.message ?? e);
    _muted = false;
  } finally {
    _mutedLoaded = true;
  }
  return _muted;
}

// Synchronous read — safe to call from any render or before playing any cue.
// Returns false (audible) if the preference hasn't loaded yet; callers that
// need to distinguish "not yet loaded" from "loaded and unmuted" should check
// isSoundPreferenceLoaded() as well.
export function isMuted() {
  return _muted;
}

export function isSoundPreferenceLoaded() {
  return _mutedLoaded;
}

// Sets the preference, optimistically updating the in-memory cache first so
// the UI (and any in-flight cue check) reflects the change immediately, then
// persisting to profiles. Reverts the cache if the write fails, so a failed
// persist never leaves the app believing something the database doesn't have.
// Signed-out sessions update the cache only (nothing to persist to).
export async function setMuted(nextMuted) {
  const previous = _muted;
  _muted = nextMuted;

  if (!_userId) return _muted; // session-only; no profile row to write to

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ sound_muted: nextMuted })
      .eq('id', _userId);
    if (error) throw error;
  } catch (e) {
    console.warn('setMuted: persistence failed, reverting to previous value:', e?.message ?? e);
    _muted = previous;
  }
  return _muted;
}

// For testing/reset only.
export function _resetSoundPreferenceForTest() {
  _muted = false;
  _mutedLoaded = false;
  _userId = null;
}
