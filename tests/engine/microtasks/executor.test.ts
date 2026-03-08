import { describe, it, expect, vi } from 'vitest';
import { MicrotaskExecutor } from '../../../src/engine/microtasks/executor.js';
import { Microtask } from '../../../src/types/microtask.js';

describe('MicrotaskExecutor', () => {
  it('deve executar uma microtask com sucesso', async () => {
    const microtask: Microtask = {
      id: 'mt-1',
      title: 'Test Microtask',
      description: 'Description',
      status: 'pending'
    };

    const executor = new MicrotaskExecutor();
    const result = await executor.executeTask(microtask);

    expect(result.success).toBe(true);
    expect(microtask.status).toBe('done');
    expect(microtask.completedAt).toBeDefined();
  });

  it('deve lidar com falha na execução', async () => {
    const microtask: Microtask = {
      id: 'mt-1',
      title: 'Fail Task',
      description: 'Desc',
      status: 'pending'
    };

    const executor = new MicrotaskExecutor();
    const result = await executor.executeTask(microtask, async () => {
      throw new Error('Simulated failure');
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Simulated failure');
    expect(microtask.status).toBe('failed');
    expect(microtask.error).toBe('Simulated failure');
  });
});
