import Anthropic from '@anthropic-ai/sdk';
import type { OcpsConfig } from '../types/config.js';
import { MultiLlmManager } from './multi-llm-manager.js';

export interface LlmResponse {
  content: string;
  tokensUsed: number;
}

export interface LlmClient {
  complete(prompt: string): Promise<LlmResponse>;
}

export class AnthropicClient implements LlmClient {
  private client: Anthropic;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: OcpsConfig, modelOverride?: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada');
    }

    this.client = new Anthropic({ apiKey });
    this.model = modelOverride ?? config.primaryModel ?? 'claude-sonnet-4-5';
    this.temperature = 0.7;
    this.maxTokens = 4096;
  }

  async complete(prompt: string): Promise<LlmResponse> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    let text = '';
    if ('text' in content) {
      text = content.text;
    }

    return {
      content: text,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    };
  }
}

export class MockLlmClient implements LlmClient {
  private responses: Map<string, string>;
  private defaultResponse: string;

  constructor(responses: Record<string, string> = {}, defaultResponse = '') {
    this.responses = new Map(Object.entries(responses));
    this.defaultResponse = defaultResponse;
  }

  async complete(prompt: string): Promise<LlmResponse> {
    const cached = this.responses.get(prompt);
    if (cached) {
      return { content: cached, tokensUsed: 100 };
    }

    if (this.defaultResponse) {
      return { content: this.defaultResponse, tokensUsed: 100 };
    }

    return {
      content: `Mock response para: ${prompt.substring(0, 50)}...`,
      tokensUsed: 100,
    };
  }

  setResponse(prompt: string, response: string): void {
    this.responses.set(prompt, response);
  }

  setDefaultResponse(response: string): void {
    this.defaultResponse = response;
  }
}

export function createLlmClient(config: OcpsConfig, useMock = false): LlmClient {
  if (useMock || !process.env.ANTHROPIC_API_KEY) {
    if (!useMock) {
      console.warn('[OCPS] ANTHROPIC_API_KEY nao configurada — usando MockLlmClient (respostas simuladas)');
    }
    return new MockLlmClient();
  }
  return new AnthropicClient(config);
}

export function createLlmClientWithFallback(config: OcpsConfig): LlmClient {
  if (!config.fallbackModel) {
    return createLlmClient(config);
  }

  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const primary: LlmClient = hasApiKey ? new AnthropicClient(config) : new MockLlmClient();
  const fallback: LlmClient = hasApiKey
    ? new AnthropicClient(config, config.fallbackModel)
    : new MockLlmClient();

  const manager = new MultiLlmManager();
  manager.addProvider('anthropic', primary);
  manager.addProvider('openai', fallback);
  manager.setStrategy({
    primary: { provider: 'anthropic', model: config.primaryModel, apiKey: '' },
    fallback: { provider: 'openai', model: config.fallbackModel, apiKey: '' },
    priority: ['anthropic', 'openai'],
  });

  console.log(`[LLM] MultiLlmManager: ${config.primaryModel} → ${config.fallbackModel} (fallback em rate limit)`);
  return manager;
}
