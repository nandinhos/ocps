import { describe, it, expect, beforeEach } from 'vitest';
import { MultiLlmManager, RateLimitError } from '../../src/core/multi-llm-manager.js';
import { MockLlmClient } from '../../src/core/llm-client.js';

describe('MultiLlmManager', () => {
  let manager: MultiLlmManager;
  let mockClient: MockLlmClient;

  beforeEach(() => {
    manager = new MultiLlmManager();
    mockClient = new MockLlmClient();
    manager.addProvider('anthropic', mockClient);
    manager.addProvider('openai', mockClient);
  });

  describe('addProvider', () => {
    it('deve_adicionar_provider', () => {
      expect(manager.getCurrentProvider()).toBe('anthropic');
    });
  });

  describe('setStrategy', () => {
    it('deve_configurar_strategy', () => {
      manager.setStrategy({
        primary: { provider: 'anthropic', model: 'claude', apiKey: 'key' },
        fallback: { provider: 'openai', model: 'gpt4', apiKey: 'key' },
        priority: ['anthropic', 'openai'],
      });

      expect(manager.getCurrentProvider()).toBe('anthropic');
    });
  });

  describe('complete', () => {
    it('deve_chamar_provider', async () => {
      manager.setStrategy({
        primary: { provider: 'anthropic', model: 'claude', apiKey: 'key' },
        fallback: { provider: 'openai', model: 'gpt4', apiKey: 'key' },
        priority: ['anthropic', 'openai'],
      });

      const result = await manager.complete('test prompt');
      expect(result.content).toBeDefined();
    });
  });

  describe('RateLimitError', () => {
    it('deve_criar_erro', () => {
      const error = new RateLimitError('anthropic', 'Rate limit exceeded');
      expect(error.provider).toBe('anthropic');
      expect(error.name).toBe('RateLimitError');
    });
  });
});
