import { Command } from 'commander';
import * as path from 'path';
import { writeConfig, addToGitignore, configExists, generateMcpJson } from './commands/init.js';
import { getVersion } from './commands/version.js';
import { doctor } from './commands/doctor.js';
import { start } from './commands/start.js';
import { mcpSetup } from './commands/mcp.js';
import { StackDetector } from '../core/stack-detector.js';

interface EnvironmentCheck {
  name: string;
  required: boolean;
  version?: string;
  installed: boolean;
}

async function checkEnvironment(stack: string): Promise<EnvironmentCheck[]> {
  const checks: EnvironmentCheck[] = [];

  const nodeCheck: EnvironmentCheck = { name: 'Node.js', required: true, installed: false };
  try {
    const result = await import('child_process').then((fs) => {
      return fs.execSync('node --version', {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    });
    nodeCheck.installed = true;
    nodeCheck.version = result.trim();
  } catch {}
  checks.push(nodeCheck);

  if (stack === 'laravel' || stack === 'php') {
    const phpCheck: EnvironmentCheck = { name: 'PHP', required: true, installed: false };
    try {
      const result = await import('child_process').then((fs) => {
        return fs.execSync('php --version', {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      });
      phpCheck.installed = true;
      phpCheck.version = result.split('\n')[0].replace('PHP ', '').split(' ')[0];
    } catch {}
    checks.push(phpCheck);
  }

  if (stack === 'nodejs' || stack === 'typescript') {
    const npmCheck: EnvironmentCheck = { name: 'npm', required: true, installed: false };
    try {
      const result = await import('child_process').then((fs) => {
        return fs.execSync('npm --version', {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      });
      npmCheck.installed = true;
      npmCheck.version = result.trim();
    } catch {}
    checks.push(npmCheck);
  }

  return checks;
}

function printEnvironmentCheck(checks: EnvironmentCheck[]): void {
  console.log('\n═══ Verificação de Ambiente ═══');
  let allPassed = true;
  for (const check of checks) {
    const status = check.installed ? '✓' : '✗';
    const version = check.version ? ` (${check.version})` : '';
    console.log(`  ${status} ${check.name}${version}`);
    if (!check.installed && check.required) {
      allPassed = false;
    }
  }
  if (!allPassed) {
    console.log(
      '\n  ⚠️ Alguns requisitos não foram encontrados. Execute "ocps doctor" para detalhes.',
    );
  }
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('ocps')
    .description('OCPS — Orquestrador Cognitivo de Projetos de Software')
    .version(getVersion());

  async function runInstall(
    projectRoot: string,
    options: { yes?: boolean; force?: boolean },
  ): Promise<void> {
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

    const envChecks = await checkEnvironment(result.stack);
    printEnvironmentCheck(envChecks);

    if (
      result.nature === 'brownfield' &&
      result.phpVersion &&
      parseFloat(result.phpVersion) >= 8.4
    ) {
      console.log('\n💡 Sugestão: Este é um projeto Brownfield moderno (PHP >= 8.4).');
      console.log(
        '   Considere habilitar o MCP Serena para indexação de código e economia de tokens.',
      );
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

    const mcpResult = generateMcpJson(projectRoot, result.stack, result.phpVersion, options.force);
    if (mcpResult.created) {
      console.log('✓ .mcp.json criado');
    }

    console.log('\n✓ Configuração criada em .ocps/config.yaml');
    console.log('\nPróximos passos:');
    console.log('  1. ocps mcp setup — Configurar MCPs');
    console.log('  2. ocps doctor    — Verificar dependências');
    console.log('  3. ocps start     — Iniciar sessão');
  }

  program
    .command('install')
    .description('Instala e configura o OCPS no projeto atual')
    .option('-y, --yes', 'Responde sim automaticamente para todas as perguntas')
    .option('-f, --force', 'Força sobrescrita de arquivos existentes')
    .action(async (options) => {
      const projectRoot = process.cwd();
      await runInstall(projectRoot, options);
    });

  program
    .command('init')
    .description('Instala e configura o OCPS no projeto atual (alias para install)')
    .option('-y, --yes', 'Responde sim automaticamente para todas as perguntas')
    .option('-f, --force', 'Força sobrescrita de arquivos existentes')
    .action(async (options) => {
      const projectRoot = process.cwd();
      await runInstall(projectRoot, options);
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
