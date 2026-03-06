// Tipos de configuração global do OCPS e conexões MCP

export type StackType =
  | 'laravel'
  | 'typescript'
  | 'nodejs'
  | 'python'
  | 'golang'
  | 'rust'
  | 'unknown';

export type ProjectNature = 'greenfield' | 'brownfield' | 'legacy';

// União de literais + string permite autocomplete sem restringir modelos futuros
export type LlmModel = 'claude-opus-4-5' | 'claude-sonnet-4-5' | 'claude-haiku-4-5' | string;

export interface McpConfig {
  basicMemory: { enabled: boolean; url?: string };
  context7: { enabled: boolean; url?: string };
  serena: { enabled: boolean; projectPath?: string; indexed?: boolean };
  laravelBoost: { enabled: boolean; laravelVersion?: string };
}

export interface OcpsConfig {
  version: string;
  projectName: string;
  stack: StackType;
  nature: ProjectNature;
  phpVersion?: string;
  primaryModel: LlmModel;
  fallbackModel?: LlmModel;
  mcp: McpConfig;
  coverageThreshold: { lines: number; branches: number };
  createdAt: string;
}

// Representa uma conexão ativa com um servidor MCP
export interface McpConnection {
  name: string;
  enabled: boolean;
  connected: boolean;
}

export interface McpConnections {
  basicMemory: McpConnection;
  context7: McpConnection;
  serena?: McpConnection;
  laravelBoost?: McpConnection;
}