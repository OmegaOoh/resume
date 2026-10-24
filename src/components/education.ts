import type { EducationData } from "../types/resume";
import { renderInlineMarkdown } from "../utils/markdown";
import { renderSectionWrapper } from "./section";

export function renderEducation(
  educationData: EducationData,
  title = "Education",
  interactive = false
): string {
  const blocks = educationData.education
    .filter((ed) => interactive || ed.enabled !== false)
    .map((ed, edIdx) => {
      const details = ed.details
        .map((d, dIdx) => {
          const dAttrs = interactive
            ? ` data-edu-detail="${edIdx}-${dIdx}"`
            : "";
          return `                                <li${dAttrs}>${renderInlineMarkdown(d)}</li>`;
        })
        .join("\n");

      const hiddenClass = interactive && ed.enabled === false ? ' class="hidden"' : "";
      const blockAttrs = interactive ? ` data-edu-index="${edIdx}"${hiddenClass}` : "";
      const degAttrs = interactive ? ` data-edu-degree="${edIdx}"` : "";
      const instAttrs = interactive ? ` data-edu-institution="${edIdx}"` : "";
      const periodAttrs = interactive ? ` data-edu-period="${edIdx}"` : "";

      const innerBlock = `                            <div class="flex flex-row justify-between">
                                <p
                                    class="text-gray-800 font-bold text-lg print:text-base"
                                >
                                    <span${degAttrs}>${renderInlineMarkdown(ed.degree)}</span>,
                                    <span${instAttrs}>${renderInlineMarkdown(ed.institution)}</span>
                                </p>
                                <h4
                                    class="text-sm text-gray-700 print:text-sm"${periodAttrs}
                                >
                                    ${renderInlineMarkdown(ed.period)}
                                </h4>
                            </div>
                            <ul
                                class="list-disc pl-5 space-y-1 print:space-y-0 print:text-sm"
                            >
${details}
                            </ul>`;

      return interactive
        ? `                            <div${blockAttrs}>\n${innerBlock}\n                            </div>`
        : innerBlock;
    })
    .join("\n");

  return renderSectionWrapper({
    id: "education",
    title,
    bodyHtml: blocks,
    variant: "dark-divider",
    interactive,
  });
}
