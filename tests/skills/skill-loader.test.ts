import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveSkillPath, loadSkill } from '../../src/skills/skill-loader';

const PROJECT_ROOT = join(import.meta.dirname, '../../');

const VALID_SKILL_YAML = `\
name: test-skill
version: 1.0.0
agent: tdd
stack:
  - typescript
description: Skill de teste
patterns:
  - padrao de teste
antiPatterns:
  - anti-padrao
lessonsLearned: []
references:
  - https://example.com
updatedAt: "2026-01-01T00:00:00Z"
`;

describe('resolveSkillPath', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'ocps-test-'));
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true });
  });

  it('deve_retornar_path_do_pacote_quando_skill_existe_apenas_no_global', () => {
    // Arrange: skill existe no pacote, não no projeto
    // Act
    const result = resolveSkillPath('tdd-typescript', tempRoot);
    // Assert
    expect(result).not.toBeNull();
    expect(result).toContain('tdd-typescript.yaml');
    expect(result).toContain('skills');
  });

  it('deve_retornar_null_quando_skill_nao_existe_em_nenhum_nivel', () => {
    const result = resolveSkillPath('skill-que-nao-existe-xyz', tempRoot);
    expect(result).toBeNull();
  });

  it('deve_priorizar_override_sobre_custom_e_global', () => {
    // Arrange: cria override e custom com o mesmo nome
    const overridesDir = join(tempRoot, '.ocps', 'skills', 'overrides');
    const customDir = join(tempRoot, '.ocps', 'skills', 'custom');
    mkdirSync(overridesDir, { recursive: true });
    mkdirSync(customDir, { recursive: true });
    writeFileSync(join(overridesDir, 'test-skill.yaml'), VALID_SKILL_YAML);
    writeFileSync(join(customDir, 'test-skill.yaml'), VALID_SKILL_YAML);

    // Act
    const result = resolveSkillPath('test-skill', tempRoot);

    // Assert
    expect(result).toBe(join(overridesDir, 'test-skill.yaml'));
  });

  it('deve_priorizar_custom_sobre_global_quando_sem_override', () => {
    // Arrange: somente custom existe no projeto
    const customDir = join(tempRoot, '.ocps', 'skills', 'custom');
    mkdirSync(customDir, { recursive: true });
    writeFileSync(join(customDir, 'test-skill.yaml'), VALID_SKILL_YAML);

    // Act
    const result = resolveSkillPath('test-skill', tempRoot);

    // Assert
    expect(result).toBe(join(customDir, 'test-skill.yaml'));
  });

  it('deve_retornar_path_do_pacote_quando_skill_nao_existe_no_projeto', () => {
    // Arrange: tempRoot vazio, mas tdd-typescript existe no pacote
    // Act
    const result = resolveSkillPath('tdd-typescript', tempRoot);

    // Assert: deve ser o path do pacote (contém /skills/global/)
    expect(result).not.toBeNull();
    expect(result).toContain(join('skills', 'global', 'tdd-typescript.yaml'));
  });
});

describe('loadSkill', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'ocps-test-'));
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true });
  });

  it('deve_carregar_e_validar_skill_real_tdd_typescript', async () => {
    // Arrange: skill existe no pacote
    // Act
    const result = await loadSkill('tdd-typescript', PROJECT_ROOT);
    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('tdd-typescript');
      expect(result.value.agent).toBe('tdd');
      expect(result.value.stack).toContain('typescript');
      expect(Array.isArray(result.value.patterns)).toBe(true);
    }
  });

  it('deve_retornar_erro_quando_skill_nao_existe', async () => {
    const result = await loadSkill('skill-inexistente-xyz', tempRoot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('skill-inexistente-xyz');
    }
  });

  it('deve_retornar_erro_quando_yaml_sintaticamente_invalido', async () => {
    // Arrange: arquivo com YAML inválido
    const customDir = join(tempRoot, '.ocps', 'skills', 'custom');
    mkdirSync(customDir, { recursive: true });
    writeFileSync(join(customDir, 'bad-skill.yaml'), 'key: [unterminated\n  nested: badly: :');

    // Act
    const result = await loadSkill('bad-skill', tempRoot);

    // Assert
    expect(result.ok).toBe(false);
  });

  it('deve_retornar_erro_quando_yaml_valido_mas_campos_invalidos', async () => {
    // Arrange: YAML válido mas sem campos obrigatórios da Skill
    const customDir = join(tempRoot, '.ocps', 'skills', 'custom');
    mkdirSync(customDir, { recursive: true });
    writeFileSync(join(customDir, 'incomplete-skill.yaml'), 'name: only-name\nversion: 1.0.0\n');

    // Act
    const result = await loadSkill('incomplete-skill', tempRoot);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Skill inválida');
    }
  });

  it('deve_carregar_override_em_vez_da_skill_do_pacote', async () => {
    // Arrange: override com description diferente da versão do pacote
    const overridesDir = join(tempRoot, '.ocps', 'skills', 'overrides');
    mkdirSync(overridesDir, { recursive: true });
    const overrideYaml = VALID_SKILL_YAML.replace('name: test-skill', 'name: tdd-typescript');
    writeFileSync(join(overridesDir, 'tdd-typescript.yaml'), overrideYaml);

    // Act
    const result = await loadSkill('tdd-typescript', tempRoot);

    // Assert: carregou o override (description = 'Skill de teste', diferente do pacote)
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.description).toBe('Skill de teste');
    }
  });
});
