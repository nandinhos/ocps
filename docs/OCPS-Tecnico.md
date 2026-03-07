# OCPS — Orquestrador Cognitivo de Projetos de Software

## Documento Técnico v1.0

---

## 1. O que é o OCPS?

O **OCPS** (Orquestrador Cognitivo de Projetos de Software) é um framework CLI que automatiza o ciclo completo de desenvolvimento de software usando agentes de IA especializados. Ele funciona como um "copiloto inteligente" que coordena múltiplos agentes para transformar uma ideia em código, com gates de qualidade em cada etapa.

### Definição Formal

```
OCPS = CLI + Agentes Especializados + Pipeline Automatizado + Gates de Qualidade + Memória Persistente
```

---

## 2. Arquitetura do Sistema

### 2.1 Pipeline de Execução

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE OCPS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  💡 Idea ──► Brainstorm ──► Planning ──► TDD ──► Review ──► QA ──► Deploy│
│                 │           │          │      │      │      │              │
│                 ▼           ▼          ▼      ▼      ▼      ▼              │
│              Gate 💬    Gate 💬   Gate ✓   Gate ✓   Gate ✓   Gate ✓      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Agentes Especializados

| Agente              | Responsabilidade                                              | Fase |
| ------------------- | ------------------------------------------------------------- | ---- |
| **BrainstormAgent** | Captura ideias brutas e transforma em backlog qualificado     | 1    |
| **PlanningAgent**   | Decompõe backlog em tarefas granulares com sprint plan        | 2    |
| **TddAgent**        | Implementa com ciclo Red → Green → Refactor                   | 3    |
| **CodeReviewAgent** | Revisão estruturada em 3 passes (SOLID, Qualidade, Segurança) | 4    |
| **QaAgent**         | Validação funcional completa com evidências                   | 5    |
| **DeployAgent**     | Pipeline CI/CD via GitHub Actions                             | 6    |
| **LegacyAgent**     | Análise arqueológica de sistemas legados                      | 7    |

### 2.3 Hierarquia de Skills

Quando um agente precisa de conhecimento específico, ele consulta nesta ordem:

```
1. .ocps/skills/overrides/  ← máxima prioridade (override do projeto)
2. .ocps/skills/custom/     ← skills customizadas do projeto
3. ~/.ocps/skills/global/  ← skills base instaladas com o npm
4. Comportamento default   ← hardcoded no agente (último recurso)
```

---

## 3. Como Funciona

### 3.1 Inicialização do Projeto

```bash
# Instalar globalmente
npm install -g ocps

# Inicializar no projeto
cd meu-projeto
ocps init
```

O comando `ocps init`:

1. Detecta a stack tecnológica (TypeScript, Node.js, Python, Laravel, Go, Rust)
2. Identifica a natureza do projeto (greenfield, brownfield, legacy)
3. Detecta versão do PHP (se Laravel)
4. Cria configuração em `.ocps/config.yaml`
5. Sugere criar `PRD.md` para projetos greenfield

### 3.2 Configuração de MCPs

```bash
ocps mcp setup
```

MCPs (Model Context Protocol) estendem as capacidades dos agentes:

- **Basic Memory** — Memória persistente entre sessões
- **Context7** — Busca contextualizada em documentação
- **Serena** — Indexação e busca semântica do código
- **Laravel Boost** — Comandos Laravel otimizados para IA

### 3.3 Verificação de Saúde

```bash
ocps doctor
```

Mostra:

- Versão do Node.js
- Status do build
- Configuração do projeto
- Status dos MCPs (conectados/offline)

### 3.4 Iniciar Sessão de Desenvolvimento

```bash
ocps start
```

Inicia o pipeline interativo onde:

1. Você descreve uma ideia/funcionalidade
2. BrainstormAgent transforma em backlog qualificado
3. Você aprova o backlog (Gate)
4. PlanningAgent decompõe em tarefas
5. Você aprova o escopo (Gate)
6. TddAgent implementa com TDD
7. Você aprova os testes (Gate)
8. CodeReviewAgent revisa
9. QaAgent valida
10. DeployAgent faz o deploy

---

## 4. Benefícios

### 4.1 Para Desenvolvedores Individuais

- **Estrutura garantida** — Nunca mais comece do zero
- **TDD obrigatório** — Código com testes desde o início
- **Memória persistente** — Contexto restaurado entre sessões
- **Revisão automática** — Code review sem depender de terceiros

### 4.2 Para Times

- **Padrões consistentes** — Todos seguem o mesmo pipeline
- **Gates de qualidade** — Aprovações manuais em pontos críticos
- **Documentação automática** — Backlog, tasks, sprint plans gerados
- **Onboarding reduzido** — Novo membro segue o mesmo fluxo
    
### 4.3 Para Projetos Legados

- **Análise arqueológica** — Entende o código antes de mexer
- **Migração segura** — DRF (Document of Reverse-Engineered Features)
- **Testes de equivalência** — Garante que comportamento não muda

---

## 5. Stack Técnica

| Componente   | Tecnologia                   |
| ------------ | ---------------------------- |
| Linguagem    | TypeScript 5.x (strict mode) |
| Runtime      | Node.js 20+                  |
| Distribuição | npm global                   |
| Testes       | Vitest                       |
| CLI          | Commander.js + Ink/React     |
| LLM          | @anthropic-ai/sdk            |
| MCP          | @modelcontextprotocol/sdk    |
| Agents       | Vercel AI SDK                |
| Schemas      | Zod                          |
| Skills       | YAML                         |

---

## 6. Comparativo

| Aspecto         | Sem OCPS  | Com OCPS    |
| --------------- | --------- | ----------- |
| Iniciar projeto | Manual    | `ocps init` |
| TDD             | Opcional  | Obrigatório |
| Code review     | Manual/RL | Automático  |
| Deploy          | Manual    | Automático  |
| Memória         | Nenhuma   | Persistente |
| Gates           | Informal  | Explicito   |

---

## 7. Próximos Passos

1. **Experimente**: `npm install -g ocps` e `ocps init` em um projeto
2. **Configure MCPs**: `ocps mcp setup` (requer terminal interativo)
3. **Crie um PRD**: Documente requisitos em `PRD.md`
4. **Inicie sessão**: `ocps start` e siga o pipeline

---

## 8. Referências

- Código fonte: https://github.com/nandinhos/ocps
- Spec completa: `docs/SPEC.md`
- ADRs: `docs/decisions/`
- Agentes: `AGENTS.md`

---

_Documento gerado automaticamente pelo OCPS_
