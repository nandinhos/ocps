import { describe, it, expect, beforeEach } from 'vitest';
import { CodeReviewAgent, type CodeReviewInput } from '../../src/agents/code-review.agent.js';
import { MockLlmClient } from '../../src/core/llm-client.js';
import type { AgentContext } from '../../src/types/agent.js';
import type { Skill } from '../../src/types/skill.js';
import type { OcpsConfig } from '../../src/types/config.js';
import type { Roadmap, Task } from '../../src/types/roadmap.js';

describe('CodeReviewAgent', () => {
  let agent: CodeReviewAgent;
  let mockCtx: AgentContext;

  beforeEach(() => {
    const mockLlm = new MockLlmClient();
    agent = new CodeReviewAgent(mockLlm);

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
    it('deve_ter_nome_codereviewagent', () => {
      expect(agent.name).toBe('CodeReviewAgent');
    });

    it('deve_ter_versao_1_0_0', () => {
      expect(agent.version).toBe('1.0.0');
    });
  });

  describe('execute', () => {
    it('deve_executar_3_passes', async () => {
      const input: CodeReviewInput = {
        changedFiles: [
          { path: 'src/test.ts', content: 'export function test() {}', language: 'typescript' },
        ],
        taskContext: {
          id: 'task-1',
          title: 'Test',
          description: 'Test',
          completionCriteria: 'Done',
          assignedAgent: 'tdd',
          status: 'pending',
        },
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.ok).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.pass1).toBeDefined();
      expect(result.output?.pass2).toBeDefined();
      expect(result.output?.pass3).toBeDefined();
    });

    it('deve_aprovar_sem_blockers', async () => {
      const input: CodeReviewInput = {
        changedFiles: [
          {
            path: 'src/test.ts',
            content: 'export function test() { return true; }',
            language: 'typescript',
          },
        ],
        taskContext: {
          id: 'task-1',
          title: 'Test',
          description: 'Test',
          completionCriteria: 'Done',
          assignedAgent: 'tdd',
          status: 'pending',
        },
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.output?.approved).toBe(true);
      expect(result.output?.blockers.length).toBe(0);
    });

    it('deve_bloquear_com_eval', async () => {
      const input: CodeReviewInput = {
        changedFiles: [
          { path: 'src/test.ts', content: 'eval("console.log(1)")', language: 'typescript' },
        ],
        taskContext: {
          id: 'task-1',
          title: 'Test',
          description: 'Test',
          completionCriteria: 'Done',
          assignedAgent: 'tdd',
          status: 'pending',
        },
      };

      const result = await agent.execute(input, mockCtx);

      expect(result.output?.approved).toBe(false);
      expect(result.output?.blockers.length).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('deve_validar_output_completo', () => {
      const output = {
        pass1: { pass: 1, name: 'Structural', items: [], approved: true },
        pass2: { pass: 2, name: 'Quality', items: [], approved: true },
        pass3: { pass: 3, name: 'Security', items: [], approved: true },
        approved: true,
        blockers: [],
        suggestions: [],
      };

      const result = agent.validate(output);
      expect(result.valid).toBe(true);
    });
  });
});
