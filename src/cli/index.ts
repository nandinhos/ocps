import { Command } from 'commander';
import * as path from 'path';
import { detectStack, writeConfig, addToGitignore, configExists } from './commands/init.js';
import { getVersion } from './commands/version.js';
import { doctor } from './commands/doctor.js';
import { start } from './commands/start.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('ocps')
    .description('OCPS — Orquestrador Cognitivo de Projetos de Software')
    .version(getVersion());

  program
    .command('init')
    .description('Inicializa OCPS no projeto atual')
    .option('-y, --yes', 'Responde sim automaticamente para todas as perguntas')
    .action(async (options) => {
      const projectRoot = process.cwd();

      const existingConfig = configExists(projectRoot);
      if (existingConfig && !options.yes) {
        console.log('Configuração já existe. Use --yes para sobrescrever.');
        process.exit(0);
      }

      if (existingConfig && options.yes) {
        console.log('Sobrescrevendo configuração existente...');
      }

      const stack = await detectStack(projectRoot);
      console.log(`Stack detectada: ${stack}`);

      const projectName = path.basename(projectRoot);
      const config = {
        version: '1.0.0',
        projectName,
        stack,
        primaryModel: 'claude-sonnet-4-5',
        mcp: {
          basicMemory: { enabled: true },
          context7: { enabled: true },
          serena: { enabled: false },
          laravelBoost: { enabled: false },
        },
        coverageThreshold: { lines: 80, branches: 70 },
        createdAt: new Date().toISOString(),
      };

      writeConfig(projectRoot, config);
      addToGitignore(projectRoot);

      console.log('\n✓ Configuração criada em .ocps/config.yaml');
      console.log('\nPróximos passos:');
      console.log('  1. ocps doctor   — Verificar dependências');
      console.log('  2. ocps start    — Iniciar sessão');
    });

  program
    .command('version')
    .description('Exibe versão do OCPS')
    .action(() => {
      const version = getVersion();
      console.log(`ocps ${version}`);
    });

  program
    .command('doctor')
    .description('Verifica dependências e configurações')
    .action(async () => {
      await doctor();
    });

  program
    .command('start')
    .description('Inicia sessão OCPS')
    .action(async () => {
      await start();
    });

  return program;
}
