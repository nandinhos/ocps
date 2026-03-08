import { Microtask, MicrotaskResult } from '../../types/microtask.js';

export class MicrotaskExecutor {
  async executeTask(task: Microtask, action?: () => Promise<any>): Promise<MicrotaskResult> {
    task.status = 'in-progress';
    task.startedAt = new Date().toISOString();

    try {
      if (action) {
        await action();
      }
      
      task.status = 'done';
      task.completedAt = new Date().toISOString();
      return { success: true };
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      return { success: false, error: error.message };
    }
  }
}
