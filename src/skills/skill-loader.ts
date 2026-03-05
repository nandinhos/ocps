import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';
import type { Result } from '../types/common.js';
import type { Skill } from '../types/skill.js';
import { validateSkill } from './skill-validator.js';

// Diretório de skills do pacote npm.
// Funciona em desenvolvimento (src/skills/) e após build (dist/skills/):
// ambos ficam 2 níveis acima do diretório skills/global.
export const PACKAGE_SKILLS_DIR = fileURLToPath(
  new URL('../../skills/global', import.meta.url),
);

/**
 * Resolve o caminho da skill seguindo a hierarquia de prioridade:
 * 1. {projectRoot}/.ocps/skills/overrides/{name}.yaml  (máxima prioridade)
 * 2. {projectRoot}/.ocps/skills/custom/{name}.yaml
 * 3. ~/.ocps/skills/global/{name}.yaml
 * 4. {packageDir}/skills/global/{name}.yaml             (mínima prioridade)
 *
 * Retorna null se a skill não existir em nenhum nível.
 */
export function resolveSkillPath(name: string, projectRoot: string): string | null {
  const candidates = [
    join(projectRoot, '.ocps', 'skills', 'overrides', `${name}.yaml`),
    join(projectRoot, '.ocps', 'skills', 'custom', `${name}.yaml`),
    join(homedir(), '.ocps', 'skills', 'global', `${name}.yaml`),
    join(PACKAGE_SKILLS_DIR, `${name}.yaml`),
  ];

  return candidates.find((p) => existsSync(p)) ?? null;
}

/**
 * Carrega e valida uma skill pelo nome, seguindo a hierarquia de busca.
 * Nunca lança exceções — erros são encapsulados em Result.
 */
export async function loadSkill(name: string, projectRoot: string): Promise<Result<Skill>> {
  const path = resolveSkillPath(name, projectRoot);

  if (!path) {
    return {
      ok: false,
      error: new Error(`Skill '${name}' não encontrada na hierarquia de busca`),
    };
  }

  let raw: unknown;
  try {
    const content = await readFile(path, 'utf-8');
    raw = parseYaml(content);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }

  return validateSkill(raw);
}
