import { describe, it, expect } from 'vitest';
import { MicrotaskValidator } from '../../../src/engine/microtasks/validator.js';
import { Microtask, MicrotaskResult } from '../../../src/types/microtask.js';

describe('MicrotaskValidator', () => {
  it('deve validar um resultado de sucesso', () => {
    const microtask: Microtask = {
      id: 'mt-1',
      title: 'Test',
      description: 'Desc',
      status: 'done'
    };
    const result: MicrotaskResult = { success: true };

    const validator = new MicrotaskValidator();
    expect(validator.validateTask(microtask, result)).toBe(true);
  });

  it('deve invalidar um resultado de falha', () => {
    const microtask: Microtask = {
      id: 'mt-1',
      title: 'Test',
      description: 'Desc',
      status: 'failed'
    };
    const result: MicrotaskResult = { success: false, error: 'Error' };

    const validator = new MicrotaskValidator();
    expect(validator.validateTask(microtask, result)).toBe(false);
  });
});
