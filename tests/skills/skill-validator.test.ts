import { describe, it, expect } from 'vitest';
import { validateSkill } from '../../src/skills/skill-validator';

const VALID_SKILL = {
  name: 'tdd-typescript',
  version: '1.0.0',
  agent: 'tdd',
  stack: ['typescript', 'node'],
  description: 'Guia TDD para TypeScript',
  patterns: ['Red → Green → Refactor'],
  antiPatterns: ['Testar implementação, não comportamento'],
  lessonsLearned: [],
  references: ['https://vitest.dev'],
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('validateSkill', () => {
  it('deve_retornar_ok_true_quando_skill_tem_todos_os_campos_validos', () => {
    // Arrange + Act
    const result = validateSkill(VALID_SKILL);
    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('tdd-typescript');
      expect(result.value.agent).toBe('tdd');
    }
  });

  it('deve_retornar_ok_true_quando_lessonsLearned_tem_itens_validos', () => {
    const withLessons = {
      ...VALID_SKILL,
      lessonsLearned: [
        { version: 'v1.1', lesson: 'Usar vi.mock no topo', addedAt: '2026-01-01T00:00:00Z' },
        {
          version: 'v1.2',
          lesson: 'Evitar any',
          addedAt: '2026-01-02T00:00:00Z',
          projectSource: 'ocps',
        },
      ],
    };

    const result = validateSkill(withLessons);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.lessonsLearned).toHaveLength(2);
    }
  });

  it('deve_retornar_ok_false_quando_name_esta_ausente', () => {
    const { name: _n, ...semName } = VALID_SKILL;
    const result = validateSkill(semName);
    expect(result.ok).toBe(false);
  });

  it('deve_retornar_ok_false_quando_stack_nao_eh_array', () => {
    const result = validateSkill({ ...VALID_SKILL, stack: 'typescript' });
    expect(result.ok).toBe(false);
  });

  it('deve_retornar_ok_false_quando_raw_eh_null', () => {
    const result = validateSkill(null);
    expect(result.ok).toBe(false);
  });

  it('deve_retornar_ok_false_quando_raw_nao_eh_objeto', () => {
    const result = validateSkill('string invalida');
    expect(result.ok).toBe(false);
  });

  it('deve_incluir_mensagem_descritiva_no_erro_quando_invalido', () => {
    const result = validateSkill({ name: 42, stack: 'errado' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Skill inválida');
    }
  });

  it('deve_retornar_ok_false_quando_campo_obrigatorio_eh_numero_em_vez_de_string', () => {
    const result = validateSkill({ ...VALID_SKILL, agent: 123 });
    expect(result.ok).toBe(false);
  });
});
