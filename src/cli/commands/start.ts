import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { readConfig } from './init.js';
import { getVersion } from './version.js';
import { Orchestrator } from '../../core/orchestrator.js';
import { BrainstormAgent } from '../../agents/brainstorm.agent.js';
import { PlanningAgent } from '../../agents/planning.agent.js';
import { TddAgent } from '../../agents/tdd.agent.js';
import { CodeReviewAgent } from '../../agents/code-review.agent.js';
import { QaAgent } from '../../agents/qa.agent.js';
import { createLlmClientWithFallback } from '../../core/llm-client.js';
import { InteractiveGateEngine } from '../../core/gate-engine.js';
import { McpBridge } from '../../mcp/mcp-bridge.js';
import { loadSkill } from '../../skills/skill-loader.js';
import { getProjectStatus } from './status.js';
import type { AgentContext } from '../../types/agent.js';
import type { Roadmap } from '../../types/roadmap.js';
import { load as parseYaml } from 'js-yaml';

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

  const status = getProjectStatus(projectRoot);

  if (status.lastGitCommit) {
    console.log(
      `\n📝 Último commit (${status.lastGitCommit.date}): ${status.lastGitCommit.hash} - ${status.lastGitCommit.message}`,
    );
  }

  console.log('\n───────────────────────────────────────────────────────────────');

  if (status.backlogItems.length > 0) {
    const pending = status.backlogItems.filter((i) => i.status !== 'done');
    console.log(
      `\n📋 Backlog: ${status.backlogItems.length} itens (${pending.length} pendentes)\n`,
    );

    for (const item of pending.slice(0, 5)) {
      const statusIcon = item.status === 'done' ? '✓' : item.status === 'in-progress' ? '●' : '○';
      console.log(`  ${statusIcon} ${item.title} [${item.status}]`);
    }

    if (pending.length > 5) {
      console.log(`  ... e mais ${pending.length - 5} itens`);
    }
  } else {
    console.log('\n📋 Backlog vazio');
  }

  console.log('\n───────────────────────────────────────────────────────────────');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const rawIdea = await new Promise<string>((resolve) => {
    rl.question('\nO que deseja desenvolver hoje? ', (answer) => {
      rl.close(); // Fechar IMEDIATAMENTE após receber a ideia
      resolve(answer);
    });
  });

  if (!rawIdea || rawIdea.trim().length < 5) {
    console.log('\nAbortado: Ideia insuficiente.\n');
    return;
  }

  // Inicializar componentes para o Orchestrator
  const llmClient = createLlmClientWithFallback(config);
  const brainstorm = new BrainstormAgent(llmClient);
  const planning = new PlanningAgent(llmClient);
  const tdd = new TddAgent(llmClient);
  const codeReview = new CodeReviewAgent(llmClient);
  const qa = new QaAgent();
  const orchestrator = new Orchestrator(brainstorm, planning, tdd, codeReview, qa);
  const gateEngine = new InteractiveGateEngine();
  orchestrator.setGateEngine(gateEngine);

  // Preparar Contexto
  const bridge = new McpBridge(config.mcp);
  const mcpStatus = await bridge.connect();

  // Carregar skills globais iniciais (exemplo simplificado)
  const skillsToLoad = ['tdd-typescript', 'elicitacao-requisitos'];
  const loadedSkills = await Promise.all(
    skillsToLoad.map(async (s) => {
      const res = await loadSkill(s, projectRoot);
      return res.ok ? res.value : null;
    }),
  );

  // Carregar roadmap atual se existir (ou criar um vazio)
  let currentRoadmap: Roadmap;
  try {
    const fase0Path = path.join(projectRoot, '.ocps', 'roadmap', 'fase-0.yaml');
    if (fs.existsSync(fase0Path)) {
      const content = fs.readFileSync(fase0Path, 'utf-8');
      currentRoadmap = parseYaml(content) as Roadmap;
    } else {
      currentRoadmap = {
        featureId: 'new-feature',
        feature: {
          id: 'new-feature',
          title: '',
          description: '',
          acceptanceCriteria: [],
          status: 'pending',
          sprint: { id: 'sprint-1', tasks: [], capacityHours: 40 },
        },
        decisions: [],
        blockers: [],
        skillsUsed: [],
        llmCheckpoint: { model: config.primaryModel, tokensAccumulated: 0, lastSavedAt: null },
        gates: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error(`Erro ao carregar roadmap: ${e}`);
    rl.close();
    return;
  }

  const ctx: AgentContext = {
    projectRoot,
    config,
    roadmap: currentRoadmap,
    skills: loadedSkills.filter((s): s is NonNullable<typeof s> => s !== null),
    sessionId: `session-${Date.now()}`,
    mcpConnections: mcpStatus.ok
      ? mcpStatus.value
      : {
          basicMemory: { name: 'basic-memory', enabled: false, connected: false },
          context7: { name: 'context7', enabled: false, connected: false },
        },
  };

  console.log('\n>>> Iniciando pipeline de agentes...\n');

  try {
    const result = await orchestrator.execute(
      {
        rawIdea,
        projectContext: `Stack: ${config.stack}, Project: ${config.projectName}`,
      },
      ctx,
    );

    if (result.ok) {
      console.log('\n[OK] Pipeline concluído com sucesso!');
      console.log(`Tokens acumulados: ${result.output?.totalTokens}`);
    } else {
      console.error(`\n[ERRO] Pipeline: ${result.error}`);
    }
  } catch (e) {
    console.error(`\n[ERRO] Inesperado no pipeline: ${e}`);
  }

  rl.close();
}
