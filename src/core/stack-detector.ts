import * as fs from 'fs';
import * as path from 'path';
import type { StackType, ProjectNature } from '../types/config.js';

export interface StackDetectorResult {
  stack: StackType;
  confidence: number;
  indicators: string[];
  files: string[];
  nature: ProjectNature;
  phpVersion?: string;
  hasPrd: boolean;
}

export class StackDetector {
  detect(projectRoot: string): StackDetectorResult {
    const indicators: string[] = [];
    const files: string[] = [];

    const hasPackageJson = fs.existsSync(path.join(projectRoot, 'package.json'));
    const hasComposerJson = fs.existsSync(path.join(projectRoot, 'composer.json'));
    const hasRequirementsTxt = fs.existsSync(path.join(projectRoot, 'requirements.txt'));
    const hasGoMod = fs.existsSync(path.join(projectRoot, 'go.mod'));
    const hasCargoToml = fs.existsSync(path.join(projectRoot, 'Cargo.toml'));
    const hasPrd = fs.existsSync(path.join(projectRoot, 'PRD.md'));

    let stack: StackType = 'unknown';
    let phpVersion: string | undefined;

    // Detecção de Stack e PHP Version
    if (hasComposerJson) {
      try {
        const content = fs.readFileSync(path.join(projectRoot, 'composer.json'), 'utf-8');
        const composer = JSON.parse(content);
        files.push('composer.json');
        
        phpVersion = composer.require?.php?.replace(/[^0-9.]/g, '') || '8.2'; // default se não achar

        if (composer.require?.['laravel/framework']) {
          indicators.push('Laravel detected via composer.json');
          stack = 'laravel';
        } else {
          indicators.push('PHP project detected');
          stack = 'unknown'; // Podia ser 'php' mas o tipo atual não tem
        }
      } catch { /* ignore */ }
    }

    if (stack === 'unknown' && hasPackageJson) {
      try {
        const content = fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8');
        const pkg = JSON.parse(content);
        files.push('package.json');
        if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) {
          stack = 'typescript';
          indicators.push('TypeScript detected');
        } else {
          stack = 'nodejs';
          indicators.push('Node.js detected');
        }
      } catch { /* ignore */ }
    }

    // Heurística de Natureza (Greenfield vs Brownfield)
    // Se tem src/ ou app/ com arquivos, é Brownfield.
    const hasSourceDir = fs.existsSync(path.join(projectRoot, 'src')) || fs.existsSync(path.join(projectRoot, 'app'));
    let nature: ProjectNature = 'greenfield';

    if (hasSourceDir) {
      const srcDir = fs.existsSync(path.join(projectRoot, 'src')) ? 'src' : 'app';
      const filesInSrc = fs.readdirSync(path.join(projectRoot, srcDir)).filter(f => !f.startsWith('.'));
      if (filesInSrc.length > 2) { // Mais que um boilerplate básico
        nature = 'brownfield';
      }
    }

    // Refinamento PHP Legacy
    if (phpVersion) {
      const versionNum = parseFloat(phpVersion);
      if (versionNum < 8.3) {
        nature = 'legacy';
        indicators.push(`Legacy PHP detected: ${phpVersion}`);
      }
    }

    return {
      stack,
      confidence: stack !== 'unknown' ? 1.0 : 0,
      indicators,
      files,
      nature,
      phpVersion,
      hasPrd
    };
  }
}