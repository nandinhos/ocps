import { describe, it, expect, vi } from 'vitest';
import { MockLlmClient, createLlmClientWithFallback } from '../../src/core/llm-client.js';
import { MultiLlmManager } from '../../src/core/multi-llm-manager.js';
import type { OcpsConfig } from '../../src/types/config.js';

describe('MockLlmClient', () => {
  it('deve_retornar_mock_response', async () => {
    const client = new MockLlmClient();
    const result = await client.complete('test prompt');

    expect(result.content).toContain('Mock response');
    expect(result.tokensUsed).toBe(100);
  });

  it('deve_usar_respostas_cacheadas', async () => {
    const client = new MockLlmClient({ 'specific prompt': 'cached response' });
    const result = await client.complete('specific prompt');

    expect(result.content).toBe('cached response');
  });

  it('deve_adicionar_respostas_dinamicamente', async () => {
    const client = new MockLlmClient();
    client.setResponse('dynamic', 'dynamic response');

    const result = await client.complete('dynamic');
    expect(result.content).toBe('dynamic response');
  });
});

function makeConfig(overrides: Partial<OcpsConfig> = {}): OcpsConfig {
  return {
    version: '1.0.0',
    projectName: 'test',
    stack: 'typescript',
    primaryModel: 'claude-sonnet-4-5',
    mcp: {
      basicMemory: { enabled: false },
      context7: { enabled: false },
      serena: { enabled: false },
      laravelBoost: { enabled: false },
    },
    coverageThreshold: { lines: 80, branches: 70 },
    createdAt: '2026-03-06T00:00:00Z',
    ...overrides,
  };
}

describe('createLlmClientWithFallback', () => {
  it('deve_retornar_client_simples_sem_fallback_model', () => {
    const client = createLlmClientWithFallback(makeConfig());
    expect(client).not.toBeInstanceOf(MultiLlmManager);
  });

  it('deve_retornar_multi_llm_manager_com_fallback_model', () => {
    const client = createLlmClientWithFallback(
      makeConfig({ fallbackModel: 'claude-haiku-4-5' }),
    );
    expect(client).toBeInstanceOf(MultiLlmManager);
  });

  it('deve_completar_com_fallback_ativo', async () => {
    const client = createLlmClientWithFallback(
      makeConfig({ fallbackModel: 'claude-haiku-4-5' }),
    );
    const result = await client.complete('test prompt');
    expect(result.content).toBeDefined();
    expect(result.tokensUsed).toBeGreaterThanOrEqual(0);
  });
});
