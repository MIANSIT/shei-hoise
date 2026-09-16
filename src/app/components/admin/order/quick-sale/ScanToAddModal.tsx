"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button } from "antd";
import { m } from "framer-motion";
import { Check } from "lucide-react";
import jsQR from "jsqr";
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";

/** Outcome of resolving one scanned code (QR or barcode) against the catalog — see QuickSale.tsx's handleBarcodeScanned, the single place both scan channels (this camera modal and the hardware-scanner keyboard listener) resolve a code through. */
export type ScanResult =
  | { outcome: "added"; productName: string }
  | { outcome: "variant-needed"; productName: string }
  | { outcome: "not-found" }
  | { outcome: "invalid" };

interface ScanToAddModalProps {
  open: boolean;
  /** True while a variant picker opened by a scan is still awaiting the cashier's selection — scanning pauses so a held-up code doesn't reopen/replace that picker mid-selection. */
  paused: boolean;
  onClose: () => void;
  /** Resolves a decoded code (from either the QR or the barcode reader below) against the catalog and returns what happened, so this modal can show the right status message. */
  onCodeScanned: (code: string) => ScanResult;
}

// Consecutive empty frames required before a held code is considered "out of
// frame" and eligible to scan again — a couple of frames, not one, so a
// single missed decode on a code that's still in view (motion blur, glare)
// doesn't let it re-trigger without actually being moved away. At ~30fps
// this is well under 200ms, so it doesn't slow down scanning the next item.
const MISS_FRAMES_TO_CLEAR = 5;

// Only the centered box (this fraction of the frame's width/height) is
// actually decoded — printed sheets of multiple product labels (see
// "Print All QR Labels"/"Barcode Labels") put several small codes in view at
// once, and decoding the full frame either can't resolve the tiny modules or
// locks onto the wrong neighboring code. Cropping to a center box matching
// the visible on-screen guide forces the cashier to align one code at a
// time, and combined with the higher-resolution stream requested below,
// that cropped region still has enough native pixels to resolve a code held
// close to the camera.
const SCAN_BOX_FRACTION = 0.55;

// Barcode formats a store's own printed labels (or a manufacturer's
// packaging) are realistically in — QR is deliberately excluded here since
// jsQR already owns that, tried first every frame; asking ZXing to also
// look for QR would just be duplicate work.
const BARCODE_HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
    ],
  ],
]);

/**
 * ZXing's RGBLuminanceSource treats a Uint8ClampedArray input as already
 * one-byte-per-pixel grayscale (only a 4-byte-per-pixel Int32Array gets its
 * built-in RGB→luminance conversion) — so a canvas's raw RGBA ImageData
 * would be silently misread pixel-for-pixel-wrong (4x too many "pixels", B
 * and A channels included) if handed over directly the way jsQR accepts it.
 * This does that conversion ourselves first.
 */
function toGrayscaleLuminance(imageData: ImageData): Uint8ClampedArray {
  const { data, width, height } = imageData;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  return gray;
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
  onClose,
  onCodeScanned,
}: ScanToAddModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const barcodeReaderRef = useRef<MultiFormatReader | null>(null);
  // The raw text of the code currently held in front of the camera — cleared
  // once it's actually removed (see MISS_FRAMES_TO_CLEAR), so holding a code
  // up longer than intended can't add it twice.
  const activeTextRef = useRef<string | null>(null);
  const missFramesRef = useRef(0);
  const pausedRef = useRef(paused);
  const [status, setStatus] = useState("Starting camera…");
  const [cameraFailed, setCameraFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  // How many items this scanning session has added — the small text status
  // line under the video was easy to miss in a busy checkout, so this and
  // the flash below give a harder-to-miss "yes, that worked" without
  // forcing the cashier to close and reopen the scanner between items.
  const [addedCount, setAddedCount] = useState(0);
  // Re-keying this remounts the flash overlay below, restarting its fade
  // from scratch even if the previous one hasn't finished yet — so two
  // items scanned in quick succession each get their own visible flash
  // instead of the second one silently doing nothing to an element that's
  // already mid-animation.
  const [flashKey, setFlashKey] = useState(0);

  if (!barcodeReaderRef.current) {
    barcodeReaderRef.current = new MultiFormatReader();
  }

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) setStatus("Finish selecting the variant in the popup, then keep scanning.");
    else if (open) setStatus("Line up a QR code or barcode inside the box.");
  }, [paused, open]);

  // Fresh count for each time the scanner is opened, not a running total
  // across separate visits to the modal.
  useEffect(() => {
    if (open) setAddedCount(0);
  }, [open]);

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
          // to resolve a small code, e.g. one label on a printed sheet of
          // several.
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
        setStatus("Line up a QR code or barcode inside the box.");
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
          // sheet out of the decode entirely, instead of leaving the
          // decoders to arbitrarily pick one among several found in the
          // full frame.
          const boxWidth = canvas.width * SCAN_BOX_FRACTION;
          const boxHeight = canvas.height * SCAN_BOX_FRACTION;
          const boxX = (canvas.width - boxWidth) / 2;
          const boxY = (canvas.height - boxHeight) / 2;
          const imageData = ctx.getImageData(boxX, boxY, boxWidth, boxHeight);

          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
          if (qrCode?.data) {
            sawCode = true;
            handleScanned(qrCode.data);
          } else {
            // Only worth trying the (more expensive) barcode decode when
            // there's no QR in this frame at all.
            try {
              const luminanceSource = new RGBLuminanceSource(
                toGrayscaleLuminance(imageData),
                imageData.width,
                imageData.height,
              );
              const bitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
              const result = barcodeReaderRef.current!.decode(bitmap, BARCODE_HINTS);
              sawCode = true;
              handleScanned(result.getText());
            } catch {
              // No barcode in this frame either — the normal case for most
              // frames; ZXing throws rather than returning null.
            }
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

      const result = onCodeScanned(text);
      switch (result.outcome) {
        case "invalid":
          setStatus("That code isn't a product code from this store.");
          break;
        case "not-found":
          setStatus("Scanned, but that product isn't in this store's catalog.");
          break;
        case "variant-needed":
          setStatus(`Select a variant for ${result.productName}…`);
          break;
        case "added":
          setStatus(`✓ Added: ${result.productName}`);
          setAddedCount((c) => c + 1);
          setFlashKey((k) => k + 1);
          break;
      }
    }

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onCodeScanned, retryToken]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={
        <Button block size="large" onClick={onClose}>
          Close
        </Button>
      }
      title="Scan QR or Barcode"
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

        {/* A hard-to-miss confirmation the moment something is actually
            added — the small status line below is easy to miss in a busy
            checkout. Re-keyed by flashKey so a second item scanned right
            after the first still gets its own full flash instead of being
            silently absorbed into an animation already in progress. */}
        {flashKey > 0 && (
          <m.div
            key={flashKey}
            aria-hidden
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Check size={72} color="#fff" strokeWidth={3} />
          </m.div>
        )}

        {/* Running total for this scanning session — lets the cashier keep
            scanning a whole basket without needing to close and reopen
            between items to confirm each one landed. */}
        {addedCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(0,0,0,0.65)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 999,
              pointerEvents: "none",
            }}
          >
            {addedCount} added this scan
          </div>
        )}
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
