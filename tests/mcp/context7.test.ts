import { describe, it, expect, afterEach, vi } from 'vitest';
import { Context7Client } from '../../src/mcp/context7';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Context7Client.ping()', () => {
  it('deve_retornar_ok_true_quando_servidor_responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })));
    const client = new Context7Client('http://localhost:3001', true);

    const result = await client.ping();

    expect(result.ok).toBe(true);
  });

  it('deve_retornar_ok_false_quando_servidor_inacessivel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const client = new Context7Client('http://localhost:3001', true);

    const result = await client.ping();

    expect(result.ok).toBe(false);
  });

  it('deve_retornar_ok_false_quando_desabilitado_na_config', async () => {
    const client = new Context7Client('http://localhost:3001', false);

    const result = await client.ping();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Desabilitado');
    }
  });
});

describe('Context7Client.resolveLibraryId()', () => {
  it('deve_retornar_ok_false_quando_nao_conectado', async () => {
    const client = new Context7Client('http://localhost:3001', true);
    const result = await client.resolveLibraryId('react');
    expect(result.ok).toBe(false);
  });
});

describe('Context7Client.getLibraryDocs()', () => {
  it('deve_retornar_ok_false_quando_nao_conectado', async () => {
    const client = new Context7Client('http://localhost:3001', true);
    const result = await client.getLibraryDocs('/facebook/react', 'hooks');
    expect(result.ok).toBe(false);
  });
});
