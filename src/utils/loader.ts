import { join } from "node:path";
import type {
  ConfigData,
  EducationData,
  ExperienceData,
  ProfileData,
  ProjectsData,
  ResumeData,
  SkillsData,
  SummaryData,
} from "../types/resume";

async function loadTomlFile<T>(filePath: string): Promise<T> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`Missing required content file: ${filePath}`);
  }
  const raw = await file.text();
  try {
    return Bun.TOML.parse(raw) as T;
  } catch (err) {
    throw new Error(`Failed to parse TOML in ${filePath}: ${(err as Error).message}`);
  }
}

/**
 * Loads summary from either content/summary.toml or content/summary.md
 */
async function loadSummary(contentDir: string): Promise<SummaryData> {
  const tomlPath = join(contentDir, "summary.toml");
  const mdPath = join(contentDir, "summary.md");

  if (await Bun.file(tomlPath).exists()) {
    return loadTomlFile<SummaryData>(tomlPath);
  }
  if (await Bun.file(mdPath).exists()) {
    const content = await Bun.file(mdPath).text();
    return { content };
  }
  throw new Error(`Missing summary file: expected ${tomlPath} or ${mdPath}`);
}

/**
 * Loads and validates all resume content files from the content directory.
 */
export async function loadResumeData(contentDir: string): Promise<ResumeData> {
  const [config, profile, summary, skills, experience, projects, education] =
    await Promise.all([
      loadTomlFile<ConfigData>(join(contentDir, "config.toml")),
      loadTomlFile<ProfileData>(join(contentDir, "profile.toml")),
      loadSummary(contentDir),
      loadTomlFile<SkillsData>(join(contentDir, "skills.toml")),
      loadTomlFile<ExperienceData>(join(contentDir, "experience.toml")),
      loadTomlFile<ProjectsData>(join(contentDir, "projects.toml")),
      loadTomlFile<EducationData>(join(contentDir, "education.toml")),
    ]);

  // Basic structural validation
  if (!profile.name || !profile.title) {
    throw new Error("profile.toml must define 'name' and 'title'");
  }
  if (!Array.isArray(config.sections)) {
    throw new Error("config.toml must define a [[sections]] array");
  }
  if (!Array.isArray(skills.skills)) {
    throw new Error("skills.toml must define a [[skills]] array");
  }
  if (!Array.isArray(experience.experience)) {
    throw new Error("experience.toml must define an [[experience]] array");
  }
  if (!Array.isArray(projects.projects)) {
    throw new Error("projects.toml must define a [[projects]] array");
  }
  if (!Array.isArray(education.education)) {
    throw new Error("education.toml must define an [[education]] array");
  }

  return {
    config,
    profile,
    summary,
    skills,
    experience,
    projects,
    education,
  };
}
