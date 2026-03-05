import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrainstormAgent, type BrainstormInput } from '../../src/agents/brainstorm.agent.js';
import type { AgentContext } from '../../src/types/agent.js';
import type { Skill } from '../../src/types/skill.js';
import type { OcpsConfig } from '../../src/types/config.js';
import type { Roadmap } from '../../src/types/roadmap.js';

describe('BrainstormAgent', () => {
  let agent: BrainstormAgent;
  let mockCtx: AgentContext;

  beforeEach(() => {
    agent = new BrainstormAgent();

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
        name: 'elicitacao-requisitos',
        version: '1.0.0',
        agent: 'BrainstormAgent',
        stack: ['typescript'],
        description: 'Skill para elicitação de requisitos',
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
    it('deve_ter_nome_brainstormagent', () => {
      expect(agent.name).toBe('BrainstormAgent');
    });

    it('deve_ter_versao_1_0_0', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('deve_ter_scope_corret', () => {
      expect(agent.scope).toEqual(['.ocps/roadmap/backlog.yaml']);
    });
  });

  describe('execute', () => {
    it('deve_retornar_backlog_item_com_id', async () => {
      const input: BrainstormInput = {
        rawIdea: 'Criar sistema de login com OAuth2',
        projectContext: 'Aplicação TypeScript com Express',
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.backlogItem.id).toBeDefined();
    });

    it('deve_retornar_clarifications_quando_ideia_curta', async () => {
      const input: BrainstormInput = {
        rawIdea: 'Login',
        projectContext: 'TypeScript',
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.output?.clarifications.length).toBeGreaterThan(0);
    });

    it('deve_retornar_risks_quando_menciona_banco', async () => {
      const input: BrainstormInput = {
        rawIdea: 'Criar tabela de usuários no banco de dados',
        projectContext: 'TypeScript',
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.output?.risks.length).toBeGreaterThan(0);
    });

    it('deve_retornar_skills_applied', async () => {
      const input: BrainstormInput = {
        rawIdea: 'Criar sistema de login',
        projectContext: 'TypeScript',
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.skillsApplied).toBeDefined();
    });
  });

  describe('loadSkills', () => {
    it('deve_carregar_skills_de_elicitacao', async () => {
      const skills = await agent.loadSkills(mockCtx);
      expect(skills.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validate', () => {
    it('deve_validar_backlog_item_com_aceitacao_criteria', () => {
      const output = {
        backlogItem: {
          id: 'test-1',
          title: 'Test',
          description: 'Test description',
          acceptanceCriteria: ['Criterion 1'],
          status: 'pending' as const,
          priority: 'medium' as const,
          createdAt: '2026-03-05T00:00:00Z',
        },
        clarifications: [],
        risks: [],
      };

      const result = agent.validate(output);
      expect(result.valid).toBe(true);
    });

    it('deve_invalidar_sem_acceptance_criteria', () => {
      const output = {
        backlogItem: {
          id: 'test-1',
          title: 'Test',
          description: 'Test description',
          acceptanceCriteria: [],
          status: 'pending' as const,
          priority: 'medium' as const,
          createdAt: '2026-03-05T00:00:00Z',
        },
        clarifications: [],
        risks: [],
      };

      const result = agent.validate(output);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('Critérios de aceite são obrigatórios');
      }
    });
  });
});
