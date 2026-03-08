# OCPS V2 – Arquitetura de Produto

## 13. CLI Interface

---

# 1. Objetivo

A **CLI Interface** fornece uma interface de linha de comando para operar, administrar e automatizar o OCPS V2.

Ela permite:

* executar comandos administrativos
* iniciar tarefas e agentes
* depurar execuções
* gerenciar sistema
* rodar automações

A CLI é essencial para:

* **DevOps**
* **automação**
* **debugging**
* **manutenção operacional**

---

# 2. Filosofia da CLI

A CLI segue princípios:

| Princípio   | Descrição                   |
| ----------- | --------------------------- |
| Scriptable  | fácil automação             |
| Predictable | comportamento consistente   |
| Modular     | comandos organizados        |
| Extensible  | novos comandos adicionáveis |

---

# 3. Estrutura Geral da CLI

```id="cli-structure"
ocps
 ├─ system
 ├─ agent
 ├─ memory
 ├─ events
 ├─ debug
 ├─ execution
 ├─ cache
 └─ database
```

Formato geral:

```bash id="cli-format"
ocps <module> <command> [options]
```

---

# 4. Comando Base

Comando principal do sistema:

```bash id="base-command"
ocps
```

Exemplo:

```bash id="base-example"
ocps system:status
```

---

# 5. Módulo System

Comandos relacionados ao estado do sistema.

```bash id="system-commands"
ocps system:status
ocps system:health
ocps system:info
ocps system:version
```

Funções:

| Comando        | Descrição               |
| -------------- | ----------------------- |
| system:status  | estado geral            |
| system:health  | health checks           |
| system:info    | informações do ambiente |
| system:version | versão instalada        |

---

# 6. Módulo Agents

Controle de agentes do sistema.

```bash id="agent-commands"
ocps agent:list
ocps agent:run
ocps agent:status
ocps agent:logs
```

Exemplos:

```bash id="agent-example"
ocps agent:run task-analyzer
```

```bash id="agent-example-2"
ocps agent:status execution_id
```

---

# 7. Módulo Execution

Gerenciamento de execuções.

```bash id="execution-commands"
ocps exec:start
ocps exec:status
ocps exec:cancel
ocps exec:logs
```

Exemplo:

```bash id="exec-example"
ocps exec:start workflow_id
```

---

# 8. Módulo Memory

Controle da Memory Layer.

```bash id="memory-commands"
ocps memory:get
ocps memory:set
ocps memory:clear
ocps memory:search
```

Exemplo:

```bash id="memory-example"
ocps memory:get execution:123
```

---

# 9. Módulo Events

Operações relacionadas a eventos.

```bash id="event-commands"
ocps event:dispatch
ocps event:list
ocps event:replay
```

Exemplo:

```bash id="event-example"
ocps event:dispatch OrderCreated
```

---

# 10. Módulo Debug

Ferramentas de debugging.

```bash id="debug-commands"
ocps debug:trace
ocps debug:execution
ocps debug:agent
```

Exemplo:

```bash id="debug-example"
ocps debug:execution 9832
```

---

# 11. Módulo Cache

Controle do sistema de cache.

```bash id="cache-commands"
ocps cache:clear
ocps cache:warm
ocps cache:status
```

Exemplo:

```bash id="cache-example"
ocps cache:clear
```

---

# 12. Módulo Database

Comandos administrativos de banco.

```bash id="db-commands"
ocps db:migrate
ocps db:rollback
ocps db:seed
ocps db:status
```

Exemplo:

```bash id="db-example"
ocps db:migrate
```

---

# 13. Módulo Scheduler

Controle de tarefas agendadas.

```bash id="scheduler-commands"
ocps schedule:list
ocps schedule:run
ocps schedule:status
```

---

# 14. Módulo Queue

Controle de filas.

```bash id="queue-commands"
ocps queue:work
ocps queue:retry
ocps queue:failed
```

Exemplo:

```bash id="queue-example"
ocps queue:work
```

---

# 15. Opções Globais

Todos comandos suportam opções globais.

| Opção     | Função          |
| --------- | --------------- |
| --env     | ambiente        |
| --verbose | saída detalhada |
| --json    | output JSON     |
| --dry-run | simulação       |

Exemplo:

```bash id="cli-options"
ocps agent:run analyzer --env=dev --verbose
```

---

# 16. Formatos de Saída

A CLI suporta múltiplos formatos.

| Formato | Uso          |
| ------- | ------------ |
| text    | humano       |
| json    | automação    |
| table   | visualização |

Exemplo:

```bash id="cli-json"
ocps system:status --json
```

---

# 17. Autocomplete

Suporte a autocomplete para shell.

```bash id="cli-autocomplete"
bash
zsh
fish
```

Exemplo:

```bash id="cli-autocomplete-example"
ocps <TAB>
```

---

# 18. Arquitetura Interna

Estrutura da CLI:

```id="cli-internal"
CLI Kernel
   │
   ▼
Command Registry
   │
   ▼
Command Handlers
   │
   ▼
Application Services
```

---

# 19. Registro de Comandos

Comandos são registrados dinamicamente.

Estrutura:

```id="cli-command-registry"
Command
 ├─ name
 ├─ description
 ├─ arguments
 └─ handler
```

---

# 20. Segurança da CLI

Controles aplicados:

| Controle     | Descrição        |
| ------------ | ---------------- |
| autenticação | acesso restrito  |
| permissões   | RBAC             |
| auditoria    | logs de execução |

---

# 21. Integração com Scripts

A CLI pode ser usada em scripts de automação.

Exemplo:

```bash id="cli-script"
#!/bin/bash

ocps db:migrate
ocps cache:clear
ocps queue:work
```

---

# 22. Integração com CI/CD

Pipeline pode usar CLI.

Exemplo:

```bash id="cli-cicd"
ocps system:health
ocps db:migrate
ocps cache:warm
```

---

# 23. Benefícios

| Benefício               | Impacto              |
| ----------------------- | -------------------- |
| automação               | operações eficientes |
| debugging               | diagnóstico rápido   |
| controle administrativo | gestão do sistema    |
| integração DevOps       | deploy automatizado  |

---

# 24. Resultado Esperado

A CLI transforma o OCPS V2 em uma plataforma **operável e automatizável**, permitindo:

* controle completo via terminal
* automação de tarefas
* debugging avançado
* integração com pipelines.