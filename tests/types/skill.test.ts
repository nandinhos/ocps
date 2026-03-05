import { describe, it, expect, expectTypeOf } from 'vitest';
import type { Skill, SkillLesson } from '../../src/types/skill';

describe('skill types', () => {
  it('deve_aceitar_SkillLesson_com_todos_os_campos', () => {
    const lesson: SkillLesson = {
      version: 'v1.1',
      lesson: 'Sempre usar vi.mock() antes dos imports',
      addedAt: '2026-01-01T00:00:00Z',
      projectSource: 'ocps',
    };
    expect(lesson.version).toBe('v1.1');
    expect(lesson.projectSource).toBe('ocps');
  });

  it('deve_aceitar_SkillLesson_sem_projectSource', () => {
    const lesson: SkillLesson = {
      version: 'v1.0',
      lesson: 'Lição base',
      addedAt: '2026-01-01T00:00:00Z',
    };
    expect(lesson.projectSource).toBeUndefined();
  });

  it('deve_aceitar_Skill_com_todos_os_campos', () => {
    const skill: Skill = {
      name: 'tdd-typescript',
      version: '1.0.0',
      agent: 'tdd',
      stack: ['typescript', 'node'],
      description: 'Guia TDD para projetos TypeScript',
      patterns: ['Red → Green → Refactor'],
      antiPatterns: ['Escrever testes depois do código'],
      lessonsLearned: [],
      references: ['https://vitest.dev'],
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(skill.name).toBe('tdd-typescript');
    expect(skill.stack).toContain('typescript');
  });

  it('deve_tipar_stack_como_array_de_string', () => {
    expectTypeOf<Skill['stack']>().toEqualTypeOf<string[]>();
  });

  it('deve_tipar_lessonsLearned_como_array_de_SkillLesson', () => {
    expectTypeOf<Skill['lessonsLearned']>().toEqualTypeOf<SkillLesson[]>();
  });
});
