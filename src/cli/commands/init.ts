import * as fs from 'fs';
import * as path from 'path';
import { load as parseYaml } from 'js-yaml';
import type { StackType, OcpsConfig } from '../../types/config.js';

const OCPS_DIR = '.ocps';
const CONFIG_FILE = 'config.yaml';

export async function detectStack(projectRoot: string): Promise<StackType> {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const composerJsonPath = path.join(projectRoot, 'composer.json');
  const requirementsTxtPath = path.join(projectRoot, 'requirements.txt');

  const hasComposerJson = fs.existsSync(composerJsonPath);
  const hasPackageJson = fs.existsSync(packageJsonPath);
  const hasRequirementsTxt = fs.existsSync(requirementsTxtPath);

  if (hasComposerJson) {
    try {
      const content = fs.readFileSync(composerJsonPath, 'utf-8');
      const composer = JSON.parse(content);
      if (composer.require?.['laravel/framework']) {
        return 'laravel';
      }
    } catch {
      // ignore parse errors
    }
  }

  if (hasPackageJson) {
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) {
        return 'typescript';
      }
      if (pkg.dependencies) {
        return 'nodejs';
      }
    } catch {
      // ignore parse errors
    }
  }

  if (hasRequirementsTxt) {
    return 'python';
  }

  return 'unknown';
}

export function readConfig(projectRoot: string): OcpsConfig | null {
  const configPath = path.join(projectRoot, OCPS_DIR, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return parseYaml(content) as OcpsConfig;
  } catch {
    return null;
  }
}

export function writeConfig(projectRoot: string, config: OcpsConfig): void {
  const configDir = path.join(projectRoot, OCPS_DIR);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configPath = path.join(configDir, CONFIG_FILE);

  const yamlContent = [
    `version: "${config.version}"`,
    `projectName: ${config.projectName}`,
    `stack: ${config.stack}`,
    `primaryModel: ${config.primaryModel}`,
    config.fallbackModel ? `fallbackModel: ${config.fallbackModel}` : null,
    'mcp:',
    '  basicMemory:',
    `    enabled: ${config.mcp.basicMemory.enabled}`,
    config.mcp.basicMemory.url ? `    url: ${config.mcp.basicMemory.url}` : null,
    '  context7:',
    `    enabled: ${config.mcp.context7.enabled}`,
    config.mcp.context7.url ? `    url: ${config.mcp.context7.url}` : null,
    '  serena:',
    `    enabled: ${config.mcp.serena.enabled}`,
    config.mcp.serena.projectPath ? `    projectPath: ${config.mcp.serena.projectPath}` : null,
    '  laravelBoost:',
    `    enabled: ${config.mcp.laravelBoost.enabled}`,
    config.mcp.laravelBoost.laravelVersion
      ? `    laravelVersion: ${config.mcp.laravelBoost.laravelVersion}`
      : null,
    'coverageThreshold:',
    `  lines: ${config.coverageThreshold.lines}`,
    `  branches: ${config.coverageThreshold.branches}`,
    `createdAt: ${config.createdAt}`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  fs.writeFileSync(configPath, yamlContent, 'utf-8');
}

export function addToGitignore(projectRoot: string): void {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const entry = '.ocps/';

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `${entry}\n`, 'utf-8');
    return;
  }

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  const lines = content.split('\n').map((line) => line.trim());

  if (!lines.includes(entry)) {
    lines.push(entry);
    fs.writeFileSync(gitignorePath, lines.join('\n') + '\n', 'utf-8');
  }
}

export function configExists(projectRoot: string): boolean {
  const configPath = path.join(projectRoot, OCPS_DIR, CONFIG_FILE);
  return fs.existsSync(configPath);
}
