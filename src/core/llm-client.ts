import Anthropic from '@anthropic-ai/sdk';
import type { OcpsConfig } from '../types/config.js';

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

  constructor(config: OcpsConfig) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada');
    }

    this.client = new Anthropic({ apiKey });
    this.model = config.primaryModel || 'claude-sonnet-4-5';
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

  constructor(responses: Record<string, string> = {}) {
    this.responses = new Map(Object.entries(responses));
  }

  async complete(prompt: string): Promise<LlmResponse> {
    const cached = this.responses.get(prompt);
    if (cached) {
      return { content: cached, tokensUsed: 100 };
    }

    return {
      content: `Mock response para: ${prompt.substring(0, 50)}...`,
      tokensUsed: 100,
    };
  }

  setResponse(prompt: string, response: string): void {
    this.responses.set(prompt, response);
  }
}

export function createLlmClient(config: OcpsConfig, useMock = false): LlmClient {
  if (useMock || !process.env.ANTHROPIC_API_KEY) {
    return new MockLlmClient();
  }
  return new AnthropicClient(config);
}
