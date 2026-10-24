export type SectionId = "summary" | "skills" | "experience" | "projects" | "education";

export interface SectionConfig {
  id: SectionId;
  title: string;
  enabled?: boolean;
  placement?: "main" | "aside";
}

export interface ConfigData {
  sections: SectionConfig[];
}

export interface ContactItem {
  icon: string;
  alt: string;
  text: string;
  select_all?: boolean;
  enabled?: boolean;
}

export interface ProfileData {
  name: string;
  title: string;
  location: string;
  contacts: ContactItem[];
}

export interface SummaryData {
  content: string;
  variants?: {
    label: string;
    content: string;
  }[];
}

export interface SkillItem {
  category: string;
  items: string;
  enabled?: boolean;
}

export interface SkillsData {
  skills: SkillItem[];
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  location?: string;
  enabled?: boolean;
  highlights: string[];
}

export interface ExperienceData {
  experience: ExperienceItem[];
}

export interface ProjectItem {
  name: string;
  period: string;
  repository?: string;
  enabled?: boolean;
  highlights: string[];
}

export interface ProjectsData {
  projects: ProjectItem[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  period: string;
  enabled?: boolean;
  details: string[];
}

export interface EducationData {
  education: EducationItem[];
}

export interface ResumeData {
  config: ConfigData;
  profile: ProfileData;
  summary: SummaryData;
  skills: SkillsData;
  experience: ExperienceData;
  projects: ProjectsData;
  education: EducationData;
}
