import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from './init.js';
import { getVersion } from './version.js';

interface DoctorResult {
  node: { status: 'ok' | 'error'; version?: string; message?: string };
  build: { status: 'ok' | 'warning' | 'error'; message?: string };
  config: { status: 'ok' | 'error'; message?: string };
  mcps: { name: string; status: 'ok' | 'warning' | 'error'; message?: string }[];
}

function checkNodeVersion(): { status: 'ok' | 'error'; version?: string; message?: string } {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);

  if (major >= 20) {
    return { status: 'ok', version };
  }

  return { status: 'error', version, message: `Node.js ${version} < 20.0.0` };
}

function checkBuild(): { status: 'ok' | 'warning' | 'error'; message?: string } {
  const projectRoot = process.cwd();
  const distDir = path.join(projectRoot, 'dist');

  if (!fs.existsSync(distDir)) {
    return { status: 'warning', message: 'Build não encontrado. Execute npm run build.' };
  }

  const cliDist = path.join(distDir, 'cli', 'index.js');
  if (!fs.existsSync(cliDist)) {
    return { status: 'error', message: 'CLI não compilado. Execute npm run build.' };
  }

  return { status: 'ok' };
}

function checkConfig(projectRoot: string): { status: 'ok' | 'error'; message?: string } {
  const config = readConfig(projectRoot);

  if (!config) {
    return { status: 'error', message: 'Configuração não encontrada. Execute ocps init.' };
  }

  if (!config.primaryModel) {
    return { status: 'error', message: 'Modelo LLM não configurado.' };
  }

  return { status: 'ok' };
}

function checkMcps(
  projectRoot: string,
): { name: string; status: 'ok' | 'warning' | 'error'; message?: string }[] {
  const config = readConfig(projectRoot);
  const results: { name: string; status: 'ok' | 'warning' | 'error'; message?: string }[] = [];

  if (!config) {
    return [
      { name: 'basicMemory', status: 'warning', message: 'Config não carregada' },
      { name: 'context7', status: 'warning', message: 'Config não carregada' },
      { name: 'serena', status: 'warning', message: 'Config não carregada' },
      { name: 'laravelBoost', status: 'warning', message: 'Config não carregada' },
    ];
  }

  const mcps = [
    { name: 'basicMemory', enabled: config.mcp.basicMemory.enabled },
    { name: 'context7', enabled: config.mcp.context7.enabled },
    { name: 'serena', enabled: config.mcp.serena.enabled },
    { name: 'laravelBoost', enabled: config.mcp.laravelBoost.enabled },
  ];

  for (const mcp of mcps) {
    if (!mcp.enabled) {
      results.push({ name: mcp.name, status: 'warning', message: 'Desabilitado' });
    } else {
      results.push({
        name: mcp.name,
        status: 'warning',
        message: 'Simulação (ping não implementado)',
      });
    }
  }

  return results;
}

export async function doctor(): Promise<void> {
  const projectRoot = process.cwd();

  console.log('\n=== OCPS Doctor ===\n');

  const result: DoctorResult = {
    node: checkNodeVersion(),
    build: checkBuild(),
    config: checkConfig(projectRoot),
    mcps: checkMcps(projectRoot),
  };

  const nodeIcon = result.node.status === 'ok' ? '✓' : '✗';
  const nodeColor = result.node.status === 'ok' ? '\x1b[32m' : '\x1b[31m';
  console.log(
    `${nodeColor}${nodeIcon}\x1b[0m Node.js: ${result.node.version || result.node.message}`,
  );

  const buildIcon =
    result.build.status === 'ok' ? '✓' : result.build.status === 'warning' ? '⚠' : '✗';
  const buildColor =
    result.build.status === 'ok'
      ? '\x1b[32m'
      : result.build.status === 'warning'
        ? '\x1b[33m'
        : '\x1b[31m';
  console.log(`${buildColor}${buildIcon}\x1b[0m Build: ${result.build.message || 'OK'}`);

  const configIcon = result.config.status === 'ok' ? '✓' : '✗';
  const configColor = result.config.status === 'ok' ? '\x1b[32m' : '\x1b[31m';
  console.log(`${configColor}${configIcon}\x1b[0m Config: ${result.config.message || 'OK'}`);

  console.log('\n--- MCPs ---\n');

  for (const mcp of result.mcps) {
    const icon = mcp.status === 'ok' ? '✓' : mcp.status === 'warning' ? '⚠' : '✗';
    const color =
      mcp.status === 'ok' ? '\x1b[32m' : mcp.status === 'warning' ? '\x1b[33m' : '\x1b[31m';
    console.log(`${color}${icon}\x1b[0m ${mcp.name}: ${mcp.message}`);
  }

  console.log(`\nocps ${getVersion()}\n`);

  const criticalFailed = result.node.status === 'error' || result.config.status === 'error';

  if (criticalFailed) {
    console.log('\x1b[31mErros críticos encontrados. Corrija antes de continuar.\x1b[0m\n');
    process.exit(1);
  }
}
