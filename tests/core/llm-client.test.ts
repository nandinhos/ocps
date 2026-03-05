import { describe, it, expect, vi } from 'vitest';
import { MockLlmClient } from '../../src/core/llm-client.js';

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
