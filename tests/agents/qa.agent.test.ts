import { describe, it, expect, beforeEach } from 'vitest';
import { QaAgent } from '../../src/agents/qa.agent.js';
import type { AgentContext } from '../../src/types/agent.js';
import type { OcpsConfig } from '../../src/types/config.js';
import type { Roadmap, Feature } from '../../src/types/roadmap.js';

describe('QaAgent', () => {
  let agent: QaAgent;
  let mockCtx: AgentContext;

  beforeEach(() => {
    agent = new QaAgent();

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
    it('deve_ter_nome_qaagent', () => {
      expect(agent.name).toBe('QaAgent');
    });
  });

  describe('execute', () => {
    it('deve_retornar_resultados_de_testes', async () => {
      const feature: Feature = {
        id: 'feature-1',
        title: 'Test',
        description: 'Test',
        acceptanceCriteria: [' criterion 1'],
        sprint: { id: 's1', tasks: [], capacityHours: 40 },
        status: 'pending',
      };

      const input = {
        feature,
        implementedFiles: {
          pass1: { pass: 1, name: 'Structural', items: [], approved: true },
          pass2: { pass: 2, name: 'Quality', items: [], approved: true },
          pass3: { pass: 3, name: 'Security', items: [], approved: true },
          approved: true,
          blockers: [],
          suggestions: [],
        },
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.integrationTestResults).toBeDefined();
      expect(result.output?.e2eTestResults).toBeDefined();
    });

    it('deve_aprovar_quando_tudo_passar', async () => {
      const feature: Feature = {
        id: 'feature-1',
        title: 'Test',
        description: 'Test',
        acceptanceCriteria: ['Test criterion'],
        sprint: { id: 's1', tasks: [], capacityHours: 40 },
        status: 'pending',
      };

      const input = {
        feature,
        implementedFiles: {
          pass1: { pass: 1, name: 'Structural', items: [], approved: true },
          pass2: { pass: 2, name: 'Quality', items: [], approved: true },
          pass3: { pass: 3, name: 'Security', items: [], approved: true },
          approved: true,
          blockers: [],
          suggestions: [],
        },
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.output?.approved).toBe(true);
    });
  });
});
