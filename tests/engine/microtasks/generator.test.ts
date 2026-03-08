import { describe, it, expect } from 'vitest';
import { MicrotaskGenerator } from '../../../src/engine/microtasks/generator.js';
import { Feature } from '../../../src/types/roadmap.js';

describe('MicrotaskGenerator', () => {
  it('deve converter tasks da feature em microtasks', () => {
    const feature: Feature = {
      id: 'f-001',
      title: 'Test Feature',
      description: 'Test Description',
      acceptanceCriteria: ['CR-01'],
      status: 'pending',
      sprint: {
        id: 's-001',
        capacityHours: 10,
        tasks: [
          {
            id: 't-001',
            title: 'Task 1',
            description: 'Desc 1',
            completionCriteria: 'Criteria 1',
            assignedAgent: 'tdd',
            status: 'pending'
          }
        ]
      }
    };

    const generator = new MicrotaskGenerator();
    const tasks = generator.generateTasks(feature);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Task 1');
    expect(tasks[0].status).toBe('pending');
  });
});
