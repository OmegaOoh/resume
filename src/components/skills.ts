import type { SkillsData } from "../types/resume";
import { renderInlineMarkdown } from "../utils/markdown";
import { renderSectionWrapper } from "./section";

export function renderSkills(
  skillsData: SkillsData,
  title = "Skills & Tools",
  interactive = false
): string {
  const items = skillsData.skills
    .filter((s) => interactive || s.enabled !== false)
    .map((s, idx) => {
      const hiddenClass = interactive && s.enabled === false ? ' class="hidden"' : "";
      const itemAttrs = interactive ? ` data-skill-index="${idx}"${hiddenClass}` : "";
      const catAttrs = interactive ? ` data-skill-category="${idx}"` : "";
      const valAttrs = interactive ? ` data-skill-items="${idx}"` : "";

      return `                                <li${itemAttrs}>
                                    <strong${catAttrs}>${renderInlineMarkdown(s.category)}: </strong>
                                    <span${valAttrs}>${renderInlineMarkdown(s.items)}</span>
                                </li>`;
    })
    .join("\n");

  const listAttrs = interactive ? ' data-skills-list="true"' : "";

  const bodyHtml = `                            <ul
                                class="list-disc pl-5 space-y-1 print:space-y-0 print:text-sm"${listAttrs}
                            >
${items}
                            </ul>`;

  return renderSectionWrapper({
    id: "skills",
    title,
    bodyHtml,
    interactive,
  });
}
