import type { ProfileData } from "../types/resume";
import { escapeAttr } from "../utils/html";
import { renderInlineMarkdown } from "../utils/markdown";

export function renderHeader(profile: ProfileData, interactive = false): string {
  const contacts = profile.contacts
    .filter((c) => interactive || c.enabled !== false)
    .map((c, idx) => {
      const spanClass = c.select_all ? ' class="select-all"' : "";
      const renderedText = renderInlineMarkdown(c.text);
      const isSimpleText = !renderedText.startsWith("<a ");
      const innerHtml = isSimpleText
        ? `<span${spanClass}${interactive ? ` data-contact-text="${idx}"` : ""}>${renderedText}</span>`
        : interactive
        ? `<span data-contact-text="${idx}">${renderedText}</span>`
        : renderedText;

      const hiddenClass = interactive && c.enabled === false ? " hidden" : "";
      const dataAttrs = interactive ? ` data-contact-index="${idx}"` : "";

      return `                            <p
                                class="flex items-center gap-2 text-gray-700 print:text-sm${hiddenClass}"${dataAttrs}
                            >
                                <img
                                    src="${escapeAttr(c.icon)}"
                                    alt="${escapeAttr(c.alt)}"
                                    class="w-5 h-5 inline align-middle print:w-4 print:h-4"
                                />
                                ${innerHtml}
                            </p>`;
    })
    .join("\n");

  const nameAttr = interactive ? ' data-profile-field="name"' : "";
  const titleAttr = interactive ? ' data-profile-field="title"' : "";
  const locationAttr = interactive ? ' data-profile-field="location"' : "";

  return `            <header class="resume-block">
                <div class="header-layout">
                    <div class="info-section">
                        <div>
                            <h1
                                class="text-4xl font-extrabold tracking-tight text-gray-900 print:text-2xl"${nameAttr}
                            >
                                ${renderInlineMarkdown(profile.name)}
                            </h1>
                        </div>
                        <h2
                            class="text-lg font-medium text-gray-700 mt-1 print:text-base"${titleAttr}
                        >
                            ${renderInlineMarkdown(profile.title)}
                        </h2>
                        <p class="text-gray-600 mt-1 print:text-sm"${locationAttr}>
                            ${renderInlineMarkdown(profile.location)}
                        </p>
                        <div class="contact-section justify-between mt-3 print:mt-1">
${contacts}
                        </div>
                    </div>
                </div>
                <hr
                    class="my-4 border-[1.5px] border-gray-500 rounded print:my-2"
                />
            </header>`;
}
