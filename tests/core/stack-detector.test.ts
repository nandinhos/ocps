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
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('deve_detectar_python', () => {
      fs.writeFileSync(path.join(testDir, 'requirements.txt'), 'flask\ndjango\n');

      const result = detector.detect(testDir);
      expect(result.stack).toBe('python');
    });

    it('deve_detectar_laravel', () => {
      fs.writeFileSync(
        path.join(testDir, 'composer.json'),
        JSON.stringify({ require: { 'laravel/framework': '^10.0' } }),
      );

      const result = detector.detect(testDir);
      expect(result.stack).toBe('laravel');
    });

    it('deve_retornar_unknown_sem_arquivos', () => {
      const result = detector.detect(testDir);
      expect(result.stack).toBe('unknown');
    });
  });

  describe('getTestFramework', () => {
    it('deve_retornar_vitest_para_typescript', () => {
      expect(detector.getTestFramework('typescript')).toBe('vitest');
    });

    it('deve_retornar_pytest_para_python', () => {
      expect(detector.getTestFramework('python')).toBe('pytest');
    });

    it('deve_retornar_pest_para_laravel', () => {
      expect(detector.getTestFramework('laravel')).toBe('pest');
    });
  });

  describe('getBuildCommand', () => {
    it('deve_retornar_npm_para_typescript', () => {
      expect(detector.getBuildCommand('typescript')).toBe('npm run build');
    });

    it('deve_retornar_pip_para_python', () => {
      expect(detector.getBuildCommand('python')).toBe('pip install -r requirements.txt');
    });
  });
});
