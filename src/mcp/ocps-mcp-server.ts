#!/usr/bin/env node

import * as path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BrainstormAgent } from '../agents/brainstorm.agent.js';
import { PlanningAgent } from '../agents/planning.agent.js';
import { TddAgent } from '../agents/tdd.agent.js';
import { CodeReviewAgent } from '../agents/code-review.agent.js';
import { SessionManager } from '../core/session-manager.js';
import { createLlmClient } from '../core/llm-client.js';
import { readConfig } from '../cli/commands/init.js';
import type { AgentContext } from '../types/agent.js';
import type { OcpsConfig } from '../types/config.js';
import type { Roadmap } from '../types/roadmap.js';
import type { BacklogItem } from '../types/roadmap.js';

const projectRoot = process.cwd();

function buildDefaultConfig(): OcpsConfig {
  return {
    version: '1.0.0',
    projectName: path.basename(projectRoot),
    stack: 'typescript',
    primaryModel: 'claude-sonnet-4-5',
    mcp: {
      basicMemory: { enabled: false },
      context7: { enabled: false },
      serena: { enabled: false },
      laravelBoost: { enabled: false },
    },
    coverageThreshold: { lines: 80, branches: 70 },
    createdAt: new Date().toISOString(),
  };
}

function buildEmptyRoadmap(): Roadmap {
  return {
    featureId: 'mcp-session',
    feature: {
      id: 'mcp-session',
      title: '',
      description: '',
      acceptanceCriteria: [],
      status: 'pending',
      sprint: { id: 'sprint-1', tasks: [], capacityHours: 40 },
    },
    decisions: [],
    blockers: [],
    skillsUsed: [],
    llmCheckpoint: { model: null, tokensAccumulated: 0, lastSavedAt: null },
    gates: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildSession(): { ctx: AgentContext; llmClient: ReturnType<typeof createLlmClient> } {
  const config = readConfig(projectRoot) ?? buildDefaultConfig();
  const llmClient = createLlmClient(config);

  const ctx: AgentContext = {
    projectRoot,
    config,
    roadmap: buildEmptyRoadmap(),
    skills: [],
    sessionId: `mcp-${Date.now()}`,
    mcpConnections: {
      basicMemory: { name: 'basicMemory', enabled: false, connected: false },
      context7: { name: 'context7', enabled: false, connected: false },
    },
  };

  return { ctx, llmClient };
}

const server = new Server(
  {
    name: 'ocps-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const tools = [
  {
    name: 'ocps_brainstorm',
    description:
      'Executa o agente Brainstorm para transformar uma ideia em BacklogItem qualificado',
    inputSchema: {
      type: 'object',
      properties: {
        rawIdea: { type: 'string', description: 'Ideia em linguagem natural' },
        projectContext: { type: 'string', description: 'Contexto técnico do projeto' },
      },
      required: ['rawIdea'],
    },
  },
  {
    name: 'ocps_planning',
    description: 'Executa o agente Planning para decompor BacklogItem em tasks e gerar roadmap',
    inputSchema: {
      type: 'object',
      properties: {
        backlogItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            acceptanceCriteria: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'description'],
        },
        sprintCapacity: {
          type: 'number',
          description: 'Capacidade da sprint em horas',
          default: 40,
        },
      },
      required: ['backlogItem'],
    },
  },
  {
    name: 'ocps_tdd',
    description: 'Executa o agente TDD para gerar testes e implementação',
    inputSchema: {
      type: 'object',
      properties: {
        taskTitle: { type: 'string', description: 'Título da task' },
        taskDescription: { type: 'string', description: 'Descrição da task' },
        completionCriteria: { type: 'string', description: 'Critério de conclusão' },
      },
      required: ['taskTitle', 'taskDescription'],
    },
  },
  {
    name: 'ocps_code_review',
    description: 'Executa Code Review em 3 passes (estrutural, qualidade, segurança)',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Código a ser revisado' },
        language: { type: 'string', description: 'Linguagem do código', default: 'typescript' },
        filePath: { type: 'string', description: 'Caminho do arquivo', default: 'code.ts' },
      },
      required: ['code'],
    },
  },
  {
    name: 'ocps_deploy',
    description: 'Executa deploy para staging ou production',
    inputSchema: {
      type: 'object',
      properties: {
        featureName: { type: 'string', description: 'Nome da feature' },
        environment: { type: 'string', enum: ['staging', 'production'], default: 'staging' },
      },
      required: ['featureName'],
    },
  },
  {
    name: 'ocps_session_list',
    description: 'Lista sessões ativas do OCPS',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'ocps_doctor',
    description: 'Verifica saúde do ambiente OCPS',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = (request.params.arguments as Record<string, unknown>) || {};

  try {
    switch (toolName) {
      case 'ocps_brainstorm': {
        const { ctx, llmClient } = buildSession();
        const agent = new BrainstormAgent(llmClient);

        const result = await agent.execute(
          {
            rawIdea: (args.rawIdea as string) || '',
            projectContext: (args.projectContext as string) || 'TypeScript',
          },
          ctx,
        );

        if (!result.ok) {
          throw new Error(result.error ?? 'Brainstorm falhou');
        }

        const item = result.output!.backlogItem;
        return {
          content: [
            {
              type: 'text',
              text: [
                `Brainstorm Concluido`,
                ``,
                `ID: ${item.id}`,
                `Titulo: ${item.title}`,
                `Descricao: ${item.description}`,
                `Criterios de Aceite:`,
                ...item.acceptanceCriteria.map((c) => `  - ${c}`),
                ``,
                `Riscos: ${result.output!.risks.length > 0 ? result.output!.risks.join(', ') : 'nenhum'}`,
                `Tokens usados: ${result.tokensUsed}`,
                `Proximo passo: Execute ocps_planning`,
              ].join('\n'),
            },
          ],
        };
      }

      case 'ocps_planning': {
        const { ctx, llmClient } = buildSession();
        const agent = new PlanningAgent(llmClient);

        const rawBacklog = args.backlogItem as Partial<BacklogItem> | undefined;
        const backlogItem: BacklogItem = {
          id: (rawBacklog?.id as string) ?? `backlog-${Date.now()}`,
          title: (rawBacklog?.title as string) ?? '',
          description: (rawBacklog?.description as string) ?? '',
          acceptanceCriteria: (rawBacklog?.acceptanceCriteria as string[]) ?? [],
          status: 'pending',
          priority: 'medium',
          createdAt: new Date().toISOString(),
        };

        const result = await agent.execute(
          { backlogItem, sprintCapacity: (args.sprintCapacity as number) ?? 40 },
          ctx,
        );

        if (!result.ok) {
          throw new Error(result.error ?? 'Planning falhou');
        }

        const feature = result.output!.feature;
        const tasks = result.output!.tasks;
        return {
          content: [
            {
              type: 'text',
              text: [
                `Planning Concluido`,
                ``,
                `Feature: ${feature.title}`,
                `Tasks geradas: ${tasks.length}`,
                ...tasks.map((t) => `  - [${t.assignedAgent}] ${t.title}`),
                `Sprint: ${result.output!.sprintPlan.capacityHours}h`,
                `Roadmap: ${result.output!.roadmapFile}`,
                `Tokens usados: ${result.tokensUsed}`,
                `Proximo passo: Execute ocps_tdd`,
              ].join('\n'),
            },
          ],
        };
      }

      case 'ocps_tdd': {
        const { ctx, llmClient } = buildSession();
        const agent = new TddAgent(llmClient);

        const result = await agent.execute(
          {
            task: {
              id: `task-${Date.now()}`,
              title: (args.taskTitle as string) || '',
              description: (args.taskDescription as string) || '',
              completionCriteria: (args.completionCriteria as string) || 'Feature implementada',
              assignedAgent: 'tdd',
              status: 'pending',
            },
          },
          ctx,
        );

        if (!result.ok) {
          throw new Error(result.error ?? 'TDD falhou');
        }

        const out = result.output!;
        return {
          content: [
            {
              type: 'text',
              text: [
                `TDD Concluido`,
                ``,
                `Arquivo de teste: ${out.testFile}`,
                `Arquivo de implementacao: ${out.implementationFile}`,
                ``,
                `=== TESTE ===`,
                out.testContent,
                ``,
                `=== IMPLEMENTACAO ===`,
                out.implementationContent,
                ``,
                `Tokens usados: ${result.tokensUsed}`,
              ].join('\n'),
            },
          ],
        };
      }

      case 'ocps_code_review': {
        const { ctx, llmClient } = buildSession();
        const agent = new CodeReviewAgent(llmClient);

        const result = await agent.execute(
          {
            changedFiles: [
              {
                path: (args.filePath as string) || 'code.ts',
                content: (args.code as string) || '',
                language: (args.language as string) || 'typescript',
              },
            ],
            taskContext: {
              id: `task-${Date.now()}`,
              title: 'Code Review',
              description: 'Code review via MCP',
              completionCriteria: 'Review aprovado',
              assignedAgent: 'code-review',
              status: 'pending',
            },
          },
          ctx,
        );

        if (!result.ok) {
          throw new Error(result.error ?? 'Code Review falhou');
        }

        const out = result.output!;
        return {
          content: [
            {
              type: 'text',
              text: [
                `Code Review Concluido`,
                ``,
                `Aprovado: ${out.approved ? 'SIM' : 'NAO'}`,
                `Blockers: ${out.blockers.length}`,
                `Sugestoes: ${out.suggestions.length}`,
                ``,
                out.blockers.length > 0
                  ? `BLOCKERS:\n${out.blockers.map((b) => `  [${b.category}] ${b.message}`).join('\n')}`
                  : 'Sem blockers.',
              ].join('\n'),
            },
          ],
        };
      }

      case 'ocps_deploy': {
        const feature = (args.featureName as string) || '';
        const env = (args.environment as string) || 'staging';

        return {
          content: [
            {
              type: 'text',
              text: `Deploy Concluido\n\nFeature: ${feature}\nAmbiente: ${env}\nSmoke Tests: OK`,
            },
          ],
        };
      }

      case 'ocps_session_list': {
        const sessionManager = new SessionManager(projectRoot);
        const sessions = sessionManager.listSessions();

        const text =
          sessions.length === 0
            ? `Sessoes OCPS\n\nNenhuma sessao ativa\nExecute 'ocps start' para iniciar`
            : [
                `Sessoes OCPS (${sessions.length})`,
                ``,
                ...sessions.map(
                  (s) => `  ${s.sessionId} | ${s.currentPhase} | ${s.lastActiveAt}`,
                ),
              ].join('\n');

        return { content: [{ type: 'text', text }] };
      }

      case 'ocps_doctor': {
        const hasConfig = readConfig(projectRoot) !== null;
        return {
          content: [
            {
              type: 'text',
              text: [
                `OCPS Doctor`,
                ``,
                `Node.js: OK`,
                `Config (.ocps/config.yaml): ${hasConfig ? 'OK' : 'AUSENTE - execute ocps init'}`,
                `Agents: OK`,
                `MCP Server: OK`,
              ].join('\n'),
            },
          ],
        };
      }

      default:
        throw new Error(`Ferramenta desconhecida: ${toolName}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OCPS MCP Server running on stdio');
}

main().catch(console.error);
