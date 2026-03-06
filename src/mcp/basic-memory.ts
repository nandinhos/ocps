import type { Result } from '../types/common.js';

const PING_TIMEOUT_MS = 1000; // Blindagem: 1s max

/**
 * Client para o MCP Basic Memory.
 * Resiliência: Timeout curto e falha silenciosa (degradação graciosa).
 */
export class BasicMemoryClient {
  private connected = false;

  constructor(
    private readonly url: string,
    private readonly enabled: boolean,
  ) {}

  async ping(): Promise<Result<void>> {
    if (!this.enabled) {
      this.connected = false;
      return { ok: false, error: new Error('Desabilitado') };
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

    try {
      // HEAD é o método mais leve para verificar se o servidor está vivo
      await fetch(this.url, { method: 'HEAD', signal: controller.signal });
      this.connected = true;
      return { ok: true, value: undefined };
    } catch (e) {
      this.connected = false;
      return { ok: false, error: new Error('Offline (Timeout 1s)') };
    } finally {
      clearTimeout(id);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async save(_key: string, _content: string): Promise<Result<void>> {
    if (!this.connected) return { ok: false, error: new Error('Offline') };
    return { ok: false, error: new Error('Phase 1 integration pending') };
  }

  async query(_query: string): Promise<Result<string[]>> {
    if (!this.connected) return { ok: false, error: new Error('Offline') };
    return { ok: false, error: new Error('Phase 1 integration pending') };
  }

  async list(_prefix?: string): Promise<Result<string[]>> {
    if (!this.connected) return { ok: false, error: new Error('Offline') };
    return { ok: false, error: new Error('Phase 1 integration pending') };
  }
}