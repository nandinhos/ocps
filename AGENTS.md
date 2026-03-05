# AGENTS.md — Especificação dos Agentes OCPS

> Referência técnica de cada agente. Leia antes de implementar qualquer agente.
> **Fase 1 Concluída:** Brainstorm, Planning e TddAgent possuem implementação funcional com orquestração real e persistência em disco.

---

## Convenções de commit

Formato obrigatório (Conventional Commits):

```
type(scope): descrição detalhada em português do Brasil
```

Tipos:

- `feat`: nova funcionalidade
- `fix`: correção de bug
- `docs`: documentação
- `style`: formatação
- `refactor`: refatoração
- `test`: testes
- `chore`: tarefas varias

Exemplo: `feat(agents): implementa BrainstormAgent com habilidades de elicitação`

**Sem co-autoria.** Sempre verificar `git log` para estilo dos commits anteriores.

---

## Contrato base: interface Agent<TInput, TOutput>

Todo agente implementa este contrato sem exceção:

```typescript
// src/types/agent.ts

export interface AgentContext {
  projectRoot: string;
  config: OcpsConfig;
  roadmap: Roadmap;
  skills: Skill[];
  sessionId: string;
}

export interface AgentResult<T> {
  ok: boolean;
  output?: T;
  error?: string;
  tokensUsed: number;
  skillsApplied: string[];
  gateStatus: GateStatus;
}

export interface Agent<TInput, TOutput> {
  readonly name: string;
  readonly version: string;
  readonly scope: string[]; // arquivos/diretórios que este agente pode modificar

  execute(input: TInput, ctx: AgentContext): Promise<AgentResult<TOutput>>;
  loadSkills(ctx: AgentContext): Promise<Skill[]>;
  validate(output: TOutput): ValidationResult;
  onGateFail(reason: string, ctx: AgentContext): Promise<void>;
}
```

---

## Agente 1 — BrainstormAgent

**Arquivo:** `src/agents/brainstorm.agent.ts`
**Fase de implementação:** Fase 1

### Responsabilidade

Captura ideias brutas e transforma em itens de backlog qualificados com critérios de aceite.

### Input / Output

```typescript
type BrainstormInput = {
  rawIdea: string; // ideia em linguagem natural do desenvolvedor
  projectContext: string; // contexto técnico do projeto
};

type BrainstormOutput = {
  backlogItem: BacklogItem; // item estruturado pronto para Planning
  clarifications: string[]; // perguntas respondidas durante a sessão
  risks: string[]; // riscos identificados
};
```

### Skills obrigatórias

- `elicitacao-requisitos`
- `ambiguity-detection`
- `backlog-formatting`
- `acceptance-criteria-draft`

### Gate de saída

Desenvolvedor aprova explicitamente o `BacklogItem` antes de avançar ao Planning.

### Comportamento esperado

- Conduz questionário estruturado (mínimo 5 perguntas de alinhamento)
- Identifica ambiguidades e solicita esclarecimento antes de gerar output
- Nunca gera BacklogItem sem critérios de aceite
- Registra cada item em `.ocps/roadmap/backlog.yaml`

---

## Agente 2 — PlanningAgent

**Arquivo:** `src/agents/planning.agent.ts`
**Fase de implementação:** Fase 1

### Responsabilidade

Decompõe BacklogItem em feature estruturada com tarefas granulares, sprint plan e roadmap.

### Input / Output

```typescript
type PlanningInput = {
  backlogItem: BacklogItem;
  sprintCapacity?: number; // horas disponíveis, default: 40h
};

type PlanningOutput = {
  feature: Feature;
  tasks: Task[];
  sprintPlan: Sprint;
  roadmapFile: string; // path do arquivo YAML gerado em .ocps/roadmap/
};
```

### Skills obrigatórias

- `feature-decomposition`
- `sprint-planning`
- `dependency-mapping`
- `roadmap-generation`
- `task-sizing`

### Gate de saída

Desenvolvedor aprova escopo exato. Após aprovação: NADA fora do escopo é implementado.

### Comportamento esperado

- Tarefas devem ser pequenas o suficiente para completar em 1-2h
- Cada tarefa tem: título, descrição, critério de conclusão, agente responsável
- Gera arquivo `.ocps/roadmap/feature-[id].yaml` com estado inicial
- Mapeia dependências entre tarefas explicitamente

---

## Agente 3 — TddAgent

**Arquivo:** `src/agents/tdd.agent.ts`
**Fase de implementação:** Fase 1

### Responsabilidade

Implementa funcionalidades seguindo ciclo Red → Green → Refactor de forma rigorosa.

### Input / Output

```typescript
type TddInput = {
  task: Task;
  existingCode?: string; // código relacionado já existente (via Serena)
  skills: Skill[];
};

type TddOutput = {
  testFile: CodeFile; // arquivo de teste (fase Red)
  implementationFile: CodeFile; // código de produção (fase Green)
  refactoredFiles: CodeFile[]; // arquivos após Refactor
  coverageReport: CoverageReport;
};
```

### Skills obrigatórias (por stack)

- `tdd-typescript` (global)
- `tdd-laravel-pest` (projetos Laravel)
- `coverage-analysis`
- `refactor-safe`

### Gate de saída

- Zero testes vermelhos
- Cobertura mínima: 80% linhas, 70% branches
- Nenhum `any` no código gerado

### Comportamento esperado

- Fase RED: escreve teste que falha pela razão correta (feature inexistente)
- Fase GREEN: implementa código MÍNIMO para passar — sem over-engineering
- Fase REFACTOR: melhora qualidade sem adicionar funcionalidade
- Bloqueia avanço se qualquer teste estiver vermelho

### Nomenclatura de testes obrigatória

```typescript
// deve_[verbo_ação]_quando_[condição]
it('deve_retornar_erro_quando_skill_nao_encontrada', ...)
it('deve_carregar_skill_quando_arquivo_yaml_valido', ...)
```

---

## Agente 4 — CodeReviewAgent

**Arquivo:** `src/agents/code-review.agent.ts`
**Fase de implementação:** Fase 2

### Responsabilidade

Revisão estruturada em 3 passes sequenciais antes de qualquer commit.

### Input / Output

```typescript
type CodeReviewInput = {
  changedFiles: CodeFile[];
  taskContext: Task;
};

type CodeReviewOutput = {
  pass1: StructuralReview; // SOLID, arquitetura, separação de responsabilidades
  pass2: QualityReview; // DRY, naming, complexidade ciclomática, dead code
  pass3: SecurityReview; // inputs, injeção, autenticação, XSS
  approved: boolean;
  blockers: ReviewItem[]; // itens que impedem aprovação
  suggestions: ReviewItem[]; // melhorias não-bloqueantes
};
```

### Skills obrigatórias

- `checklist-structural`
- `checklist-quality`
- `checklist-security`
- `laravel-conventions` (projetos Laravel)
- `typescript-conventions` (projetos TypeScript)

### Gate de saída

Zero `blockers`. Sugestões são opcionais mas registradas.

---

## Agente 5 — QaAgent

**Arquivo:** `src/agents/qa.agent.ts`
**Fase de implementação:** Fase 2

### Responsabilidade

Validação funcional completa: testes de integração, E2E e verificação de critérios de aceite.

### Input / Output

```typescript
type QaInput = {
  feature: Feature;
  implementedFiles: CodeFile[];
};

type QaOutput = {
  integrationTestResults: TestResult[];
  e2eTestResults: TestResult[];
  acceptanceCriteriaResults: AcceptanceCriteriaResult[];
  approved: boolean;
  evidence: Evidence[]; // screenshots, logs, métricas
};
```

### Skills obrigatórias

- `integration-testing`
- `e2e-patterns`
- `acceptance-validation`
- `regression-detection`
- `qa-report`

### Gate de saída

100% dos critérios de aceite validados com evidências. Zero regressões detectadas.

---

## Agente 6 — DeployAgent

**Arquivo:** `src/agents/deploy.agent.ts`
**Fase de implementação:** Fase 3

### Responsabilidade

Pipeline CI/CD via GitHub Actions. Ativado APENAS após gate QA aprovado.

### Input / Output

```typescript
type DeployInput = {
  feature: Feature;
  environment: 'staging' | 'production';
  qaApproval: QaOutput; // obrigatório — bloqueia sem isso
};

type DeployOutput = {
  deploymentId: string;
  smokeTestResults: TestResult[];
  releaseNotes: string;
  rollbackPlan: string;
};
```

### Skills obrigatórias

- `github-actions-typescript`
- `github-actions-laravel` (projetos Laravel)
- `env-management`
- `rollback-strategy`
- `release-notes`

### Gate de saída

Smoke tests passando em staging. Promoção para produção requer confirmação explícita.

---

## Agente 7 — LegacyAgent

**Arquivo:** `src/agents/legacy.agent.ts`
**Fase de implementação:** Fase 5

### Responsabilidade

Análise arqueológica de sistemas legados para modernização segura e documentada.

### Input / Output

```typescript
type LegacyInput = {
  moduleFiles: CodeFile[]; // arquivos do módulo legado a analisar
  originalDocs?: string; // documentação original se disponível
};

type LegacyOutput = {
  behaviorMap: BehaviorMap; // o que o código FAZ (não o que deveria fazer)
  divergences: Divergence[]; // gaps entre comportamento real e documentação
  drf: DRF; // Document of Reverse-Engineered Features
  migrationPlan: MigrationPlan;
};
```

### Skills obrigatórias

- `legacy-behavior-analysis`
- `code-archaeology`
- `requirements-extraction`
- `migration-strategy`
- `equivalence-testing`

### Gate de saída

DRF aprovado pelo desenvolvedor + testes de equivalência implementados.

### Regra de ouro

Nenhuma refatoração de código legado é executada sem DRF aprovado.
O objetivo é modernizar sem carregar bugs do passado.

---

## Hierarquia de Skills

Quando um agente procura por uma skill, a ordem de prioridade é:

```
1. .ocps/skills/overrides/  ← máxima prioridade (override do projeto)
2. .ocps/skills/custom/     ← skills customizadas do projeto
3. ~/.ocps/skills/global/   ← skills base instaladas com o pacote npm
4. Comportamento default     ← hardcoded no agente (último recurso)
```

---

## Protocolo de consulta de memória (todo agente executa antes de agir)

```
1. Basic Memory → "existe lição aprendida relevante para esta tarefa?"
2. Serena       → "existe código similar no projeto? (DRY check)"
3. Skill Engine → carregar skills relevantes para a tarefa
4. Se Laravel   → Laravel Boost (obrigatório)
5. Se lib externa → Context7 (obrigatório)
6. APENAS ENTÃO → gerar código
```

---

## Retroalimentação de Skills

Quando um erro é corrigido e validado:

```typescript
// O orquestrador propõe automaticamente:
{
  skill: "tdd-typescript",
  version: "1.2.0",  // bump minor automático
  newLesson: "v1.2: Mocks de módulos externos devem usar vi.mock() no topo do arquivo, antes de qualquer import"
}
// Desenvolvedor confirma → skill é atualizada e salva no Basic Memory
```
