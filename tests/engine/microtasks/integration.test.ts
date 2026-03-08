import { describe, it, expect } from 'vitest';
import { MicrotaskGenerator } from '../../../src/engine/microtasks/generator.js';
import { MicrotaskExecutor } from '../../../src/engine/microtasks/executor.js';
import { MicrotaskValidator } from '../../../src/engine/microtasks/validator.js';
import { Feature } from '../../../src/types/roadmap.js';

describe('Microtask Engine Integration', () => {
  it('deve gerar, executar e validar microtasks de uma feature', async () => {
    const feature: Feature = {
      id: 'f-int-001',
      title: 'Integration Feature',
      description: 'Desc',
      acceptanceCriteria: ['AC1'],
      status: 'pending',
      sprint: {
        id: 's-int-001',
        capacityHours: 8,
        tasks: [
          {
            id: 't-int-1',
            title: 'Integration Task',
            description: 'Desc',
            completionCriteria: 'Criteria',
            assignedAgent: 'tdd',
            status: 'pending'
          }
        ]
      }
    };

    const generator = new MicrotaskGenerator();
    const executor = new MicrotaskExecutor();
    const validator = new MicrotaskValidator();

    // 1. Generate
    const microtasks = generator.generateTasks(feature);
    expect(microtasks).toHaveLength(1);

    // 2. Execute
    const result = await executor.executeTask(microtasks[0]);
    expect(result.success).toBe(true);
    expect(microtasks[0].status).toBe('done');

    // 3. Validate
    const isValid = validator.validateTask(microtasks[0], result);
    expect(isValid).toBe(true);
  });
});
