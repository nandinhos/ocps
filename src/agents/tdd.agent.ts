import * as path from 'path';
import type { Agent, AgentContext, AgentResult, ValidationResult } from '../types/agent.js';
import type { Skill } from '../types/skill.js';
import type { GateStatus } from '../types/gate.js';
import type { Task } from '../types/roadmap.js';
import type { LlmClient } from '../core/llm-client.js';

export interface TddInput {
  task: Task;
  existingCode?: string;
}

export interface TddOutput {
  testFile: string;
  implementationFile: string;
  testContent: string;
  implementationContent: string;
  coverageReport: { lines: number; branches: number };
}

export class TddAgent implements Agent<TddInput, TddOutput> {
  readonly name = 'TddAgent';
  readonly version = '1.0.0';
  readonly scope = ['src/**/*.ts', 'tests/**/*.ts'];

  private llmClient: LlmClient;

  constructor(llmClient: LlmClient) {
    this.llmClient = llmClient;
  }

  async execute(input: TddInput, ctx: AgentContext): Promise<AgentResult<TddOutput>> {
    const skills = await this.loadSkills(ctx);

    console.log(`[TddAgent] Gerando testes para: ${input.task.title}...`);
    const testResponse = await this.llmClient.complete(this.buildTestPrompt(input.task));
    
    console.log(`[TddAgent] Gerando implementação para: ${input.task.title}...`);
    const implResponse = await this.llmClient.complete(this.buildImplPrompt(input.task, testResponse.content));

    // Derivar nome do arquivo a partir do título da task (kebab-case)
    const fileName = this.titleToFileName(input.task.title);
    const testFile = path.join(ctx.projectRoot, 'tests', `${fileName}.test.ts`);
    const implementationFile = path.join(ctx.projectRoot, 'src', `${fileName}.ts`);

    const output: TddOutput = {
      testFile,
      implementationFile,
      testContent: testResponse.content,
      implementationContent: implResponse.content,
      coverageReport: { lines: 0, branches: 0 },
    };

    return {
      ok: true,
      output,
      tokensUsed: testResponse.tokensUsed + implResponse.tokensUsed,
      skillsApplied: skills.map((s) => s.name),
      gateStatus: 'pending' as GateStatus,
    };
  }

  async loadSkills(ctx: AgentContext): Promise<Skill[]> {
    return ctx.skills.filter(
      (s) =>
        s.name === 'tdd-typescript' || s.name === 'coverage-analysis' || s.name === 'refactor-safe',
    );
  }

  validate(output: TddOutput): ValidationResult {
    const errors: string[] = [];
    if (!output.testContent) errors.push('Conteúdo do teste vazio');
    if (!output.implementationContent) errors.push('Conteúdo da implementação vazio');
    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }

  async onGateFail(reason: string, _ctx: AgentContext): Promise<void> {
    console.log(`[TddAgent] Gate falhou: ${reason}`);
  }

  private titleToFileName(title: string): string {
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return slug || 'generated-code';
  }

  private buildTestPrompt(task: Task): string {
    const fileName = this.titleToFileName(task.title);
    return `Gere APENAS o código de um teste TypeScript usando Vitest para a seguinte tarefa:
Tarefa: ${task.title}
Descrição: ${task.description}

Regras:
1. Use 'describe' e 'it'.
2. Nomeie o arquivo de implementação como '${fileName}.ts'.
3. Importe a função de '../src/${fileName}.js'.
4. Não inclua explicações, apenas o código.`;
  }

  private buildImplPrompt(task: Task, testCode: string): string {
    return `Gere APENAS o código da implementação TypeScript que satisfaça este teste:
${testCode}

Tarefa: ${task.title}
Não inclua explicações, apenas o código.`;
  }
}