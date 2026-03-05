# ADR-001 — Stack TypeScript + Node.js

**Status:** Aceito  
**Data:** 2025  
**Autor:** Nando

## Contexto

O OCPS precisa ser um binário instalável globalmente, integrar-se nativamente
ao protocolo MCP da Anthropic e ter ecossistema CLI maduro.

## Decisão

TypeScript + Node.js 20+ como stack oficial e definitiva.

## Justificativas

1. O protocolo MCP foi criado pela Anthropic em TypeScript — implementação de referência
2. SDK oficial @anthropic-ai/sdk é Node-first com streaming e tool use nativos
3. `npm install -g ocps` — instalação trivial em qualquer máquina com Node.js
4. Tipagem forte via TypeScript: essencial para contratos de agentes e skills
5. Ink/React para TUI: componentes reutilizáveis no terminal

## Consequências

- O desenvolvedor (Nando) é especialista Laravel, não TypeScript sênior
  → Claude Code deve gerar código TypeScript idiomático sem precisar de intervenção
- PHP não é usado no orquestrador (apenas nos projetos que ele gerencia)

## Alternativas descartadas

- PHP: sem ecossistema para CLI installable e sem cliente MCP oficial
- Python: viável tecnicamente, mas ecossistema CLI inferior ao Node.js
