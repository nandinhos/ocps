# OCPS — Orquestrador Cognitivo de Projetos de Software

> Leia este arquivo integralmente antes de qualquer ação.
> Leia também `AGENTS.md` e `docs/SPEC.md` antes de iniciar qualquer implementação.

---

## O que é este projeto

Framework CLI instalável (`npm install -g ocps`) para desenvolvimento assistido por IA,
orientado a agentes semi-autônomos especializados e skills retroalimentáveis.
Público-alvo: desenvolvedores sênior.

**Documentação completa:** `docs/SPEC.md`
**Spec de agentes:** `AGENTS.md`
**Decisões registradas:** `docs/decisions/`

---

## Stack

| Item      | Decisão                    |
| --------- | -------------------------- |
| Linguagem | TypeScript 5.x strict      |
| Runtime   | Node.js 20+                |
| Testes    | Vitest                     |
| CLI UI    | Commander.js + Ink + React |
| LLM SDK   | @anthropic-ai/sdk          |
| MCP SDK   | @modelcontextprotocol/sdk  |
| AI Agents | Vercel AI SDK              |
| Validação | Zod                        |
| Skills    | YAML (js-yaml)             |
| Linting   | ESLint + Prettier          |

---

## Estrutura de diretórios

```
ocps/
├── src/
│   ├── core/          # Orchestrator, pipeline, gate engine
│   ├── agents/        # 7 agentes especializados
│   ├── skills/        # Skill Engine: loader, validator, versioner, feedback
│   ├── mcp/           # MCP Bridge: Serena, BasicMemory, Context7, LaravelBoost
│   ├── cli/           # Comandos CLI e TUI com Ink
│   └── types/         # Contratos TypeScript: Agent, Skill, Roadmap, Gate, Config
├── skills/
│   └── global/        # Skills base distribuídas com o pacote npm
├── tests/             # Vitest: unitários e integração
├── docs/
│   ├── SPEC.md        # Especificação completa do sistema (leia antes de implementar)
│   ├── decisions/     # ADRs: Architecture Decision Records
│   └── assets/        # Documentos de referência (Word, PDFs)
├── .ocps/             # Configuração local do próprio projeto (OCPS gerencia a si mesmo)
│   ├── config.yaml
│   └── roadmap/
├── CLAUDE.md          # Este arquivo — lido pelo Claude Code a cada sessão
└── AGENTS.md          # Spec detalhada de cada agente
```

---

## Fase atual: FASE 0 — Foundation

**Objetivo:** Estrutura base funcional. Sem agentes complexos ainda.

### Checklist da Fase 0

- [ ] Contratos TypeScript em `src/types/` (Agent, Skill, Roadmap, Gate, Config)
- [ ] Skill Engine básico: carregar, validar (Zod) e listar skills YAML
- [ ] MCP Bridge: conectar Basic Memory e Context7
- [ ] CLI base: `ocps init`, `ocps start`, `ocps doctor`, `ocps version`
- [ ] Primeira skill global: `skills/global/tdd-typescript.yaml`
- [ ] Testes unitários do Skill Engine com Vitest
- [ ] `ocps init` cria `.ocps/config.yaml` no projeto alvo

**Fase 0 está concluída quando:** `ocps init` + `ocps doctor` funcionam em um projeto TypeScript real.

---

## Regras invioláveis

1. **TDD obrigatório.** Nenhum código de produção sem teste falho primeiro. Red → Green → Refactor.
2. **YAGNI.** Implementar APENAS o que está no checklist da fase atual. Sem antecipar fases futuras.
3. **DRY.** Antes de criar qualquer função, verificar se lógica similar já existe no codebase.
4. **Sem `any` em TypeScript.** Strict mode ativo. Usar `unknown` + type guards quando necessário.
5. **Sem implementação fora do escopo aprovado.** Se surgir uma ideia boa para outra fase, registrar em `docs/decisions/backlog.md` e seguir em frente.
6. **Todo arquivo novo precisa de teste correspondente** em `tests/` espelhando a estrutura de `src/`.
7. **Gate antes de avanç.ar fase.** Todos os itens do checklist devem estar verdes antes de iniciar a próxima fase.
8. **Commits com Conventional Commits.** Formato: `type(scope): description` em português do Brasil, sem co-autoria.

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

Sem co-autoria. Sempre verificar `git log` para estilo dos commits anteriores.

---

## Convenções de código

```typescript
// Nomenclatura
PascalCase      → classes, interfaces, types, enums
camelCase       → funções, variáveis, métodos
SCREAMING_SNAKE → constantes globais
kebab-case      → arquivos, diretórios, skills YAML

// Estrutura de arquivo
// 1. imports externos
// 2. imports internos
// 3. types/interfaces locais
// 4. constantes
// 5. implementação
// 6. export

// Funções assíncronas sempre com Result type, nunca throw direto
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
```

---

## MCPs configurados

| MCP           | Status                          | Propósito                                      |
| ------------- | ------------------------------- | ---------------------------------------------- |
| Basic Memory  | Obrigatório global              | Memória persistente, skills, lições aprendidas |
| Context7      | Obrigatório global              | Docs de libs externas                          |
| Serena        | Obrigatório local (projeto)     | Indexação semântica do código                  |
| Laravel Boost | Obrigatório em projetos Laravel | Docs oficiais do framework                     |

---

## Como retomar uma sessão

1. Ler este `CLAUDE.md` (feito automaticamente)
2. Ler `AGENTS.md`
3. Verificar `.ocps/roadmap/fase-0.yaml` para estado atual
4. Verificar o checklist da fase atual acima
5. Perguntar ao usuário: "Estou no item [X] da Fase 0. Confirma que devo continuar?"
6. Nunca assumir que o trabalho anterior foi concluído sem verificar os arquivos

---

## Contato com o desenvolvedor

Nando é desenvolvedor Laravel sênior, familiarizado com padrões DDD, arquitetura em camadas,
PHP 8.3+, Laravel 11/12, Pest/PHPUnit. Conhecimento de TypeScript para consumo — não expert.
Prefere respostas diretas, técnicas e sem rodeios. Explica decisões mas não argumenta contra
decisões já tomadas e documentadas aqui.
