import sanitizeHtmlLib from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
];

/**
 * Sanitizes HTML produced by the rich text editor (Tiptap) before it is
 * persisted, restricting it to the tags the editor's toolbar can actually
 * produce.
 */
export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}
