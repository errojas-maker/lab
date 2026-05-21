export interface Publication {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  volume?: string;
  pages?: string;
  doi?: string;
  abstract: string;
  tags: string[];
  link?: string;
  citations: number;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  period: string;
  details: string[];
  location: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  organization: string;
  period: string;
  description: string[];
  type: 'academic' | 'research' | 'management';
  location: string;
}

export interface Course {
  id: string;
  name: string;
  level: string;
  code: string;
  description: string;
  topics: string[];
  semester: string;
}

export interface ResearchLine {
  id: string;
  title: string;
  description: string;
  icon: string;
  projectsCount: number;
  publicationsCount: number;
}
