import { describe, it, expect, afterEach, vi } from 'vitest';
import { BasicMemoryClient } from '../../src/mcp/basic-memory';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BasicMemoryClient.ping()', () => {
  it('deve_retornar_ok_true_quando_servidor_responde', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })));
    const client = new BasicMemoryClient('http://localhost:3000', true);
    // Act
    const result = await client.ping();
    // Assert
    expect(result.ok).toBe(true);
  });

  it('deve_retornar_ok_false_quando_conexao_recusada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const client = new BasicMemoryClient('http://localhost:3000', true);

    const result = await client.ping();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Falha ao conectar');
    }
  });

  it('deve_retornar_ok_false_quando_desabilitado_na_config', async () => {
    const client = new BasicMemoryClient('http://localhost:3000', false);

    const result = await client.ping();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('desabilitado');
    }
  });

  it('deve_retornar_ok_false_quando_timeout_excedido', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('AbortError'), { name: 'AbortError' })),
    );
    const client = new BasicMemoryClient('http://localhost:3000', true);

    const result = await client.ping();

    expect(result.ok).toBe(false);
  });
});

describe('BasicMemoryClient.save()', () => {
  it('deve_retornar_ok_false_quando_nao_conectado', async () => {
    // Arrange: sem ping() prévio → connected = false
    const client = new BasicMemoryClient('http://localhost:3000', true);
    // Act
    const result = await client.save('chave', 'conteudo');
    // Assert
    expect(result.ok).toBe(false);
  });

  it('deve_retornar_ok_false_quando_desabilitado', async () => {
    const client = new BasicMemoryClient('http://localhost:3000', false);
    const result = await client.save('chave', 'conteudo');
    expect(result.ok).toBe(false);
  });
});

describe('BasicMemoryClient.query()', () => {
  it('deve_retornar_ok_false_quando_nao_conectado', async () => {
    const client = new BasicMemoryClient('http://localhost:3000', true);
    const result = await client.query('busca qualquer');
    expect(result.ok).toBe(false);
  });
});

describe('BasicMemoryClient.list()', () => {
  it('deve_retornar_ok_false_quando_nao_conectado', async () => {
    const client = new BasicMemoryClient('http://localhost:3000', true);
    const result = await client.list();
    expect(result.ok).toBe(false);
  });
});
