/**
 * A short confirmation beep for scan flows (Quick Sale's "Scan to Add").
 *
 * Mobile browsers — iOS Safari in particular — only let an AudioContext
 * actually produce sound if it was created/resumed synchronously inside a
 * real user gesture (a click/tap handler); one created later, from inside
 * an async scan callback, is silently left "suspended" and never makes a
 * sound even though no error is thrown. So `unlockBeepAudio` must be called
 * directly from the onClick that opens the scanner, and `playBeep` then
 * reuses that same already-unlocked context for every scan.
 */
let sharedCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (sharedCtx) return sharedCtx;
  const AudioCtx =
    typeof window !== "undefined"
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AudioCtx) return null;
  try {
    sharedCtx = new AudioCtx();
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Call from inside a click/tap handler (not after an await) to unlock audio for later `playBeep()` calls on this device. */
export function unlockBeepAudio(): void {
  const ctx = getAudioCtx();
  if (ctx?.state === "suspended") ctx.resume().catch(() => {});
}

export function playBeep(): void {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  } catch {
    // Sound isn't critical to the scan flow — ignore if unsupported/blocked.
  }
}
