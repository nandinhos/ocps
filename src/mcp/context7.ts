import type { Result } from '../types/common.js';

const PING_TIMEOUT_MS = 1000; // Blindagem: 1s max

/**
 * Client para o MCP Context7.
 * Resiliência: Timeout curto e falha silenciosa.
 */
export class Context7Client {
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

  async resolveLibraryId(_name: string): Promise<Result<string>> {
    if (!this.connected) return { ok: false, error: new Error('Offline') };
    return { ok: false, error: new Error('Phase 1 integration pending') };
  }

  async getLibraryDocs(_libraryId: string, _query: string): Promise<Result<string>> {
    if (!this.connected) return { ok: false, error: new Error('Offline') };
    return { ok: false, error: new Error('Phase 1 integration pending') };
  }
}