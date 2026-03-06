import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { StackDetector } from '../../src/core/stack-detector.js';

describe('StackDetector', () => {
  let detector: StackDetector;
  let testDir: string;

  beforeEach(() => {
    detector = new StackDetector();
    testDir = path.join('/tmp', `ocps-stack-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('detect', () => {
    it('deve_detectar_typescript', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { typescript: '^5.0.0' } }),
      );

      const result = detector.detect(testDir);
      expect(result.stack).toBe('typescript');
      expect(result.confidence).toBe(1.0);
    });

    it('deve_detectar_laravel', () => {
      fs.writeFileSync(
        path.join(testDir, 'composer.json'),
        JSON.stringify({ require: { 'laravel/framework': '^10.0', php: '^8.2' } }),
      );

      const result = detector.detect(testDir);
      expect(result.stack).toBe('laravel');
      expect(result.phpVersion).toBe('8.2');
    });

    it('deve_detectar_nature_greenfield', () => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'main.ts'), 'console.log("hello")');

      const result = detector.detect(testDir);
      expect(result.nature).toBe('greenfield');
    });

    it('deve_detectar_nature_brownfield', () => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'main.ts'), 'console.log("hello")');
      fs.writeFileSync(path.join(testDir, 'src', 'utils.ts'), 'export const a = 1');
      fs.writeFileSync(path.join(testDir, 'src', 'helpers.ts'), 'export const b = 2');

      const result = detector.detect(testDir);
      expect(result.nature).toBe('brownfield');
    });

    it('deve_retornar_unknown_sem_arquivos', () => {
      const result = detector.detect(testDir);
      expect(result.stack).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('deve_detectar_prd', () => {
      fs.writeFileSync(path.join(testDir, 'PRD.md'), '# PRD');
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });

      const result = detector.detect(testDir);
      expect(result.hasPrd).toBe(true);
    });
  });
});
