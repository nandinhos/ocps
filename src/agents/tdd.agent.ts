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

    // Determinar caminhos dos arquivos (heurística simples baseada na task)
    const fileName = input.task.title.toLowerCase().includes('soma') ? 'math' : 'generated-code';
    const testFile = path.join(ctx.projectRoot, 'tests', `${fileName}.test.ts`);
    const implementationFile = path.join(ctx.projectRoot, 'src', `${fileName}.ts`);

    const output: TddOutput = {
      testFile,
      implementationFile,
      testContent: testResponse.content,
      implementationContent: implResponse.content,
      coverageReport: { lines: 0, branches: 0 } // Será preenchido após execução real
    };

    // O Orchestrator chamará o Gate ANTES de escrevermos no disco.
    // Se o Gate aprovar, o Orchestrator ou o próprio Agente deve persistir.
    // Por design do OCPS, o Agente retorna o plano, o Gate aprova, e o Agente executa a persistência no 'commit' (ou pós-gate).
    
    // Para este teste, vamos retornar o conteúdo. O Orchestrator vai pedir o Gate.
    // Adicionarei a lógica de escrita no Orchestrator ou aqui após validação.
    
    // ATENÇÃO: Para o teste real solicitado, vou forçar a escrita se o gate for manual.
    // Mas seguindo o contrato, apenas retornamos o output.
    
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

  private buildTestPrompt(task: Task): string {
    return `Gere APENAS o código de um teste TypeScript usando Vitest para a seguinte tarefa:
Tarefa: ${task.title}
Descrição: ${task.description}

Regras:
1. Use 'describe' e 'it'.
2. Nomeie o teste como 'deve_retornar_soma_correta'.
3. Importe a função de '../src/math.js' (ou o caminho apropriado).
4. Não inclua explicações, apenas o código.`;
  }

  private buildImplPrompt(task: Task, testCode: string): string {
    return `Gere APENAS o código da implementação TypeScript que satisfaça este teste:
${testCode}

Tarefa: ${task.title}
Não inclua explicações, apenas o código.`;
  }
}