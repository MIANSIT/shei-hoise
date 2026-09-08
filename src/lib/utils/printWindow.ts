/** Strips characters that aren't safe in a Windows/macOS filename, for use as a "Save as PDF" / download suggested name. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "download";
}

/** Triggers a browser download of an arbitrary Blob via a throwaway `<a download>` link. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Prints an arbitrary HTML document via a temporary hidden iframe (desktop)
 * or a new window (iOS/Android, where a hidden iframe often silently fails
 * to trigger the print dialog). Mirrors the approach already used for
 * invoice printing — see `printInvoice` in
 * src/app/components/invoice/invoice.tsx — so every print flow in the app
 * (invoices, QR labels, POS receipts) behaves the same way across devices.
 *
 * The iframe path also temporarily overrides the *parent* page's
 * `document.title` around the print call: Chrome's "Save as PDF" suggested
 * filename is taken from the top-level tab's title, not the iframe's own
 * `<title>`, so without this every iframe-printed PDF would save as
 * whatever the dashboard page itself is titled, regardless of what title
 * this function was given.
 */
export function printHtmlDocument(
  title: string,
  bodyHtml: string,
  styles: string,
): void {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;

  const fullHtml =
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">` +
    `<title>${title}</title><style>${styles}</style></head><body>${bodyHtml}` +
    `<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script></body></html>`;

  if (isMobile) {
    const pw = window.open("", "_blank");
    if (!pw) {
      alert("Please allow pop-ups to print.");
      return;
    }
    pw.document.open();
    pw.document.write(fullHtml);
    pw.document.close();
    pw.focus();
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) return;
  doc.open();
  doc.write(fullHtml);
  doc.close();

  const previousTitle = document.title;
  document.title = title;
  const restoreTitle = () => {
    document.title = previousTitle;
  };

  win.addEventListener("afterprint", () => {
    restoreTitle();
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 100);
  });
  // Fallback in case the print dialog is cancelled without firing
  // afterprint in some browsers — don't leave the tab title changed forever.
  setTimeout(restoreTitle, 30000);
}

function printPdfViaIframe(blob: Blob): void {
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:0;z-index:99999;background:#fff;";
  const cleanup = () => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    URL.revokeObjectURL(url);
  };
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
    // Fires once the OS print sheet is dismissed, on both desktop and
    // mobile, since this iframe is same-origin and actually rendered.
    win.addEventListener("afterprint", cleanup);
  };
  iframe.src = url;
  document.body.appendChild(iframe);
  // Fallback in case afterprint never fires (some mobile browsers don't
  // reliably emit it for a PDF viewer's own print action).
  setTimeout(cleanup, 60000);
}

/**
 * Prints a PDF Blob for anything that already generates a real PDF (a
 * receipt copy, a QR label) instead of printing HTML through
 * `printHtmlDocument` above.
 *
 * On mobile this hands the file to Android's Share sheet first (via the Web
 * Share API's file support), not the browser's print API — a Bluetooth
 * ESC/POS bridge app (RawBT, "ESC POS Print Service", etc.) is normally
 * used by receiving a shared file directly, and that's also what actually
 * works: calling window.print()/iframe print() instead routes through
 * Android's own system Print Preview screen, which tries to render a
 * thumbnail of the PDF and can render nothing but a blank/black screen for
 * a non-standard small page size like this app's 58mm receipts — a dead
 * end with no path to an actual printer. Sharing skips that broken preview
 * entirely and lets the bridge app open the file itself.
 *
 * Desktop keeps the iframe + `contentWindow.print()` path (proven reliable
 * there), since desktop print dialogs don't have this custom-page-size
 * preview problem and Web Share's file support is far less consistently
 * available on desktop browsers.
 *
 * `preferShare` (default true) opts out of the mobile Share-sheet detour
 * above for callers where it doesn't make sense — a QR label (58mm or A4)
 * is normally sent to a regular/photo printer via the OS print dialog, not
 * an ESC/POS Bluetooth bridge app, so routing it through Share first just
 * adds an extra "which app?" hop with no printer on the other end. Receipt
 * printing keeps the default (true).
 */
export async function printPdfBlob(
  blob: Blob,
  fileName: string,
  options?: { preferShare?: boolean },
): Promise<void> {
  const preferShare = options?.preferShare ?? true;
  const isMobile = /iPad|iPhone|iPod|Android/.test(navigator.userAgent);

  if (preferShare && isMobile && typeof navigator.share === "function") {
    const file = new File([blob], fileName, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName });
        return;
      } catch (err) {
        // The user backing out of the share sheet isn't a failure to fall
        // back from — anything else (e.g. no share target installed) falls
        // through to the iframe/print path below as a last resort.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
  }

  printPdfViaIframe(blob);
}
