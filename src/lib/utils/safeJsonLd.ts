// The two line separators JavaScript treats as newlines inside a string.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/**
 * Serialises structured data for a `<script type="application/ld+json">` tag.
 * Plain JSON.stringify leaves `<` as is, so text such as a store name or
 * product title containing `</script>` would close the tag early and let the
 * rest run as page markup. Escaping `<`, `>` and `&` (and the two line
 * separators) keeps the JSON identical for crawlers while making that
 * impossible.
 * @returns a JSON string that is safe to inject with dangerouslySetInnerHTML
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LINE_SEPARATOR)
    .join("\\u2028")
    .split(PARAGRAPH_SEPARATOR)
    .join("\\u2029");
}
