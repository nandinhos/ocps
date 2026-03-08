import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
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
  private model: string;

  constructor(config: OcpsConfig, modelOverride?: string) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY não configurada');
    }
    this.model = modelOverride ?? config.primaryModel ?? 'claude-3-5-sonnet-latest';
  }

  async complete(prompt: string): Promise<LlmResponse> {
    const { text, usage } = await generateText({
      model: anthropic(this.model) as any,
      prompt,
    });

    return {
      content: text,
      tokensUsed: usage.totalTokens,
    };
  }
}

export class OpenAiClient implements LlmClient {
  private model: string;

  constructor(_config: OcpsConfig, modelOverride?: string) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }
    this.model = modelOverride ?? 'gpt-4o';
  }

  async complete(prompt: string): Promise<LlmResponse> {
    const { text, usage } = await generateText({
      model: openai(this.model) as any,
      prompt,
    });

    return {
      content: text,
      tokensUsed: usage.totalTokens,
    };
  }
}

export class GoogleLlmClient implements LlmClient {
  private model: string;

  constructor(_config: OcpsConfig, modelOverride?: string) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY não configurada');
    }
    this.model = modelOverride ?? 'gemini-1.5-pro';
  }

  async complete(prompt: string): Promise<LlmResponse> {
    const { text, usage } = await generateText({
      model: google(this.model) as any,
      prompt,
    });

    return {
      content: text,
      tokensUsed: usage.totalTokens,
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
  if (useMock) return new MockLlmClient();

  if (config.primaryModel?.startsWith('claude') && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicClient(config);
  }

  if ((config.primaryModel?.startsWith('gpt') || config.primaryModel?.startsWith('o1')) && process.env.OPENAI_API_KEY) {
    return new OpenAiClient(config);
  }

  if (config.primaryModel?.startsWith('gemini') && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new GoogleLlmClient(config);
  }

  console.warn('[OCPS] API Key não configurada ou modelo desconhecido — usando MockLlmClient');
  return new MockLlmClient();
}

export function createLlmClientWithFallback(config: OcpsConfig): LlmClient {
  if (!config.fallbackModel) {
    return createLlmClient(config);
  }

  const primary = createLlmClient(config);
  const fallback = createLlmClient({ ...config, primaryModel: config.fallbackModel });

  if (primary instanceof MockLlmClient || fallback instanceof MockLlmClient) {
    console.warn('[LLM] Usando MockLlmClient para primary ou fallback');
  }

  const manager = new MultiLlmManager();
  
  const getProvider = (model: string): any => {
    if (model.startsWith('claude')) return 'anthropic';
    if (model.startsWith('gpt') || model.startsWith('o1')) return 'openai';
    if (model.startsWith('gemini')) return 'google';
    return 'anthropic';
  };

  const primaryProvider = getProvider(config.primaryModel);
  const fallbackProvider = getProvider(config.fallbackModel);

  manager.addProvider(primaryProvider, primary);
  manager.addProvider(fallbackProvider, fallback);
  
  manager.setStrategy({
    primary: { provider: primaryProvider, model: config.primaryModel, apiKey: '' },
    fallback: { provider: fallbackProvider, model: config.fallbackModel, apiKey: '' },
    priority: [primaryProvider, fallbackProvider],
  });

  console.log(`[LLM] MultiLlmManager: ${config.primaryModel} (${primaryProvider}) → ${config.fallbackModel} (${fallbackProvider})`);
  return manager;
}
