import type { Result } from '../types/common.js';
import type { McpConfig, McpConnections } from '../types/config.js';
import { BasicMemoryClient } from './basic-memory.js';
import { Context7Client } from './context7.js';

export interface McpPingResult {
  connected: boolean;
  error?: string;
}

/**
 * Orquestra todas as conexões MCP do OCPS.
 *
 * Degradação graciosa: connect() sempre retorna ok:true.
 * Se um MCP estiver offline, o sistema continua funcionando —
 * apenas as operações que dependem daquele MCP retornam ok:false.
 */
export class McpBridge {
  private readonly _basicMemory: BasicMemoryClient;
  private readonly _context7: Context7Client;

  constructor(private readonly config: McpConfig) {
    this._basicMemory = new BasicMemoryClient(
      process.env['BASIC_MEMORY_URL'] ?? 'http://localhost:3000',
      config.basicMemory.enabled,
    );
    this._context7 = new Context7Client(
      process.env['CONTEXT7_URL'] ?? 'http://localhost:3001',
      config.context7.enabled,
    );
  }

  /**
   * Tenta conectar a todos os MCPs habilitados.
   * Nunca lança exceção — retorna ok:true mesmo com MCPs offline.
   * O campo McpConnections.connected reflete o estado real de cada MCP.
   */
  async connect(): Promise<Result<McpConnections>> {
    const pings = await this.ping();

    const connections: McpConnections = {
      basicMemory: {
        name: 'basic-memory',
        enabled: this.config.basicMemory.enabled,
        connected: pings['basic-memory']?.connected ?? false,
      },
      context7: {
        name: 'context7',
        enabled: this.config.context7.enabled,
        connected: pings['context7']?.connected ?? false,
      },
    };

    if (!connections.basicMemory.connected && this.config.basicMemory.enabled) {
      const err = pings['basic-memory']?.error;
      console.warn(`[McpBridge] Basic Memory offline${err ? `: ${err}` : ''} — degradação graciosa ativa`);
    }

    if (!connections.context7.connected && this.config.context7.enabled) {
      const err = pings['context7']?.error;
      console.warn(`[McpBridge] Context7 offline${err ? `: ${err}` : ''} — degradação graciosa ativa`);
    }

    return { ok: true, value: connections };
  }

  /**
   * Verifica conectividade de todos os MCPs configurados.
   */
  async ping(): Promise<Record<string, McpPingResult>> {
    const [bmResult, c7Result] = await Promise.all([
      this._basicMemory.ping(),
      this._context7.ping(),
    ]);

    return {
      'basic-memory': {
        connected: bmResult.ok,
        error: bmResult.ok ? undefined : bmResult.error.message,
      },
      context7: {
        connected: c7Result.ok,
        error: c7Result.ok ? undefined : c7Result.error.message,
      },
    };
  }

  /**
   * Encerra conexões ativas.
   * Fase 0: no-op (conexões são stateless via HTTP ping).
   * Fase 1: fecha transports do MCP SDK.
   */
  async disconnect(): Promise<void> {
    // Phase 1: fechar transports MCP
  }

  get basicMemory(): BasicMemoryClient {
    return this._basicMemory;
  }

  get context7(): Context7Client {
    return this._context7;
  }
}
