"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button } from "antd";
import jsQR from "jsqr";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { extractProductSlugFromScannedText } from "@/lib/utils/productQr";

interface ScanToAddModalProps {
  open: boolean;
  /** True while a variant picker opened by a scan is still awaiting the cashier's selection — scanning pauses so a held-up QR doesn't reopen/replace that picker mid-selection. */
  paused: boolean;
  products: ProductWithVariants[];
  onClose: () => void;
  onProductFound: (product: ProductWithVariants) => "added" | "variant-needed";
}

// Debounces repeat scans of the same QR while it's still in frame, so
// holding the code up doesn't add it a dozen times.
const RESCAN_DELAY_MS = 1500;

// A short beep + vibration on every recognized scan — the on-screen status
// text alone is easy to miss while scanning several items back-to-back.
function playBeep(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
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
    oscillator.onended = () => ctx.close();
  } catch {
    // Sound isn't critical to the scan flow — ignore if unsupported/blocked.
  }
}

function vibrate(): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(60);
}

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera permission denied — enable camera access for this site in your browser settings, then tap Try Again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is already in use by another app.";
  }
  return "Couldn't access the camera. Please try again.";
}

export default function ScanToAddModal({
  open,
  paused,
  products,
  onClose,
  onProductFound,
}: ScanToAddModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastMatchRef = useRef<{ slug: string; time: number } | null>(null);
  const pausedRef = useRef(paused);
  const [status, setStatus] = useState("Starting camera…");
  const [cameraFailed, setCameraFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) setStatus("Finish selecting the variant in the popup, then keep scanning.");
    else if (open) setStatus("Point the camera at a product QR code.");
  }, [paused, open]);

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    setStatus("Starting camera…");
    setCameraFailed(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera not supported on this device/browser.");
      setCameraFailed(true);
      return;
    }

    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play();
        }
        setStatus("Point the camera at a product QR code.");
        rafRef.current = requestAnimationFrame(scanTick);
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(cameraErrorMessage(err));
        setCameraFailed(true);
      });

    function scanTick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!pausedRef.current && video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) handleScanned(code.data);
        }
      }
      rafRef.current = requestAnimationFrame(scanTick);
    }

    function handleScanned(text: string) {
      const slug = extractProductSlugFromScannedText(text);
      if (!slug) {
        setStatus("That QR isn't a product code from this store.");
        return;
      }
      const now = Date.now();
      const last = lastMatchRef.current;
      if (last && last.slug === slug && now - last.time < RESCAN_DELAY_MS) {
        return;
      }
      const product = products.find((p) => p.slug === slug);
      if (!product) {
        setStatus("Scanned, but that product isn't in this store's catalog.");
        return;
      }
      lastMatchRef.current = { slug, time: now };
      vibrate();
      playBeep();
      const outcome = onProductFound(product);
      setStatus(
        outcome === "variant-needed"
          ? `Select a variant for ${product.name}…`
          : `✓ Added: ${product.name}`,
      );
    }

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, products, retryToken]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={
        <Button block size="large" onClick={onClose}>
          Close
        </Button>
      }
      title="Scan Product QR"
      centered
    >
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          width: "100%",
          borderRadius: 8,
          background: "#000",
          aspectRatio: "4 / 3",
          objectFit: "cover",
        }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "#888", textAlign: "center", minHeight: 16 }}>
        {status}
      </p>
      {cameraFailed && (
        <Button
          block
          size="large"
          style={{ marginTop: 12 }}
          onClick={() => setRetryToken((n) => n + 1)}
        >
          Try Again
        </Button>
      )}
    </Modal>
  );
}
