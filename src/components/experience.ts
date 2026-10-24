import type { ExperienceData } from "../types/resume";
import { renderInlineMarkdown } from "../utils/markdown";
import { renderSectionWrapper } from "./section";

export function renderExperience(
  experienceData: ExperienceData,
  title = "Experience",
  interactive = false
): string {
  const items = experienceData.experience
    .filter((e) => interactive || e.enabled !== false)
    .map((e, expIdx) => {
      const highlights = e.highlights
        .map((h, hIdx) => {
          const hAttrs = interactive
            ? ` data-exp-highlight="${expIdx}-${hIdx}"`
            : "";
          return `                                        <li${hAttrs}>
                                            ${renderInlineMarkdown(h)}
                                        </li>`;
        })
        .join("\n");

      const locAttrs = interactive ? ` data-exp-location="${expIdx}"` : "";
      const locationLine = e.location
        ? `\n                                    <p class="text-xs text-gray-500 mb-1"${locAttrs}>${renderInlineMarkdown(
            e.location
          )}</p>`
        : "";

      const hiddenClass = interactive && e.enabled === false ? " hidden" : "";
      const itemAttrs = interactive ? ` data-exp-index="${expIdx}"` : "";
      const roleAttrs = interactive ? ` data-exp-role="${expIdx}"` : "";
      const companyAttrs = interactive ? ` data-exp-company="${expIdx}"` : "";
      const periodAttrs = interactive ? ` data-exp-period="${expIdx}"` : "";

      return `                                <li class="resume-block${hiddenClass}"${itemAttrs}>
                                    <div
                                        class="flex flex-row justify-between mb-1"
                                    >
                                        <div>
                                            <h3
                                                class="text-lg font-bold text-gray-800 print:text-base inline"${roleAttrs}
                                            >
                                                ${renderInlineMarkdown(e.role)}
                                            </h3>
                                            <span class="text-gray-600 text-sm font-medium"> — <span${companyAttrs}>${renderInlineMarkdown(
                                              e.company
                                            )}</span></span>
                                        </div>
                                        <p
                                            class="text-sm text-gray-700 print:text-sm font-medium"${periodAttrs}
                                        >
                                            ${renderInlineMarkdown(e.period)}
                                        </p>
                                    </div>${locationLine}
                                    <ul
                                        class="list-inside list-disc pl-5 mt-1 space-y-1 print:space-y-0 print:text-sm"
                                    >
${highlights}
                                    </ul>
                                </li>`;
    })
    .join("\n");

  const listAttrs = interactive ? ' data-experience-list="true"' : "";

  const bodyHtml = `                            <ul
                                class="list-disc pl-5 space-y-4 print:space-y-2 print:text-sm"${listAttrs}
                            >
${items}
                            </ul>`;

  return renderSectionWrapper({
    id: "experience",
    title,
    bodyHtml,
    interactive,
  });
}
