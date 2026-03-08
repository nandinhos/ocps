export type MicrotaskStatus = 'pending' | 'in-progress' | 'done' | 'failed';

export interface Microtask {
  id: string;
  title: string;
  description: string;
  status: MicrotaskStatus;
  startedAt?: string;
  completedAt?: string;
  output?: any;
  error?: string;
}

export interface MicrotaskResult {
  success: boolean;
  output?: any;
  error?: string;
}
