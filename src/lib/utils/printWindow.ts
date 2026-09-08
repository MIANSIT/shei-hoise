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
 * Prints a PDF Blob for anything that already generates a real PDF (a
 * receipt copy, a QR label) instead of printing HTML through
 * `printHtmlDocument` above.
 *
 * Deliberately never navigates to the PDF (no `window.open` on the blob
 * URL): whether that shows a viewer with a print icon, or just silently
 * downloads the file instead, depends on the phone's own "open PDFs in
 * browser vs. download them" setting — outside this app's control, and a
 * dead end when it's set to download, since the user then has to go dig the
 * file out of Downloads themselves. Instead this loads the PDF into a real,
 * visible (not zero-size/hidden) same-page iframe and calls
 * `contentWindow.print()` directly — that invokes the browser's native
 * print API, which on Android hands off to the OS print dialog (showing
 * every registered PrintService, e.g. an ESC/POS Bluetooth-printer bridge)
 * the same way `window.print()` would, regardless of any PDF-download
 * setting, since the PDF is never treated as a file to open or save. A
 * zero-size/hidden iframe frequently never finishes initializing its
 * embedded PDF viewer on mobile, so print() had nothing to act on — this
 * briefly overlays the full viewport instead, which reliably finishes
 * loading, then is removed once printing is done.
 */
export function printPdfBlob(blob: Blob): void {
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
