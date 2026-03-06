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
  async detectAsync(projectRoot: string): Promise<StackDetectorResult> {
    const [packageJson, composerJson, prdExists, srcExists, appExists] = await Promise.all([
      this.readJsonSafe(path.join(projectRoot, 'package.json')),
      this.readJsonSafe(path.join(projectRoot, 'composer.json')),
      this.fileExists(path.join(projectRoot, 'PRD.md')),
      this.fileExists(path.join(projectRoot, 'src')),
      this.fileExists(path.join(projectRoot, 'app')),
    ]);

    const indicators: string[] = [];
    const files: string[] = [];

    let stack: StackType = 'unknown';
    let phpVersion: string | undefined;

    if (composerJson) {
      try {
        const composer = JSON.parse(composerJson);
        files.push('composer.json');

        phpVersion = composer.require?.php?.replace(/[^0-9.]/g, '') || '8.2';

        if (composer.require?.['laravel/framework']) {
          indicators.push('Laravel detected via composer.json');
          stack = 'laravel';
        } else {
          indicators.push('PHP project detected');
        }
      } catch {
        /* ignore */
      }
    }

    if (stack === 'unknown' && packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        files.push('package.json');
        if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) {
          stack = 'typescript';
          indicators.push('TypeScript detected');
        } else {
          stack = 'nodejs';
          indicators.push('Node.js detected');
        }
      } catch {
        /* ignore */
      }
    }

    let nature: ProjectNature = 'greenfield';

    if (srcExists || appExists) {
      const srcDir = srcExists ? 'src' : 'app';
      try {
        const filesInSrc = fs
          .readdirSync(path.join(projectRoot, srcDir))
          .filter((f) => !f.startsWith('.'));
        if (filesInSrc.length > 2) {
          nature = 'brownfield';
        }
      } catch {
        /* ignore */
      }
    }

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
      hasPrd: prdExists,
    };
  }

  private async readJsonSafe(filePath: string): Promise<string | null> {
    try {
      const exists = await this.fileExists(filePath);
      if (!exists) return null;
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  detect(projectRoot: string): StackDetectorResult {
    const indicators: string[] = [];
    const files: string[] = [];

    const hasPackageJson = fs.existsSync(path.join(projectRoot, 'package.json'));
    const hasComposerJson = fs.existsSync(path.join(projectRoot, 'composer.json'));
    const hasPrd = fs.existsSync(path.join(projectRoot, 'PRD.md'));

    let stack: StackType = 'unknown';
    let phpVersion: string | undefined;

    if (hasComposerJson) {
      try {
        const content = fs.readFileSync(path.join(projectRoot, 'composer.json'), 'utf-8');
        const composer = JSON.parse(content);
        files.push('composer.json');

        phpVersion = composer.require?.php?.replace(/[^0-9.]/g, '') || '8.2';

        if (composer.require?.['laravel/framework']) {
          indicators.push('Laravel detected via composer.json');
          stack = 'laravel';
        } else {
          indicators.push('PHP project detected');
        }
      } catch {
        /* ignore */
      }
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
      } catch {
        /* ignore */
      }
    }

    const hasSourceDir =
      fs.existsSync(path.join(projectRoot, 'src')) || fs.existsSync(path.join(projectRoot, 'app'));
    let nature: ProjectNature = 'greenfield';

    if (hasSourceDir) {
      const srcDir = fs.existsSync(path.join(projectRoot, 'src')) ? 'src' : 'app';
      const filesInSrc = fs
        .readdirSync(path.join(projectRoot, srcDir))
        .filter((f) => !f.startsWith('.'));
      if (filesInSrc.length > 2) {
        nature = 'brownfield';
      }
    }

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
      hasPrd,
    };
  }
}
