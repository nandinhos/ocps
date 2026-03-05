import { describe, it, expect, afterEach, vi } from 'vitest';
import { McpBridge } from '../../src/mcp/mcp-bridge';
import type { McpConfig } from '../../src/types/config';

afterEach(() => {
  vi.unstubAllGlobals();
});

const CONFIG_AMBOS_HABILITADOS: McpConfig = {
  basicMemory: { enabled: true },
  context7: { enabled: true },
  serena: { enabled: false },
  laravelBoost: { enabled: false },
};

const CONFIG_AMBOS_DESABILITADOS: McpConfig = {
  basicMemory: { enabled: false },
  context7: { enabled: false },
  serena: { enabled: false },
  laravelBoost: { enabled: false },
};

describe('McpBridge.ping()', () => {
  it('deve_retornar_record_com_chaves_dos_mcps_configurados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const bridge = new McpBridge(CONFIG_AMBOS_HABILITADOS);

    const result = await bridge.ping();

    expect('basic-memory' in result).toBe(true);
    expect('context7' in result).toBe(true);
  });

  it('deve_retornar_connected_false_quando_mcps_offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const bridge = new McpBridge(CONFIG_AMBOS_HABILITADOS);

    const result = await bridge.ping();

    expect(result['basic-memory'].connected).toBe(false);
    expect(result['context7'].connected).toBe(false);
  });

  it('deve_retornar_connected_true_quando_mcps_respondem', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })));
    const bridge = new McpBridge(CONFIG_AMBOS_HABILITADOS);

    const result = await bridge.ping();

    expect(result['basic-memory'].connected).toBe(true);
    expect(result['context7'].connected).toBe(true);
  });

  it('deve_retornar_connected_false_quando_mcp_desabilitado', async () => {
    const bridge = new McpBridge(CONFIG_AMBOS_DESABILITADOS);

    const result = await bridge.ping();

    expect(result['basic-memory'].connected).toBe(false);
    expect(result['context7'].connected).toBe(false);
  });
});

describe('McpBridge.connect()', () => {
  it('deve_retornar_ok_true_mesmo_quando_mcps_offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const bridge = new McpBridge(CONFIG_AMBOS_HABILITADOS);

    const result = await bridge.connect();

    expect(result.ok).toBe(true);
  });

  it('deve_retornar_McpConnections_com_status_real_dos_mcps', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const bridge = new McpBridge(CONFIG_AMBOS_HABILITADOS);

    const result = await bridge.connect();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.basicMemory.connected).toBe(false);
      expect(result.value.context7.connected).toBe(false);
      expect(result.value.basicMemory.enabled).toBe(true);
      expect(result.value.context7.enabled).toBe(true);
    }
  });

  it('deve_nunca_lancar_excecao_mesmo_sem_mcps_disponiveis', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const bridge = new McpBridge(CONFIG_AMBOS_HABILITADOS);

    await expect(bridge.connect()).resolves.not.toThrow();
  });
});

describe('McpBridge.disconnect()', () => {
  it('deve_resolver_sem_erro', async () => {
    const bridge = new McpBridge(CONFIG_AMBOS_DESABILITADOS);
    await expect(bridge.disconnect()).resolves.toBeUndefined();
  });
});
