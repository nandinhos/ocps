# OCPS — Orquestrador Cognitivo de Projetos de Software

## Documentação Pública Completa v1.0

---

## 1. Introdução e Visão Geral

### 1.1 O Que é o OCPS?

O **OCPS (Orquestrador Cognitivo de Projetos de Software)** é um framework CLI (Command Line Interface) de código aberto desenvolvido em TypeScript que automatiza o ciclo completo de desenvolvimento de software utilizando agentes de Inteligência Artificial especializados. O projeto foi concebido para funcionar como um "copiloto inteligente" que coordena múltiplos agentes autônomos, transformando uma ideia abstrata em código de produção validado, testado e pronto para deploy.

O diferencial fundamental do OCPS reside na sua abordagem estruturada: ao invés de simplesmente gerar código a partir de prompts, o framework implementa um pipeline completo com gates de qualidade em cada etapa, garantindo que o desenvolvedor mantenha controle humano sobre decisões críticas enquanto se beneficia da automação inteligente em tarefas repetitivas e boilerplate.

A arquitetura do sistema foi desenhada para ser extensível e adaptável a diferentes stacks tecnológicas, suportando nativamente TypeScript, Node.js, Python, Laravel, Go e Rust. Além disso, o OCPS implementa um sistema de habilidades (skills) que permite personalizar o comportamento de cada agente conforme as necessidades específicas do projeto ou da equipe.

### 1.2 Problema que o OCPS Resolve

O desenvolvimento de software moderno apresenta diversos desafios que o OCPS endereça diretamente:

**Inconsistência na qualidade do código**: Sem processos estruturados, equipes frequentemente produzem código sem testes adequados, documentação deficiente ou padrões inconsistentes. O OCPS obriga a adoção de TDD (Test-Driven Development) como parte do fluxo natural de desenvolvimento.

**Perda de contexto entre sessões**: Desenvolvedores frequentemente perdem o contexto do que estavam fazendo ao encerrar uma sessão de trabalho. O OCPS implementa persistência de sessão completa, permitindo retomar o trabalho exatamente de onde parou.

**Dificuldade em manter padrões**: Times têm dificuldade em aplicar uniformemente padrões de código, convenções de nomenclatura e práticas de revisão. O OCPS automatiza a revisão de código em múltiplas dimensões (estrutural, qualidade, segurança).

**Barreiras para onboarding**: Novos membros de equipe levam tempo para entender processos e padrões do projeto. Com o OCPS, todos seguem o mesmo pipeline estruturado, independentemente do nível de experiência.

**Problemas com código legado**: Modernizar sistemas legados é arriscado porque frequentemente não existe documentação precisa do comportamento atual. O OCPS inclui um agente especializado em análise arqueológica que documenta o comportamento real antes de propor modificações.

### 1.3 Filosofia de Design

O OCPS foi desenvolvido sob alguns princípios fundamentais que guiam todas as decisões arquiteturais:

**Controle humano nos pontos críticos**: Embora os agentes automatizem a maior parte do trabalho, gates de aprovação humana existem em cada transição de fase. O desenvolvedor sempre tem a palavra final sobre se o output de cada etapa é satisfatório.

**Transparência e auditabilidade**: Cada decisão, interação e output dos agentes é persistido em disco. Isso permite auditing completo do que foi feito, por que foi feito, e quando foi feito.

**Aprendizado contínuo**: O sistema de habilidades (skills) permite que lições aprendidas sejam capturadas e reutilizadas. Quando um erro é corrigido e validado, o sistema propõe automaticamente a atualização da skill relevante.

**Separação de responsabilidades**: Cada agente tem uma responsabilidade única e bem definida. Isso facilita manutenção, testing e extensão do sistema.

**Minimalismo na implementação**: O agente TDD, por exemplo, é instruído a implementar código mínimo suficiente para passar nos testes — sem over-engineering, sem funcionalidades extras não solicitadas.

---

## 2. Arquitetura do Sistema

### 2.1 Visão Arquitetural de Alto Nível

O OCPS segue uma arquitetura orientada a agentes com pipeline sequencial e gates de qualidade. O sistema é composto por sete camadas principais que trabalham em conjunto para transformar entrada do usuário em output validado:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CAMADA DE INTERFACE CLI                           │
│                         (Commander.js + Ink/React)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAMADA DE ORQUESTRAÇÃO                             │
│                            (Orchestrator)                                   │
│                  Coordena sequência de agentes e gates                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CAMADA DE AGENTES                                 │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌────┐ ┌──────┐ ┌─────┐│
│  │Brainstorm│ │ Planning │ │  TDD   │ │CodeReview│ │ QA │ │Deploy│ │Legacy││
│  └──────────┘ └──────────┘ └────────┘ └──────────┘ └────┘ └──────┘ └─────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CAMADA DE HABILIDADES (Skills)                        │
│                    (Skill Engine + Skill Loader)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAMADA DE MEMÓRIA                                  │
│     (Session Manager + Basic Memory + Roadmap Persistence)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CAMADA DE INTEGRAÇÃO MCP                              │
│           (MCP Bridge + Basic Memory + Context7 + Serena)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CAMADA DE COMUNICAÇÃO LLM                            │
│              (LLM Client + Multi-LLM Manager + Rate Limiting)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Pipeline de Execução

O pipeline do OCPS é composto por fases sequenciais, onde cada fase representa um agente especializado responsável por uma entrega específica. A transição entre fases é controlada por gates de qualidade que exigem aprovação humana:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PIPELINE OCPS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │ 💡 Idea │───►│Brainstorm│───►│ Planning│───►│  TDD    │───►│  Code   │   │
│  │         │    │         │    │         │    │         │    │ Review  │   │
│  └─────────┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘   │
│                      │             │             │             │          │
│                      ▼             ▼             ▼             ▼          │
│                   Gate 💬      Gate 💬      Gate 💬       Gate 💬        │
│                   (Aprovar    (Aprovar     (Aprovar      (Aprovar       │
│                   Backlog)    Escopo)      Código)       Review)         │
│                                                                      │      │
│                                                                      ▼      │
│  ┌─────────┐    ┌─────────┐                                      ┌────────┐ │
│  │ Deploy  │◄───│   QA    │◄─────────────────────────────────────│ Complete│ │
│  │         │    │         │                                      │         │ │
│  └────┬────┘    └────┬────┘                                      └────────┘ │
│       │              │                                                  │
│       ▼              ▼                                              ┌────────┐ │
│    Gate 💬       Gate 💬                                           │ Pipeline│ │
│    (Smoke)     (Critérios)                                         │Finished │ │
│                                                                  └─────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

Cada fase produz artefatos específicos que alimentam a próxima fase:

**Fase 1 — Brainstorm**: Transforma ideia bruta em BacklogItem estruturado com critérios de aceite. Output: `BacklogItem` com título, descrição, critérios de aceite, prioridade e riscos identificados.

**Fase 2 — Planning**: Decompõe BacklogItem em Feature com tarefas granulares. Output: `Feature` com `Task[]`, `Sprint`, dependências entre tarefas mapeadas.

**Fase 3 — TDD**: Implementa cada tarefa seguindo ciclo Red → Green → Refactor. Output: Arquivos de teste (Red), arquivos de implementação (Green), arquivos refatorados (Refactor), relatório de cobertura.

**Fase 4 — Code Review**: Revisa código em três passes sequenciais. Output: Resultado de review estrutural, de qualidade e de segurança com blockers e sugestões.

**Fase 5 — QA**: Valida critérios de aceite e verifica regressões. Output: Resultados de testes de integração, E2E, validação de critérios de aceite com evidências.

**Fase 6 — Deploy**: Executa pipeline CI/CD e smoke tests. Output: Deployment ID, resultados de smoke tests, release notes, plano de rollback.

### 2.3 Componentes Centrais

#### 2.3.1 Orchestrator

O `Orchestrator` é o componente central responsável por coordenar a execução sequencial dos agentes e gerenciar os gates de qualidade. Ele implementa a lógica de pipeline propriamente dita, determinando qual agente executar em cada fase, quando persistir dados, quando solicitar aprovação humana e como tratar erros.

Localização: `src/core/orchestrator.ts`

O Orchestrator mantém estado através de uma estrutura `PipelineContext` que contém:

- `currentPhase`: Indica a fase atual do pipeline (brainstorm, planning, tdd, code-review, qa, complete)
- `backlogItem`: Referência ao item de backlog gerado na fase de brainstorm
- `feature`: Feature estruturada gerada na fase de planning
- `tasks`: Array de tarefas a serem executadas
- `tddOutput`: Output do agente TDD com arquivos gerados

A persistência de arquivos ocorre apenas após aprovação do gate correspondente, com mecanismo de retry (3 tentativas) para lidar com condições de corrida em sistemas de arquivos compartilhados.

#### 2.3.2 Session Manager

O Session Manager é responsável por toda a gestão de estado entre sessões de trabalho. Ele implementa persistência em formato JSON no diretório `.ocps/sessions/`, permitindo que o desenvolvedor encerre o trabalho e retome exatamente de onde parou.

Localização: `src/core/session-manager.ts`

Cada sessão persistida contém:

- `sessionId`: Identificador único da sessão
- `createdAt`: Timestamp de criação
- `lastActiveAt`: Timestamp da última atividade
- `currentPhase`: Fase atual do pipeline
- `config`: Configuração do projeto
- `roadmap`: Estado atual do roadmap
- `llmCheckpoint`: Histórico de mensagens trocadas com o LLM, modelo utilizado e tokens acumulados
- `skills`: Habilidades carregadas na sessão

O Session Manager mantém os últimos 100 mensajes do LLM por sessão para permitir contexto contextual, mas implementa pruning automático para evitar consumo excessivo de memória.

#### 2.3.3 Gate Engine

O Gate Engine é responsável por gerenciar as aprovações humanas em cada transição de fase. Ele abstrai a lógica de confirmação, permitindo que diferentes interfaces (CLI interativa, MCP, testes automatizados) implementem seus próprios mecanismos de aprovação.

Localização: `src/core/gate-engine.ts`

O Gate Engine suporta dois modos de operação:

- **Modo interativo**: Solicita confirmação direta do usuário via CLI
- **Modo automatizado**: Pode ser configurado para auto-aprovar em cenários de teste

Cada gate registra o resultado (aprovado/reprovado), o usuário que aprovou e o timestamp em `roadmap.gates`, garantindo auditabilidade completa do processo.

#### 2.3.4 Stack Detector

O Stack Detector é responsável por identificar automaticamente a stack tecnológica do projeto. Ele analisa arquivos de configuração, estrutura de diretórios e conteúdo de arquivos para determinar:

- Tipo de projeto (Laravel, TypeScript, Node.js, Python, Go, Rust)
- Natureza do projeto (greenfield — novo, brownfield — existente, legacy — legado)
- Versão de frameworks e linguagens (ex: versão do PHP para projetos Laravel)

Localização: `src/core/stack-detector.ts`

A detecção é usada para:

- Selecionar as skills apropriadas para cada agente
- Configurar automaticamente o modelo LLM mais adequado
- Determinar quais MCPs são relevantes (ex: Laravel Boost apenas para projetos Laravel)
- Sugerir configurações iniciais otimizadas

#### 2.3.5 Multi-LLM Manager

O Multi-LLM Manager implementa fallback automático entre provedores de LLM. Atualmente suporta Anthropic (Claude) e OpenAI, mas a arquitetura permite adição de novos provedores facilmente.

Localização: `src/core/multi-llm-manager.ts`

Funcionalidades implementadas:

- **Detecção de rate limiting**: Monitora respostas 429 (Too Many Requests) e automaticamente tenta provedor alternativo
- **Fallback automático**: Se um modelo falha, tenta o modelo fallback configurado
- **Gerenciamento de custos**: Rastreia tokens utilizados por modelo para controle de custos
- **Seleção de modelo por tarefa**: Agentes podem solicitar modelos específicos conforme necessidade (ex: Opus para tarefas complexas de raciocínio, Haiku para tarefas simples)

#### 2.3.6 LLM Client

O LLM Client é a abstração de mais baixo nível para comunicação com APIs de LLM. Implementa retry com backoff exponencial, parsing de respostas e formatação de mensagens.

Localização: `src/core/llm-client.ts`

---

## 3. Sistema de Agentes

### 3.1 Contrato Base de Agente

Todo agente no OCPS implementa uma interface genérica `Agent<TInput, TOutput>` que garante consistência comportamental e estrutural. Este contrato é fundamental para a extensibilidade do sistema: novos agentes podem ser adicionados sem modificar o Orchestrator.

```typescript
interface Agent<TInput, TOutput> {
  readonly name: string;
  readonly version: string;
  readonly scope: string[]; // arquivos/diretórios que este agente pode modificar

  execute(input: TInput, ctx: AgentContext): Promise<AgentResult<TOutput>>;
  loadSkills(ctx: AgentContext): Promise<Skill[]>;
  validate(output: TOutput): ValidationResult;
  onGateFail(reason: string, ctx: AgentContext): Promise<void>;
}
```

Cada propriedade e método tem propósito específico:

- `name`: Identificador textual do agente, usado em logs e debugging
- `version`: Versão semântica do agente, importante para skill matching
- `scope`: Array de caminhos que este agente pode modificar, usado para validação de segurança
- `execute`: Método principal que processa input e retorna output
- `loadSkills`: Carrega habilidades específicas do agente do sistema de skills
- `validate`: Valida o output do agente antes de prosseguir
- `onGateFail`: Callback executado quando o gate corresponding é reprovado

### 3.2 BrainstormAgent

**Responsabilidade**: Capturar ideias brutas em linguagem natural e transformar em itens de backlog estruturados com critérios de aceite bem definidos.

**Localização**: `src/agents/brainstorm.agent.ts`

**Input esperado**:

```typescript
type BrainstormInput = {
  rawIdea: string; // Ideia em linguagem natural
  projectContext: string; // Contexto técnico do projeto
};
```

**Output gerado**:

```typescript
type BrainstormOutput = {
  backlogItem: BacklogItem; // Item estruturado
  clarifications: string[]; // Perguntas respondidas durante elicitação
  risks: string[]; // Riscos identificados
};
```

**Fluxo interno**:

1. **Elicitação de requisitos**: O agente conduz questionário estruturado com no mínimo 5 perguntas para alinhar expectativas. Exemplos incluem: quem são os usuários finais?, quais são as restrições de performance?, quais integrações são necessárias?, quais são os casos de borda?, quais são os critérios de sucesso?

2. **Detecção de ambiguidades**: Antes de gerar o backlog item, o agente identifica ambiguidades na ideia original e solicita esclarecimento. Se a ideia for "criar sistema de login", o agente pode perguntar: "Você prefere autenticação por email/senha, OAuth, ou ambos?", "É necessário recuperação de senha?", "Há requisitos de MFA?"

3. **Formatação do backlog item**: Apenas após esclarecimento adequado, o agente gera o `BacklogItem` com:
   - Título descritivo
   - Descrição detalhada
   - Array de critérios de aceite (cada um testável/verificável)
   - Prioridade (low, medium, high, critical)
   - Estimativa de horas (se possível)

4. **Identificação de riscos**: O agente lista riscos potenciais que devem ser considerados nas fases subsequentes.

**Skills utilizadas**:

- `elicitacao-requisitos`: Técnicas de coleta de requisitos
- `ambiguity-detection`: Identificação de requisitos ambíguos
- `backlog-formatting`: Formatação padrão de backlog items
- `acceptance-criteria-draft`: Elaboração de critérios de aceite

**Gate de saída**: O desenvolvedor deve aprovar explicitamente o BacklogItem antes de prosseguir. Se reprovado, o agente conduz nova elicitação focada nos pontos de insatisfação.

### 3.3 PlanningAgent

**Responsabilidade**: Decompor BacklogItem em feature estruturada com tarefas granulares, sprint plan e mapeamento de dependências.

**Localização**: `src/agents/planning.agent.ts`

**Input esperado**:

```typescript
type PlanningInput = {
  backlogItem: BacklogItem;
  sprintCapacity?: number; // horas disponíveis, default: 40h
};
```

**Output gerado**:

```typescript
type PlanningOutput = {
  feature: Feature;
  tasks: Task[];
  sprintPlan: Sprint;
  roadmapFile: string; // path do arquivo YAML gerado
};
```

**Fluxo interno**:

1. **Análise do backlog item**: O agente lê o backlog item aprovado, seus critérios de aceite e riscos identificados.

2. **Decomposição em tarefas**: Cada critério de aceite (ou grupo de critérios relacionados) torna-se uma ou mais tarefas. O agente segue o princípio de tasks pequenas: cada tarefa deve ser completada em 1-2 horas.

3. **Mapeamento de dependências**: O agente identifica dependências entre tarefas. Se a Tarefa B depende da Tarefa A, isso fica explícito no output. O Orchestrator usa essa informação para ordenar execuções.

4. **Estimativa e alocação**: Cada tarefa recebe estimativa em horas. O agente agrupa tarefas em sprints baseado na capacidade informada (default 40h/sprint).

5. **Geração de roadmap**: O agente persiste o roadmap em `.ocps/roadmap/feature-[id].yaml` com estado inicial "pending".

6. **Atribuição de agentes**: Cada tarefa recebe um agente responsável. Tasks de implementação recebem TddAgent, tarefas de documentação podem receber outro agente, etc.

**Skills utilizadas**:

- `feature-decomposition`: Técnicas de decomposição de features
- `sprint-planning`: Planejamento de sprints
- `dependency-mapping`: Mapeamento de dependências
- `roadmap-generation`: Geração de roadmap em YAML
- `task-sizing`: Estimativa de tamanho de tarefas

**Gate de saída**: O desenvolvedor aprova o escopo exato da feature e das tarefas. Após aprovação, o Orchestrator bloqueia qualquer implementação de funcionalidades fora do escopo aprovado.

### 3.4 TddAgent

**Responsabilidade**: Implementar funcionalidades seguindo rigorosamente o ciclo Red → Green → Refactor do TDD.

**Localização**: `src/agents/tdd.agent.ts`

**Input esperado**:

```typescript
type TddInput = {
  task: Task;
  existingCode?: string; // código relacionado já existente (via Serena)
  skills: Skill[];
};
```

**Output gerado**:

```typescript
type TddOutput = {
  testFile: string; // Caminho do arquivo de teste
  testContent: string; // Conteúdo do teste (fase Red)
  implementationFile: string; // Caminho do arquivo de implementação
  implementationContent: string; // Código de produção (fase Green)
  refactoredFiles: string[]; // Arquivos após Refactor
  coverageReport: CoverageReport;
};
```

**Fluxo interno**:

O TddAgent implementa o ciclo TDD de forma rigorosa, com três fases distintas:

**Fase RED (Teste que falha)**:

1. O agente escreve um teste que descreve o comportamento desejado
2. O teste falha porque a funcionalidade não existe ainda
3. A falha deve ser pela "razão correta" — não por erro de syntax ou setup incorreto do teste

O agente segue nomenclatura de testes obrigatória em português brasileiro:

```typescript
it('deve_retornar_erro_quando_skill_nao_encontrada', () => { ... });
it('deve_carregar_skill_quando_arquivo_yaml_valido', () => { ... });
```

**Fase GREEN (Código mínimo)**:

1. O agente implementa código mínimo suficiente para fazer o teste passar
2. Não há preocupação com elegância ou optimização nesta fase
3. O código pode ter duplicação proposital — será tratado no Refactor

**Fase REFACTOR (Melhoria)**:

1. O agente melhora a qualidade do código sem mudar comportamento
2. Remove duplicações, renomeia variáveis para nomes mais claros
3. Aplica princípios SOLID quando aplicável
4. Não adiciona funcionalidade nova

**Skills utilizadas (por stack)**:

- `tdd-typescript`: Para projetos TypeScript/Node.js
- `tdd-laravel-pest`: Para projetos Laravel usando Pest
- `coverage-analysis`: Análise de cobertura de código
- `refactor-safe`: Técnicas de refatoração segura

**Gate de saída**:

- Zero testes vermelhos (todos passando)
- Cobertura mínima: 80% de linhas, 70% de branches
- Zero uso de `any` no código gerado (type safety)

**Validações obrigatórias**:

O agente executa validações internas antes de reportar output:

1. Verifica que testes estão passando
2. Gera relatório de cobertura
3. Valida que não há `any` no código (usando ESLint ou similar)
4. Valida que nomes de testes seguem convenção

### 3.5 CodeReviewAgent

**Responsabilidade**: Revisar código em três passes sequenciais antes de qualquer commit.

**Localização**: `src/agents/code-review.agent.ts`

**Input esperado**:

```typescript
type CodeReviewInput = {
  changedFiles: CodeFile[];
  taskContext: Task;
};
```

**Output gerado**:

```typescript
type CodeReviewOutput = {
  pass1: StructuralReview; // SOLID, arquitetura, sep. responsabilidades
  pass2: QualityReview; // DRY, naming, complexidade, dead code
  pass3: SecurityReview; // inputs, injeção, autenticação, XSS
  approved: boolean;
  blockers: ReviewItem[]; // Itens que impedem aprovação
  suggestions: ReviewItem[]; // Melhorias não-bloqueantes
};
```

**Fluxo interno**:

O CodeReviewAgent executa três passes de review, cada um focado em um aspecto específico:

**Pass 1 — Review Estrutural**:

- Verifica princípios SOLID
- Avalia separação de responsabilidades
- Verifica se classes/módulos têm tamanho adequado
- Analisa coesão e acoplamento
- Valida aplicação de padrões de projeto quando apropriado

**Pass 2 — Review de Qualidade**:

- Verifica principio DRY (Don't Repeat Yourself)
- Avalia qualidade de nomenclatura
- Mede complexidade ciclomática
- Identifica código morto (dead code)
- Verifica formatação e estilo

**Pass 3 — Review de Segurança**:

- Valida sanitização de inputs
- Verifica proteção contra injeção (SQL, XSS, command injection)
- Avalia implementação de autenticação e autorização
- Identifica exposição de dados sensíveis
- Verifica práticas de criptografia

**Skills utilizadas**:

- `checklist-structural`: Checklist de review estrutural
- `checklist-quality`: Checklist de review de qualidade
- `checklist-security`: Checklist de review de segurança
- `laravel-conventions`: Convenções Laravel (se aplicável)
- `typescript-conventions`: Convenções TypeScript (se aplicável)

**Gate de saída**:

- Zero blockers — qualquer item bloqueante impede progressão
- Sugestões são registradas mas não bloqueiam

### 3.6 QaAgent

**Responsabilidade**: Validação funcional completa com testes de integração, E2E e verificação de critérios de aceite.

**Localização**: `src/agents/qa.agent.ts`

**Input esperado**:

```typescript
type QaInput = {
  feature: Feature;
  implementedFiles: CodeFile[];
};
```

**Output gerado**:

```typescript
type QaOutput = {
  integrationTestResults: TestResult[];
  e2eTestResults: TestResult[];
  acceptanceCriteriaResults: AcceptanceCriteriaResult[];
  approved: boolean;
  evidence: Evidence[]; // screenshots, logs, métricas
};
```

**Fluxo interno**:

O QaAgent foca em validação funcional, diferentemente do CodeReviewAgent que foca em qualidade de código:

1. **Execução de testes de integração**: Roda testes que verificam interação entre módulos
2. **Execução de testes E2E**: Se aplicável, executa testes end-to-end completos
3. **Validação de critérios de aceite**: Para cada critério definido no BacklogItem, o agente verifica se foi atendido
4. **Detecção de regressões**: Compara comportamento atual com baseline (se disponível)
5. **Coleta de evidências**: Captura screenshots, logs e métricas que comprovam a funcionalidade

**Skills utilizadas**:

- `integration-testing`: Testes de integração
- `e2e-patterns`: Padrões de testes E2E
- `acceptance-validation`: Validação de critérios de aceite
- `regression-detection`: Detecção de regressões
- `qa-report`: Geração de relatórios QA

**Gate de saída**:

- 100% dos critérios de aceite validados
- Zero regressões detectadas
- Evidências coletadas para cada validação

### 3.7 DeployAgent

**Responsabilidade**: Executar pipeline CI/CD via GitHub Actions com smoke tests.

**Localização**: `src/agents/deploy.agent.ts`

**Input esperado**:

```typescript
type DeployInput = {
  feature: Feature;
  environment: 'staging' | 'production';
  qaApproval: QaOutput; // obrigatório — bloqueia sem isso
};
```

**Output gerado**:

```typescript
type DeployOutput = {
  deploymentId: string;
  smokeTestResults: TestResult[];
  releaseNotes: string;
  rollbackPlan: string;
};
```

**Fluxo interno**:

O DeployAgent só pode ser ativado após gate QA aprovado. Isso garante que apenas código validado chega a ambientes de deploy:

1. **Geração de workflow GitHub Actions**: Cria arquivo YAML de workflow com stages: build, test, deploy
2. **Execução em staging**: Deploy inicial em staging
3. **Smoke tests**: Executa testes mínimos que verificam funcionalidade crítica
4. **Promoção para produção**: Apenas após smoke tests passando, pergunta confirmação para produção
5. **Geração de release notes**: Cria changelog automático baseado em commits
6. **Plano de rollback**: Documenta steps para reverter se necessário

**Skills utilizadas**:

- `github-actions-typescript`: Workflows para TypeScript
- `github-actions-laravel`: Workflows para Laravel
- `env-management`: Gestão de variáveis de ambiente
- `rollback-strategy`: Estratégias de rollback
- `release-notes`: Geração de changelogs

**Gate de saída**:

- Smoke tests passando em staging
- Promoção para produção requer confirmação explícita

### 3.8 LegacyAgent

**Responsabilidade**: Análise arqueológica de sistemas legados para modernização segura.

**Localização**: `src/agents/legacy.agent.ts`

Este agente é fundamental para projetos de modernização, onde frequentemente não existe documentação precisa do comportamento atual do sistema.

**Input esperado**:

```typescript
type LegacyInput = {
  moduleFiles: CodeFile[]; // Arquivos do módulo legado
  originalDocs?: string; // Documentação original (se disponível)
};
```

**Output gerado**:

```typescript
type LegacyOutput = {
  behaviorMap: BehaviorMap; // O que o código FAZ
  divergences: Divergence[]; // Gaps entre real e documentação
  drf: DRF; // Document of Reverse-Engineered Features
  migrationPlan: MigrationPlan;
};
```

**Fluxo interno**:

1. **Análise comportamental**: O agente estuda o código e documenta o comportamento real, não o que deveria fazer
2. **Extração de requisitos**: Identifica requisitos implícitos no código
3. **Comparação com documentação**: Se existir documentação, identifica divergências
4. **Geração de DRF**: Cria documento formal de features invertidas (equivalente a especificação mas gerado do código)
5. **Planejamento de migração**: Proõe plano de migração gradual

**Regra de ouro**: Nenhuma refatoração de código legado é executada sem DRF aprovado. O objetivo é modernizar sem carregar bugs do passado.

**Skills utilizadas**:

- `legacy-behavior-analysis`: Análise comportamental
- `code-archaeology`: Arqueologia de código
- `requirements-extraction`: Extração de requisitos
- `migration-strategy`: Estratégias de migração
- `equivalence-testing`: Testes de equivalência

**Gate de saída**:

- DRF aprovado pelo desenvolvedor
- Testes de equivalência implementados

---

## 4. Sistema de Habilidades (Skills)

### 4.1 Conceito de Skills

Skills são unidades de conhecimento que personalizam o comportamento dos agentes. Cada skill contém instruções específicas, templates, padrões e lições aprendidas que o agente utiliza ao executar suas tarefas.

Uma skill é essencialmente um documento YAML que descreve:

- Como executar determinada tarefa
- Templates de código a usar
- Convenções a seguir
- Armadilhas comuns a evitar
- Lições aprendidas de erros anteriores

### 4.2 Hierarquia de Skills

O OCPS implementa uma hierarquia de quatro níveis para resolução de skills, permitindo flexibilidade entre padronização global e customização por projeto:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HIERARQUIA DE RESOLUÇÃO                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1º .ocps/skills/overrides/                                                │
│     ├── Prioridade MÁXIMA                                                   │
│     ├── Override específico do projeto                                     │
│     ├── Usado para: exceções temporárias, experimentos                      │
│     └── Exemplo: customizar comportamento para projeto específico          │
│                                                                             │
│  2º .ocps/skills/custom/                                                   │
│     ├── Skills customizadas do projeto                                     │
│     ├── Persistidas no repositório                                        │
│     └── Exemplo: convenções específicas da equipe                          │
│                                                                             │
│  3º ~/.ocps/skills/global/                                                 │
│     ├── Skills base instaladas com o pacote npm                           │
│     ├── Compartilhadas entre todos os projetos                            │
│     └── Exemplo: tdd-typescript, elicacao-requisitos                       │
│                                                                             │
│  4º Comportamento default (hardcoded)                                     │
│     ├── Último recurso                                                     │
│     ├── Fallback quando nenhuma skill é encontrada                        │
│     └── Exemplo: lógica padrão de parsing do agente                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Estrutura de uma Skill

Uma skill típica tem a seguinte estrutura:

```yaml
name: tdd-typescript
version: 1.0.0
description: Habilidades para TDD em projetos TypeScript
agent: tdd

instructions: |
  # Instruções para o agente

  ## Fase Red
  - Escreva teste que descreva comportamento desejado
  - Use naming: deve_[verbo]_quando_[condicao]
  - Teste apenas uma coisa por teste

  ## Fase Green
  - Implemente código mínimo para passar
  - Não otimize ainda

  ## Fase Refactor
  - Remova duplicações
  - Melhore nomes

templates:
  test: |
    describe('{{subject}}', () => {
      it('{{test_name}}', () => {
        // teste aqui
      });
    });

patterns:
  - name: naming-convention
    pattern: 'deve_[a-z_]+_quando_[a-z_]+'
    description: Testes devem seguir convenção em português

pitfalls:
  - Usar 'any' no código
  - Testar múltiplas coisas em um único it
  - Esquecer de assert

lessons:
  - version: 1.1.0
    text: 'Mocks de módulos externos devem usar vi.mock() no topo do arquivo'
```

### 4.4 Skill Engine

O Skill Engine é responsável por:

1. **Listar skills disponíveis**: Varre os quatro níveis da hierarquia e lista todas as skills únicas por nome
2. **Carregar skill por nome**: Dado um nome, carrega a versão de maior prioridade disponível
3. **Filtrar skills por agente**: Retorna apenas skills relevantes para um agente específico

Localização: `src/skills/skill-engine.ts`

### 4.5 Protocolo de Consulta de Memória

Antes de executar qualquer ação, todo agente segue um protocolo de consulta em ordem:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROTOCOLO DE CONSULTA DE MEMÓRIA                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Basic Memory                                                           │
│     Pergunta: "Existe lição aprendida relevante para esta tarefa?"        │
│     Retorno: Histórico de erros e correções anteriores                    │
│                                                                             │
│  2. Serena                                                                 │
│     Pergunta: "Existe código similar no projeto?"                         │
│     Retorno: Trechos de código que podem ser reutilizados                 │
│                                                                             │
│  3. Skill Engine                                                           │
│     Ação: Carregar skills relevantes para a tarefa                        │
│     Retorno: Instruções, templates, patterns, pitfalls                    │
│                                                                             │
│  4. Se Laravel → Laravel Boost (obrigatório)                             │
│     Carrega comandos e convenções específicas do Laravel                   │
│                                                                             │
│  5. Se lib externa → Context7 (obrigatório)                              │
│     Busca documentação contextualizada                                      │
│                                                                             │
│  6. APENAS ENTÃO → Gerar código                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.6 Retroalimentação de Skills

Quando um erro é corrigido e validado durante o desenvolvimento, o sistema pode propor automaticamente a atualização da skill relevante:

```typescript
{
  skill: "tdd-typescript",
  version: "1.2.0",  // bump minor automático
  newLesson: "v1.2: Mocks de módulos externos devem usar vi.mock() no topo do arquivo, antes de qualquer import"
}
```

O desenvolvedor confirma a atualização → skill é atualizada e salva no Basic Memory para uso futuro.

---

## 5. Integração com MCPs

### 5.1 O que é MCP?

MCP (Model Context Protocol) é um protocolo aberto que permite a ferramentas de IA interagirem com sistemas externos. O OCPS implementa bridge para múltiplos MCPs, estendendo suas capacidades além do que seria possível apenas com chamadas de LLM.

### 5.2 MCPs Suportados

#### Basic Memory

Permite persistência de memória entre sessões e projetos. Útil para armazenar:

- Lições aprendidasacross projects
- Preferências do desenvolvedor
- Histórico de decisões de design
- Contexto de projeto

Configuração em `.ocps/config.yaml`:

```yaml
mcp:
  basicMemory:
    enabled: true
    url: 'http://localhost:3100' # ou URL do servidor remoto
```

#### Context7

Fornece busca contextualizada em documentação. Quando o agente precisa entender como usar uma biblioteca ou framework, Context7 retorna documentação relevante baseada no contexto atual.

Configuração:

```yaml
mcp:
  context7:
    enabled: true
    url: 'http://localhost:3101'
```

#### Serena

Indexa e permite busca semântica no código do projeto. O agente pode perguntar "existe código similar a X no projeto?" e Serena retorna trechos relevantes.

Configuração:

```yaml
mcp:
  serena:
    enabled: true
    projectPath: './src'
    indexed: true # se já foi indexado anteriormente
```

#### Laravel Boost

Comandos Laravel otimizados para IA. Disponibiliza via MCP comandos artisan específicos que ajudam agentes a entender e manipular projetos Laravel.

Configuração:

```yaml
mcp:
  laravelBoost:
    enabled: true
    laravelVersion: '12' # opcional, detecta automaticamente se não informado
```

### 5.3 Arquitetura MCP Bridge

O MCP Bridge (`src/mcp/mcp-bridge.ts`) implementa interface unificada para todos os MCPs:

```typescript
class McpBridge {
  async connect(config: McpConfig): Promise<void>;
  async disconnect(): Promise<void>;
  async query(mcp: string, query: string): Promise<McpResponse>;
  getStatus(): McpConnections;
}
```

Cada MCP específico implementa adapter:

- `src/mcp/basic-memory.ts`
- `src/mcp/context7.ts`
- `src/mcp/serena.ts` (quando implementado)

---

## 6. Interface CLI

### 6.1 Comandos Disponíveis

O OCPS expõe os seguintes comandos CLI:

| Comando                     | Descrição                                                    |
| --------------------------- | ------------------------------------------------------------ |
| `ocps init`                 | Inicializa OCPS no projeto, detecta stack, cria configuração |
| `ocps doctor`               | Verifica dependências, configurações e status dos MCPs       |
| `ocps version`              | Exibe versão instalada do OCPS                               |
| `ocps start`                | Inicia sessão interativa de desenvolvimento                  |
| `ocps session list`         | Lista sessões disponíveis para retomada                      |
| `ocps session restore <id>` | Restaura sessão específica                                   |
| `ocps mcp setup`            | Configura MCPs interativamente                               |
| `ocps mcp status`           | Mostra status das conexões MCP                               |

### 6.2 Fluxo de Uso Típico

```bash
# 1. Instalar globalmente
npm install -g ocps

# 2. Inicializar no projeto
cd meu-projeto
ocps init

# 3. Verificar ambiente
ocps doctor

# 4. Configurar MCPs (opcional)
ocps mcp setup

# 5. Iniciar sessão de desenvolvimento
ocps start

# Durante a sessão:
# - Você descreve uma ideia
# - BrainstormAgent transforma em backlog
# - Você aprova ou reprova
# - PlanningAgent decompõe em tarefas
# - Você aprova ou reprova
# - TddAgent implementa com TDD
# - Você aprova ou reprova
# - CodeReviewAgent revisa
# - QaAgent valida
# - DeployAgent faz deploy (se configurado)

# 6. Sair a qualquer momento
# O contexto é persistido automaticamente

# 7. Retomar depois
ocps start
# A sessão anterior é carregada automaticamente
```

---

## 7. Estrutura de Dados e Persistência

### 7.1 Diretório .ocps

O OCPS cria um diretório `.ocps` na raiz do projeto com a seguinte estrutura:

```
.ocps/
├── config.yaml              # Configuração do projeto
├── roadmap/
│   ├── backlog.yaml         # Backlog de todas as features
│   └── feature-[id].yaml    # Roadmaps individuais
├── sessions/
│   └── session-[timestamp].json  # Estado das sessões
└── skills/
    ├── overrides/           # Skills de override (máxima prioridade)
    └── custom/             # Skills customizadas do projeto
```

### 7.2 Configuração (config.yaml)

```yaml
version: '1.0.0'
projectName: meu-projeto
stack: typescript
nature: greenfield
primaryModel: claude-sonnet-4-5
fallbackModel: claude-haiku-4-5

mcp:
  basicMemory:
    enabled: true
  context7:
    enabled: true
  serena:
    enabled: false
  laravelBoost:
    enabled: false

coverageThreshold:
  lines: 80
  branches: 70

createdAt: '2024-01-15T10:30:00Z'
```

### 7.3 Tipos Principais

#### BacklogItem

```typescript
interface BacklogItem {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: 'pending' | 'in-progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt?: string;
  estimatedHours?: number;
}
```

#### Feature

```typescript
interface Feature {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  sprint: Sprint;
  status: 'pending' | 'in-progress' | 'done' | 'blocked';
}
```

#### Task

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  completionCriteria: string;
  assignedAgent: string; // 'tdd', 'brainstorm', 'planning', etc.
  status: 'pending' | 'in-progress' | 'done' | 'blocked';
  startedAt?: string;
  completedAt?: string;
  tokensUsed?: number;
}
```

---

## 8. Configuração Avançada

### 8.1 Variáveis de Ambiente

O OCPS respeita as seguintes variáveis de ambiente:

| Variável            | Descrição              | Default           |
| ------------------- | ---------------------- | ----------------- |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic | (obrigatório)     |
| `OPENAI_API_KEY`    | Chave da API OpenAI    | (opcional)        |
| `OCPS_MODEL`        | Modelo padrão          | claude-sonnet-4-5 |
| `OCPS_SESSION_DIR`  | Diretório de sessões   | .ocps/sessions    |
| `OCPS_SKILLS_DIR`   | Diretório de skills    | ~/.ocps/skills    |
| `OCPS_DEBUG`        | Habilita debug         | false             |

### 8.2 Configuração por Projeto

Além do `.ocps/config.yaml`, você pode criar `.ocps.local.yaml` para configurações locais que não serão commitadas (useful para API keys pessoais).

### 8.3 Extensibilidade

O OCPS foi desenhado para ser extensível:

**Adicionar novo agente**: Crie nova classe que implemente `Agent<TInput, TOutput>`, registre no Orchestrator.

**Adicionar nova skill**: Crie arquivo YAML em `.ocps/skills/custom/`.

**Adicionar novo MCP**: Implemente interface `McpAdapter` e registre no McpBridge.

**Adicionar nova stack**: Atualize `StackDetector` para detectar nova stack, crie skills específicas.

---

## 9. Considerações de Segurança

### 9.1 Controle de Acesso a Arquivos

Cada agente tem escopo definido de arquivos que pode modificar. O Orchestrator valida que agentes não tentam modificar arquivos fora do escopo autorizado.

### 9.2 Proteção de Credenciais

- Chaves de API são lidas apenas de variáveis de ambiente
- Configurações com secrets devem usar referências a env vars
- Nunca exponha credenciais em logs ou outputs

### 9.3 Validação de Input

Todos os inputs dos agentes são validados com Zod schemas antes de processamento, prevenindo ataques de injeção de prompt.

---

## 10. Roadmap e Futuro

### 10.1 Fases de Implementação

| Fase | Status                | Descrição                                  |
| ---- | --------------------- | ------------------------------------------ |
| 0    | ✅ Concluída          | Foundation (CLI, skill engine, MCP bridge) |
| 1    | ✅ Concluída          | Core Agents (Brainstorm, Planning, TDD)    |
| 2    | ✅ Concluída          | Quality Gates (Code Review, QA automático) |
| 3    | 🟡 Em desenvolvimento | Deploy (GitHub Actions + smoke tests)      |
| 4    | 🔜 Próxima            | Memory Full (Retomada < 60s)               |
| 5    | 🔜 Próxima            | Legacy Mode (DRF + análise arqueológica)   |
| 6    | 🔜 Próxima            | Multi-LLM (Fallback automático)            |
| 7    | 🔜 Próxima            | Multi-Stack (Node.js + Python end-to-end)  |

### 10.2 Contribuindo

O OCPS é um projeto open source. Contribuições são bem-vindas:

1. Fork o repositório
2. Crie branch para sua feature (`feat/nova-feature`)
3. Commit seguindoConventional Commits
4. Push e abra Pull Request

---

## 11. Referências e Links

- Repositório: https://github.com/nandinhos/ocps
- Documentação técnica: `docs/OCPS-Tecnico.md`
- Especificação completa: `docs/SPEC.md`
- Decisões arquiteturais: `docs/decisions/`
- Especificação de agentes: `AGENTS.md`

---

## 12. Licença

MIT © Nando Dev

---

_Documento gerado automaticamente. Última atualização: 2024._
