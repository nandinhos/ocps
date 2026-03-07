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
import { SessionManager } from '../../core/session-manager.js';
import { getProjectStatus } from './status.js';
import type { AgentContext } from '../../types/agent.js';
import type { Roadmap } from '../../types/roadmap.js';
import { load as parseYaml } from 'js-yaml';

async function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function runPipeline(rawIdea: string, projectRoot: string, config: any): Promise<void> {
  const llmClient = createLlmClientWithFallback(config);
  const brainstorm = new BrainstormAgent(llmClient);
  const planning = new PlanningAgent(llmClient);
  const tdd = new TddAgent(llmClient);
  const codeReview = new CodeReviewAgent(llmClient);
  const qa = new QaAgent();
  const orchestrator = new Orchestrator(brainstorm, planning, tdd, codeReview, qa);
  const gateEngine = new InteractiveGateEngine();
  orchestrator.setGateEngine(gateEngine);

  const bridge = new McpBridge(config.mcp);
  await bridge.connect();

  const SKILLS_BY_STACK: Record<string, string[]> = {
    typescript: ['tdd-typescript', 'elicitacao-requisitos', 'coverage-analysis'],
    nodejs: ['tdd-typescript', 'elicitacao-requisitos'],
    laravel: ['tdd-laravel-pest', 'elicitacao-requisitos', 'laravel-conventions'],
    python: ['elicitacao-requisitos'],
    php: ['elicitacao-requisitos'],
  };

  const skillsToLoad = SKILLS_BY_STACK[config.stack] || ['elicitacao-requisitos'];
  const loadedSkills = await Promise.all(
    skillsToLoad.map(async (s) => {
      const res = await loadSkill(s, projectRoot);
      return res.ok ? res.value : null;
    }),
  );

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
    return;
  }

  const sessionManager = new SessionManager(projectRoot);
  const session = sessionManager.createSession(projectRoot, config);

  const ctx: AgentContext = {
    projectRoot,
    config,
    roadmap: currentRoadmap,
    skills: loadedSkills.filter((s): s is NonNullable<typeof s> => s !== null),
    sessionId: session.sessionId,
    mcpConnections: {
      basicMemory: { name: 'basic-memory', enabled: false, connected: false },
      context7: { name: 'context7', enabled: false, connected: false },
    },
  };

  sessionManager.updatePhase(session.sessionId, 'brainstorm');
  console.log(`\n📝 Sessão: ${session.sessionId}\n`);

  console.log('>>> Iniciando pipeline de agentes...\n');

  try {
    const result = await orchestrator.execute(
      {
        rawIdea,
        projectContext: `Stack: ${config.stack}, Project: ${config.projectName}`,
      },
      ctx,
    );

    if (result.ok) {
      sessionManager.updatePhase(session.sessionId, 'complete');
      console.log('\n[OK] Pipeline concluído com sucesso!');
      console.log(`Tokens acumulados: ${result.output?.totalTokens}`);
    } else {
      sessionManager.updatePhase(session.sessionId, 'failed');
      console.error(`\n[ERRO] Pipeline: ${result.error}`);
    }
  } catch (e) {
    sessionManager.updatePhase(session.sessionId, 'error');
    console.error(`\n[ERRO] Inesperado no pipeline: ${e}`);
  }
}

export async function start(): Promise<void> {
  const projectRoot = process.cwd();

  const config = readConfig(projectRoot);
  if (!config) {
    console.error('\n✗ Configuração não encontrada.');
    console.error('Execute "ocps install" primeiro.\n');
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

  const pendingItems = status.backlogItems.filter((i) => i.status !== 'done');

  if (pendingItems.length > 0) {
    console.log('\n📋 Você tem itens pendentes no backlog:\n');

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      const statusIcon = item.status === 'in-progress' ? '●' : '○';
      console.log(`  [${i + 1}] ${statusIcon} ${item.title}`);
    }

    console.log('\n  [N] Nova ideia');
    console.log('  [S] Sair\n');

    const choice = await askQuestion('Escolha uma opção: ');

    if (choice.toUpperCase() === 'S') {
      console.log('\nEncerrando. Até mais!\n');
      return;
    }

    if (choice.toUpperCase() !== 'N') {
      const itemIndex = parseInt(choice) - 1;
      if (itemIndex >= 0 && itemIndex < pendingItems.length) {
        const selectedItem = pendingItems[itemIndex];
        console.log(`\n>>> Continuando com: ${selectedItem.title}\n`);

        await runPipeline(selectedItem.title, projectRoot, config);
        return;
      }
    }
  }

  console.log('\n───────────────────────────────────────────────────────────────');

  const rawIdea = await askQuestion('\nO que deseja desenvolver hoje? ');

  if (!rawIdea || rawIdea.trim().length < 5) {
    console.log('\nAbortado: Ideia insuficiente.\n');
    return;
  }

  await runPipeline(rawIdea, projectRoot, config);
}
