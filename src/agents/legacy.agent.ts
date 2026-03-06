import type { Agent, AgentContext, AgentResult, ValidationResult } from '../types/agent.js';
import type { Skill } from '../types/skill.js';
import type { GateStatus } from '../types/gate.js';
import type { CodeFile } from './code-review.agent.js';
import type { LlmClient } from '../core/llm-client.js';

interface LlmBehaviorEntry {
  functionName?: string;
  inputs?: string;
  outputs?: string;
  sideEffects?: string;
  risk?: string;
}

export interface BehaviorEntry {
  functionName: string;
  inputs: string;
  outputs: string;
  sideEffects: string;
  risk: 'low' | 'medium' | 'high';
}

export interface BehaviorMap {
  entries: BehaviorEntry[];
  analyzedAt: string;
}

export interface Divergence {
  type: 'missing' | 'different' | 'obsolete';
  description: string;
  location?: string;
}

export interface DrfSection {
  title: string;
  content: string;
}

export interface EquivalenceTest {
  name: string;
  input: string;
  expectedOutput: string;
  status: 'pending' | 'passing' | 'failing';
}

export interface DRF {
  title: string;
  summary: string;
  sections: DrfSection[];
  equivalenceTests: EquivalenceTest[];
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface MigrationStep {
  order: number;
  description: string;
  risks: string[];
  estimatedHours: number;
}

export interface MigrationPlan {
  title: string;
  summary: string;
  steps: MigrationStep[];
  totalEstimatedHours: number;
  risks: string[];
}

export interface LegacyInput {
  moduleFiles: CodeFile[];
  originalDocs?: string;
}

export interface LegacyOutput {
  behaviorMap: BehaviorMap;
  divergences: Divergence[];
  drf: DRF;
  migrationPlan: MigrationPlan;
}

export class LegacyAgent implements Agent<LegacyInput, LegacyOutput> {
  readonly name = 'LegacyAgent';
  readonly version = '1.0.0';
  readonly scope = ['src/**/*.ts', 'src/**/*.js'];

  private llmClient: LlmClient;

  constructor(_llmClient: LlmClient) {
    this.llmClient = _llmClient;
  }

  async execute(input: LegacyInput, ctx: AgentContext): Promise<AgentResult<LegacyOutput>> {
    const skills = await this.loadSkills(ctx);

    const { map: behaviorMap, tokensUsed } = await this.analyzeBehavior(input);
    const divergences = await this.detectDivergences(input);
    const drf = await this.generateDrf(input, behaviorMap);
    const migrationPlan = await this.generateMigrationPlan(input, behaviorMap);

    return {
      ok: true,
      output: {
        behaviorMap,
        divergences,
        drf,
        migrationPlan,
      },
      tokensUsed,
      skillsApplied: skills.map((s) => s.name),
      gateStatus: 'pending' as GateStatus,
    };
  }

  async loadSkills(ctx: AgentContext): Promise<Skill[]> {
    return ctx.skills.filter(
      (s) =>
        s.name === 'legacy-behavior-analysis' ||
        s.name === 'code-archaeology' ||
        s.name === 'requirements-extraction' ||
        s.name === 'migration-strategy' ||
        s.name === 'equivalence-testing',
    );
  }

  validate(output: LegacyOutput): ValidationResult {
    const errors: string[] = [];

    if (!output.behaviorMap || output.behaviorMap.entries.length === 0) {
      errors.push('Behavior map é obrigatório');
    }
    if (!output.drf || !output.drf.sections || output.drf.sections.length === 0) {
      errors.push('DRF é obrigatório');
    }
    if (!output.migrationPlan || output.migrationPlan.steps.length === 0) {
      errors.push('Migration plan é obrigatório');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }
    return { valid: true };
  }

  async onGateFail(reason: string, _ctx: AgentContext): Promise<void> {
    console.log(`[LegacyAgent] Gate falhou: ${reason}`);
  }

  private async analyzeBehavior(input: LegacyInput): Promise<{ map: BehaviorMap; tokensUsed: number }> {
    try {
      const { entries, tokensUsed } = await this.analyzeBehaviorWithLlm(input);
      if (entries.length > 0) {
        return { map: { entries, analyzedAt: new Date().toISOString() }, tokensUsed };
      }
    } catch {
      // fallback to static
    }

    return { map: this.analyzeBehaviorStatic(input), tokensUsed: 0 };
  }

  private async analyzeBehaviorWithLlm(input: LegacyInput): Promise<{ entries: BehaviorEntry[]; tokensUsed: number }> {
    const codeContext = input.moduleFiles.map((f) => `// ${f.path}\n${f.content}`).join('\n\n');

    const prompt = `Você é um especialista em análise de código legado. Analise o código abaixo e extraia o comportamento de cada função.

Código:
${codeContext}

Retorne APENAS um JSON válido no formato:
{"entries": [{"functionName": "nome", "inputs": "parâmetros", "outputs": "retorno", "sideEffects": "efeitos colaterais", "risk": "low|medium|high"}]}

Critério de risco:
- high: funções que modificam banco, executam comandos, deletam dados
- medium: funções que leem arquivos, fazem I/O externo
- low: funções de transformação pura`;

    const response = await this.llmClient.complete(prompt);
    const entries = this.parseBehaviorResponse(response.content);
    return { entries, tokensUsed: response.tokensUsed };
  }

  private parseBehaviorResponse(content: string): BehaviorEntry[] {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]) as { entries?: LlmBehaviorEntry[] };
        if (Array.isArray(data.entries) && data.entries.length > 0) {
          return data.entries
            .filter((e): e is LlmBehaviorEntry & { functionName: string } => Boolean(e.functionName))
            .map((e) => ({
              functionName: e.functionName,
              inputs: e.inputs ?? 'unknown',
              outputs: e.outputs ?? 'unknown',
              sideEffects: e.sideEffects ?? 'none identified',
              risk: (['low', 'medium', 'high'].includes(e.risk ?? '') ? e.risk : 'low') as 'low' | 'medium' | 'high',
            }));
        }
      }
    } catch {
      // ignore — fallback
    }
    return [];
  }

  private analyzeBehaviorStatic(input: LegacyInput): BehaviorMap {
    const entries: BehaviorEntry[] = [];

    for (const file of input.moduleFiles) {
      const functions = this.extractFunctions(file.content);

      for (const func of functions) {
        entries.push({
          functionName: func.name,
          inputs: func.params || 'unknown',
          outputs: 'unknown',
          sideEffects: 'none identified',
          risk: this.assessRisk(func.name, file.content),
        });
      }
    }

    return { entries, analyzedAt: new Date().toISOString() };
  }

  private extractFunctions(content: string): { name: string; params: string }[] {
    const functions: { name: string; params: string }[] = [];

    const functionMatches = content.matchAll(
      /(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:\([^)]*\)|[^=]))?\s*(?:=>)?\s*\{/g,
    );

    for (const match of functionMatches) {
      functions.push({
        name: match[1],
        params: 'parameters',
      });
    }

    return functions;
  }

  private assessRisk(functionName: string, _content: string): 'low' | 'medium' | 'high' {
    const riskyPatterns = ['delete', 'drop', 'truncate', 'eval', 'exec', 'shell'];

    if (riskyPatterns.some((p) => functionName.toLowerCase().includes(p))) {
      return 'high';
    }

    if (
      functionName.toLowerCase().includes('database') ||
      functionName.toLowerCase().includes('file')
    ) {
      return 'medium';
    }

    return 'low';
  }

  private async detectDivergences(input: LegacyInput): Promise<Divergence[]> {
    const divergences: Divergence[] = [];

    if (!input.originalDocs) {
      divergences.push({
        type: 'missing',
        description: 'Documentação original não fornecida',
      });
      return divergences;
    }

    for (const file of input.moduleFiles) {
      if (file.content.includes('TODO') || file.content.includes('FIXME')) {
        divergences.push({
          type: 'obsolete',
          description: 'Código com TODOs ou FIXMEs pendentes',
          location: file.path,
        });
      }
    }

    return divergences;
  }

  private async generateDrf(input: LegacyInput, behaviorMap: BehaviorMap): Promise<DRF> {
    const sections: DrfSection[] = [
      {
        title: 'Visão Geral',
        content: `Este documento descreve o comportamento reverso-engineered do sistema analisado.
Total de funções identificadas: ${behaviorMap.entries.length}`,
      },
      {
        title: 'Funções Identificadas',
        content: behaviorMap.entries
          .map((e) => `- ${e.functionName} (risco: ${e.risk})`)
          .join('\n'),
      },
      {
        title: 'Riscos',
        content:
          behaviorMap.entries
            .filter((e) => e.risk !== 'low')
            .map((e) => `- ${e.functionName}: risco ${e.risk}`)
            .join('\n') || 'Nenhum risco identificado',
      },
    ];

    const equivalenceTests: EquivalenceTest[] = behaviorMap.entries.slice(0, 3).map((entry) => ({
      name: `test_${entry.functionName}_equivalence`,
      input: '{}',
      expectedOutput: 'undefined',
      status: 'pending' as const,
    }));

    return {
      title: `DRF - ${input.moduleFiles[0]?.path || 'Módulo Analisado'}`,
      summary: `Análise de ${input.moduleFiles.length} arquivos`,
      sections,
      equivalenceTests,
      approved: false,
    };
  }

  private async generateMigrationPlan(
    input: LegacyInput,
    behaviorMap: BehaviorMap,
  ): Promise<MigrationPlan> {
    const highRisk = behaviorMap.entries.filter((e) => e.risk === 'high');
    const steps: MigrationStep[] = [];

    steps.push({
      order: 1,
      description: 'Análise completa do código legado',
      risks: ['Pode revelar dependências ocultas'],
      estimatedHours: 8,
    });

    steps.push({
      order: 2,
      description: 'Criação de testes de equivalência',
      risks: ['Testes podem não cobrir todos os casos'],
      estimatedHours: 16,
    });

    if (highRisk.length > 0) {
      steps.push({
        order: 3,
        description: 'Refatoração de funções de alto risco',
        risks: ['Pode introduzir regressões'],
        estimatedHours: 24,
      });
    }

    steps.push({
      order: steps.length + 1,
      description: 'Migração para nova arquitetura',
      risks: ['Período de transição'],
      estimatedHours: 40,
    });

    const totalHours = steps.reduce((sum, s) => sum + s.estimatedHours, 0);

    return {
      title: 'Plano de Migração',
      summary: `Migração de ${input.moduleFiles.length} arquivos`,
      steps,
      totalEstimatedHours: totalHours,
      risks: ['Compatibilidade com sistema legados', 'Curva de aprendizado'],
    };
  }
}
