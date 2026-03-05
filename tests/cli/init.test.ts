import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  detectStack,
  readConfig,
  writeConfig,
  addToGitignore,
} from '../../src/cli/commands/init.js';

vi.mock('fs');
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    resolve: (...args: string[]) => args.join('/'),
  };
});

describe('init command', () => {
  const mockProjectRoot = '/test-project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectStack', () => {
    it('deve_detectar_typescript_quando_existe_package_json_com_typescript', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: string) => {
        if (filePath === '/test-project/package.json') return true;
        if (filePath === '/test-project/composer.json') return false;
        if (filePath === '/test-project/requirements.txt') return false;
        return false;
      });

      const mockPackageJson = { dependencies: { typescript: '^5.0.0' } };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

      const result = await detectStack(mockProjectRoot);
      expect(result).toBe('typescript');
    });

    it('deve_detectar_laravel_quando_existe_composer_json_com_laravel', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: string) => {
        if (filePath === '/test-project/package.json') return false;
        if (filePath === '/test-project/composer.json') return true;
        if (filePath === '/test-project/requirements.txt') return false;
        return false;
      });

      const mockComposerJson = { require: { 'laravel/framework': '^11.0' } };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockComposerJson));

      const result = await detectStack(mockProjectRoot);
      expect(result).toBe('laravel');
    });

    it('deve_detectar_python_quando_existe_requirements_txt', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: string) => {
        if (filePath === '/test-project/package.json') return false;
        if (filePath === '/test-project/composer.json') return false;
        if (filePath === '/test-project/requirements.txt') return true;
        return false;
      });

      vi.mocked(fs.readFileSync).mockReturnValue('django\nflask\n');

      const result = await detectStack(mockProjectRoot);
      expect(result).toBe('python');
    });

    it('deve_retornar_unknown_quando_nenhum_arquivo_detectado', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await detectStack(mockProjectRoot);
      expect(result).toBe('unknown');
    });

    it('deve_priorizar_laravel_sobre_typescript_quando_existem_ambos', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: string) => {
        if (filePath === '/test-project/package.json') return true;
        if (filePath === '/test-project/composer.json') return true;
        if (filePath === '/test-project/requirements.txt') return false;
        return false;
      });

      const mockComposerJson = { require: { 'laravel/framework': '^11.0' } };
      const mockPackageJson = { dependencies: { typescript: '^5.0.0' } };

      vi.mocked(fs.readFileSync).mockImplementation((filePath: string) => {
        if (filePath === '/test-project/composer.json') return JSON.stringify(mockComposerJson);
        if (filePath === '/test-project/package.json') return JSON.stringify(mockPackageJson);
        return '';
      });

      const result = await detectStack(mockProjectRoot);
      expect(result).toBe('laravel');
    });
  });

  describe('readConfig', () => {
    it('deve_ler_config_existente_quando_existe', () => {
      const mockConfig = {
        version: '1.0.0',
        projectName: 'test-project',
        stack: 'typescript',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        'version: "1.0.0"\nprojectName: test-project\nstack: typescript',
      );

      const result = readConfig(mockProjectRoot);
      expect(result).toEqual(mockConfig);
    });

    it('deve_retornar_null_quando_config_nao_existe', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = readConfig(mockProjectRoot);
      expect(result).toBeNull();
    });
  });

  describe('writeConfig', () => {
    it('deve_escrever_config_yaml', () => {
      const config = {
        version: '1.0.0',
        projectName: 'test-project',
        stack: 'typescript' as const,
        primaryModel: 'claude-sonnet-4-5',
        mcp: {
          basicMemory: { enabled: true },
          context7: { enabled: true },
          serena: { enabled: false },
          laravelBoost: { enabled: false },
        },
        coverageThreshold: { lines: 80, branches: 70 },
        createdAt: '2026-03-05T00:00:00Z',
      };

      writeConfig(mockProjectRoot, config);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('addToGitignore', () => {
    it('deve_adicionar_ocps_ao_gitignore_se_nao_existe', () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: string) => {
        if (filePath.includes('.gitignore')) return true;
        return false;
      });

      vi.mocked(fs.readFileSync).mockReturnValue('node_modules/\ndist/');

      addToGitignore(mockProjectRoot);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0][1];
      expect(writtenContent).toContain('.ocps/');
    });

    it('nao_deve_duplicar_se_ja_existe', () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: string) => {
        if (filePath.includes('.gitignore')) return true;
        return false;
      });

      vi.mocked(fs.readFileSync).mockReturnValue('node_modules/\n.ocps/\ndist/');

      addToGitignore(mockProjectRoot);

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });
});
