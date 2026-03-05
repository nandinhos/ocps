import { describe, it, expect, beforeEach } from 'vitest';
import { DeployAgent } from '../../src/agents/deploy.agent.js';
import { MockLlmClient } from '../../src/core/llm-client.js';
import type { AgentContext } from '../../src/types/agent.js';
import type { OcpsConfig } from '../../src/types/config.js';
import type { Roadmap, Feature } from '../../src/types/roadmap.js';

describe('DeployAgent', () => {
  let agent: DeployAgent;
  let mockCtx: AgentContext;

  beforeEach(() => {
    const mockLlm = new MockLlmClient();
    agent = new DeployAgent(mockLlm);

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
    it('deve_ter_nome_deployagent', () => {
      expect(agent.name).toBe('DeployAgent');
    });
  });

  describe('execute', () => {
    it('deve_bloquear_quando_qa_nao_aprovado', async () => {
      const feature: Feature = {
        id: 'feature-1',
        title: 'Test',
        description: 'Test',
        acceptanceCriteria: [],
        sprint: { id: 's1', tasks: [], capacityHours: 40 },
        status: 'pending',
      };

      const input = {
        feature,
        environment: 'staging' as const,
        qaApproval: {
          integrationTestResults: [],
          e2eTestResults: [],
          acceptanceCriteriaResults: [],
          approved: false,
          evidence: [],
        },
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('QA não aprovado');
    });

    it('deve_deployar_quando_qa_aprovado', async () => {
      const feature: Feature = {
        id: 'feature-1',
        title: 'Test Feature',
        description: 'Test description',
        acceptanceCriteria: ['Test criterion'],
        sprint: { id: 's1', tasks: [], capacityHours: 40 },
        status: 'pending',
      };

      const input = {
        feature,
        environment: 'staging' as const,
        qaApproval: {
          integrationTestResults: [],
          e2eTestResults: [],
          acceptanceCriteriaResults: [],
          approved: true,
          evidence: [],
        },
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.deploymentId).toBeDefined();
      expect(result.output?.smokeTestResults).toBeDefined();
    });

    it('deve_gerar_release_notes', async () => {
      const feature: Feature = {
        id: 'feature-1',
        title: 'Test Feature',
        description: 'Test description',
        acceptanceCriteria: ['Test criterion'],
        sprint: { id: 's1', tasks: [], capacityHours: 40 },
        status: 'pending',
      };

      const input = {
        feature,
        environment: 'staging' as const,
        qaApproval: {
          integrationTestResults: [],
          e2eTestResults: [],
          acceptanceCriteriaResults: [],
          approved: true,
          evidence: [],
        },
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.output?.releaseNotes).toBeDefined();
    });
  });
});
