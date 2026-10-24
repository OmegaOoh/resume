import { join } from "node:path";
import { renderCustomizerClientScript } from "./components/customizer-ui";
import { renderEducation } from "./components/education";
import { renderExperience } from "./components/experience";
import { renderHeader } from "./components/header";
import { renderProjects } from "./components/projects";
import { renderSkills } from "./components/skills";
import { renderSummary } from "./components/summary";
import type { ResumeData, SectionConfig } from "./types/resume";
import { escapeHtml } from "./utils/html";
import { loadResumeData } from "./utils/loader";

function renderSectionById(
  section: SectionConfig,
  data: ResumeData,
  interactive: boolean
): string {
  switch (section.id) {
    case "summary":
      return renderSummary(data.summary, section.title, interactive);
    case "skills":
      return renderSkills(data.skills, section.title, interactive);
    case "experience":
      return renderExperience(data.experience, section.title, interactive);
    case "projects":
      return renderProjects(data.projects, section.title, interactive);
    case "education":
      return renderEducation(data.education, section.title, interactive);
    default:
      return "";
  }
}

export async function buildResume(rootDir = process.cwd()): Promise<void> {
  const contentDir = join(rootDir, "content");
  const templatesDir = join(rootDir, "templates");

  console.log("Loading TOML content files...");
  const data = await loadResumeData(contentDir);

  const [indexTemplate, customizeTemplate] = await Promise.all([
    Bun.file(join(templatesDir, "index.html")).text(),
    Bun.file(join(templatesDir, "customize.html")).text(),
  ]);

  const pageTitle = `${escapeHtml(data.profile.name)} | Resume`;

  // 1. Build Static Public Landing Page (index.html)
  const staticMainSections = data.config.sections
    .filter((s) => s.enabled !== false && s.placement !== "aside")
    .map((s) => renderSectionById(s, data, false))
    .join("\n");

  const staticAsideSections = data.config.sections
    .filter((s) => s.enabled !== false && s.placement === "aside")
    .map((s) => renderSectionById(s, data, false))
    .join("\n");

  const indexHtml = indexTemplate
    .replace("<!-- TITLE -->", pageTitle)
    .replace("<!-- HEADER -->", renderHeader(data.profile, false))
    .replace("<!-- MAIN_SECTIONS -->", staticMainSections)
    .replace("<!-- ASIDE_SECTIONS -->", staticAsideSections);

  // 2. Build Interactive JD Tailoring Workbench (customize.html)
  const interactiveMainSections = data.config.sections
    .filter((s) => s.placement !== "aside")
    .map((s) => renderSectionById(s, data, true))
    .join("\n");

  const interactiveAsideSections = data.config.sections
    .filter((s) => s.placement === "aside")
    .map((s) => renderSectionById(s, data, true))
    .join("\n");

  const customizeHtml = customizeTemplate
    .replace("<!-- TITLE -->", pageTitle)
    .replace("<!-- HEADER -->", renderHeader(data.profile, true))
    .replace("<!-- MAIN_SECTIONS -->", interactiveMainSections)
    .replace("<!-- ASIDE_SECTIONS -->", interactiveAsideSections)
    .replace("<!-- CUSTOMIZER_SCRIPT -->", renderCustomizerClientScript(data));

  await Promise.all([
    Bun.write(join(rootDir, "index.html"), indexHtml),
    Bun.write(join(rootDir, "customize.html"), customizeHtml),
  ]);

  console.log("Successfully compiled index.html and customize.html");
}
