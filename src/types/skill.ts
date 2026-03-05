// 1. Nenhum import externo necessário

// 2. Interfaces

export interface SkillLesson {
  version: string;
  lesson: string;
  addedAt: string;
  projectSource?: string;
}

export interface Skill {
  name: string;
  version: string;
  agent: string;
  stack: string[];
  description: string;
  patterns: string[];
  antiPatterns: string[];
  lessonsLearned: SkillLesson[];
  references: string[];
  updatedAt: string;
}
