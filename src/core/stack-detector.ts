import * as fs from 'fs';
import * as path from 'path';
import type { StackType } from '../types/config.js';

export interface StackDetectorResult {
  stack: StackType;
  confidence: number;
  indicators: string[];
  files: string[];
}

export class StackDetector {
  detect(projectRoot: string): StackDetectorResult {
    const indicators: string[] = [];
    const files: string[] = [];

    const hasPackageJson = fs.existsSync(path.join(projectRoot, 'package.json'));
    const hasComposerJson = fs.existsSync(path.join(projectRoot, 'composer.json'));
    const hasRequirementsTxt = fs.existsSync(path.join(projectRoot, 'requirements.txt'));
    const hasSetupPy = fs.existsSync(path.join(projectRoot, 'setup.py'));
    const hasPyprojectToml = fs.existsSync(path.join(projectRoot, 'pyproject.toml'));
    const hasGoMod = fs.existsSync(path.join(projectRoot, 'go.mod'));
    const hasCargoToml = fs.existsSync(path.join(projectRoot, 'Cargo.toml'));

    if (hasComposerJson) {
      try {
        const content = fs.readFileSync(path.join(projectRoot, 'composer.json'), 'utf-8');
        const composer = JSON.parse(content);
        if (composer.require?.['laravel/framework']) {
          files.push('composer.json');
          indicators.push('Laravel detected via composer.json');
          return { stack: 'laravel', confidence: 1.0, indicators, files };
        }
      } catch {
        // ignore
      }
    }

    if (hasPackageJson) {
      try {
        const content = fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8');
        const pkg = JSON.parse(content);
        files.push('package.json');

        if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) {
          indicators.push('TypeScript detected via package.json');
          return { stack: 'typescript', confidence: 0.9, indicators, files };
        }

        if (pkg.dependencies || pkg.devDependencies) {
          indicators.push('Node.js detected via package.json');
          return { stack: 'nodejs', confidence: 0.8, indicators, files };
        }
      } catch {
        // ignore
      }
    }

    if (hasRequirementsTxt || hasSetupPy || hasPyprojectToml) {
      files.push(
        ...(hasRequirementsTxt ? ['requirements.txt'] : []),
        ...(hasSetupPy ? ['setup.py'] : []),
        ...(hasPyprojectToml ? ['pyproject.toml'] : []),
      );
      indicators.push('Python detected via config files');
      return { stack: 'python', confidence: 0.9, indicators, files };
    }

    if (hasGoMod) {
      files.push('go.mod');
      indicators.push('Go detected via go.mod');
      return { stack: 'golang', confidence: 0.9, indicators, files };
    }

    if (hasCargoToml) {
      files.push('Cargo.toml');
      indicators.push('Rust detected via Cargo.toml');
      return { stack: 'rust', confidence: 0.9, indicators, files };
    }

    return { stack: 'unknown', confidence: 0, indicators: [], files: [] };
  }

  getTestFramework(stack: StackType): string {
    switch (stack) {
      case 'typescript':
      case 'nodejs':
        return 'vitest';
      case 'laravel':
        return 'pest';
      case 'python':
        return 'pytest';
      case 'golang':
        return 'testing';
      case 'rust':
        return 'cargo test';
      default:
        return 'unknown';
    }
  }

  getBuildCommand(stack: StackType): string {
    switch (stack) {
      case 'typescript':
      case 'nodejs':
        return 'npm run build';
      case 'laravel':
        return 'composer install';
      case 'python':
        return 'pip install -r requirements.txt';
      case 'golang':
        return 'go build';
      case 'rust':
        return 'cargo build';
      default:
        return 'unknown';
    }
  }
}
