import type { Agent, AgentContext } from '../types/agent.js';
import type { BacklogItem, Feature, Task } from '../types/roadmap.js';
import type { BrainstormInput, BrainstormOutput } from '../agents/brainstorm.agent.js';
import type { PlanningInput, PlanningOutput } from '../agents/planning.agent.js';
import type { TddInput, TddOutput } from '../agents/tdd.agent.js';
import type { GateEngine } from './gate-engine.js';

export interface PipelineContext extends AgentContext {
  currentPhase: 'brainstorm' | 'planning' | 'tdd' | 'complete';
  backlogItem?: BacklogItem;
  feature?: Feature;
  tasks?: Task[];
  tddOutput?: TddOutput;
}

export interface PipelineInput {
  rawIdea: string;
  projectContext: string;
}

export interface PipelineOutput {
  backlogItem: BacklogItem;
  feature: Feature;
  tddOutput?: TddOutput;
  phasesCompleted: string[];
  totalTokens: number;
}

export interface PipelineResult {
  ok: boolean;
  output?: PipelineOutput;
  error?: string;
}

export class Orchestrator {
  private brainstormAgent: Agent<BrainstormInput, BrainstormOutput>;
  private planningAgent: Agent<PlanningInput, PlanningOutput>;
  private tddAgent: Agent<TddInput, TddOutput>;
  private gateEngine?: GateEngine;

  constructor(
    brainstorm: Agent<BrainstormInput, BrainstormOutput>,
    planning: Agent<PlanningInput, PlanningOutput>,
    tdd: Agent<TddInput, TddOutput>,
  ) {
    this.brainstormAgent = brainstorm;
    this.planningAgent = planning;
    this.tddAgent = tdd;
  }

  setGateEngine(gateEngine: GateEngine): void {
    this.gateEngine = gateEngine;
  }

  async execute(input: PipelineInput, ctx: AgentContext): Promise<PipelineResult> {
    const phasesCompleted: string[] = [];
    let totalTokens = 0;

    console.log('\n=== Starting Pipeline ===\n');

    const brainstormInput: BrainstormInput = {
      rawIdea: input.rawIdea,
      projectContext: input.projectContext,
    };

    console.log('[Phase 1/3] Brainstorm...');
    const brainstormResult = await this.brainstormAgent.execute(brainstormInput, ctx);

    if (!brainstormResult.ok) {
      return { ok: false, error: brainstormResult.error };
    }

    totalTokens += brainstormResult.tokensUsed;
    phasesCompleted.push('brainstorm');

    if (this.gateEngine) {
      const approved = await this.gateEngine.confirm(
        'Aprovar BacklogItem?',
        brainstormResult.output?.backlogItem,
      );
      if (!approved) {
        return { ok: false, error: 'Gate reprovado pelo desenvolvedor' };
      }
    }

    const planningInput: PlanningInput = {
      backlogItem: brainstormResult.output!.backlogItem,
    };

    console.log('[Phase 2/3] Planning...');
    const planningResult = await this.planningAgent.execute(planningInput, ctx);

    if (!planningResult.ok) {
      return { ok: false, error: planningResult.error };
    }

    totalTokens += planningResult.tokensUsed;
    phasesCompleted.push('planning');

    if (this.gateEngine) {
      const approved = await this.gateEngine.confirm(
        'Aprovar Feature e Tasks?',
        planningResult.output?.feature,
      );
      if (!approved) {
        return { ok: false, error: 'Gate reprovado pelo desenvolvedor' };
      }
    }

    const taskToExecute = planningResult.output!.tasks.find((t) => t.assignedAgent === 'tdd');

    if (taskToExecute) {
      console.log('[Phase 3/3] TDD...');
      const tddInput: TddInput = { task: taskToExecute };
      const tddResult = await this.tddAgent.execute(tddInput, ctx);

      if (!tddResult.ok) {
        return { ok: false, error: tddResult.error };
      }

      totalTokens += tddResult.tokensUsed;
      phasesCompleted.push('tdd');

      if (this.gateEngine) {
        const approved = await this.gateEngine.confirm('Aprovar código gerado?', tddResult.output);
        if (!approved) {
          return { ok: false, error: 'Gate reprovado pelo desenvolvedor' };
        }
      }
    }

    phasesCompleted.push('complete');

    console.log('\n=== Pipeline Complete ===\n');

    return {
      ok: true,
      output: {
        backlogItem: brainstormResult.output!.backlogItem,
        feature: planningResult.output!.feature,
        tddOutput: planningResult.output ? undefined : undefined,
        phasesCompleted,
        totalTokens,
      },
    };
  }
}
