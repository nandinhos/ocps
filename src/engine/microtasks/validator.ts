import { Microtask, MicrotaskResult } from '../../types/microtask.js';

export class MicrotaskValidator {
  validateTask(_task: Microtask, result: MicrotaskResult): boolean {
    return result.success;
  }
}
