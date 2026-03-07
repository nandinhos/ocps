import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from './init.js';
import { execSync } from 'child_process';

interface BacklogItemSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface ProjectStatus {
  hasConfig: boolean;
  projectName: string;
  stack: string;
  nature: string;
  backlogItems: BacklogItemSummary[];
  lastGitCommit?: { hash: string; message: string; date: string };
  roadmapFiles: string[];
}

function loadBacklogItems(projectRoot: string): BacklogItemSummary[] {
  const items: BacklogItemSummary[] = [];
  const roadmapDir = path.join(projectRoot, '.ocps', 'roadmap');

  if (!fs.existsSync(roadmapDir)) {
    return items;
  }

  const files = fs.readdirSync(roadmapDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

  for (const file of files) {
    try {
      const filePath = path.join(roadmapDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      const idMatch = content.match(/id:\s*(\S+)/);
      const titleMatch = content.match(/title:\s*["']?([^"'\n]+)["']?/);
      const statusMatch = content.match(/status:\s*(\S+)/);
      const priorityMatch = content.match(/priority:\s*(\S+)/);

      if (idMatch || titleMatch) {
        items.push({
          id: idMatch?.[1] || file.replace('.yaml', '').replace('.yml', ''),
          title: titleMatch?.[1] || 'Sem título',
          status: statusMatch?.[1] || 'pending',
          priority: priorityMatch?.[1] || 'medium',
        });
      }
    } catch {
      // ignore parse errors
    }
  }

  return items;
}

function getLastGitCommit(
  projectRoot: string,
): { hash: string; message: string; date: string } | undefined {
  try {
    const hash = execSync('git rev-parse HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    const message = execSync('git log -1 --pretty=format:"%s"', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    const date = execSync('git log -1 --pretty=format:"%ad" --date=short', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    return { hash: hash.substring(0, 7), message, date };
  } catch {
    return undefined;
  }
}

export function getProjectStatus(projectRoot: string): ProjectStatus {
  const config = readConfig(projectRoot);
  const hasConfig = config !== null;

  const backlogItems = loadBacklogItems(projectRoot);
  const lastCommit = getLastGitCommit(projectRoot);

  const roadmapDir = path.join(projectRoot, '.ocps', 'roadmap');
  const roadmapFiles = fs.existsSync(roadmapDir)
    ? fs.readdirSync(roadmapDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    : [];

  return {
    hasConfig,
    projectName: config?.projectName || path.basename(projectRoot),
    stack: config?.stack || 'unknown',
    nature: config?.nature || 'unknown',
    backlogItems,
    lastGitCommit: lastCommit,
    roadmapFiles,
  };
}

export function printProjectStatus(status: ProjectStatus): void {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  OCPS — Status do Projeto');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!status.hasConfig) {
    console.log('⚠️  Projeto não inicializado. Execute "ocps install" primeiro.\n');
    return;
  }

  console.log(`📁 Projeto: ${status.projectName}`);
  console.log(`🛠️  Stack:   ${status.stack} (${status.nature})`);

  if (status.lastGitCommit) {
    console.log(`\n📝 Último commit (${status.lastGitCommit.date}):`);
    console.log(`   ${status.lastGitCommit.hash} - ${status.lastGitCommit.message}`);
  }

  console.log('\n───────────────────────────────────────────────────────────────');

  if (status.backlogItems.length > 0) {
    console.log(`\n📋 Backlog (${status.backlogItems.length} itens):\n`);

    for (const item of status.backlogItems) {
      const statusIcon = item.status === 'done' ? '✓' : item.status === 'in-progress' ? '●' : '○';
      const priorityIcon =
        item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
      console.log(`  ${statusIcon} ${priorityIcon} ${item.title}`);
      console.log(`     ID: ${item.id} | Status: ${item.status}`);
    }
  } else {
    console.log('\n📋 Backlog vazio');
  }

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('\n🚀 Próximos passos:');
  console.log('   ocps start      — Iniciar nova sessão de desenvolvimento');
  console.log('   ocps backlog    — Gerenciar backlog');
  console.log('   ocps doctor     — Verificar ambiente\n');
}

export async function status(): Promise<void> {
  const projectRoot = process.cwd();
  const status = getProjectStatus(projectRoot);
  printProjectStatus(status);
}

export async function listBacklog(): Promise<void> {
  const projectRoot = process.cwd();
  const status = getProjectStatus(projectRoot);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  OCPS — Backlog');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!status.hasConfig) {
    console.log('⚠️  Projeto não inicializado.\n');
    return;
  }

  if (status.backlogItems.length === 0) {
    console.log('📋 Backlog vazio. Execute "ocps start" para criar um item.\n');
    return;
  }

  const pendingItems = status.backlogItems.filter((i) => i.status !== 'done');
  const doneItems = status.backlogItems.filter((i) => i.status === 'done');

  if (pendingItems.length > 0) {
    console.log(`⏳ Pendentes (${pendingItems.length}):\n`);
    for (const item of pendingItems) {
      const priorityIcon =
        item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
      console.log(`  ${priorityIcon} ${item.title}`);
      console.log(`     ID: ${item.id} | Prioridade: ${item.priority}`);
    }
  }

  if (doneItems.length > 0) {
    console.log(`\n✅ Concluídos (${doneItems.length}):\n`);
    for (const item of doneItems) {
      console.log(`  ✓ ${item.title}`);
    }
  }

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('\nAções:');
  console.log('   ocps start     — Continuar com próximo item');
  console.log('   ocps status    — Ver status geral\n');
}
