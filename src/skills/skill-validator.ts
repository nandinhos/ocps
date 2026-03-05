import { z } from 'zod';
import type { Result } from '../types/common.js';
import type { Skill } from '../types/skill.js';

// Schemas Zod espelham exatamente as interfaces em src/types/skill.ts

const SkillLessonSchema = z.object({
  version: z.string(),
  lesson: z.string(),
  addedAt: z.string(),
  projectSource: z.string().optional(),
});

const SkillSchema = z.object({
  name: z.string(),
  version: z.string(),
  agent: z.string(),
  stack: z.array(z.string()),
  description: z.string(),
  patterns: z.array(z.string()),
  antiPatterns: z.array(z.string()),
  lessonsLearned: z.array(SkillLessonSchema),
  references: z.array(z.string()),
  updatedAt: z.string(),
});

export function validateSkill(raw: unknown): Result<Skill> {
  const parsed = SkillSchema.safeParse(raw);

  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return {
      ok: false,
      error: new Error(`Skill inválida: ${messages.join('; ')}`),
    };
  }

  return { ok: true, value: parsed.data };
}
