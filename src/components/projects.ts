import type { ProjectsData } from "../types/resume";
import { renderInlineMarkdown } from "../utils/markdown";
import { renderSectionWrapper } from "./section";

export function renderProjects(
  projectsData: ProjectsData,
  title = "Projects",
  interactive = false
): string {
  const items = projectsData.projects
    .filter((p) => interactive || p.enabled !== false)
    .map((p, projIdx) => {
      const highlights = p.highlights
        .map((h, hIdx) => {
          const hAttrs = interactive
            ? ` data-proj-highlight="${projIdx}-${hIdx}"`
            : "";
          return `                                        <li${hAttrs}>
                                            ${renderInlineMarkdown(h)}
                                        </li>`;
        })
        .join("\n");

      let repoLine = "";
      if (p.repository) {
        // Support either a raw URL or Markdown link in repository field
        const repoRendered = p.repository.includes("](")
          ? renderInlineMarkdown(p.repository)
          : renderInlineMarkdown(`[${p.repository}](${p.repository})`);

        const repoAttrs = interactive ? ` data-proj-repo="${projIdx}"` : "";
        repoLine = `\n                                        <span
                                            class="pr-detail block mt-2 print:mt-1 print:text-sm"${repoAttrs}
                                            ><strong>Repository:</strong>
                                            ${repoRendered}
                                        </span>`;
      }

      const hiddenClass = interactive && p.enabled === false ? " hidden" : "";
      const itemAttrs = interactive ? ` data-proj-index="${projIdx}"` : "";
      const nameAttrs = interactive ? ` data-proj-name="${projIdx}"` : "";
      const periodAttrs = interactive ? ` data-proj-period="${projIdx}"` : "";
      const ulAttrs = interactive ? ` data-proj-highlights-list="${projIdx}"` : "";

      return `                                <li class="resume-block${hiddenClass}"${itemAttrs}>
                                    <div
                                        class="flex flex-row justify-between mb-2"
                                    >
                                        <h3
                                            class="text-lg font-bold text-gray-800 print:text-base"${nameAttrs}
                                        >
                                            ${renderInlineMarkdown(p.name)}
                                        </h3>
                                        <p
                                            class="text-sm text-gray-700 print:text-sm"${periodAttrs}
                                        >
                                            ${renderInlineMarkdown(p.period)}
                                        </p>
                                    </div>
                                    <ul
                                        class="list-inside list-disc pl-5 mt-1 space-y-1 print:space-y-0 print:text-sm"${ulAttrs}
                                    >
${highlights}${repoLine}
                                    </ul>
                                </li>`;
    })
    .join("\n");

  const listAttrs = interactive ? ' data-projects-list="true"' : "";

  const bodyHtml = `                            <ul class="space-y-6 print:space-y-1"${listAttrs}>
${items}
                            </ul>`;

  return renderSectionWrapper({
    id: "projects",
    title,
    bodyHtml,
    interactive,
  });
}
