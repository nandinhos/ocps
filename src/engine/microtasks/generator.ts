import { Microtask } from '../../types/microtask.js';
import { Feature } from '../../types/roadmap.js';

export class MicrotaskGenerator {
  generateTasks(feature: Feature): Microtask[] {
    const tasks = feature.sprint?.tasks || [];
    
    return tasks.map(task => ({
      id: `mt-${task.id}`,
      title: task.title,
      description: task.description,
      status: task.status as any, // Cast temporário para compatibilidade
    }));
  }
}
