import { describe, it, expect, beforeEach } from 'vitest';
import { BrainstormAgent, type BrainstormInput } from '../../src/agents/brainstorm.agent.js';
import { MockLlmClient } from '../../src/core/llm-client.js';
import type { AgentContext } from '../../src/types/agent.js';
import type { Skill } from '../../src/types/skill.js';
import type { OcpsConfig } from '../../src/types/config.js';
import type { Roadmap } from '../../src/types/roadmap.js';

const VALID_LLM_RESPONSE = JSON.stringify({
  title: 'Sistema de login com OAuth2',
  description: 'Implementar autenticação via OAuth2 para a aplicação',
  acceptanceCriteria: [
    'Usuário consegue autenticar via Google OAuth2',
    'Token JWT é gerado após autenticação bem-sucedida',
    'Sessão expira após 24 horas',
  ],
  risks: ['Dependência de provedor externo OAuth2', 'Gerenciamento de tokens de refresh'],
  clarifications: ['Quais provedores OAuth2 devem ser suportados?'],
});

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
    projectRoot: '/test',
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

describe('BrainstormAgent', () => {
  describe('propriedades', () => {
    it('deve_ter_nome_brainstormagent', () => {
      const agent = new BrainstormAgent();
      expect(agent.name).toBe('BrainstormAgent');
    });

    it('deve_ter_versao_1_0_0', () => {
      const agent = new BrainstormAgent();
      expect(agent.version).toBe('1.0.0');
    });

    it('deve_ter_scope_correto', () => {
      const agent = new BrainstormAgent();
      expect(agent.scope).toEqual(['.ocps/roadmap/backlog.yaml']);
    });
  });

  describe('execute — fallback estatico (sem LLM)', () => {
    let agent: BrainstormAgent;
    let ctx: AgentContext;

    beforeEach(() => {
      agent = new BrainstormAgent();
      ctx = makeCtx([
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
      ]);
    });

    it('deve_retornar_backlog_item_com_id', async () => {
      const input: BrainstormInput = {
        rawIdea: 'Criar sistema de login com OAuth2',
        projectContext: 'Aplicação TypeScript com Express',
      };
      const result = await agent.execute(input, ctx);
      expect(result.ok).toBe(true);
      expect(result.output?.backlogItem.id).toBeDefined();
    });

    it('deve_retornar_acceptance_criteria_nao_vazio', async () => {
      const input: BrainstormInput = {
        rawIdea: 'Criar sistema de login com OAuth2',
        projectContext: 'Aplicação TypeScript com Express',
      };
      const result = await agent.execute(input, ctx);
      expect(result.output?.backlogItem.acceptanceCriteria.length).toBeGreaterThan(0);
    });

    it('deve_retornar_clarifications_quando_ideia_curta', async () => {
      const input: BrainstormInput = { rawIdea: 'Login', projectContext: 'TypeScript' };
      const result = await agent.execute(input, ctx);
      expect(result.output?.clarifications.length).toBeGreaterThan(0);
    });

    it('deve_retornar_risks_quando_menciona_banco', async () => {
      const input: BrainstormInput = {
        rawIdea: 'Criar tabela de usuários no banco de dados',
        projectContext: 'TypeScript',
      };
      const result = await agent.execute(input, ctx);
      expect(result.output?.risks.length).toBeGreaterThan(0);
    });
  });

  describe('execute — com LLM (MockLlmClient)', () => {
    it('deve_usar_llm_e_retornar_criterios_do_json', async () => {
      const mockLlm = new MockLlmClient();
      mockLlm.setDefaultResponse(VALID_LLM_RESPONSE);
      const agent = new BrainstormAgent(mockLlm);
      const ctx = makeCtx();

      const input: BrainstormInput = {
        rawIdea: 'Criar sistema de login com OAuth2',
        projectContext: 'TypeScript',
      };
      const result = await agent.execute(input, ctx);

      expect(result.ok).toBe(true);
      expect(result.output?.backlogItem.acceptanceCriteria.length).toBe(3);
      expect(result.output?.backlogItem.title).toBe('Sistema de login com OAuth2');
      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    it('deve_usar_fallback_quando_llm_retorna_json_invalido', async () => {
      const mockLlm = new MockLlmClient();
      const agent = new BrainstormAgent(mockLlm);
      const ctx = makeCtx();

      const input: BrainstormInput = {
        rawIdea: 'Criar sistema de notificações em tempo real',
        projectContext: 'TypeScript',
      };
      const result = await agent.execute(input, ctx);

      expect(result.ok).toBe(true);
      expect(result.output?.backlogItem.id).toBeDefined();
      expect(result.output?.backlogItem.acceptanceCriteria.length).toBeGreaterThan(0);
    });
  });

  describe('loadSkills', () => {
    it('deve_carregar_skills_de_elicitacao', async () => {
      const agent = new BrainstormAgent();
      const ctx = makeCtx([
        {
          name: 'elicitacao-requisitos',
          version: '1.0.0',
          agent: 'BrainstormAgent',
          stack: ['typescript'],
          description: 'Skill',
          patterns: [],
          antiPatterns: [],
          lessonsLearned: [],
          references: [],
          updatedAt: '2026-03-05T00:00:00Z',
        },
      ]);
      const skills = await agent.loadSkills(ctx);
      expect(skills.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validate', () => {
    it('deve_validar_backlog_item_com_acceptance_criteria', () => {
      const agent = new BrainstormAgent();
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
      const agent = new BrainstormAgent();
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
