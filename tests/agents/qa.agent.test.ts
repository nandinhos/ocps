import { describe, it, expect, beforeEach } from 'vitest';
import { QaAgent } from '../../src/agents/qa.agent.js';
import { MockLlmClient } from '../../src/core/llm-client.js';
import type { AgentContext } from '../../src/types/agent.js';
import type { OcpsConfig } from '../../src/types/config.js';
import type { Roadmap, Feature } from '../../src/types/roadmap.js';
import type { CodeFile } from '../../src/agents/code-review.agent.js';

const VALID_QA_RESPONSE = JSON.stringify([
  { criterion: 'Usuário pode fazer login', passed: true, evidence: 'Autenticação implementada no código' },
  { criterion: 'Usuário pode fazer logout', passed: true, evidence: 'Logout endpoint implementado' },
]);

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feature-001',
    title: 'Sistema de login',
    description: 'Autenticação com OAuth2',
    acceptanceCriteria: ['Usuário pode fazer login', 'Usuário pode fazer logout'],
    sprint: { id: 's1', tasks: [], capacityHours: 40 },
    status: 'pending',
    ...overrides,
  };
}

function makeFiles(): CodeFile[] {
  return [
    { path: 'src/auth.ts', content: 'export function login() {}', language: 'typescript' },
    { path: 'tests/auth.test.ts', content: "import { login } from '../src/auth.js';", language: 'typescript' },
  ];
}

function makeCtx(): AgentContext {
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

  return {
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
}

describe('QaAgent', () => {
  describe('propriedades', () => {
    it('deve_ter_nome_qaagent', () => {
      expect(new QaAgent().name).toBe('QaAgent');
    });
  });

  describe('execute — sem LLM (fallback estatico)', () => {
    let agent: QaAgent;
    let ctx: AgentContext;

    beforeEach(() => {
      agent = new QaAgent();
      ctx = makeCtx();
    });

    it('deve_retornar_resultados_de_testes', async () => {
      const result = await agent.execute({ feature: makeFeature(), implementedFiles: makeFiles() }, ctx);
      expect(result.ok).toBe(true);
      expect(result.output?.integrationTestResults).toBeDefined();
      expect(result.output?.e2eTestResults).toBeDefined();
    });

    it('deve_aprovar_quando_tudo_passar', async () => {
      const result = await agent.execute({ feature: makeFeature(), implementedFiles: makeFiles() }, ctx);
      expect(result.output?.approved).toBe(true);
    });

    it('deve_gerar_acceptance_criteria_results_para_cada_criterio', async () => {
      const result = await agent.execute({ feature: makeFeature(), implementedFiles: makeFiles() }, ctx);
      expect(result.output?.acceptanceCriteriaResults.length).toBe(2);
    });
  });

  describe('execute — com LLM (MockLlmClient)', () => {
    it('deve_usar_llm_para_validar_acceptance_criteria', async () => {
      const mockLlm = new MockLlmClient();
      mockLlm.setDefaultResponse(VALID_QA_RESPONSE);
      const agent = new QaAgent(mockLlm);
      const ctx = makeCtx();

      const result = await agent.execute({ feature: makeFeature(), implementedFiles: makeFiles() }, ctx);

      expect(result.ok).toBe(true);
      expect(result.output?.acceptanceCriteriaResults.length).toBe(2);
      expect(result.output?.acceptanceCriteriaResults[0].passed).toBe(true);
      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    it('deve_usar_fallback_quando_llm_retorna_json_invalido', async () => {
      const mockLlm = new MockLlmClient();
      const agent = new QaAgent(mockLlm);
      const ctx = makeCtx();

      const result = await agent.execute({ feature: makeFeature(), implementedFiles: makeFiles() }, ctx);

      expect(result.ok).toBe(true);
      expect(result.output?.acceptanceCriteriaResults.length).toBeGreaterThan(0);
    });

    it('deve_ter_evidence_quando_llm_responde', async () => {
      const mockLlm = new MockLlmClient();
      mockLlm.setDefaultResponse(VALID_QA_RESPONSE);
      const agent = new QaAgent(mockLlm);
      const ctx = makeCtx();

      const result = await agent.execute({ feature: makeFeature(), implementedFiles: makeFiles() }, ctx);

      result.output?.acceptanceCriteriaResults.forEach((r) => {
        expect(r.evidence.length).toBeGreaterThan(0);
      });
    });
  });
});
