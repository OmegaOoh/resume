import { renderInlineMarkdown } from "../utils/markdown";
import type { SectionId } from "../types/resume";

export interface SectionWrapperOptions {
  id: SectionId;
  title: string;
  bodyHtml: string;
  variant?: "default" | "dark-divider";
  interactive?: boolean;
}

export function renderSectionWrapper({
  id,
  title,
  bodyHtml,
  variant = "default",
  interactive = false,
}: SectionWrapperOptions): string {
  const headingClass =
    variant === "dark-divider"
      ? "text-2xl font-semibold mb-1 print:text-lg"
      : "text-2xl font-semibold text-gray-800 mb-1 print:text-lg";

  const hrClass =
    variant === "dark-divider"
      ? "mb-3 border-[1.5px] border-gray-800 rounded print:mb-1"
      : "mb-3 border-[1.5px] border-gray-400 rounded print:mb-1";

  const dataAttrs = interactive ? ` data-section-id="${id}"` : "";
  const titleAttrs = interactive ? ` data-section-title="${id}"` : "";

  return `                        <div class="break-inside resume-block"${dataAttrs}>
                            <h2
                                class="${headingClass}"${titleAttrs}
                            >
                                ${renderInlineMarkdown(title)}
                            </h2>
                            <hr
                                class="${hrClass}"
                            />
${bodyHtml}
                        </div>`;
}
