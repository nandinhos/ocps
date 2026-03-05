import { describe, it, expect, beforeEach } from 'vitest';
import { Orchestrator, type PipelineInput } from '../../src/core/orchestrator.js';
import { BrainstormAgent } from '../../src/agents/brainstorm.agent.js';
import { PlanningAgent } from '../../src/agents/planning.agent.js';
import { TddAgent } from '../../src/agents/tdd.agent.js';
import { MockLlmClient } from '../../src/core/llm-client.js';
import type { AgentContext } from '../../src/types/agent.js';
import type { Skill } from '../../src/types/skill.js';
import type { OcpsConfig } from '../../src/types/config.js';
import type { Roadmap } from '../../src/types/roadmap.js';

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  let mockCtx: AgentContext;

  beforeEach(() => {
    const mockLlm = new MockLlmClient();
    const brainstorm = new BrainstormAgent();
    const planning = new PlanningAgent();
    const tdd = new TddAgent(mockLlm);

    orchestrator = new Orchestrator(brainstorm, planning, tdd);

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

    const mockSkills: Skill[] = [];

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

  describe('execute', () => {
    it('deve_executar_pipeline_completo', async () => {
      const input: PipelineInput = {
        rawIdea: 'Criar sistema de login com OAuth2',
        projectContext: 'Aplicação TypeScript com Express',
      };

      const result = await orchestrator.execute(input, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.phasesCompleted).toContain('brainstorm');
      expect(result.output?.phasesCompleted).toContain('planning');
    });

    it('deve_retornar_backlog_item_e_feature', async () => {
      const input: PipelineInput = {
        rawIdea: 'Sistema de login',
        projectContext: 'TypeScript',
      };

      const result = await orchestrator.execute(input, mockCtx);

      expect(result.output?.backlogItem).toBeDefined();
      expect(result.output?.feature).toBeDefined();
    });
  });
});
