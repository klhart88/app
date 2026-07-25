// ============================================================================
// RealEquityIQ — useNarration (Path B guided-audio mechanic)
//
// The single reusable audio mechanic for the guided journey. Every narrated
// beat (Discovery stops, Execution milestones) uses THIS.
//
// TWO ENGINES, ONE API:
//   - REAL CLIP (preferred): pass `audioSrc` (an imported/hosted audio file).
//     Played via an <audio> element — the same dependable pathway as the unlock
//     tone, so it rides the session unlock and autoplays reliably on entry.
//   - SPEECH SYNTHESIS (fallback): if no `audioSrc`, speak `text` via the
//     browser's SpeechSynthesis. Free/robotic, and re-gated by some browsers
//     across navigation — use only where a recorded clip isn't available yet.
// The public API (status, play, replay, stop, supported) is identical for both,
// so callers don't care which engine is in use.
//
// AUTOPLAY: fires once on mount if the audio session was unlocked upstream (the
// Run My Simulation tone warms the context) OR mode==='autoplay'. The clip path
// is interrupt-safe against React StrictMode's dev double-mount (a benign
// AbortError from an interrupted play is ignored, not treated as 'blocked').
// Any genuine autoplay refusal flips status to 'blocked' so the caller shows
// the Listen tap fallback.
//
// ACCESSIBILITY: respects prefers-reduced-motion (treated as "don't autoplay").
//
// SOUND PREFERENCE (v2): also respects the shared, persisted sound_muted
// preference from audioSession.js — the SAME flag the Promenade's milestone
// and celebration cues check, so narration and completion audio never disagree
// about whether this user wants sound. Muted gates AUTOPLAY only, mirroring
// exactly how prefersReducedMotion() is already scoped here: a muted session
// won't start narration on its own, but an explicit Listen/Replay tap is a
// deliberate in-the-moment request and still works, the same way a reduced-
// motion session can still tap to hear a clip. If a future requirement needs
// mute to block explicit taps too, gate play()/replay() on isMuted() as well.
//
// HONEST LIMIT: isMuted() is a plain synchronous getter (a module-level cache
// in audioSession.js), not a subscribable value. If the user flips the mute
// toggle WHILE a clip is already playing, this hook has no way to know and
// react mid-playback — it only re-checks isMuted() the next time something
// tries to autoplay. Fine for now (mute/unmute mid-narration is an edge case),
// but worth knowing if that ever needs to be tightened.
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { isUnlocked, isMuted } from './audioSession.js';

// Module-level handle to whatever clip is currently playing. Any new clip play()
// stops this one first, so two narrations can never overlap (e.g. advancing to
// the next stop before the current clip finishes, or a StrictMode double-mount
// firing two plays). Set on play, cleared on end/stop.
let _activeAudio = null;

function stopActiveAudio(except) {
  if (_activeAudio && _activeAudio !== except) {
    try { _activeAudio.pause(); _activeAudio.currentTime = 0; } catch (e) { /* ignore */ }
  }
  if (_activeAudio && _activeAudio !== except) _activeAudio = null;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function synth() {
  return typeof window !== 'undefined' ? window.speechSynthesis : null;
}

// text     : line to speak via SpeechSynthesis when no clip is given.
// audioSrc : optional real recorded clip (imported asset URL or hosted URL).
// mode     : 'autoplay' | 'tap'
// enabled  : master on/off.
export function useNarration(text, { audioSrc = null, mode = 'tap', enabled = true } = {}) {
  // status: 'idle' | 'speaking' | 'done' | 'blocked' | 'unsupported'
  const [status, setStatus] = useState('idle');
  const audioRef = useRef(null); // lazily-created <audio> for the real clip

  const speechSupported = !!synth() && typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window;
  const usingClip = !!audioSrc;
  const supported = usingClip ? true : speechSupported;

  // Build the <audio> element once per clip src, and autoplay it here (in the
  // SAME effect) when armed/unlocked. Keeping creation + autoplay together means
  // a StrictMode remount rebuilds the element AND re-fires its play — they can
  // never desync (the earlier split-effect version left the rebuilt element
  // silent because the autoplay guard had already tripped on the first element).
  useEffect(() => {
    if (!usingClip || typeof window === 'undefined') return;
    const el = new window.Audio(audioSrc);
    el.preload = 'auto';
    el.onplay = () => setStatus('speaking');
    el.onended = () => { if (_activeAudio === el) _activeAudio = null; setStatus('done'); };
    el.onerror = () => setStatus('blocked');
    audioRef.current = el;

    // Autoplay this clip if the session is unlocked (or explicit autoplay mode),
    // reduced motion isn't requested, and the user hasn't muted sound.
    if (enabled && (isUnlocked() || mode === 'autoplay') && !prefersReducedMotion() && !isMuted()) {
      stopActiveAudio(el);
      _activeAudio = el;

      // Attempt play; on a brand-new element the file may not be buffered yet,
      // and some browsers reject an immediate play() on a cold element with a
      // non-AbortError. Rather than treat that as a real 'blocked' (autoplay
      // policy) refusal, we retry once the element signals it can play. A true
      // NotAllowedError still flips to 'blocked' so the Listen fallback shows.
      const attemptPlay = () => {
        // If this element was torn down (scene closed) or superseded by another
        // clip, don't (re)start it — prevents a deferred canplay retry from
        // playing audio into a closed Environment.
        if (audioRef.current !== el || _activeAudio !== el) return;
        try {
          const p = el.play();
          if (p && typeof p.then === 'function') {
            p.then(() => setStatus('speaking')).catch((err) => {
              if (err && err.name === 'AbortError') return; // benign: remount/navigation
              if (err && err.name === 'NotAllowedError') { setStatus('blocked'); return; }
              // Likely a not-ready/cold-element reject: wait for canplay, retry once.
              el.addEventListener('canplay', attemptPlay, { once: true });
            });
          }
        } catch (e) {
          setStatus('blocked');
        }
      };
      attemptPlay();
    }

    return () => {
      // On unmount (navigating away), stop THIS clip so it can't bleed into the
      // next stop's narration. A benign AbortError from pausing an in-flight play
      // is caught above.
      try { el.pause(); } catch (e) { /* ignore */ }
      if (_activeAudio === el) _activeAudio = null;
      audioRef.current = null;
    };
  }, [audioSrc, usingClip, enabled, mode]);

  const stop = useCallback(() => {
    if (usingClip && audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch (e) { /* ignore */ }
      if (_activeAudio === audioRef.current) _activeAudio = null;
      setStatus('idle');
      return;
    }
    const s = synth();
    if (s) s.cancel();
    setStatus('idle');
  }, [usingClip]);

  const play = useCallback(() => {
    // Real clip path (reliable, rides the unlock like the tone)
    if (usingClip) {
      const el = audioRef.current;
      if (!el) { setStatus('blocked'); return; }
      stopActiveAudio(el);   // stop any other clip currently playing (no overlap)
      _activeAudio = el;     // this clip is now the active one
      try {
        el.currentTime = 0;
        const p = el.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            setStatus('speaking');
          }).catch((err) => {
            // AbortError = a remount/navigation interrupted the play. Benign —
            // the stable mount plays fine, or we intentionally stopped it. Don't
            // flip to 'blocked'. NotAllowedError = a real autoplay-policy refusal.
            if (err && err.name === 'AbortError') return;
            setStatus('blocked');
          });
        }
      } catch (e) {
        setStatus('blocked');
      }
      return;
    }
    // SpeechSynthesis fallback path
    const s = synth();
    if (!speechSupported || !s || !text) { setStatus('unsupported'); return; }
    try {
      s.cancel();
      const u = new window.SpeechSynthesisUtterance(text);
      u.rate = 1.0; u.pitch = 1.0;
      u.onstart = () => setStatus('speaking');
      u.onend = () => setStatus('done');
      u.onerror = () => setStatus('blocked');
      s.speak(u);
      setTimeout(() => setStatus((prev) => (prev === 'idle' ? 'blocked' : prev)), 400);
    } catch (e) {
      setStatus('blocked');
    }
  }, [usingClip, text, speechSupported]);

  const replay = useCallback(() => { play(); }, [play]);

  // Autoplay for the SPEECH-SYNTHESIS fallback only (no clip). The clip path
  // autoplays inside its element effect above; this covers the rare case of a
  // beat with text but no recorded clip yet.
  const speechAutoplayedRef = useRef(false);
  useEffect(() => {
    if (usingClip || speechAutoplayedRef.current) return;
    if (!enabled) return;
    if (!(isUnlocked() || mode === 'autoplay')) return;
    if (prefersReducedMotion()) return;
    if (isMuted()) return;
    speechAutoplayedRef.current = true;
    play();
  }, [usingClip, enabled, mode, play]);

  // Clean up in-flight speech on unmount / source change. Guarded so a rapid
  // StrictMode remount doesn't cancel a fresh utterance (same race the clip path
  // had). We only cancel speech synthesis, which has no AbortError equivalent.
  useEffect(() => {
    return () => { const s = synth(); if (s && !usingClip) s.cancel(); };
  }, [text, audioSrc, usingClip]);

  return { status, supported, play, replay, stop };
}
