// import type evita dependência circular em runtime (types são apagados no JS compilado)
import type { AgentContext } from './agent.js';

export type GateStatus = 'pending' | 'approved' | 'blocked' | 'bypassed';

export interface GateResult {
  status: GateStatus;
  checkedAt?: string;
  approvedBy?: 'developer' | 'auto';
  evidence?: string[];
  blockers?: string[];
}

export interface Gate {
  name: string;
  description: string;
  check(context: AgentContext): Promise<GateResult>;
  onBlock(result: GateResult, context: AgentContext): Promise<void>;
}
