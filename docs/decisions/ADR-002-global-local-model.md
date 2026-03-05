# ADR-002 — Modelo de Distribuição Global + Local

**Status:** Aceito  
**Data:** 2025  
**Autor:** Nando

## Decisão

Binário global (`npm install -g ocps`) + configuração local por projeto (`.ocps/`).

## Justificativa

Segue o modelo de git, composer e artisan:
- Binário instalado uma vez na máquina
- Configuração e contexto específicos por projeto
- `.ocps/` é versionado no git do projeto (exceto `.ocps/.env`)

## O que é global

- Binário `ocps` e todos os agentes
- Skills base (SOLID, DRY, TDD, Laravel, TypeScript)
- Clientes MCP globais: Basic Memory, Context7

## O que é local (.ocps/)

- `config.yaml`: stack, LLM, MCPs, preferências do projeto
- `.env`: credenciais (NÃO commitar)
- `skills/custom/`: convenções específicas do projeto/cliente
- `skills/overrides/`: override de skills globais
- `roadmap/`: features ativas com checkpoints de estado
- `memory/local.md`: lições aprendidas locais
- `memory/decisions.md`: ADRs do projeto gerenciado
- `logs/`: auditoria de todas as ações dos agentes
