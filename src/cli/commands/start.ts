import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { readConfig } from './init.js';
import { getVersion } from './version.js';

interface RoadmapFeature {
  id: string;
  title: string;
  status: string;
}

export async function start(): Promise<void> {
  const projectRoot = process.cwd();

  const config = readConfig(projectRoot);
  if (!config) {
    console.error('\n✗ Configuração não encontrada.');
    console.error('Execute "ocps init" primeiro.\n');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  OCPS — Orquestrador Cognitivo de Projetos de Software');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Projeto: ${config.projectName}`);
  console.log(`Stack:   ${config.stack}`);
  console.log(`Modelo:  ${config.primaryModel}`);
  console.log(`Versão:  ${getVersion()}`);

  console.log('\n───────────────────────────────────────────────────────────────');

  const roadmapDir = path.join(projectRoot, '.ocps', 'roadmap');
  const roadmapFiles = fs.existsSync(roadmapDir)
    ? fs.readdirSync(roadmapDir).filter((f) => f.endsWith('.yaml'))
    : [];

  if (roadmapFiles.length > 0) {
    console.log('\nFeatures ativas:\n');

    for (const file of roadmapFiles) {
      const filePath = path.join(roadmapDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      const idMatch = fileContent.match(/featureId:\s*(\S+)/);
      const titleMatch = fileContent.match(/title:\s*["']?([^"'\n]+)["']?/);
      const statusMatch = fileContent.match(/status:\s*(\S+)/);

      const feature: RoadmapFeature = {
        id: idMatch?.[1] || file,
        title: titleMatch?.[1] || 'Sem título',
        status: statusMatch?.[1] || 'unknown',
      };

      const statusIcon =
        feature.status === 'done' ? '✓' : feature.status === 'in-progress' ? '●' : '○';
      console.log(`  ${statusIcon} ${feature.title} [${feature.status}]`);

      const pendingTaskMatch = fileContent.match(
        /- id:\s*(\S+)\n\s+title:\s*["']?([^"'\n]+)["']?\n\s+status:\s*pending/,
      );
      if (pendingTaskMatch) {
        console.log(`\nPróxima tarefa: ${pendingTaskMatch[2]} (${pendingTaskMatch[1]})`);
      }
    }
  } else {
    console.log('\nNenhuma feature encontrada no roadmap.');
    console.log('Use "ocps init" e depois "ocps start" para iniciar uma sessão.\n');
  }

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('\nAguardando confirmação para continuar...\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Pressione ENTER para continuar (ou ctrl+C para sair): ', () => {
    rl.close();
    console.log('\n✓ Sessão iniciada (stub - pipeline de agentes ainda não implementado)\n');
  });
}
