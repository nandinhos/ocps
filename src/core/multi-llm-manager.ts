import type { LlmClient, LlmResponse } from './llm-client.js';

export type LlmProvider = 'anthropic' | 'openai' | 'google';

export interface LlmProviderConfig {
  provider: LlmProvider;
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}

export interface FallbackStrategy {
  primary: LlmProviderConfig;
  fallback: LlmProviderConfig;
  priority: LlmProvider[];
}

export class RateLimitError extends Error {
  provider: LlmProvider;
  retryAfter?: number;

  constructor(provider: LlmProvider, message: string, retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.provider = provider;
    this.retryAfter = retryAfter;
  }
}

export class MultiLlmManager {
  private providers: Map<LlmProvider, LlmClient> = new Map();
  private strategy: FallbackStrategy | null = null;
  private currentProvider: LlmProvider = 'anthropic';

  constructor() {}

  addProvider(provider: LlmProvider, client: LlmClient): void {
    this.providers.set(provider, client);
  }

  setStrategy(strategy: FallbackStrategy): void {
    this.strategy = strategy;
    this.currentProvider = strategy.primary.provider;
  }

  async complete(prompt: string): Promise<LlmResponse> {
    const client = this.providers.get(this.currentProvider);

    if (!client) {
      throw new Error(`Provider ${this.currentProvider} not configured`);
    }

    try {
      return await client.complete(prompt);
    } catch (error) {
      if (this.isRateLimitError(error)) {
        return this.handleRateLimit(error as RateLimitError, prompt);
      }
      throw error;
    }
  }

  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate limit') ||
        message.includes('429') ||
        message.includes('too many requests')
      );
    }
    return false;
  }

  private async handleRateLimit(error: RateLimitError, prompt: string): Promise<LlmResponse> {
    console.warn(`[MultiLlm] Rate limit detected on ${error.provider}, attempting fallback...`);

    if (!this.strategy) {
      throw new Error('No fallback strategy configured');
    }

    const fallbackProvider = this.findFallbackProvider(error.provider);

    if (!fallbackProvider) {
      throw new Error('No fallback provider available');
    }

    console.warn(`[MultiLlm] Switching to fallback provider: ${fallbackProvider}`);
    this.currentProvider = fallbackProvider;

    const fallbackClient = this.providers.get(fallbackProvider);

    if (!fallbackClient) {
      throw new Error(`Fallback provider ${fallbackProvider} not configured`);
    }

    return fallbackClient.complete(prompt);
  }

  private findFallbackProvider(failedProvider: LlmProvider): LlmProvider | null {
    if (!this.strategy) return null;

    const priority = this.strategy.priority;
    const index = priority.indexOf(failedProvider);

    if (index === -1 || index === priority.length - 1) {
      return null;
    }

    return priority[index + 1];
  }

  getCurrentProvider(): LlmProvider {
    return this.currentProvider;
  }

  resetProvider(): void {
    if (this.strategy) {
      this.currentProvider = this.strategy.primary.provider;
    }
  }
}

export function createMultiLlmManager(
  primary: LlmProviderConfig,
  fallback: LlmProviderConfig,
): MultiLlmManager {
  const manager = new MultiLlmManager();

  manager.setStrategy({
    primary,
    fallback,
    priority: [primary.provider, fallback.provider],
  });

  return manager;
}
