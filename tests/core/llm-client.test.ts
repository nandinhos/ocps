import { describe, it, expect, vi } from 'vitest';
import { 
  MockLlmClient, 
  createLlmClientWithFallback,
  AnthropicClient,
  OpenAiClient,
  GoogleLlmClient
} from '../../src/core/llm-client.js';
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
    primaryModel: 'claude-3-5-sonnet-latest',
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

describe('LlmClients (Vercel AI SDK)', () => {
  it('AnthropicClient deve ser instanciável', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const config = makeConfig({ primaryModel: 'claude-3-5-sonnet-latest' });
    const client = new AnthropicClient(config);
    expect(client).toBeDefined();
  });

  it('OpenAiClient deve ser instanciável', () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const config = makeConfig({ primaryModel: 'gpt-4o' });
    const client = new OpenAiClient(config);
    expect(client).toBeDefined();
  });

  it('GoogleLlmClient deve ser instanciável', () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';
    const config = makeConfig({ primaryModel: 'gemini-1.5-pro' });
    const client = new GoogleLlmClient(config);
    expect(client).toBeDefined();
  });
});

describe('createLlmClientWithFallback', () => {
  it('deve_retornar_client_simples_sem_fallback_model', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const client = createLlmClientWithFallback(makeConfig());
    expect(client).not.toBeInstanceOf(MultiLlmManager);
  });

  it('deve_retornar_multi_llm_manager_com_fallback_model', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.OPENAI_API_KEY = 'test-key';
    const client = createLlmClientWithFallback(
      makeConfig({ fallbackModel: 'gpt-4o' }),
    );
    expect(client).toBeInstanceOf(MultiLlmManager);
  });
});
