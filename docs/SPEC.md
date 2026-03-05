# SPEC.md — Especificação Técnica Completa do OCPS

> Versão para leitura pelo Claude Code. Documento de referência canônico.
> Versão formatada para humanos: `docs/assets/OCPS_v2_Arquitetura_Completa.docx`

---

## 1. Visão Geral

O OCPS é um framework CLI instalável (`npm install -g ocps`) que orquestra agentes
semi-autônomos especializados para gerenciar o ciclo completo de desenvolvimento de software.

**Pilares:**
- Automação com controle total do desenvolvedor
- Skills retroalimentáveis: agentes aprendem com erros corrigidos
- Memória semântica persistente entre sessões e projetos
- TDD obrigatório: Red → Green → Refactor
- YAGNI + DRY em todo código gerado
- Multi-LLM resiliente: troca de modelo sem perda de contexto

---

## 2. Stack Técnica (decisão definitiva)

```
Linguagem:    TypeScript 5.x (strict mode)
Runtime:      Node.js 20+
Distribuição: npm global (npm install -g ocps)
Testes:       Vitest
CLI:          Commander.js + Ink/React
LLM:          @anthropic-ai/sdk
MCP:          @modelcontextprotocol/sdk
Agents:       Vercel AI SDK
Schemas:      Zod
Skills:       YAML via js-yaml
```

**Justificativa TypeScript (não PHP):**
- MCP foi criado pela Anthropic em TypeScript — todos os MCPs são nativos
- SDK oficial Anthropic é Node-first
- npm install -g em qualquer máquina com Node.js
- Tipagem forte essencial para contratos de agentes e skills

---

## 3. Modelo Global + Local

```bash
npm install -g ocps        # instala binário + skills base + MCP clients
cd meu-projeto
ocps init                  # cria .ocps/ no projeto com config local
ocps doctor               # verifica MCPs, LLM e dependências
ocps start                # inicia orquestrador carregando contexto
```

**Global (~/.ocps/):**    binário, agentes, skills base, conexão Basic Memory / Context7
**Local (.ocps/):**       config.yaml, skills custom, roadmap, memory local

---

## 4. Estrutura de Diretórios

```
ocps/                          # repositório do framework
├── src/
│   ├── core/
│   │   ├── orchestrator.ts    # pipeline principal, roteamento de agentes
│   │   ├── gate-engine.ts     # gates de validação entre fases
│   │   └── session.ts         # gerenciamento de sessão e contexto
│   ├── agents/
│   │   ├── brainstorm.agent.ts
│   │   ├── planning.agent.ts
│   │   ├── tdd.agent.ts
│   │   ├── code-review.agent.ts
│   │   ├── qa.agent.ts
│   │   ├── deploy.agent.ts
│   │   └── legacy.agent.ts
│   ├── skills/
│   │   ├── skill-engine.ts    # loader, validator, versioner
│   │   ├── skill-loader.ts    # lê YAML, resolve hierarquia
│   │   ├── skill-validator.ts # Zod schemas para validação
│   │   └── skill-feedback.ts  # retroalimentação e bump de versão
│   ├── mcp/
│   │   ├── mcp-bridge.ts      # gerencia conexões com todos os MCPs
│   │   ├── basic-memory.ts    # client Basic Memory
│   │   ├── context7.ts        # client Context7
│   │   ├── serena.ts          # client Serena (local por projeto)
│   │   └── laravel-boost.ts   # client Laravel Boost (condicional)
│   ├── cli/
│   │   ├── index.ts           # entry point, Commander.js
│   │   ├── commands/
│   │   │   ├── init.ts        # ocps init
│   │   │   ├── start.ts       # ocps start
│   │   │   ├── doctor.ts      # ocps doctor
│   │   │   └── version.ts     # ocps version
│   │   └── ui/
│   │       ├── spinner.tsx    # componente Ink spinner
│   │       ├── gate-prompt.tsx # confirmação de gate
│   │       └── status.tsx     # status da sessão
│   └── types/
│       ├── agent.ts           # interface Agent<TInput, TOutput>
│       ├── skill.ts           # interface Skill, SkillLesson
│       ├── roadmap.ts         # interface Roadmap, Feature, Task, Sprint
│       ├── gate.ts            # interface Gate, GateStatus, GateResult
│       └── config.ts          # interface OcpsConfig, ProjectConfig
├── skills/
│   └── global/
│       ├── tdd-typescript.yaml
│       ├── tdd-laravel-pest.yaml
│       ├── code-review-typescript.yaml
│       ├── laravel-service-pattern.yaml
│       └── solid-principles.yaml
├── tests/
│   ├── core/
│   ├── agents/
│   ├── skills/
│   └── mcp/
├── docs/
│   ├── SPEC.md               # este arquivo
│   ├── decisions/
│   │   ├── ADR-001-typescript-stack.md
│   │   ├── ADR-002-global-local-model.md
│   │   └── backlog.md        # ideias para fases futuras
│   └── assets/               # Word, PDFs para humanos
├── .ocps/                    # o OCPS gerencia sua própria evolução
│   ├── config.yaml
│   └── roadmap/
│       └── fase-0.yaml
├── CLAUDE.md                 # lido pelo Claude Code a cada sessão
├── AGENTS.md                 # spec detalhada dos agentes
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 5. Contratos TypeScript (Fase 0 — prioridade máxima)

### 5.1 Skill

```typescript
// src/types/skill.ts
export interface SkillLesson {
  version: string;          // "v1.1"
  lesson: string;           // descrição da lição aprendida
  addedAt: string;          // ISO date
  projectSource?: string;   // projeto onde a lição foi aprendida
}

export interface Skill {
  name: string;             // kebab-case, único
  version: string;          // semver: "1.0.0"
  agent: string;            // agente proprietário
  stack: string[];          // ["typescript", "node"] ou ["php", "laravel"]
  description: string;      // quando e como usar esta skill
  patterns: string[];       // padrões corretos com exemplos
  antiPatterns: string[];   // erros a evitar com justificativa
  lessonsLearned: SkillLesson[];
  references: string[];     // URLs para documentação oficial
  updatedAt: string;        // ISO date
}
```

### 5.2 Agent

```typescript
// src/types/agent.ts
export interface AgentContext {
  projectRoot: string;
  config: OcpsConfig;
  roadmap: Roadmap;
  skills: Skill[];
  sessionId: string;
  mcpConnections: McpConnections;
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

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
  readonly scope: string[];
  execute(input: TInput, ctx: AgentContext): Promise<AgentResult<TOutput>>;
  loadSkills(ctx: AgentContext): Promise<Skill[]>;
  validate(output: TOutput): ValidationResult;
  onGateFail(reason: string, ctx: AgentContext): Promise<void>;
}
```

### 5.3 Roadmap

```typescript
// src/types/roadmap.ts
export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'blocked';

export interface Task {
  id: string;
  title: string;
  description: string;
  completionCriteria: string;
  assignedAgent: string;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
  tokensUsed?: number;
}

export interface Sprint {
  id: string;
  tasks: Task[];
  capacityHours: number;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  sprint: Sprint;
  status: TaskStatus;
}

export interface Roadmap {
  featureId: string;
  feature: Feature;
  decisions: ArchitectureDecision[];
  blockers: Blocker[];
  skillsUsed: string[];
  llmCheckpoint: LlmCheckpoint;
  gates: Record<string, GateResult>;
  createdAt: string;
  updatedAt: string;
}
```

### 5.4 Gate

```typescript
// src/types/gate.ts
export type GateStatus = 'pending' | 'approved' | 'blocked' | 'bypassed';

export interface GateResult {
  status: GateStatus;
  checkedAt?: string;
  approvedBy?: 'developer' | 'auto';
  evidence?: string[];
  blockers?: string[];
}

export interface Gate {
  name: string;
  description: string;
  check(context: AgentContext): Promise<GateResult>;
  onBlock(result: GateResult, context: AgentContext): Promise<void>;
}
```

### 5.5 Config

```typescript
// src/types/config.ts
export type StackType = 'laravel' | 'typescript' | 'nodejs' | 'python' | 'unknown';
export type LlmModel = 'claude-opus-4-5' | 'claude-sonnet-4-5' | 'claude-haiku-4-5' | string;

export interface McpConfig {
  basicMemory: { enabled: boolean; url?: string };
  context7: { enabled: boolean; url?: string };
  serena: { enabled: boolean; projectPath?: string };
  laravelBoost: { enabled: boolean; laravelVersion?: string };
}

export interface OcpsConfig {
  version: string;
  projectName: string;
  stack: StackType;
  primaryModel: LlmModel;
  fallbackModel?: LlmModel;
  mcp: McpConfig;
  coverageThreshold: { lines: number; branches: number };
  createdAt: string;
}
```

---

## 6. Skill Engine (Fase 0 — implementar)

```
Responsabilidade: carregar, validar e versionar skills YAML

Funções principais:
- loadSkill(name, projectRoot): Promise<Result<Skill>>
- loadSkillsForAgent(agentName, projectRoot): Promise<Skill[]>
- validateSkill(raw): Result<Skill>        // usa Zod
- updateSkillLesson(skill, lesson): Promise<Result<Skill>>
- resolveSkillPath(name, projectRoot): string  // hierarquia de prioridade

Hierarquia de busca:
  1. {projectRoot}/.ocps/skills/overrides/{name}.yaml
  2. {projectRoot}/.ocps/skills/custom/{name}.yaml
  3. ~/.ocps/skills/global/{name}.yaml
  4. {packageDir}/skills/global/{name}.yaml
```

---

## 7. CLI Commands (Fase 0 — implementar)

### ocps init
```
- Detecta stack do projeto (lê package.json, composer.json, etc.)
- Cria .ocps/config.yaml com valores padrão
- Adiciona .ocps/.env ao .gitignore
- Exibe próximos passos
```

### ocps doctor
```
- Verifica Node.js >= 20
- Verifica conexão com LLM (ping simples)
- Verifica MCPs configurados e acessíveis
- Verifica skills globais presentes
- Exibe relatório de saúde com ✓ / ✗ / ⚠
```

### ocps start
```
- Carrega config.yaml
- Carrega roadmap ativo (se existir)
- Apresenta resumo de estado ao desenvolvedor
- Aguarda confirmação para continuar
- Inicia pipeline de agentes
```

### ocps version
```
- Exibe versão do ocps
- Exibe versões dos MCPs conectados
- Exibe modelo LLM configurado
```

---

## 8. Ciclo de Vida de uma Feature

```
Fase 1: Ideação      → BrainstormAgent  → gate: dev aprova BacklogItem
Fase 2: Refinamento  → PlanningAgent    → gate: dev aprova escopo
Fase 3: Dev (TDD)    → TddAgent         → gate: zero testes vermelhos
Fase 4: Revisão      → CodeReviewAgent  → gate: checklist 100% verde
Fase 5: QA           → QaAgent          → gate: 100% critérios aceite
Fase 6: Deploy       → DeployAgent      → gate: smoke tests em staging
```

---

## 9. Plano de Fases

| Fase | Nome | Critério de Conclusão |
|------|------|-----------------------|
| 0 | Foundation | `ocps init` + `ocps doctor` funcionam |
| 1 | Core Agents | Feature completa via TDD sem intervenção manual |
| 2 | Quality Gates | Gate review e QA bloqueando automaticamente |
| 3 | Deployment | Deploy automático após gate QA |
| 4 | Memory Full | Retomada de sessão < 60s após troca de LLM |
| 5 | Legacy Mode | Análise de módulo legado gerando DRF aprovável |
| 6 | Multi-LLM | Troca automática por rate limit sem perda de contexto |
| 7 | Multi-Stack | Node.js e Python suportados end-to-end |

---

## 10. MCPs — Protocolo de Consulta

Antes de qualquer geração de código, todo agente executa:

```
1. Basic Memory → lições aprendidas relevantes
2. Serena       → código similar no projeto (DRY check)
3. Skill Engine → skills do agente para a tarefa
4. Laravel Boost → se projeto Laravel (obrigatório)
5. Context7     → se usa biblioteca externa
6. → gerar código
```
