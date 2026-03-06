import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningAgent, type PlanningInput } from '../../src/agents/planning.agent.js';
import { MockLlmClient } from '../../src/core/llm-client.js';
import type { AgentContext } from '../../src/types/agent.js';
import type { Skill } from '../../src/types/skill.js';
import type { OcpsConfig } from '../../src/types/config.js';
import type { Roadmap, BacklogItem } from '../../src/types/roadmap.js';

const VALID_PLANNING_RESPONSE = JSON.stringify({
  tasks: [
    {
      id: 'task-001',
      title: 'Configurar autenticação OAuth2',
      description: 'Setup do provider OAuth2 e callbacks',
      completionCriteria: 'Provider configurado e testado',
      assignedAgent: 'tdd',
      estimatedHours: 2,
    },
    {
      id: 'task-002',
      title: 'Implementar fluxo de login',
      description: 'Tela de login e redirecionamento OAuth2',
      completionCriteria: 'Usuário consegue autenticar com sucesso',
      assignedAgent: 'tdd',
      estimatedHours: 2,
    },
    {
      id: 'task-003',
      title: 'Implementar logout e revogação de token',
      description: 'Endpoint de logout e invalidação de sessão',
      completionCriteria: 'Sessão encerrada e token invalidado',
      assignedAgent: 'tdd',
      estimatedHours: 1,
    },
  ],
});

function makeBacklogItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: 'backlog-001',
    title: 'Criar sistema de login',
    description: 'Sistema de autenticação com OAuth2',
    acceptanceCriteria: ['Usuário pode fazer login', 'Usuário pode fazer logout'],
    status: 'pending',
    priority: 'high',
    createdAt: '2026-03-05T00:00:00Z',
    ...overrides,
  };
}

function makeCtx(skills: Skill[] = []): AgentContext {
  const mockConfig: OcpsConfig = {
    version: '1.0.0',
    projectName: 'test-project',
    stack: 'typescript',
    primaryModel: 'claude-sonnet-4-5',
    mcp: {
      basicMemory: { enabled: true },
      context7: { enabled: true },
      serena: { enabled: false },
      laravelBoost: { enabled: false },
    },
    coverageThreshold: { lines: 80, branches: 70 },
    createdAt: '2026-03-05T00:00:00Z',
  };

  const mockRoadmap: Roadmap = {
    featureId: 'test',
    feature: {
      id: 'test',
      title: 'Test',
      description: 'Test',
      acceptanceCriteria: [],
      sprint: { id: 's1', tasks: [], capacityHours: 40 },
      status: 'pending',
    },
    decisions: [],
    blockers: [],
    skillsUsed: [],
    llmCheckpoint: { model: null, tokensAccumulated: 0, lastSavedAt: null },
    gates: {},
    createdAt: '2026-03-05T00:00:00Z',
    updatedAt: '2026-03-05T00:00:00Z',
  };

  return {
    projectRoot: '/tmp/planning-test',
    config: mockConfig,
    roadmap: mockRoadmap,
    skills,
    sessionId: 'test-session',
    mcpConnections: {
      basicMemory: { name: 'basicMemory', enabled: true, connected: false },
      context7: { name: 'context7', enabled: true, connected: false },
    },
  };
}

describe('PlanningAgent', () => {
  describe('propriedades', () => {
    it('deve_ter_nome_planningagent', () => {
      expect(new PlanningAgent().name).toBe('PlanningAgent');
    });

    it('deve_ter_versao_1_0_0', () => {
      expect(new PlanningAgent().version).toBe('1.0.0');
    });
  });

  describe('execute — fallback estatico (sem LLM)', () => {
    let agent: PlanningAgent;
    let ctx: AgentContext;

    beforeEach(() => {
      agent = new PlanningAgent();
      ctx = makeCtx([
        {
          name: 'feature-decomposition',
          version: '1.0.0',
          agent: 'PlanningAgent',
          stack: ['typescript'],
          description: 'Skill para decomposição de features',
          patterns: [],
          antiPatterns: [],
          lessonsLearned: [],
          references: [],
          updatedAt: '2026-03-05T00:00:00Z',
        },
      ]);
    });

    it('deve_gerar_feature_e_tarefas', async () => {
      const result = await agent.execute({ backlogItem: makeBacklogItem() }, ctx);
      expect(result.ok).toBe(true);
      expect(result.output?.feature).toBeDefined();
      expect(result.output?.tasks.length).toBeGreaterThan(0);
    });

    it('deve_gerar_3_tarefas_padrao', async () => {
      const result = await agent.execute({ backlogItem: makeBacklogItem() }, ctx);
      expect(result.output?.tasks.length).toBe(3);
      expect(result.output?.tasks[0].title).toContain('Analisar');
      expect(result.output?.tasks[1].title).toContain('Implementar');
      expect(result.output?.tasks[2].title).toContain('Revisar');
    });

    it('deve_usar_capacity_padrao_40h', async () => {
      const result = await agent.execute({ backlogItem: makeBacklogItem() }, ctx);
      expect(result.output?.sprintPlan.capacityHours).toBe(40);
    });

    it('deve_usar_capacity_customizada', async () => {
      const result = await agent.execute(
        { backlogItem: makeBacklogItem(), sprintCapacity: 20 },
        ctx,
      );
      expect(result.output?.sprintPlan.capacityHours).toBe(20);
    });
  });

  describe('execute — com LLM (MockLlmClient)', () => {
    it('deve_usar_llm_para_decompor_em_tasks', async () => {
      const mockLlm = new MockLlmClient();
      mockLlm.setDefaultResponse(VALID_PLANNING_RESPONSE);
      const agent = new PlanningAgent(mockLlm);
      const ctx = makeCtx();

      const result = await agent.execute({ backlogItem: makeBacklogItem() }, ctx);

      expect(result.ok).toBe(true);
      expect(result.output?.tasks.length).toBe(3);
      expect(result.output?.tasks[0].title).toBe('Configurar autenticação OAuth2');
      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    it('deve_usar_fallback_quando_llm_retorna_json_invalido', async () => {
      const mockLlm = new MockLlmClient();
      const agent = new PlanningAgent(mockLlm);
      const ctx = makeCtx();

      const result = await agent.execute({ backlogItem: makeBacklogItem() }, ctx);

      expect(result.ok).toBe(true);
      expect(result.output?.tasks.length).toBeGreaterThan(0);
    });

    it('deve_todas_as_tasks_ter_completion_criteria', async () => {
      const mockLlm = new MockLlmClient();
      mockLlm.setDefaultResponse(VALID_PLANNING_RESPONSE);
      const agent = new PlanningAgent(mockLlm);
      const ctx = makeCtx();

      const result = await agent.execute({ backlogItem: makeBacklogItem() }, ctx);

      result.output?.tasks.forEach((t) => {
        expect(t.completionCriteria).toBeTruthy();
      });
    });
  });

  describe('validate', () => {
    it('deve_validar_output_completo', () => {
      const agent = new PlanningAgent();
      const output = {
        feature: {
          id: 'feature-001',
          title: 'Test',
          description: 'Test',
          acceptanceCriteria: ['Test'],
          sprint: { id: 's1', tasks: [], capacityHours: 40 },
          status: 'pending' as const,
        },
        tasks: [
          {
            id: 'task-001',
            title: 'Test',
            description: 'Test',
            completionCriteria: 'Done',
            assignedAgent: 'human',
            status: 'pending' as const,
          },
        ],
        sprintPlan: { id: 's1', capacityHours: 40 },
        roadmapFile: 'test.yaml',
      };
      const result = agent.validate(output);
      expect(result.valid).toBe(true);
    });

    it('deve_invalidar_sem_tarefas', () => {
      const agent = new PlanningAgent();
      const output = {
        feature: {
          id: 'feature-001',
          title: 'Test',
          description: 'Test',
          acceptanceCriteria: ['Test'],
          sprint: { id: 's1', tasks: [], capacityHours: 40 },
          status: 'pending' as const,
        },
        tasks: [],
        sprintPlan: { id: 's1', capacityHours: 40 },
        roadmapFile: 'test.yaml',
      };
      const result = agent.validate(output);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('Pelo menos uma tarefa é obrigatória');
      }
    });
  });
});
