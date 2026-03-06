import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SessionManager } from '../../src/core/session-manager.js';

describe('SessionManager', () => {
  let manager: SessionManager;
  let testDir: string;

  beforeEach(() => {
    testDir = path.join('/tmp', `ocps-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    manager = new SessionManager(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('createSession', () => {
    it('deve_criar_nova_sessao', () => {
      const config = { primaryModel: 'claude-sonnet-4-5', projectName: 'test' };
      const session = manager.createSession(testDir, config);

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toContain('session-');
      expect(session.projectRoot).toBe(testDir);
      expect(session.currentPhase).toBe('idle');
    });

    it('deve_salvar_sessao_em_arquivo', () => {
      const config = { primaryModel: 'claude-sonnet-4-5', projectName: 'test' };
      const session = manager.createSession(testDir, config);

      const sessionPath = path.join(testDir, '.ocps', 'sessions', `${session.sessionId}.json`);
      expect(fs.existsSync(sessionPath)).toBe(true);
    });
  });

  describe('loadSession', () => {
    it('deve_carregar_sessao_existente', () => {
      const config = { primaryModel: 'claude-sonnet-4-5', projectName: 'test' };
      const created = manager.createSession(testDir, config);

      const loaded = manager.loadSession(created.sessionId);
      expect(loaded).not.toBeNull();
      expect(loaded?.sessionId).toBe(created.sessionId);
    });

    it('deve_retornar_null_para_sessao_inexistente', () => {
      const loaded = manager.loadSession('session-inexistente');
      expect(loaded).toBeNull();
    });
  });

  describe('updateLlmCheckpoint', () => {
    it('deve_atualizar_checkpoint', () => {
      const config = { primaryModel: 'claude-sonnet-4-5', projectName: 'test' };
      const session = manager.createSession(testDir, config);

      manager.updateLlmCheckpoint(session.sessionId, 'claude-opus-4-5', 100, {
        role: 'user',
        content: 'Test message',
      });

      const loaded = manager.loadSession(session.sessionId);
      expect(loaded?.llmCheckpoint.tokensAccumulated).toBe(100);
      expect(loaded?.llmCheckpoint.messages.length).toBe(1);
    });
  });

  describe('listSessions', () => {
    it('deve_listar_sessoes', () => {
      const config = { primaryModel: 'claude-sonnet-4-5', projectName: 'test' };
      manager.createSession(testDir, config);

      const sessions = manager.listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('restoreFromCheckpoint', () => {
    it('deve_restaurar_contexto', () => {
      const config = { primaryModel: 'claude-sonnet-4-5', projectName: 'test' };
      const session = manager.createSession(testDir, config);

      manager.updateLlmCheckpoint(session.sessionId, 'claude-opus-4-5', 100, {
        role: 'user',
        content: 'Test message',
      });

      const restored = manager.restoreFromCheckpoint(session.sessionId);
      expect(restored).not.toBeNull();
      expect(restored?.context).toContain('user: Test message');
      expect(restored?.tokens).toBe(100);
    });
  });
});
