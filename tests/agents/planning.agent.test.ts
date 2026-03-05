import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningAgent, type PlanningInput } from '../../src/agents/planning.agent.js';
import type { AgentContext } from '../../src/types/agent.js';
import type { Skill } from '../../src/types/skill.js';
import type { OcpsConfig } from '../../src/types/config.js';
import type { Roadmap, BacklogItem } from '../../src/types/roadmap.js';

describe('PlanningAgent', () => {
  let agent: PlanningAgent;
  let mockCtx: AgentContext;

  beforeEach(() => {
    agent = new PlanningAgent();

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

    const mockSkills: Skill[] = [
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
    ];

    mockCtx = {
      projectRoot: '/test',
      config: mockConfig,
      roadmap: mockRoadmap,
      skills: mockSkills,
      sessionId: 'test-session',
      mcpConnections: {
        basicMemory: { name: 'basicMemory', enabled: true, connected: false },
        context7: { name: 'context7', enabled: true, connected: false },
      },
    };
  });

  describe('propriedades', () => {
    it('deve_ter_nome_planningagent', () => {
      expect(agent.name).toBe('PlanningAgent');
    });

    it('deve_ter_versao_1_0_0', () => {
      expect(agent.version).toBe('1.0.0');
    });
  });

  describe('execute', () => {
    it('deve_gerar_feature_e_tarefas', async () => {
      const backlogItem: BacklogItem = {
        id: 'backlog-001',
        title: 'Criar sistema de login',
        description: 'Sistema de autenticação com OAuth2',
        acceptanceCriteria: ['Usuário pode fazer login', 'Usuário pode fazer logout'],
        status: 'pending',
        priority: 'high',
        createdAt: '2026-03-05T00:00:00Z',
      };

      const input: PlanningInput = { backlogItem };

      const result = await agent.execute(input, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.feature).toBeDefined();
      expect(result.output?.tasks.length).toBeGreaterThan(0);
    });

    it('deve_gerar_3_tarefas', async () => {
      const backlogItem: BacklogItem = {
        id: 'backlog-001',
        title: 'Criar sistema de login',
        description: 'Sistema de autenticação com OAuth2',
        acceptanceCriteria: ['Login funciona'],
        status: 'pending',
        priority: 'high',
        createdAt: '2026-03-05T00:00:00Z',
      };

      const input: PlanningInput = { backlogItem };

      const result = await agent.execute(input, mockCtx);

      expect(result.output?.tasks.length).toBe(3);
      expect(result.output?.tasks[0].title).toContain('Analisar');
      expect(result.output?.tasks[1].title).toContain('Implementar');
      expect(result.output?.tasks[2].title).toContain('Revisar');
    });

    it('deve_usar_capacity_padrao_40h', async () => {
      const backlogItem: BacklogItem = {
        id: 'backlog-001',
        title: 'Test',
        description: 'Test',
        acceptanceCriteria: ['Test'],
        status: 'pending',
        priority: 'medium',
        createdAt: '2026-03-05T00:00:00Z',
      };

      const input: PlanningInput = { backlogItem };

      const result = await agent.execute(input, mockCtx);

      expect(result.output?.sprintPlan.capacityHours).toBe(40);
    });

    it('deve_usar_capacity_customizada', async () => {
      const backlogItem: BacklogItem = {
        id: 'backlog-001',
        title: 'Test',
        description: 'Test',
        acceptanceCriteria: ['Test'],
        status: 'pending',
        priority: 'medium',
        createdAt: '2026-03-05T00:00:00Z',
      };

      const input: PlanningInput = { backlogItem, sprintCapacity: 20 };

      const result = await agent.execute(input, mockCtx);

      expect(result.output?.sprintPlan.capacityHours).toBe(20);
    });
  });

  describe('validate', () => {
    it('deve_validar_output_completo', () => {
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
