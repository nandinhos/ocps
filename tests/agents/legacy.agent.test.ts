import { describe, it, expect, beforeEach } from 'vitest';
import { LegacyAgent } from '../../src/agents/legacy.agent.js';
import { MockLlmClient } from '../../src/core/llm-client.js';
import type { AgentContext } from '../../src/types/agent.js';
import type { OcpsConfig } from '../../src/types/config.js';
import type { Roadmap } from '../../src/types/roadmap.js';

const VALID_LEGACY_RESPONSE = JSON.stringify({
  entries: [
    {
      functionName: 'processPayment',
      inputs: 'amount: number, userId: string',
      outputs: 'PaymentResult',
      sideEffects: 'Debita conta, gera log de transação',
      risk: 'high',
    },
    {
      functionName: 'validateUser',
      inputs: 'userId: string',
      outputs: 'boolean',
      sideEffects: 'Nenhum',
      risk: 'low',
    },
  ],
});

describe('LegacyAgent', () => {
  let agent: LegacyAgent;
  let mockCtx: AgentContext;

  beforeEach(() => {
    const mockLlm = new MockLlmClient();
    agent = new LegacyAgent(mockLlm);

    const mockConfig: OcpsConfig = {
      version: '1.0.0',
      projectName: 'test',
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

    mockCtx = {
      projectRoot: '/test',
      config: mockConfig,
      roadmap: mockRoadmap,
      skills: [],
      sessionId: 'test',
      mcpConnections: {
        basicMemory: { name: 'basicMemory', enabled: true, connected: false },
        context7: { name: 'context7', enabled: true, connected: false },
      },
    };
  });

  describe('propriedades', () => {
    it('deve_ter_nome_legacyagent', () => {
      expect(agent.name).toBe('LegacyAgent');
    });
  });

  describe('execute', () => {
    it('deve_gerar_behavior_map', async () => {
      const input = {
        moduleFiles: [
          {
            path: 'src/legacy.ts',
            content: 'function oldFunction() { return 1; }',
            language: 'typescript',
          },
        ],
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.behaviorMap).toBeDefined();
    });

    it('deve_gerar_drf', async () => {
      const input = {
        moduleFiles: [
          { path: 'src/legacy.ts', content: 'function test() {}', language: 'typescript' },
        ],
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.output?.drf).toBeDefined();
      expect(result.output?.drf.sections).toBeDefined();
    });

    it('deve_gerar_migration_plan', async () => {
      const input = {
        moduleFiles: [
          { path: 'src/legacy.ts', content: 'function test() {}', language: 'typescript' },
        ],
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.output?.migrationPlan).toBeDefined();
      expect(result.output?.migrationPlan.steps).toBeDefined();
    });
  });

  describe('execute — com LLM (MockLlmClient)', () => {
    it('deve_usar_llm_para_analisar_comportamento', async () => {
      const mockLlm = new MockLlmClient();
      mockLlm.setDefaultResponse(VALID_LEGACY_RESPONSE);
      const llmAgent = new LegacyAgent(mockLlm);
      const input = {
        moduleFiles: [
          { path: 'src/payment.ts', content: 'function processPayment() {}', language: 'typescript' },
        ],
      };

      const result = await llmAgent.execute(input, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.tokensUsed).toBeGreaterThan(0);
      const names = result.output?.behaviorMap.entries.map((e) => e.functionName);
      expect(names).toContain('processPayment');
      expect(names).toContain('validateUser');
    });

    it('deve_ter_risco_correto_vindo_do_llm', async () => {
      const mockLlm = new MockLlmClient();
      mockLlm.setDefaultResponse(VALID_LEGACY_RESPONSE);
      const llmAgent = new LegacyAgent(mockLlm);
      const input = {
        moduleFiles: [
          { path: 'src/payment.ts', content: 'function processPayment() {}', language: 'typescript' },
        ],
      };

      const result = await llmAgent.execute(input, mockCtx);

      const payment = result.output?.behaviorMap.entries.find((e) => e.functionName === 'processPayment');
      expect(payment?.risk).toBe('high');
    });

    it('deve_fallback_para_estatico_quando_llm_retorna_json_invalido', async () => {
      const mockLlm = new MockLlmClient();
      // sem setDefaultResponse → resposta vazia → fallback estático
      const llmAgent = new LegacyAgent(mockLlm);
      const input = {
        moduleFiles: [
          { path: 'src/legacy.ts', content: 'function oldFunction() { return 1; }', language: 'typescript' },
        ],
      };

      const result = await llmAgent.execute(input, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.output?.behaviorMap).toBeDefined();
    });
  });

  describe('validate', () => {
    it('deve_validar_output_completo', () => {
      const output = {
        behaviorMap: {
          entries: [
            {
              functionName: 'test',
              inputs: '',
              outputs: '',
              sideEffects: '',
              risk: 'low' as const,
            },
          ],
          analyzedAt: '2026-03-05',
        },
        divergences: [],
        drf: {
          title: 'Test',
          summary: 'Test',
          sections: [{ title: 'Test', content: 'Test' }],
          equivalenceTests: [],
          approved: false,
        },
        migrationPlan: {
          title: 'Test',
          summary: 'Test',
          steps: [{ order: 1, description: 'Test', risks: [], estimatedHours: 8 }],
          totalEstimatedHours: 8,
          risks: [],
        },
      };

      const result = agent.validate(output);
      expect(result.valid).toBe(true);
    });
  });
});
