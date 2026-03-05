# 🤖 OCPS — Orquestrador Cognitivo de Projetos de Software

> Framework CLI para desenvolvimento assistido por IA com pipeline automatizado de agentes

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-6.0+-6AD1A3?style=flat&logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 O que é o OCPS?

O OCPS é um orquestrador de agentes de IA que automatiza o ciclo completo de desenvolvimento de software — do brainstorm ao deploy — com gates de qualidade interativos.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE OCPS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  💡 Idea ──► Brainstorm ──► Planning ──► TDD ──► Review ──► QA ──► Deploy │
│                 │           │          │      │      │      │              │
│                 ▼           ▼          ▼      ▼      ▼      ▼              │
│              Gate 💬    Gate 💬   Gate ✓   Gate ✓   Gate ✓   Gate ✓      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## ✨ Features

- **🤖 7 Agentes Especializados** — Brainstorm, Planning, TDD, Code Review, QA, Deploy, Legacy
- **🔄 Pipeline Automatizado** — Do conceito ao deploy em fluxo sequencial
- **🛡️ Gates de Qualidade** — Aprovações manuais em pontos estratégicos
- **🧠 Memória Persistente** — Sessões restauráveis com contexto completo
- **🌐 Multi-LLM** — Fallback automático entre provedores (Anthropic ↔ OpenAI)
- **🐍 Multi-Stack** — Suporte nativo a TypeScript, Node.js, Python, Laravel, Go, Rust
- **📦 MCP Ready** — Integração com Basic Memory, Context7, Serena, LaravelBoost

## 🚀 Quick Start

```bash
# Instalar globalmente
npm install -g ocps

# Inicializar projeto
ocps init

# Verificar dependências
ocps doctor

# Iniciar sessão
ocps start
```

## 📖 Comandos CLI

| Comando        | Descrição                             |
| -------------- | ------------------------------------- |
| `ocps init`    | Inicializa OCPS no projeto            |
| `ocps doctor`  | Verifica dependências e configurações |
| `ocps version` | Exibe versão do OCPS                  |
| `ocps start`   | Inicia sessão interativa              |

## 🏗️ Arquitetura

```
src/
├── agents/              # Agentes do pipeline
│   ├── brainstorm.agent.ts
│   ├── planning.agent.ts
│   ├── tdd.agent.ts
│   ├── code-review.agent.ts
│   ├── qa.agent.ts
│   ├── deploy.agent.ts
│   └── legacy.agent.ts
├── core/                # Componentes centrais
│   ├── orchestrator.ts     # Pipeline coordinator
│   ├── llm-client.ts       # Anthropic/OpenAI client
│   ├── multi-llm-manager.ts
│   ├── session-manager.ts
│   ├── stack-detector.ts
│   └── gate-engine.ts
├── cli/                 # Interface CLI
│   ├── index.ts
│   └── commands/
├── mcp/                # MCP bridges
│   ├── mcp-bridge.ts
│   ├── basic-memory.ts
│   └── context7.ts
├── skills/              # Skill engine
│   ├── skill-engine.ts
│   └── skill-loader.ts
└── types/               # TypeScript definitions
```

## 📊 Pipeline de Fases

| Fase | Nome          | Descrição                          |
| ---- | ------------- | ---------------------------------- |
| 0    | Foundation    | CLI, skill engine, MCP bridge      |
| 1    | Core Agents   | Brainstorm → Planning → TDD        |
| 2    | Quality Gates | Code Review + QA automático        |
| 3    | Deploy        | GitHub Actions + smoke tests       |
| 4    | Memory Full   | Retomada de sessão < 60s           |
| 5    | Legacy Mode   | Análise de código legado (DRF)     |
| 6    | Multi-LLM     | Fallback automático por rate limit |
| 7    | Multi-Stack   | Node.js + Python end-to-end        |

## 🔧 Configuração

Cria `.ocps/config.yaml`:

```yaml
version: '1.0.0'
projectName: meu-projeto
stack: typescript
primaryModel: claude-sonnet-4-5

mcp:
  basicMemory: { enabled: true }
  context7: { enabled: true }
  serena: { enabled: false }
  laravelBoost: { enabled: false }

coverageThreshold:
  lines: 80
  branches: 70
```

## 🧪 Testes

```bash
# Rodar testes
npm test

# Com coverage
npm test -- --coverage
```

**Status:** 153 testes passando

## 📦 Dependências

- **TypeScript 5.0+** — Tipagem
- **Vitest** — Testes
- **Commander.js** — CLI
- **@anthropic-ai/sdk** — Claude API
- **Ink** — UI interativa

## 📄 Licença

MIT © Nando Dev

---

<p align="center">
  <sub>Feito com ☕ e 🤖 por Nando Dev</sub>
</p>
