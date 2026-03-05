import type { Agent, AgentContext, AgentResult, ValidationResult } from '../types/agent.js';
import type { Skill } from '../types/skill.js';
import type { GateStatus } from '../types/gate.js';
import type { Task } from '../types/roadmap.js';
import type { LlmClient } from '../core/llm-client.js';

export interface CodeFile {
  path: string;
  content: string;
  language: string;
}

export interface ReviewItem {
  type: 'blocker' | 'suggestion';
  category: string;
  message: string;
  file?: string;
  line?: number;
}

export interface CodeReviewInput {
  changedFiles: CodeFile[];
  taskContext: Task;
}

export interface PassResult {
  pass: number;
  name: string;
  items: ReviewItem[];
  approved: boolean;
}

export interface CodeReviewOutput {
  pass1: PassResult;
  pass2: PassResult;
  pass3: PassResult;
  approved: boolean;
  blockers: ReviewItem[];
  suggestions: ReviewItem[];
}

export class CodeReviewAgent implements Agent<CodeReviewInput, CodeReviewOutput> {
  readonly name = 'CodeReviewAgent';
  readonly version = '1.0.0';
  readonly scope = ['src/**/*.ts', 'tests/**/*.ts'];

  private llmClient: LlmClient;

  constructor(llmClient: LlmClient) {
    this.llmClient = llmClient;
  }

  async execute(input: CodeReviewInput, ctx: AgentContext): Promise<AgentResult<CodeReviewOutput>> {
    const skills = await this.loadSkills(ctx);

    const pass1 = await this.runStructuralPass(input);
    const pass2 = await this.runQualityPass(input);
    const pass3 = await this.runSecurityPass(input);

    const allItems = [...pass1.items, ...pass2.items, ...pass3.items];
    const blockers = allItems.filter((i) => i.type === 'blocker');
    const suggestions = allItems.filter((i) => i.type === 'suggestion');
    const approved = blockers.length === 0;

    return {
      ok: true,
      output: {
        pass1,
        pass2,
        pass3,
        approved,
        blockers,
        suggestions,
      },
      tokensUsed: 0,
      skillsApplied: skills.map((s) => s.name),
      gateStatus: (approved ? 'approved' : 'blocked') as GateStatus,
    };
  }

  async loadSkills(ctx: AgentContext): Promise<Skill[]> {
    return ctx.skills.filter(
      (s) =>
        s.name === 'checklist-structural' ||
        s.name === 'checklist-quality' ||
        s.name === 'checklist-security' ||
        s.name === 'typescript-conventions',
    );
  }

  validate(output: CodeReviewOutput): ValidationResult {
    const errors: string[] = [];

    if (!output.pass1 || !output.pass2 || !output.pass3) {
      errors.push('Todos os 3 passes são obrigatórios');
    }
    if (output.blockers.length > 0 && output.approved) {
      errors.push('Não pode ter blockers e estar aprovado simultaneamente');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }
    return { valid: true };
  }

  async onGateFail(reason: string, _ctx: AgentContext): Promise<void> {
    console.log(`[CodeReviewAgent] Gate falhou: ${reason}`);
  }

  private async runStructuralPass(input: CodeReviewInput): Promise<PassResult> {
    const prompt = `Analise o código abaixo para revisão estrutural (SOLID, arquitetura):
Verifique: SRP, OCP, DIP,ISP - Single Responsibility, Open/Closed, Dependency Inversion, Interface Segregation

Arquivos:
${input.changedFiles.map((f) => `// ${f.path}\n${f.content}`).join('\n\n')}

Retorne JSON com array de items, cada um: { type: "blocker"|"suggestion", category, message, file?, line? }`;

    const response = await this.llmClient.complete(prompt);
    const items = this.parseReviewItems(response.content);

    return {
      pass: 1,
      name: 'Structural',
      items: items.length > 0 ? items : this.defaultStructuralCheck(input),
      approved: items.filter((i) => i.type === 'blocker').length === 0,
    };
  }

  private async runQualityPass(input: CodeReviewInput): Promise<PassResult> {
    const prompt = `Analise o código abaixo para revisão de qualidade:
Verifique: DRY, naming, complexidade ciclomática, código morto

Arquivos:
${input.changedFiles.map((f) => `// ${f.path}\n${f.content}`).join('\n\n')}

Retorne JSON com array de items, cada um: { type: "blocker"|"suggestion", category, message, file?, line? }`;

    const response = await this.llmClient.complete(prompt);
    const items = this.parseReviewItems(response.content);

    return {
      pass: 2,
      name: 'Quality',
      items: items.length > 0 ? items : this.defaultQualityCheck(input),
      approved: items.filter((i) => i.type === 'blocker').length === 0,
    };
  }

  private async runSecurityPass(input: CodeReviewInput): Promise<PassResult> {
    const prompt = `Analise o código abaixo para revisão de segurança:
Verifique: inputs, injeção, autenticação, XSS, SQL injection, secrets

Arquivos:
${input.changedFiles.map((f) => `// ${f.path}\n${f.content}`).join('\n\n')}

Retorne JSON com array de items, cada um: { type: "blocker"|"suggestion", category, message, file?, line? }`;

    const response = await this.llmClient.complete(prompt);
    const items = this.parseReviewItems(response.content);

    return {
      pass: 3,
      name: 'Security',
      items: items.length > 0 ? items : this.defaultSecurityCheck(input),
      approved: items.filter((i) => i.type === 'blocker').length === 0,
    };
  }

  private parseReviewItems(content: string): ReviewItem[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // ignore parse errors
    }
    return [];
  }

  private defaultStructuralCheck(input: CodeReviewInput): ReviewItem[] {
    const items: ReviewItem[] = [];
    for (const file of input.changedFiles) {
      if (file.content.includes('class') && file.content.length > 500) {
        items.push({
          type: 'suggestion',
          category: 'SOLID',
          message: 'Considere quebrar classes grandes em unidades menores',
          file: file.path,
        });
      }
    }
    return items;
  }

  private defaultQualityCheck(input: CodeReviewInput): ReviewItem[] {
    const items: ReviewItem[] = [];
    for (const file of input.changedFiles) {
      if (
        file.content.includes('function') &&
        file.content.includes('function') &&
        file.content.match(/function\s+\w+\s*\([^)]*\)\s*\{[^}]{200,}/)
      ) {
        items.push({
          type: 'suggestion',
          category: 'Complexity',
          message: 'Função muito longa detectada',
          file: file.path,
        });
      }
    }
    return items;
  }

  private defaultSecurityCheck(input: CodeReviewInput): ReviewItem[] {
    const items: ReviewItem[] = [];
    for (const file of input.changedFiles) {
      if (file.content.includes('eval(')) {
        items.push({
          type: 'blocker',
          category: 'Security',
          message: 'Uso de eval() detectado - risco de XSS',
          file: file.path,
        });
      }
      if (file.content.includes('password') && !file.content.includes('process.env')) {
        items.push({
          type: 'blocker',
          category: 'Security',
          message: 'Senha hardcoded detectada',
          file: file.path,
        });
      }
    }
    return items;
  }
}
