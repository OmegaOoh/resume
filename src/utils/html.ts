/**
 * Escapes unsafe HTML characters while preserving existing valid HTML entities.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[a-fA-F\d]+);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escapes double quotes for safe usage inside HTML attributes.
 */
export function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}
