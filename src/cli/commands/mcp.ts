import * as readline from 'readline';
import { readConfig, writeConfig } from './init.js';
import { McpBridge } from '../../mcp/mcp-bridge.js';

function createRl(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
}

function isInteractive(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY;
}

export async function mcpSetup(): Promise<void> {
  const projectRoot = process.cwd();
  const config = readConfig(projectRoot);

  if (!config) {
    console.error(`\n✗ Configuração não encontrada. Execute "ocps init" primeiro.`);
    return;
  }

  if (!isInteractive()) {
    console.error(`\n✗ Este comando requer modo interativo. Execute no terminal.`);
    return;
  }

  const rl = createRl();

  const ask = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, (answer) => {
        resolve(answer || '');
      });
    });
  };

  try {
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`  OCPS MCP Setup Wizard (Intelligence Mode)`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    console.log(`📁 Projeto: ${config.projectName}`);
    console.log(`📍 Caminho: ${projectRoot}\n`);

    console.log(`═══ O que são MCPs? ═══`);
    console.log(`MCPs (Model Context Protocol) são serviços que extends a IA com:`);
    console.log(`  • Basic Memory  → Memória persistente entre sessões`);
    console.log(`  • Context7      → Busca em documentação`);
    console.log(`  • Serena        → Indexação do seu código`);
    console.log(`  • Laravel Boost → Comandos Laravel específicos para IA\n`);

    console.log(`Para rodar os serviços, abra outro terminal e execute:`);
    console.log(`  • npx @anthropic-basic-memory/serve  (porta 3000)`);
    console.log(`  • npx @context7/mcp-server           (porta 3001)\n`);

    const bridge = new McpBridge(config.mcp);
    const pings = await bridge.ping();

    // --- Basic Memory ---
    console.log(`[1/4] Basic Memory`);
    console.log(`   O que é: Memória persistente entre sessões`);
    console.log(`   Serviço: npx @anthropic-basic-memory/serve (porta 3000)`);
    const bmStatus = pings['basic-memory'];
    if (bmStatus?.connected) {
      console.log(`   ✓ Conectado`);
      config.mcp.basicMemory.enabled = true;
    } else {
      console.log(`   Status: Offline (inicie o serviço primeiro)`);
      const answer = await ask(`   Usar Basic Memory? (y/n) [n]: `);
      config.mcp.basicMemory.enabled = answer.toLowerCase().startsWith('y');
    }

    // --- Context7 ---
    console.log(`\n[2/4] Context7`);
    console.log(`   O que é: Busca contextualizada em documentação`);
    console.log(`   Serviço: npx @context7/mcp-server (porta 3001)`);
    const c7Status = pings['context7'];
    if (c7Status?.connected) {
      console.log(`   ✓ Conectado`);
      config.mcp.context7.enabled = true;
    } else {
      console.log(`   Status: Offline (inicie o serviço primeiro)`);
      const answer = await ask(`   Usar Context7? (y/n) [n]: `);
      config.mcp.context7.enabled = answer.toLowerCase().startsWith('y');
    }

    // --- Serena ---
    console.log(`\n[3/4] Serena`);
    console.log(`   O que é: Indexação e busca semântica do código`);
    console.log(`   Serviço: Rode o app/desktop Serena e configure o projeto`);
    if (config.mcp.serena.enabled && config.mcp.serena.projectPath) {
      console.log(`   ✓ Configurado: ${config.mcp.serena.projectPath}`);
      config.mcp.serena.enabled = true;
    } else {
      const answer = await ask(`   Usar Serena? (y/n) [n]: `);
      config.mcp.serena.enabled = answer.toLowerCase().startsWith('y');
      if (config.mcp.serena.enabled) {
        config.mcp.serena.projectPath = projectRoot;
      }
    }

    // --- Laravel Boost ---
    if (config.stack === 'laravel') {
      console.log(`\n[4/4] Laravel Boost`);
      console.log(`   O que é: Comandos Laravel otimizados para IA`);
      console.log(`   Serviço: php artisan boost:mcp no seu projeto Laravel`);
      const lbStatus = pings['laravel-boost'];
      if (lbStatus?.connected) {
        console.log(`   ✓ Conectado`);
        config.mcp.laravelBoost.enabled = true;
      } else {
        console.log(`   Status: Offline (inicie o serviço primeiro)`);
        const answer = await ask(`   Usar Laravel Boost? (y/n) [n]: `);
        config.mcp.laravelBoost.enabled = answer.toLowerCase().startsWith('y');
      }
    }

    writeConfig(projectRoot, config);

    console.log(`\n✅ Configuração concluída!\n`);
  } finally {
    rl.close();
  }
}
