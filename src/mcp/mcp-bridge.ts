import type { Result } from '../types/common.js';
import type { McpConfig, McpConnections } from '../types/config.js';
import { BasicMemoryClient } from './basic-memory.js';
import { Context7Client } from './context7.js';

export interface McpPingResult {
  connected: boolean;
  error?: string;
}

/**
 * Orquestra todas as conexões MCP do OCPS com Circuit Breaker.
 */
export class McpBridge {
  private readonly _basicMemory: BasicMemoryClient;
  private readonly _context7: Context7Client;
  private _unstableMcps: Set<string> = new Set();

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

    // Circuit Breaker: Marcar como instável se falhar no connect inicial
    if (this.config.basicMemory.enabled && !connections.basicMemory.connected) {
      this._unstableMcps.add('basic-memory');
    }
    if (this.config.context7.enabled && !connections.context7.connected) {
      this._unstableMcps.add('context7');
    }

    return { ok: true, value: connections };
  }

  async ping(): Promise<Record<string, McpPingResult>> {
    const results: Record<string, McpPingResult> = {};

    // Se estiver marcado como instável, nem tentamos o ping para economizar tempo
    if (this._unstableMcps.has('basic-memory')) {
      results['basic-memory'] = { connected: false, error: 'Circuit Breaker: Instável' };
    } else {
      const bm = await this._basicMemory.ping();
      results['basic-memory'] = { connected: bm.ok, error: bm.ok ? undefined : bm.error.message };
      if (!bm.ok) this._unstableMcps.add('basic-memory');
    }

    if (this._unstableMcps.has('context7')) {
      results['context7'] = { connected: false, error: 'Circuit Breaker: Instável' };
    } else {
      const c7 = await this._context7.ping();
      results['context7'] = { connected: c7.ok, error: c7.ok ? undefined : c7.error.message };
      if (!c7.ok) this._unstableMcps.add('context7');
    }

    return results;
  }

  async disconnect(): Promise<void> {}

  get basicMemory(): BasicMemoryClient { return this._basicMemory; }
  get context7(): Context7Client { return this._context7; }
}