"use client";

import { useEffect, useRef } from "react";

// A hardware barcode scanner acts as a keyboard typing very fast — each
// keystroke lands well under this many ms apart. A human typing the same
// characters by hand is reliably slower, even a fast typist, which is what
// lets this tell a real scan apart from someone typing in a nearby field.
const MAX_INTERVAL_MS = 50;
// Guards against a stray single keystroke (e.g. a bumped key) being treated
// as a scan — a real SKU is always at least this long.
const MIN_CODE_LENGTH = 3;

/**
 * Listens for a hardware barcode scanner's keyboard-wedge input anywhere on
 * the page (scanners of this kind "type" the decoded value followed by
 * Enter) and calls `onScan` with the buffered code. Complements, not
 * replaces, the phone-camera QR scanning in ScanToAddModal.tsx — a
 * countertop USB/Bluetooth scanner gun reading a printed CODE128 sticker is
 * the far more common real-world setup for 1D barcodes than pointing a
 * camera at one.
 *
 * Deliberately does not stopPropagation/preventDefault or check focus — it
 * only ever fires `onScan` for a burst that both arrives scanner-fast *and*
 * ends in Enter, so a normal typist's own keystrokes (even if one happens to
 * land in a text field at the same time) essentially never produce a false
 * match once the caller checks the buffered code against a real SKU.
 */
export function useHardwareBarcodeScanner(onScan: (code: string) => void, enabled: boolean = true) {
  const bufferRef = useRef("");
  const lastTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const elapsed = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (e.key === "Enter") {
        const code = bufferRef.current;
        bufferRef.current = "";
        if (code.length >= MIN_CODE_LENGTH) {
          onScanRef.current(code);
        }
        return;
      }

      // A gap this long means this keystroke isn't part of a scanner burst —
      // either the first key of a new scan, or ordinary human typing.
      // Resetting either way costs nothing: a real scan reliably restarts
      // within one burst.
      if (elapsed > MAX_INTERVAL_MS) {
        bufferRef.current = "";
      }

      // Printable single characters only — modifier/navigation keys (Shift,
      // Tab, arrow keys, …) report multi-character `key` values and must
      // never become part of the buffered code.
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
