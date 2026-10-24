import { join } from "node:path";
import type { ResumeData } from "../types/resume";

/**
 * Generates the client-side interactive script and initial state JSON
 * for the Resume Customizer Studio (customize.html).
 */
export async function renderCustomizerClientScript(
  data: ResumeData
): Promise<string> {
  const serializedData = JSON.stringify(data).replace(/</g, "\\u003c");
  const clientJsPath = join(import.meta.dir, "customizer-client.js");
  const clientJs = await Bun.file(clientJsPath).text();

  return `<script id="resume-initial-data" type="application/json">${serializedData}</script>\n<script>\n${clientJs}\n</script>`;
}
