/** Strips characters that aren't safe in a Windows/macOS filename, for use as a "Save as PDF" / download suggested name. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "download";
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

/**
 * Prints a PDF Blob via the most reliable path per platform, for anything
 * that already generates a real PDF (a receipt copy, a QR label) instead of
 * printing HTML through `printHtmlDocument` above.
 *
 * Desktop: a temporary hidden iframe + `contentWindow.print()` — proven
 * reliable there (see ReceiptPreviewModal's visible preview iframe, which
 * uses the same call). Mobile (iOS/Android): opens the PDF in a new tab
 * instead. A hidden iframe's embedded PDF viewer often never finishes
 * initializing on mobile, so `.print()` on it silently does nothing — same
 * lesson as the isMobile branch above, just for a PDF instead of HTML. The
 * new tab shows the browser's own PDF viewer, which has its own working
 * Print/Share icon that hands off to the OS print sheet (AirPrint, a
 * Bluetooth thermal-printer app via RawBT, etc.) exactly like printing any
 * other document.
 */
export function printPdfBlob(blob: Blob): void {
  const isMobile = /iPad|iPhone|iPod|Android/.test(navigator.userAgent);
  const url = URL.createObjectURL(blob);

  if (isMobile) {
    const win = window.open(url, "_blank");
    if (!win) alert("Please allow pop-ups to print.");
    // Left for the browser to release when that tab is closed — revoking
    // eagerly here can blank the viewer while it's still loading the file.
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden;";
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
  };
  iframe.src = url;
  document.body.appendChild(iframe);
  // No afterprint-driven cleanup here (unlike printHtmlDocument) — a PDF
  // loaded via `src` rather than `document.write` doesn't reliably fire
  // afterprint on the iframe's own window across browsers, so this just
  // gives the print dialog a generous window to be used before cleaning up.
  setTimeout(() => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    URL.revokeObjectURL(url);
  }, 60000);
}
