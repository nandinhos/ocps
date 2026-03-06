import { Command } from 'commander';
import * as path from 'path';
import { writeConfig, addToGitignore, configExists } from './commands/init.js';
import { getVersion } from './commands/version.js';
import { doctor } from './commands/doctor.js';
import { start } from './commands/start.js';
import { mcpSetup } from './commands/mcp.js';
import { StackDetector } from '../core/stack-detector.js';

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

      const detector = new StackDetector();
      const result = detector.detect(projectRoot);
      console.log(`Stack detectada: ${result.stack}`);
      console.log(`Natureza: ${result.nature}`);
      if (result.phpVersion) console.log(`PHP Version: ${result.phpVersion}`);

      if (result.nature === 'brownfield' && result.phpVersion && parseFloat(result.phpVersion) >= 8.4) {
        console.log('\n💡 Sugestão: Este é um projeto Brownfield moderno (PHP >= 8.4).');
        console.log('   Considere habilitar o MCP Serena para indexação de código e economia de tokens.');
      }

      if (result.nature === 'greenfield') {
        if (result.hasPrd) {
          console.log('\n✓ PRD.md encontrado. O OCPS usará este arquivo para guiar o fluxo.');
        } else {
          console.log('\n⚠ Aviso: Projeto Greenfield sem PRD.md.');
          console.log('   Recomenda-se criar um arquivo PRD.md com os requisitos do sistema.');
        }
      }

      const projectName = path.basename(projectRoot);
      const config = {
        version: '1.0.0',
        projectName,
        stack: result.stack,
        nature: result.nature,
        phpVersion: result.phpVersion,
        primaryModel: 'claude-sonnet-4-5',
        mcp: {
          basicMemory: { enabled: true },
          context7: { enabled: true },
          serena: { enabled: result.nature === 'brownfield' },
          laravelBoost: { enabled: result.stack === 'laravel' },
        },
        coverageThreshold: { lines: 80, branches: 70 },
        createdAt: new Date().toISOString(),
      };

      writeConfig(projectRoot, config);
      addToGitignore(projectRoot);

      console.log('\n✓ Configuração criada em .ocps/config.yaml');
      console.log('\nPróximos passos:');
      console.log('  1. ocps mcp setup — Configurar MCPs');
      console.log('  2. ocps doctor    — Verificar dependências');
      console.log('  3. ocps start     — Iniciar sessão');
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

  const mcp = program.command('mcp').description('Gerenciamento de MCPs');

  mcp
    .command('setup')
    .description('Configura servidores MCP interativamente')
    .action(async () => {
      await mcpSetup();
    });

  return program;
}