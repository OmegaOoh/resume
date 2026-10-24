import type { SummaryData } from "../types/resume";
import { renderBlockMarkdown } from "../utils/markdown";
import { renderSectionWrapper } from "./section";

export function renderSummary(
  summary: SummaryData,
  title = "Summary",
  interactive = false
): string {
  const renderedBlocks = renderBlockMarkdown(summary.content);
  const bodyHtml = interactive
    ? `                            <div data-summary-content="true">\n                            ${renderedBlocks}\n                            </div>`
    : `                            ${renderedBlocks}`;

  return renderSectionWrapper({
    id: "summary",
    title,
    bodyHtml,
    interactive,
  });
}
