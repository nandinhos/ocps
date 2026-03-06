import * as readline from 'readline';
import { readConfig, writeConfig } from './init.js';

export async function mcpSetup(): Promise<void> {
  const projectRoot = process.cwd();
  const config = readConfig(projectRoot);

  if (!config) {
    console.error(`\n✗ Configuração não encontrada. Execute "ocps init" primeiro.`);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  OCPS MCP Setup Wizard`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  // --- Basic Memory ---
  console.log(`[1/4] Configurando Basic Memory`);
  const bmEnabled = (await ask(`Habilitar Basic Memory? (y/n) [${config.mcp.basicMemory.enabled ? 'y' : 'n'}]: `)).toLowerCase() || (config.mcp.basicMemory.enabled ? 'y' : 'n');
  config.mcp.basicMemory.enabled = bmEnabled.startsWith('y');
  if (config.mcp.basicMemory.enabled) {
    const bmUrl = await ask(`URL do Basic Memory [${config.mcp.basicMemory.url || 'http://localhost:3000'}]: `);
    config.mcp.basicMemory.url = bmUrl || config.mcp.basicMemory.url || 'http://localhost:3000';
  }

  // --- Context7 ---
  console.log(`\n[2/4] Configurando Context7 (Documentação)`);
  const c7Enabled = (await ask(`Habilitar Context7? (y/n) [${config.mcp.context7.enabled ? 'y' : 'n'}]: `)).toLowerCase() || (config.mcp.context7.enabled ? 'y' : 'n');
  config.mcp.context7.enabled = c7Enabled.startsWith('y');
  if (config.mcp.context7.enabled) {
    const c7Url = await ask(`URL do Context7 [${config.mcp.context7.url || 'http://localhost:3001'}]: `);
    config.mcp.context7.url = c7Url || config.mcp.context7.url || 'http://localhost:3001';
  }

  // --- Serena ---
  console.log(`\n[3/4] Configurando Serena (Indexação de Código)`);
  const serenaEnabled = (await ask(`Habilitar Serena? (y/n) [${config.mcp.serena.enabled ? 'y' : 'n'}]: `)).toLowerCase() || (config.mcp.serena.enabled ? 'y' : 'n');
  config.mcp.serena.enabled = serenaEnabled.startsWith('y');
  if (config.mcp.serena.enabled) {
    const serenaPath = await ask(`Caminho do projeto para o Serena [${config.mcp.serena.projectPath || projectRoot}]: `);
    config.mcp.serena.projectPath = serenaPath || config.mcp.serena.projectPath || projectRoot;
  }

  // --- Laravel Boost ---
  if (config.stack === 'laravel') {
    console.log(`\n[4/4] Configurando Laravel Boost`);
    const lbEnabled = (await ask(`Habilitar Laravel Boost? (y/n) [${config.mcp.laravelBoost.enabled ? 'y' : 'n'}]: `)).toLowerCase() || (config.mcp.laravelBoost.enabled ? 'y' : 'n');
    config.mcp.laravelBoost.enabled = lbEnabled.startsWith('y');
  }

  writeConfig(projectRoot, config);
  console.log(`\n✅ Configuração de MCPs atualizada com sucesso em .ocps/config.yaml\n`);

  rl.close();
}