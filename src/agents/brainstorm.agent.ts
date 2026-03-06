import type { Agent, AgentContext, AgentResult, ValidationResult } from '../types/agent.js';
import type { Skill } from '../types/skill.js';
import type { GateStatus } from '../types/gate.js';
import type { BacklogItem } from '../types/roadmap.js';
import type { LlmClient } from '../core/llm-client.js';

export interface BrainstormInput {
  rawIdea: string;
  projectContext: string;
}

export interface BrainstormOutput {
  backlogItem: BacklogItem;
  clarifications: string[];
  risks: string[];
}

interface LlmBacklogItem {
  title?: string;
  description?: string;
  acceptanceCriteria?: string[];
  risks?: string[];
  clarifications?: string[];
}

export class BrainstormAgent implements Agent<BrainstormInput, BrainstormOutput> {
  readonly name = 'BrainstormAgent';
  readonly version = '1.0.0';
  readonly scope = ['.ocps/roadmap/backlog.yaml'];

  private llmClient?: LlmClient;

  constructor(llmClient?: LlmClient) {
    this.llmClient = llmClient;
  }

  async execute(input: BrainstormInput, ctx: AgentContext): Promise<AgentResult<BrainstormOutput>> {
    const skills = await this.loadSkills(ctx);

    if (this.llmClient) {
      return this.executeWithLlm(input, skills);
    }

    return this.executeStatic(input, skills);
  }

  private async executeWithLlm(
    input: BrainstormInput,
    skills: Skill[],
  ): Promise<AgentResult<BrainstormOutput>> {
    const prompt = this.buildPrompt(input);
    const response = await this.llmClient!.complete(prompt);

    const parsed = this.parseResponse(response.content, input);
    const clarifications = parsed.clarifications ?? this.identifyClarifications(input);
    const risks = parsed.risks ?? this.identifyRisks(input);

    const id = `backlog-${Date.now()}`;
    const backlogItem: BacklogItem = {
      id,
      title: parsed.title ?? input.rawIdea.substring(0, 50),
      description: parsed.description ?? input.rawIdea,
      acceptanceCriteria:
        parsed.acceptanceCriteria && parsed.acceptanceCriteria.length > 0
          ? parsed.acceptanceCriteria
          : [`Funcionalidade "${input.rawIdea.substring(0, 50)}" implementada e testada`],
      status: 'pending',
      priority: 'medium',
      createdAt: new Date().toISOString(),
    };

    return {
      ok: true,
      output: { backlogItem, clarifications, risks },
      tokensUsed: response.tokensUsed,
      skillsApplied: skills.map((s) => s.name),
      gateStatus: 'pending' as GateStatus,
    };
  }

  private executeStatic(
    input: BrainstormInput,
    skills: Skill[],
  ): AgentResult<BrainstormOutput> {
    const clarifications = this.identifyClarifications(input);
    const backlogItem = this.generateBacklogItem(input);
    const risks = this.identifyRisks(input);

    return {
      ok: true,
      output: { backlogItem, clarifications, risks },
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

  private buildPrompt(input: BrainstormInput): string {
    return `Você é um especialista em elicitação de requisitos ágeis.
Analise a ideia abaixo e retorne um JSON válido com o seguinte formato:

{
  "title": "título conciso da feature (máx 80 chars)",
  "description": "descrição detalhada da funcionalidade",
  "acceptanceCriteria": ["critério 1", "critério 2", "critério 3"],
  "risks": ["risco técnico 1", "risco técnico 2"],
  "clarifications": ["pergunta de esclarecimento 1"]
}

Ideia: ${input.rawIdea}
Contexto do projeto: ${input.projectContext}

Retorne APENAS o JSON, sem explicações.`;
  }

  private parseResponse(content: string, _input: BrainstormInput): LlmBacklogItem {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as LlmBacklogItem;
      }
    } catch {
      // ignore — fallback será aplicado pelo chamador
    }
    return {};
  }

  private generateBacklogItem(input: BrainstormInput): BacklogItem {
    const id = `backlog-${Date.now()}`;
    const title = input.rawIdea.substring(0, 50);
    return {
      id,
      title,
      description: input.rawIdea,
      acceptanceCriteria: [`Funcionalidade "${title}" implementada e testada`],
      status: 'pending',
      priority: 'medium',
      createdAt: new Date().toISOString(),
    };
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

  private identifyRisks(input: BrainstormInput): string[] {
    const risks: string[] = [];

    if (
      input.rawIdea.toLowerCase().includes('migrar') ||
      input.rawIdea.toLowerCase().includes('legacy')
    ) {
      risks.push('Tarefa pode envolver código legado — considerar análise arqueológica');
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
