import * as fs from 'fs';
import * as path from 'path';
import type { Agent, AgentContext, AgentResult } from '../types/agent.js';
import type { BacklogItem, Feature, Task } from '../types/roadmap.js';
import type { BrainstormInput, BrainstormOutput } from '../agents/brainstorm.agent.js';
import { PlanningAgent } from '../agents/planning.agent.js';
import type { PlanningInput } from '../agents/planning.agent.js';
import type { TddInput, TddOutput } from '../agents/tdd.agent.js';
import type { CodeReviewInput, CodeReviewOutput, CodeFile } from '../agents/code-review.agent.js';
import type { QaInput, QaOutput } from '../agents/qa.agent.js';
import type { GateEngine } from './gate-engine.js';

export interface PipelineContext extends AgentContext {
  currentPhase: 'brainstorm' | 'planning' | 'tdd' | 'code-review' | 'qa' | 'complete';
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
  reviewOutput?: CodeReviewOutput;
  qaOutput?: QaOutput;
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
  private planningAgent: PlanningAgent;
  private tddAgent: Agent<TddInput, TddOutput>;
  private codeReviewAgent?: Agent<CodeReviewInput, CodeReviewOutput>;
  private qaAgent?: Agent<QaInput, QaOutput>;
  private gateEngine?: GateEngine;

  constructor(
    brainstorm: Agent<BrainstormInput, BrainstormOutput>,
    planning: PlanningAgent,
    tdd: Agent<TddInput, TddOutput>,
    codeReview?: Agent<CodeReviewInput, CodeReviewOutput>,
    qa?: Agent<QaInput, QaOutput>,
  ) {
    this.brainstormAgent = brainstorm;
    this.planningAgent = planning;
    this.tddAgent = tdd;
    this.codeReviewAgent = codeReview;
    this.qaAgent = qa;
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

    try {
      this.planningAgent.persistRoadmap(planningResult.output!, ctx.projectRoot);
    } catch {
      // Non-fatal - continues pipeline even if persist fails
    }

    const taskToExecute = planningResult.output!.tasks.find((t) => t.assignedAgent === 'tdd');

    let tddResult: Awaited<ReturnType<typeof this.tddAgent.execute>> | undefined;

    if (taskToExecute) {
      console.log('[Phase 3/3] TDD...');
      const tddInput: TddInput = { task: taskToExecute };
      tddResult = await this.tddAgent.execute(tddInput, ctx);

      if (!tddResult!.ok) {
        return { ok: false, error: tddResult!.error };
      }

      totalTokens += tddResult!.tokensUsed;
      phasesCompleted.push('tdd');

      if (this.gateEngine) {
        const approved = await this.gateEngine.confirm('Aprovar código gerado?', tddResult!.output);
        if (!approved) {
          return { ok: false, error: 'Gate reprovado pelo desenvolvedor' };
        }

        // PERSISTÊNCIA REAL APÓS APROVAÇÃO
        const out = tddResult!.output!;
        console.log(`\n[Orchestrator] Escrevendo arquivos no disco...`);

        try {
          if (!fs.existsSync(path.dirname(out.testFile)))
            fs.mkdirSync(path.dirname(out.testFile), { recursive: true });
          if (!fs.existsSync(path.dirname(out.implementationFile)))
            fs.mkdirSync(path.dirname(out.implementationFile), { recursive: true });

          fs.writeFileSync(out.testFile, out.testContent, 'utf-8');
          fs.writeFileSync(out.implementationFile, out.implementationContent, 'utf-8');

          console.log(`✓ Criado: ${out.testFile}`);
          console.log(`✓ Criado: ${out.implementationFile}`);
        } catch (e) {
          return { ok: false, error: `Falha ao escrever arquivos: ${e}` };
        }
      }
    }

    // Fase Code Review
    let reviewResult: AgentResult<CodeReviewOutput> | undefined;

    if (this.codeReviewAgent && tddResult?.output) {
      console.log('[Phase 4/5] Code Review...');

      const changedFiles: CodeFile[] = [
        {
          path: tddResult.output.testFile,
          content: tddResult.output.testContent,
          language: 'typescript',
        },
        {
          path: tddResult.output.implementationFile,
          content: tddResult.output.implementationContent,
          language: 'typescript',
        },
      ];

      const reviewInput: CodeReviewInput = {
        changedFiles,
        taskContext: taskToExecute!,
      };

      reviewResult = await this.codeReviewAgent.execute(reviewInput, ctx);

      if (!reviewResult.ok) {
        return { ok: false, error: reviewResult.error };
      }

      totalTokens += reviewResult.tokensUsed;
      phasesCompleted.push('code-review');

      if (this.gateEngine) {
        if (reviewResult.output?.blockers && reviewResult.output.blockers.length > 0) {
          return {
            ok: false,
            error: `Code review bloqueado: ${reviewResult.output.blockers[0].message}`,
          };
        }
        const approved = await this.gateEngine.confirm('Aprovar code review?', reviewResult.output);
        if (!approved) {
          return { ok: false, error: 'Gate reprovado pelo desenvolvedor' };
        }
      }
    }

    // Fase QA
    let qaResult: AgentResult<QaOutput> | undefined;

    if (this.qaAgent) {
      console.log('[Phase 5/5] QA...');

      const implementedFiles: CodeFile[] = tddResult?.output
        ? [
            {
              path: tddResult.output.testFile,
              content: tddResult.output.testContent,
              language: 'typescript',
            },
            {
              path: tddResult.output.implementationFile,
              content: tddResult.output.implementationContent,
              language: 'typescript',
            },
          ]
        : [];

      const qaInput: QaInput = {
        feature: planningResult.output!.feature,
        implementedFiles,
      };

      qaResult = await this.qaAgent.execute(qaInput, ctx);

      if (!qaResult.ok) {
        return { ok: false, error: qaResult.error };
      }

      totalTokens += qaResult.tokensUsed;
      phasesCompleted.push('qa');

      if (this.gateEngine) {
        const approved = await this.gateEngine.confirm('Aprovar QA?', qaResult.output);
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
        tddOutput: tddResult?.output,
        reviewOutput: reviewResult?.output,
        qaOutput: qaResult?.output,
        phasesCompleted,
        totalTokens,
      },
    };
  }
}
