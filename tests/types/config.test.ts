import { describe, it, expect, expectTypeOf } from 'vitest';
import type { StackType, LlmModel, McpConfig, OcpsConfig, McpConnection, McpConnections } from '../../src/types/config';

describe('config types', () => {
  it('deve_aceitar_OcpsConfig_valido', () => {
    const config: OcpsConfig = {
      version: '0.1.0',
      projectName: 'meu-projeto',
      stack: 'typescript',
      primaryModel: 'claude-sonnet-4-5',
      mcp: {
        basicMemory: { enabled: true },
        context7: { enabled: true },
        serena: { enabled: false },
        laravelBoost: { enabled: false },
      },
      coverageThreshold: { lines: 80, branches: 70 },
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(config.stack).toBe('typescript');
    expect(config.coverageThreshold.lines).toBe(80);
  });

  it('deve_aceitar_OcpsConfig_com_fallbackModel', () => {
    const config: OcpsConfig = {
      version: '0.1.0',
      projectName: 'teste',
      stack: 'laravel',
      primaryModel: 'claude-opus-4-5',
      fallbackModel: 'claude-haiku-4-5',
      mcp: {
        basicMemory: { enabled: true },
        context7: { enabled: true },
        serena: { enabled: true, projectPath: '/project' },
        laravelBoost: { enabled: true, laravelVersion: '12' },
      },
      coverageThreshold: { lines: 80, branches: 70 },
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(config.fallbackModel).toBe('claude-haiku-4-5');
  });

  it('deve_ser_union_type_StackType_com_valores_esperados', () => {
    expectTypeOf<StackType>().toEqualTypeOf<'laravel' | 'typescript' | 'nodejs' | 'python' | 'unknown'>();
  });

  it('deve_aceitar_string_arbitraria_em_LlmModel', () => {
    const model: LlmModel = 'claude-custom-model';
    expect(typeof model).toBe('string');
  });

  it('deve_aceitar_McpConnection_conectada', () => {
    const conn: McpConnection = {
      name: 'basic-memory',
      enabled: true,
      connected: true,
    };
    expect(conn.connected).toBe(true);
  });

  it('deve_aceitar_McpConnections_com_conexoes_opcionais_ausentes', () => {
    const connections: McpConnections = {
      basicMemory: { name: 'basic-memory', enabled: true, connected: true },
      context7: { name: 'context7', enabled: true, connected: false },
    };
    expect(connections.serena).toBeUndefined();
    expect(connections.laravelBoost).toBeUndefined();
  });

  it('deve_tipar_McpConfig_basicMemory_com_url_opcional', () => {
    expectTypeOf<McpConfig['basicMemory']>().toEqualTypeOf<{ enabled: boolean; url?: string }>();
  });
});
