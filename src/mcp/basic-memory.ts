import type { Result } from '../types/common.js';

const PING_TIMEOUT_MS = 3000;

/**
 * Client para o MCP Basic Memory.
 * Fase 0: conectividade via HTTP ping + stubs para operações.
 * Fase 1: integração completa via protocolo MCP (@modelcontextprotocol/sdk).
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
      return { ok: false, error: new Error('Basic Memory desabilitado na configuração') };
    }

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

      try {
        await fetch(this.url, { method: 'HEAD', signal: controller.signal });
        this.connected = true;
        return { ok: true, value: undefined };
      } finally {
        clearTimeout(id);
      }
    } catch (e) {
      this.connected = false;
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: new Error(`Falha ao conectar ao Basic Memory: ${msg}`) };
    }
  }

  /**
   * Persiste um conteúdo com chave no Basic Memory.
   * Requer ping() bem-sucedido antes de chamar.
   */
  async save(_key: string, _content: string): Promise<Result<void>> {
    if (!this.connected) {
      return { ok: false, error: new Error('Basic Memory não conectado — execute ping() primeiro') };
    }
    // Phase 1: implementar via MCP protocol
    return { ok: false, error: new Error('save() será implementado em Phase 1') };
  }

  /**
   * Busca entradas no Basic Memory por query semântica.
   * Requer ping() bem-sucedido antes de chamar.
   */
  async query(_query: string): Promise<Result<string[]>> {
    if (!this.connected) {
      return { ok: false, error: new Error('Basic Memory não conectado — execute ping() primeiro') };
    }
    // Phase 1: implementar via MCP protocol
    return { ok: false, error: new Error('query() será implementado em Phase 1') };
  }

  /**
   * Lista entradas do Basic Memory com prefixo opcional.
   * Requer ping() bem-sucedido antes de chamar.
   */
  async list(_prefix?: string): Promise<Result<string[]>> {
    if (!this.connected) {
      return { ok: false, error: new Error('Basic Memory não conectado — execute ping() primeiro') };
    }
    // Phase 1: implementar via MCP protocol
    return { ok: false, error: new Error('list() será implementado em Phase 1') };
  }

  isConnected(): boolean {
    return this.connected;
  }
}
