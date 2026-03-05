import { describe, it, expect, expectTypeOf } from 'vitest';
import type { TaskStatus, Task, Sprint, Feature, Roadmap } from '../../src/types/roadmap';

describe('roadmap types', () => {
  it('deve_ser_union_type_TaskStatus_com_quatro_valores', () => {
    expectTypeOf<TaskStatus>().toEqualTypeOf<'pending' | 'in-progress' | 'done' | 'blocked'>();
  });

  it('deve_aceitar_Task_com_campos_obrigatorios', () => {
    const task: Task = {
      id: 't001',
      title: 'Setup inicial',
      description: 'Configurar package.json e tsconfig',
      completionCriteria: 'npm run build passa',
      assignedAgent: 'human',
      status: 'done',
    };
    expect(task.id).toBe('t001');
    expect(task.status).toBe('done');
  });

  it('deve_aceitar_Task_com_campos_opcionais', () => {
    const task: Task = {
      id: 't002',
      title: 'Contratos TypeScript',
      description: 'Implementar src/types/',
      completionCriteria: 'Tudo compila',
      assignedAgent: 'tdd',
      status: 'in-progress',
      startedAt: '2026-03-05T14:00:00Z',
      tokensUsed: 1500,
    };
    expect(task.startedAt).toBeDefined();
    expect(task.completedAt).toBeUndefined();
  });

  it('deve_aceitar_Sprint_com_tasks', () => {
    const sprint: Sprint = {
      id: 'sprint-fase-0',
      tasks: [],
      capacityHours: 40,
    };
    expect(sprint.capacityHours).toBe(40);
  });

  it('deve_aceitar_Feature_valida', () => {
    const feature: Feature = {
      id: 'fase-0-foundation',
      title: 'Fase 0 — Foundation',
      description: 'Estrutura base do OCPS',
      acceptanceCriteria: ['ocps init funciona', 'ocps doctor funciona'],
      sprint: { id: 'sprint-1', tasks: [], capacityHours: 40 },
      status: 'pending',
    };
    expect(feature.acceptanceCriteria).toHaveLength(2);
  });

  it('deve_aceitar_Roadmap_completo', () => {
    const roadmap: Roadmap = {
      featureId: 'fase-0-foundation',
      feature: {
        id: 'fase-0-foundation',
        title: 'Fase 0',
        description: 'Foundation',
        acceptanceCriteria: [],
        sprint: { id: 's1', tasks: [], capacityHours: 40 },
        status: 'pending',
      },
      decisions: [],
      blockers: [],
      skillsUsed: [],
      llmCheckpoint: { model: null, tokensAccumulated: 0, lastSavedAt: null },
      gates: {},
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(roadmap.featureId).toBe('fase-0-foundation');
    expect(roadmap.gates).toEqual({});
  });

  it('deve_tipar_Task_tokensUsed_como_number_opcional', () => {
    expectTypeOf<Task['tokensUsed']>().toEqualTypeOf<number | undefined>();
  });
});
