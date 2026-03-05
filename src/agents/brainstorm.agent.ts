import type { Agent, AgentContext, AgentResult, ValidationResult } from '../types/agent.js';
import type { Skill } from '../types/skill.js';
import type { GateStatus } from '../types/gate.js';
import type { BacklogItem } from '../types/roadmap.js';

export interface BrainstormInput {
  rawIdea: string;
  projectContext: string;
}

export interface BrainstormOutput {
  backlogItem: BacklogItem;
  clarifications: string[];
  risks: string[];
}

export class BrainstormAgent implements Agent<BrainstormInput, BrainstormOutput> {
  readonly name = 'BrainstormAgent';
  readonly version = '1.0.0';
  readonly scope = ['.ocps/roadmap/backlog.yaml'];

  async execute(input: BrainstormInput, ctx: AgentContext): Promise<AgentResult<BrainstormOutput>> {
    const skills = await this.loadSkills(ctx);

    const clarifications = this.identifyClarifications(input);
    const backlogItem = this.generateBacklogItem(input);
    const risks = this.identifyRisks(input);

    return {
      ok: true,
      output: {
        backlogItem,
        clarifications,
        risks,
      },
      tokensUsed: 0,
      skillsApplied: skills.map((s) => s.name),
      gateStatus: 'pending' as GateStatus,
    };
  }

  async loadSkills(ctx: AgentContext): Promise<Skill[]> {
    return ctx.skills.filter(
      (s) =>
        s.name === 'elicitacao-requisitos' ||
        s.name === 'ambiguity-detection' ||
        s.name === 'backlog-formatting' ||
        s.name === 'acceptance-criteria-draft',
    );
  }

  validate(output: BrainstormOutput): ValidationResult {
    const errors: string[] = [];

    if (!output.backlogItem) {
      errors.push('BacklogItem é obrigatório');
    }
    if (!output.backlogItem.title) {
      errors.push('Título do BacklogItem é obrigatório');
    }
    if (!output.backlogItem.description) {
      errors.push('Descrição do BacklogItem é obrigatória');
    }
    if (
      !output.backlogItem.acceptanceCriteria ||
      output.backlogItem.acceptanceCriteria.length === 0
    ) {
      errors.push('Critérios de aceite são obrigatórios');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }
    return { valid: true };
  }

  async onGateFail(reason: string, _ctx: AgentContext): Promise<void> {
    console.log(`[BrainstormAgent] Gate falhou: ${reason}`);
  }

  private identifyClarifications(input: BrainstormInput): string[] {
    const clarifications: string[] = [];

    if (!input.rawIdea || input.rawIdea.length < 10) {
      clarifications.push('A ideia parece muito curta. Pode elaborar mais?');
    }

    if (!input.projectContext) {
      clarifications.push('Qual é o contexto técnico do projeto?');
    }

    return clarifications;
  }

  private generateBacklogItem(_input: BrainstormInput): BacklogItem {
    const id = `backlog-${Date.now()}`;
    return {
      id,
      title: _input.rawIdea.substring(0, 50),
      description: _input.rawIdea,
      acceptanceCriteria: [],
      status: 'pending',
      priority: 'medium',
      createdAt: new Date().toISOString(),
    };
  }

  private identifyRisks(input: BrainstormInput): string[] {
    const risks: string[] = [];

    if (
      input.rawIdea.toLowerCase().includes('migrar') ||
      input.rawIdea.toLowerCase().includes('legacy')
    ) {
      risks.push('arefa pode envolver código legado — considerar análise arqueológica');
    }

    if (
      input.rawIdea.toLowerCase().includes('banco') ||
      input.rawIdea.toLowerCase().includes('dados')
    ) {
      risks.push('Envolvimento de banco de dados — considerar migrations e rollback');
    }

    return risks;
  }
}
