import * as fs from 'fs';
import * as path from 'path';

export interface SessionState {
  sessionId: string;
  projectRoot: string;
  createdAt: string;
  lastActiveAt: string;
  currentPhase: string;
  config: Record<string, unknown>;
  roadmap: Record<string, unknown>;
  llmCheckpoint: {
    model: string;
    tokensAccumulated: number;
    messages: Array<{ role: string; content: string }>;
  };
  skills: string[];
}

export class SessionManager {
  private sessionDir: string;

  constructor(projectRoot: string) {
    this.sessionDir = path.join(projectRoot, '.ocps', 'sessions');
    this.ensureSessionDir();
  }

  private ensureSessionDir(): void {
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  createSession(projectRoot: string, config: Record<string, unknown>): SessionState {
    const sessionId = `session-${Date.now()}`;
    const now = new Date().toISOString();

    const state: SessionState = {
      sessionId,
      projectRoot,
      createdAt: now,
      lastActiveAt: now,
      currentPhase: 'idle',
      config,
      roadmap: {},
      llmCheckpoint: {
        model: (config.primaryModel as string) || 'claude-sonnet-4-5',
        tokensAccumulated: 0,
        messages: [],
      },
      skills: [],
    };

    this.saveSession(state);
    return state;
  }

  loadSession(sessionId: string): SessionState | null {
    const sessionPath = path.join(this.sessionDir, `${sessionId}.json`);

    if (!fs.existsSync(sessionPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(sessionPath, 'utf-8');
      return JSON.parse(content) as SessionState;
    } catch {
      return null;
    }
  }

  saveSession(state: SessionState): void {
    state.lastActiveAt = new Date().toISOString();
    const sessionPath = path.join(this.sessionDir, `${state.sessionId}.json`);
    fs.writeFileSync(sessionPath, JSON.stringify(state, null, 2), 'utf-8');
  }

  updatePhase(sessionId: string, phase: string): void {
    const state = this.loadSession(sessionId);
    if (state) {
      state.currentPhase = phase;
      this.saveSession(state);
    }
  }

  updateLlamaCheckpoint(
    sessionId: string,
    model: string,
    tokens: number,
    message: { role: string; content: string },
  ): void {
    const state = this.loadSession(sessionId);
    if (state) {
      state.llmCheckpoint.model = model;
      state.llmCheckpoint.tokensAccumulated += tokens;
      state.llmCheckpoint.messages.push(message);

      if (state.llmCheckpoint.messages.length > 100) {
        state.llmCheckpoint.messages = state.llmCheckpoint.messages.slice(-100);
      }

      this.saveSession(state);
    }
  }

  listSessions(): { sessionId: string; lastActiveAt: string; currentPhase: string }[] {
    if (!fs.existsSync(this.sessionDir)) {
      return [];
    }

    const files = fs.readdirSync(this.sessionDir).filter((f) => f.endsWith('.json'));

    return files.map((file) => {
      const state = this.loadSession(file.replace('.json', ''));
      return {
        sessionId: state?.sessionId || file.replace('.json', ''),
        lastActiveAt: state?.lastActiveAt || '',
        currentPhase: state?.currentPhase || 'unknown',
      };
    });
  }

  getLatestSession(): SessionState | null {
    const sessions = this.listSessions();
    if (sessions.length === 0) {
      return null;
    }

    const latest = sessions.sort(
      (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime(),
    )[0];

    return this.loadSession(latest.sessionId);
  }

  restoreFromCheckpoint(
    sessionId: string,
  ): { context: string; model: string; tokens: number } | null {
    const state = this.loadSession(sessionId);
    if (!state) {
      return null;
    }

    const context = state.llmCheckpoint.messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');

    return {
      context,
      model: state.llmCheckpoint.model,
      tokens: state.llmCheckpoint.tokensAccumulated,
    };
  }
}
