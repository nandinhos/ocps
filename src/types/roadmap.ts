import type { GateResult } from './gate.js';

export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'blocked';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: TaskStatus;
  priority: Priority;
  createdAt: string;
  updatedAt?: string;
  estimatedHours?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  completionCriteria: string;
  assignedAgent: string;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
  tokensUsed?: number;
}

export interface Sprint {
  id: string;
  tasks: Task[];
  capacityHours: number;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  sprint: Sprint;
  status: TaskStatus;
}

export interface ArchitectureDecision {
  id: string;
  title: string;
  decision: string;
  rationale: string;
  createdAt: string;
}

export interface Blocker {
  id: string;
  description: string;
  reportedAt: string;
  resolvedAt?: string;
}

export interface LlmCheckpoint {
  model: string | null;
  tokensAccumulated: number;
  lastSavedAt: string | null;
}

export interface Roadmap {
  featureId: string;
  feature: Feature;
  decisions: ArchitectureDecision[];
  blockers: Blocker[];
  skillsUsed: string[];
  llmCheckpoint: LlmCheckpoint;
  gates: Record<string, GateResult>;
  createdAt: string;
  updatedAt: string;
}
