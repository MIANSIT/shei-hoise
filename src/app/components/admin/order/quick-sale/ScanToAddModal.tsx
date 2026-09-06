"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button } from "antd";
import jsQR from "jsqr";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { extractProductSlugFromScannedText } from "@/lib/utils/productQr";
import { playBeep } from "@/lib/utils/beep";

interface ScanToAddModalProps {
  open: boolean;
  /** True while a variant picker opened by a scan is still awaiting the cashier's selection — scanning pauses so a held-up QR doesn't reopen/replace that picker mid-selection. */
  paused: boolean;
  products: ProductWithVariants[];
  onClose: () => void;
  onProductFound: (product: ProductWithVariants) => "added" | "variant-needed";
}

// Consecutive empty frames required before a held QR is considered "out of
// frame" and eligible to scan again — a couple of frames, not one, so a
// single missed decode on a code that's still in view (motion blur, glare)
// doesn't let it re-trigger without actually being moved away. At ~30fps
// this is well under 200ms, so it doesn't slow down scanning the next item.
const MISS_FRAMES_TO_CLEAR = 5;

// Only the centered box (this fraction of the frame's width/height) is
// actually decoded — printed sheets of multiple product labels (see
// "Print All QR Labels") put several small QR codes in view at once, and
// decoding the full frame either can't resolve the tiny modules or locks
// onto the wrong neighboring code. Cropping to a center box matching the
// visible on-screen guide forces the cashier to align one code at a time,
// and combined with the higher-resolution stream requested below, that
// cropped region still has enough native pixels to resolve a code held
// close to the camera.
const SCAN_BOX_FRACTION = 0.55;

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
  // The raw text of the QR currently held in front of the camera — cleared
  // once it's actually removed (see MISS_FRAMES_TO_CLEAR), so holding a code
  // up longer than intended can't add it twice.
  const activeTextRef = useRef<string | null>(null);
  const missFramesRef = useRef(0);
  const pausedRef = useRef(paused);
  const [status, setStatus] = useState("Starting camera…");
  const [cameraFailed, setCameraFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) setStatus("Finish selecting the variant in the popup, then keep scanning.");
    else if (open) setStatus("Line up one QR code inside the box.");
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
      .getUserMedia({
        video: {
          facingMode: "environment",
          // Ideal, not exact — falls back gracefully on cameras that can't
          // hit this, but on most phones this is what actually gives the
          // cropped center box (see SCAN_BOX_FRACTION) enough real pixels
          // to resolve a small QR code, e.g. one label on a printed sheet
          // of several.
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
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
        setStatus("Line up one QR code inside the box.");
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
      let sawCode = false;
      if (!pausedRef.current && video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          // Decode only the centered box matching the on-screen guide (see
          // SCAN_BOX_FRACTION) — keeps neighboring codes on a multi-label
          // sheet out of the decode entirely, instead of leaving jsQR to
          // arbitrarily pick one among several found in the full frame.
          const boxWidth = canvas.width * SCAN_BOX_FRACTION;
          const boxHeight = canvas.height * SCAN_BOX_FRACTION;
          const boxX = (canvas.width - boxWidth) / 2;
          const boxY = (canvas.height - boxHeight) / 2;
          const imageData = ctx.getImageData(boxX, boxY, boxWidth, boxHeight);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            sawCode = true;
            handleScanned(code.data);
          }
        }
      }
      if (sawCode) {
        missFramesRef.current = 0;
      } else if (activeTextRef.current !== null) {
        missFramesRef.current += 1;
        if (missFramesRef.current >= MISS_FRAMES_TO_CLEAR) {
          activeTextRef.current = null;
          missFramesRef.current = 0;
        }
      }
      rafRef.current = requestAnimationFrame(scanTick);
    }

    function handleScanned(text: string) {
      // Same code still in front of the camera as last frame — wait for it
      // to actually leave view (scanTick clears this) before acting again.
      if (activeTextRef.current === text) return;
      activeTextRef.current = text;

      const slug = extractProductSlugFromScannedText(text);
      if (!slug) {
        setStatus("That QR isn't a product code from this store.");
        return;
      }
      const product = products.find((p) => p.slug === slug);
      if (!product) {
        setStatus("Scanned, but that product isn't in this store's catalog.");
        return;
      }
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
      <div style={{ position: "relative" }}>
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
            display: "block",
          }}
        />
        {/* Visual match for SCAN_BOX_FRACTION — only what's inside this box
            is actually decoded, so it tells the cashier where to hold a
            single code when several are visible at once (e.g. an uncut
            sheet of printed labels). */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `${SCAN_BOX_FRACTION * 100}%`,
            height: `${SCAN_BOX_FRACTION * 100}%`,
            transform: "translate(-50%, -50%)",
            border: "2px solid rgba(255,255,255,0.85)",
            borderRadius: 8,
            boxShadow: "0 0 0 999px rgba(0,0,0,0.25)",
            pointerEvents: "none",
          }}
        />
      </div>
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
