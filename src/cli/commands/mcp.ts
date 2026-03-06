import * as readline from 'readline';
import { readConfig, writeConfig } from './init.js';
import { McpBridge } from '../../mcp/mcp-bridge.js';

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
  console.log(`  OCPS MCP Setup Wizard (Intelligence Mode)`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  // Instanciar a Bridge para testar conexões atuais
  const bridge = new McpBridge(config.mcp);
  const pings = await bridge.ping();

  // --- Basic Memory ---
  console.log(`[1/4] Basic Memory`);
  const bmStatus = pings['basic-memory'];
  if (bmStatus?.connected) {
    console.log(`✓ Já está configurado e FUNCIONAL em: ${config.mcp.basicMemory.url || 'http://localhost:3000'}`);
    const reconf = await ask(`Deseja reconfigurar mesmo assim? (y/N): `);
    if (!reconf.toLowerCase().startsWith('y')) {
      config.mcp.basicMemory.enabled = true;
    } else {
      const bmUrl = await ask(`Nova URL [${config.mcp.basicMemory.url || 'http://localhost:3000'}]: `);
      config.mcp.basicMemory.url = bmUrl || config.mcp.basicMemory.url || 'http://localhost:3000';
      config.mcp.basicMemory.enabled = true;
    }
  } else {
    console.log(`⚠ Status: Offline ou não configurado.`);
    const bmEnabled = (await ask(`Habilitar Basic Memory? (y/n) [n]: `)).toLowerCase();
    config.mcp.basicMemory.enabled = bmEnabled.startsWith('y');
    if (config.mcp.basicMemory.enabled) {
      const bmUrl = await ask(`URL do Basic Memory [http://localhost:3000]: `);
      config.mcp.basicMemory.url = bmUrl || 'http://localhost:3000';
    }
  }

  // --- Context7 ---
  console.log(`\n[2/4] Context7 (Documentação)`);
  const c7Status = pings['context7'];
  if (c7Status?.connected) {
    console.log(`✓ Já está configurado e FUNCIONAL em: ${config.mcp.context7.url || 'http://localhost:3001'}`);
    const reconf = await ask(`Deseja reconfigurar mesmo assim? (y/N): `);
    if (!reconf.toLowerCase().startsWith('y')) {
      config.mcp.context7.enabled = true;
    } else {
      const c7Url = await ask(`Nova URL [${config.mcp.context7.url || 'http://localhost:3001'}]: `);
      config.mcp.context7.url = c7Url || config.mcp.context7.url || 'http://localhost:3001';
      config.mcp.context7.enabled = true;
    }
  } else {
    console.log(`⚠ Status: Offline ou não configurado.`);
    const c7Enabled = (await ask(`Habilitar Context7? (y/n) [n]: `)).toLowerCase();
    config.mcp.context7.enabled = c7Enabled.startsWith('y');
    if (config.mcp.context7.enabled) {
      const c7Url = await ask(`URL do Context7 [http://localhost:3001]: `);
      config.mcp.context7.url = c7Url || 'http://localhost:3001';
    }
  }

  // --- Serena ---
  console.log(`\n[3/4] Serena (Indexação de Código)`);
  // Serena por enquanto é simulação no ping, então mantemos o fluxo padrão mas com check de path
  if (config.mcp.serena.enabled && config.mcp.serena.projectPath) {
    console.log(`✓ Já habilitado para o projeto em: ${config.mcp.serena.projectPath}`);
    const reconf = await ask(`Deseja alterar o caminho? (y/N): `);
    if (reconf.toLowerCase().startsWith('y')) {
      const serenaPath = await ask(`Novo caminho [${config.mcp.serena.projectPath}]: `);
      config.mcp.serena.projectPath = serenaPath || config.mcp.serena.projectPath;
    }
  } else {
    const serenaEnabled = (await ask(`Habilitar Serena? (y/n) [n]: `)).toLowerCase();
    config.mcp.serena.enabled = serenaEnabled.startsWith('y');
    if (config.mcp.serena.enabled) {
      const serenaPath = await ask(`Caminho do projeto [${projectRoot}]: `);
      config.mcp.serena.projectPath = serenaPath || projectRoot;
    }
  }

  // --- Laravel Boost ---
  if (config.stack === 'laravel') {
    console.log(`\n[4/4] Laravel Boost`);
    if (config.mcp.laravelBoost.enabled) {
      console.log(`✓ Já habilitado.`);
      const reconf = await ask(`Deseja desabilitar? (y/N): `);
      if (reconf.toLowerCase().startsWith('y')) config.mcp.laravelBoost.enabled = false;
    } else {
      const lbEnabled = (await ask(`Habilitar Laravel Boost? (y/n) [n]: `)).toLowerCase();
      config.mcp.laravelBoost.enabled = lbEnabled.startsWith('y');
    }
  }

  writeConfig(projectRoot, config);
  console.log(`\n✅ Configuração de MCPs atualizada com sucesso!\n`);

  rl.close();
}