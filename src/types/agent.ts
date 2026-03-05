import type { GateStatus } from './gate.js';
import type { Roadmap } from './roadmap.js';
import type { Skill } from './skill.js';
import type { OcpsConfig, McpConnections } from './config.js';

export interface AgentContext {
  projectRoot: string;
  config: OcpsConfig;
  roadmap: Roadmap;
  skills: Skill[];
  sessionId: string;
  mcpConnections: McpConnections;
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

export interface AgentResult<T> {
  ok: boolean;
  output?: T;
  error?: string;
  tokensUsed: number;
  skillsApplied: string[];
  gateStatus: GateStatus;
}

export interface Agent<TInput, TOutput> {
  readonly name: string;
  readonly version: string;
  readonly scope: string[];
  execute(input: TInput, ctx: AgentContext): Promise<AgentResult<TOutput>>;
  loadSkills(ctx: AgentContext): Promise<Skill[]>;
  validate(output: TOutput): ValidationResult;
  onGateFail(reason: string, ctx: AgentContext): Promise<void>;
}
