import { describe, it, expect, beforeEach } from 'vitest';
import { TddAgent } from '../../src/agents/tdd.agent.js';
import type { AgentContext } from '../../src/types/agent.js';
import type { Skill } from '../../src/types/skill.js';
import type { OcpsConfig } from '../../src/types/config.js';
import type { Roadmap, Task } from '../../src/types/roadmap.js';
import { MockLlmClient } from '../../src/core/llm-client.js';

describe('TddAgent', () => {
  let agent: TddAgent;
  let mockCtx: AgentContext;
  let mockLlm: MockLlmClient;

  beforeEach(() => {
    mockLlm = new MockLlmClient();
    agent = new TddAgent(mockLlm);

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
        name: 'tdd-typescript',
        version: '1.0.0',
        agent: 'TddAgent',
        stack: ['typescript'],
        description: 'Skill para TDD em TypeScript',
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
    it('deve_ter_nome_tddagent', () => {
      expect(agent.name).toBe('TddAgent');
    });

    it('deve_ter_versao_1_0_0', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('deve_ter_scope_correto', () => {
      expect(agent.scope).toContain('src/**/*.ts');
    });
  });

  describe('execute', () => {
    it('deve_retornar_output_com_test_e_impl', async () => {
      const task: Task = {
        id: 'task-001',
        title: 'Criar função de soma',
        description: 'Implementar função que soma dois números',
        completionCriteria: 'Função retorna soma correta',
        assignedAgent: 'tdd',
        status: 'pending',
      };

      const result = await agent.execute({ task }, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.testFile).toBeDefined();
      expect(result.output?.implementationFile).toBeDefined();
      expect(result.output?.coverageReport).toBeDefined();
    });

    it('deve_derivar_filename_do_titulo_da_task', async () => {
      const task: Task = {
        id: 'task-001',
        title: 'Criar sistema de autenticação',
        description: 'Auth system',
        completionCriteria: 'Auth works',
        assignedAgent: 'tdd',
        status: 'pending',
      };

      const result = await agent.execute({ task }, mockCtx);

      expect(result.output?.testFile).toContain('criar-sistema-de-autenticacao');
      expect(result.output?.implementationFile).toContain('criar-sistema-de-autenticacao');
    });

    it('deve_nao_usar_heuristica_hardcoded', async () => {
      const task: Task = {
        id: 'task-001',
        title: 'Implementar feature de pagamento',
        description: 'Payment feature',
        completionCriteria: 'Payment works',
        assignedAgent: 'tdd',
        status: 'pending',
      };

      const result = await agent.execute({ task }, mockCtx);

      expect(result.output?.testFile).not.toContain('generated-code');
      expect(result.output?.testFile).toContain('implementar-feature-de-pagamento');
    });

    it('deve_retornar_tokens_used', async () => {
      const task: Task = {
        id: 'task-001',
        title: 'Test',
        description: 'Test',
        completionCriteria: 'Done',
        assignedAgent: 'tdd',
        status: 'pending',
      };

      const result = await agent.execute({ task }, mockCtx);

      expect(result.tokensUsed).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('deve_validar_output_completo', () => {
      const output = {
        testFile: "import { it } from 'vitest';",
        testContent: "import { it } from 'vitest';",
        implementationFile: 'export function test() {}',
        implementationContent: 'export function test() {}',
        refactoredFiles: [],
        coverageReport: { lines: 85, branches: 75 },
      };

      const result = agent.validate(output);
      expect(result.valid).toBe(true);
    });

    it('deve_invalidar_test_vazio', () => {
      const output = {
        testFile: '',
        testContent: '',
        implementationFile: 'export function test() {}',
        implementationContent: 'export function test() {}',
        refactoredFiles: [],
        coverageReport: { lines: 85, branches: 75 },
      };

      const result = agent.validate(output);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('Conteúdo do teste vazio');
      }
    });
  });
});
