import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { Skill } from '../types/skill.js';
import { loadSkill, PACKAGE_SKILLS_DIR } from './skill-loader.js';

/**
 * Coleta todos os nomes únicos de skills disponíveis nos quatro níveis da hierarquia.
 * A deduplicação por nome garante que a versão de maior prioridade seja usada
 * ao chamar loadSkill (que aplica resolveSkillPath internamente).
 */
function listSkillNames(projectRoot: string): string[] {
  const dirs = [
    join(projectRoot, '.ocps', 'skills', 'overrides'),
    join(projectRoot, '.ocps', 'skills', 'custom'),
    join(homedir(), '.ocps', 'skills', 'global'),
    PACKAGE_SKILLS_DIR,
  ];

  const names = new Set<string>();

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'));
      for (const file of files) {
        names.add(file.replace(/\.yaml$/, ''));
      }
    } catch {
      // Diretório inacessível — ignora silenciosamente
    }
  }

  return Array.from(names);
}

/**
 * Retorna todas as skills válidas de um agente específico,
 * respeitando a hierarquia de prioridade na resolução de cada skill.
 */
export async function loadSkillsForAgent(
  agentName: string,
  projectRoot: string,
): Promise<Skill[]> {
  const names = listSkillNames(projectRoot);
  const results = await Promise.all(names.map((name) => loadSkill(name, projectRoot)));

  return results
    .filter((r): r is { ok: true; value: Skill } => r.ok)
    .map((r) => r.value)
    .filter((skill) => skill.agent === agentName);
}
