import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { loadSkillsForAgent } from '../../src/skills/skill-engine';

const PROJECT_ROOT = join(import.meta.dirname, '../../');

describe('loadSkillsForAgent', () => {
  it('deve_retornar_skills_do_agente_tdd_quando_existe_no_pacote', async () => {
    // Arrange: tdd-typescript.yaml tem agent: tdd
    // Act
    const skills = await loadSkillsForAgent('tdd', PROJECT_ROOT);
    // Assert
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBeGreaterThan(0);
    const names = skills.map((s) => s.name);
    expect(names).toContain('tdd-typescript');
  });

  it('deve_retornar_apenas_skills_do_agente_solicitado', async () => {
    // Arrange + Act
    const skills = await loadSkillsForAgent('tdd', PROJECT_ROOT);
    // Assert: todas as skills retornadas pertencem ao agente 'tdd'
    expect(skills.every((s) => s.agent === 'tdd')).toBe(true);
  });

  it('deve_retornar_array_vazio_quando_agente_nao_tem_skills', async () => {
    // Arrange: agente inexistente
    const skills = await loadSkillsForAgent('agente-sem-skills-xyz', PROJECT_ROOT);
    expect(skills).toEqual([]);
  });

  it('deve_retornar_skills_com_estrutura_Skill_valida', async () => {
    // Arrange + Act
    const skills = await loadSkillsForAgent('tdd', PROJECT_ROOT);
    // Assert: cada skill tem os campos obrigatórios
    for (const skill of skills) {
      expect(typeof skill.name).toBe('string');
      expect(typeof skill.version).toBe('string');
      expect(typeof skill.agent).toBe('string');
      expect(Array.isArray(skill.stack)).toBe(true);
      expect(Array.isArray(skill.patterns)).toBe(true);
      expect(Array.isArray(skill.antiPatterns)).toBe(true);
    }
  });
});
