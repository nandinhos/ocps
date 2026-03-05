import type { Agent, AgentContext, AgentResult, ValidationResult } from '../types/agent.js';
import type { Skill } from '../types/skill.js';
import type { GateStatus } from '../types/gate.js';
import type { BacklogItem, Feature, Task } from '../types/roadmap.js';

export interface PlanningInput {
  backlogItem: BacklogItem;
  sprintCapacity?: number;
}

export interface PlanningOutput {
  feature: Feature;
  tasks: Task[];
  sprintPlan: { id: string; capacityHours: number };
  roadmapFile: string;
}

export class PlanningAgent implements Agent<PlanningInput, PlanningOutput> {
  readonly name = 'PlanningAgent';
  readonly version = '1.0.0';
  readonly scope = ['.ocps/roadmap/'];

  async execute(input: PlanningInput, ctx: AgentContext): Promise<AgentResult<PlanningOutput>> {
    const skills = await this.loadSkills(ctx);

    const tasks = this.decomposeBacklogItem(input.backlogItem);
    const feature = this.generateFeature(input.backlogItem, tasks);
    const sprintPlan = this.generateSprintPlan(input.sprintCapacity ?? 40);
    const roadmapFile = this.generateRoadmapFile(feature);

    return {
      ok: true,
      output: {
        feature,
        tasks,
        sprintPlan,
        roadmapFile,
      },
      tokensUsed: 0,
      skillsApplied: skills.map((s) => s.name),
      gateStatus: 'pending' as GateStatus,
    };
  }

  async loadSkills(ctx: AgentContext): Promise<Skill[]> {
    return ctx.skills.filter(
      (s) =>
        s.name === 'feature-decomposition' ||
        s.name === 'sprint-planning' ||
        s.name === 'dependency-mapping' ||
        s.name === 'roadmap-generation' ||
        s.name === 'task-sizing',
    );
  }

  validate(output: PlanningOutput): ValidationResult {
    const errors: string[] = [];

    if (!output.feature) {
      errors.push('Feature é obrigatória');
    }
    if (!output.feature.title) {
      errors.push('Título da feature é obrigatório');
    }
    if (!output.tasks || output.tasks.length === 0) {
      errors.push('Pelo menos uma tarefa é obrigatória');
    }
    if (output.tasks.some((t) => !t.completionCriteria)) {
      errors.push('Todas as tarefas devem ter critério de conclusão');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }
    return { valid: true };
  }

  async onGateFail(reason: string, _ctx: AgentContext): Promise<void> {
    console.log(`[PlanningAgent] Gate falhou: ${reason}`);
  }

  private decomposeBacklogItem(backlogItem: BacklogItem): Task[] {
    const tasks: Task[] = [];
    const baseId = backlogItem.id.replace('backlog', 'task');

    tasks.push({
      id: `${baseId}-001`,
      title: `Analisar ${backlogItem.title}`,
      description: `Análise técnica e requisitos para: ${backlogItem.description}`,
      completionCriteria: 'Análise documentada, dependências identificadas',
      assignedAgent: 'human',
      status: 'pending',
    });

    tasks.push({
      id: `${baseId}-002`,
      title: `Implementar ${backlogItem.title}`,
      description: `Implementação da funcionalidade: ${backlogItem.description}`,
      completionCriteria: 'Código implementado e testado unitariamente',
      assignedAgent: 'tdd',
      status: 'pending',
    });

    tasks.push({
      id: `${baseId}-003`,
      title: `Revisar ${backlogItem.title}`,
      description: `Revisão de código para: ${backlogItem.title}`,
      completionCriteria: 'Code review aprovado',
      assignedAgent: 'code-review',
      status: 'pending',
    });

    return tasks;
  }

  private generateFeature(backlogItem: BacklogItem, tasks: Task[]): Feature {
    return {
      id: backlogItem.id.replace('backlog', 'feature'),
      title: backlogItem.title,
      description: backlogItem.description,
      acceptanceCriteria: backlogItem.acceptanceCriteria,
      sprint: {
        id: 'sprint-001',
        tasks,
        capacityHours: 40,
      },
      status: 'pending',
    };
  }

  private generateSprintPlan(capacityHours: number) {
    return {
      id: 'sprint-001',
      capacityHours,
    };
  }

  private generateRoadmapFile(feature: Feature): string {
    return `.ocps/roadmap/${feature.id}.yaml`;
  }
}
