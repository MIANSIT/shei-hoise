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
 * Measures how tall the given HTML+CSS renders by mounting it off-screen in
 * the current document — used instead of the CSS `size: <width> auto` @page
 * syntax, which isn't actually valid (a <length> can't be paired with
 * `auto`): browsers that reject it silently fall back to the system default
 * page size (A4/Letter) rather than "fit to content", which is why a 58mm
 * receipt or an 80mm label was printing on a full A4 page.
 */
export function estimateHtmlHeightMm(bodyHtml: string, styles: string): number {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;visibility:hidden;";
  const styleEl = document.createElement("style");
  styleEl.textContent = styles;
  const contentEl = document.createElement("div");
  contentEl.innerHTML = bodyHtml;
  container.appendChild(styleEl);
  container.appendChild(contentEl);
  document.body.appendChild(container);
  const heightPx = contentEl.getBoundingClientRect().height;
  document.body.removeChild(container);
  // 96 CSS px = 1in = 25.4mm, per spec — resolution independent.
  return (heightPx * 25.4) / 96;
}

/**
 * Prints a narrow, content-fitted document (a receipt, a single product
 * label) at an explicit `widthMm × <measured height>mm` page size, computed
 * from the actual rendered content instead of the unreliable `auto` height.
 */
export function printFittedDocument(
  title: string,
  bodyHtml: string,
  styles: string,
  widthMm: number,
): void {
  const heightMm = Math.ceil(estimateHtmlHeightMm(bodyHtml, styles)) + 8;
  printHtmlDocument(title, bodyHtml, `${styles}\n@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`);
}
