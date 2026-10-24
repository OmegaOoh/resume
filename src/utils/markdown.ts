import { escapeHtml } from "./html";

/**
 * Renders inline Markdown syntax into safe HTML.
 * Supports:
 * - Inline code: `code`
 * - Bold + Italic: ***text***
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Strikethrough: ~~text~~
 * - Links: [text](url)
 */
export function renderInlineMarkdown(text: string): string {
  if (!text) return "";

  let html = escapeHtml(text);

  // Extract inline code spans first so markdown inside code is not parsed
  const codeSpans: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_match, code: string) => {
    const placeholder = `\x00CODE_${codeSpans.length}\x00`;
    codeSpans.push(
      `<code class="px-1 py-0.5 bg-gray-100 rounded text-[0.9em] font-mono print:bg-transparent print:px-0">${code}</code>`
    );
    return placeholder;
  });

  // Links: [label](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, url: string) => {
      const isMailOrTel = url.startsWith("mailto:") || url.startsWith("tel:");
      const targetAttrs = isMailOrTel
        ? ""
        : ' target="_blank" rel="noopener noreferrer"';
      return `<a href="${url}"${targetAttrs} class="text-blue-600 underline">${label}</a>`;
    }
  );

  // Bold + Italic: ***text***
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_ (avoiding mid-word underscores)
  html = html.replace(/\*(?!\s)(.+?)(?<!\s)\*/g, "<em>$1</em>");
  html = html.replace(/(^|\s)_(?!\s)(.+?)(?<!\s)_(?=$|\s|[.,!?;:])/g, "$1<em>$2</em>");

  // Strikethrough: ~~text~~
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Restore inline code spans
  html = html.replace(/\x00CODE_(\d+)\x00/g, (_match, idx: string) => {
    return codeSpans[Number(idx)] ?? "";
  });

  return html;
}

/**
 * Renders multi-line block Markdown into HTML.
 * Supports paragraphs, bullet lists (- or *), and inline Markdown inside blocks.
 */
export function renderBlockMarkdown(text: string): string {
  if (!text) return "";

  const lines = text.trim().split(/\r?\n/);
  const blocks: string[] = [];
  let currentList: string[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push(
        `<p class="print:text-sm">\n                                ${currentParagraph
          .map((l) => renderInlineMarkdown(l))
          .join("\n                                ")}\n                            </p>`
      );
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      const items = currentList
        .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
        .join("\n");
      blocks.push(
        `<ul class="list-disc pl-5 space-y-1 print:space-y-0 print:text-sm">\n${items}\n</ul>`
      );
      currentList = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      currentList.push(listMatch[1]);
    } else {
      flushList();
      currentParagraph.push(line);
    }
  }

  flushParagraph();
  flushList();

  return blocks.join("\n                            ");
}
