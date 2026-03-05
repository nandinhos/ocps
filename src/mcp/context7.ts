import type { Result } from '../types/common.js';

const PING_TIMEOUT_MS = 3000;

/**
 * Client para o MCP Context7.
 * Fase 0: conectividade via HTTP ping + stubs para operações.
 * Fase 1: integração completa via protocolo MCP (@modelcontextprotocol/sdk).
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
      return { ok: false, error: new Error('Context7 desabilitado na configuração') };
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
      return { ok: false, error: new Error(`Falha ao conectar ao Context7: ${msg}`) };
    }
  }

  /**
   * Resolve o ID de uma biblioteca pelo nome amigável.
   * Exemplo: 'react' → '/facebook/react'
   */
  async resolveLibraryId(_name: string): Promise<Result<string>> {
    if (!this.connected) {
      return {
        ok: false,
        error: new Error('Context7 não conectado — execute ping() primeiro'),
      };
    }
    // Phase 1: implementar via MCP protocol
    return { ok: false, error: new Error('resolveLibraryId() será implementado em Phase 1') };
  }

  /**
   * Retorna documentação de uma biblioteca do Context7.
   * @param libraryId - ID no formato '/org/repo'
   * @param query    - Tópico ou dúvida específica
   */
  async getLibraryDocs(_libraryId: string, _query: string): Promise<Result<string>> {
    if (!this.connected) {
      return {
        ok: false,
        error: new Error('Context7 não conectado — execute ping() primeiro'),
      };
    }
    // Phase 1: implementar via MCP protocol
    return { ok: false, error: new Error('getLibraryDocs() será implementado em Phase 1') };
  }

  isConnected(): boolean {
    return this.connected;
  }
}
