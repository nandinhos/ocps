import * as fs from 'fs';
import * as path from 'path';
import { dump as dumpYaml } from 'js-yaml';
import type { Agent, AgentContext, AgentResult, ValidationResult } from '../types/agent.js';
import type { Skill } from '../types/skill.js';
import type { GateStatus } from '../types/gate.js';
import type { BacklogItem, Feature, Task } from '../types/roadmap.js';
import type { LlmClient } from '../core/llm-client.js';

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

interface LlmTask {
  id?: string;
  title?: string;
  description?: string;
  completionCriteria?: string;
  assignedAgent?: string;
  estimatedHours?: number;
}

export class PlanningAgent implements Agent<PlanningInput, PlanningOutput> {
  readonly name = 'PlanningAgent';
  readonly version = '1.0.0';
  readonly scope = ['.ocps/roadmap/'];

  private llmClient?: LlmClient;

  constructor(llmClient?: LlmClient) {
    this.llmClient = llmClient;
  }

  async execute(input: PlanningInput, ctx: AgentContext): Promise<AgentResult<PlanningOutput>> {
    const skills = await this.loadSkills(ctx);

    let tasks: Task[];
    let tokensUsed = 0;

    if (this.llmClient) {
      const result = await this.decomposeWithLlm(input.backlogItem);
      tasks = result.tasks;
      tokensUsed = result.tokensUsed;

      if (tasks.length === 0) {
        tasks = this.decomposeBacklogItem(input.backlogItem);
      }
    } else {
      tasks = this.decomposeBacklogItem(input.backlogItem);
    }

    const feature = this.generateFeature(input.backlogItem, tasks);
    const sprintPlan = this.generateSprintPlan(input.sprintCapacity ?? 40);
    const roadmapFile = this.generateRoadmapFile(feature);

    return {
      ok: true,
      output: { feature, tasks, sprintPlan, roadmapFile },
      tokensUsed,
      skillsApplied: skills.map((s) => s.name),
      gateStatus: 'pending' as GateStatus,
    };
  }

  persistRoadmap(output: PlanningOutput, projectRoot: string): void {
    const roadmapDir = path.join(projectRoot, '.ocps', 'roadmap');
    if (!fs.existsSync(roadmapDir)) {
      fs.mkdirSync(roadmapDir, { recursive: true });
    }

    const roadmapPath = path.join(projectRoot, output.roadmapFile);
    const content = dumpYaml({
      featureId: output.feature.id,
      feature: output.feature,
      tasks: output.tasks,
      sprint: output.sprintPlan,
      createdAt: new Date().toISOString(),
    });

    fs.writeFileSync(roadmapPath, content, 'utf-8');
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

  private async decomposeWithLlm(
    backlogItem: BacklogItem,
  ): Promise<{ tasks: Task[]; tokensUsed: number }> {
    const prompt = `Você é um especialista em planejamento ágil.
Decomponha o BacklogItem abaixo em tasks técnicas granulares (1-2h cada).

BacklogItem:
- Título: ${backlogItem.title}
- Descrição: ${backlogItem.description}
- Critérios de aceite: ${backlogItem.acceptanceCriteria.join('; ')}

Retorne APENAS um JSON válido no formato:
{
  "tasks": [
    {
      "id": "task-001",
      "title": "título da task",
      "description": "descrição técnica",
      "completionCriteria": "critério de conclusão",
      "assignedAgent": "tdd",
      "estimatedHours": 2
    }
  ]
}

Regras:
- Mínimo 2 tasks, máximo 8
- assignedAgent deve ser: "tdd", "human" ou "code-review"
- Cada task deve ter completionCriteria não vazio`;

    const response = await this.llmClient!.complete(prompt);
    const parsed = this.parseTasksResponse(response.content, backlogItem);

    return { tasks: parsed, tokensUsed: response.tokensUsed };
  }

  private parseTasksResponse(content: string, backlogItem: BacklogItem): Task[] {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]) as { tasks?: LlmTask[] };
        if (Array.isArray(data.tasks) && data.tasks.length > 0) {
          return data.tasks
            .filter((t): t is Required<LlmTask> => Boolean(t.title && t.completionCriteria))
            .map((t, i) => ({
              id: t.id ?? `task-${String(i + 1).padStart(3, '0')}`,
              title: t.title,
              description: t.description ?? '',
              completionCriteria: t.completionCriteria,
              assignedAgent: t.assignedAgent ?? 'tdd',
              status: 'pending' as const,
            }));
        }
      }
    } catch {
      // ignore — chamador aplicará fallback
    }
    return this.decomposeBacklogItem(backlogItem);
  }

  private decomposeBacklogItem(backlogItem: BacklogItem): Task[] {
    const baseId = backlogItem.id.replace('backlog', 'task');

    return [
      {
        id: `${baseId}-001`,
        title: `Analisar ${backlogItem.title}`,
        description: `Análise técnica e requisitos para: ${backlogItem.description}`,
        completionCriteria: 'Análise documentada, dependências identificadas',
        assignedAgent: 'human',
        status: 'pending',
      },
      {
        id: `${baseId}-002`,
        title: `Implementar ${backlogItem.title}`,
        description: `Implementação da funcionalidade: ${backlogItem.description}`,
        completionCriteria: 'Código implementado e testado unitariamente',
        assignedAgent: 'tdd',
        status: 'pending',
      },
      {
        id: `${baseId}-003`,
        title: `Revisar ${backlogItem.title}`,
        description: `Revisão de código para: ${backlogItem.title}`,
        completionCriteria: 'Code review aprovado',
        assignedAgent: 'code-review',
        status: 'pending',
      },
    ];
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
    return { id: 'sprint-001', capacityHours };
  }

  private generateRoadmapFile(feature: Feature): string {
    return `.ocps/roadmap/${feature.id}.yaml`;
  }
}
