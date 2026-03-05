import { describe, it, expect, expectTypeOf } from 'vitest';
import type { AgentResult, ValidationResult } from '../../src/types/agent';
import type { GateStatus } from '../../src/types/gate';

describe('agent types', () => {
  it('deve_aceitar_AgentResult_com_ok_true', () => {
    const result: AgentResult<string> = {
      ok: true,
      output: 'sucesso',
      tokensUsed: 250,
      skillsApplied: ['tdd-typescript'],
      gateStatus: 'approved',
    };
    expect(result.ok).toBe(true);
    expect(result.output).toBe('sucesso');
  });

  it('deve_aceitar_AgentResult_com_ok_false', () => {
    const result: AgentResult<string> = {
      ok: false,
      error: 'Falha na execução',
      tokensUsed: 100,
      skillsApplied: [],
      gateStatus: 'blocked',
    };
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Falha na execução');
  });

  it('deve_narrowing_funcionar_em_ValidationResult_valido', () => {
    const valid: ValidationResult = { valid: true };
    if (valid.valid) {
      expect(valid.valid).toBe(true);
    }
  });

  it('deve_narrowing_funcionar_em_ValidationResult_invalido', () => {
    const invalid: ValidationResult = { valid: false, errors: ['campo obrigatório ausente'] };
    if (!invalid.valid) {
      expect(invalid.errors).toHaveLength(1);
    }
  });

  it('deve_tipar_gateStatus_em_AgentResult_como_GateStatus', () => {
    expectTypeOf<AgentResult<unknown>['gateStatus']>().toEqualTypeOf<GateStatus>();
  });

  it('deve_tipar_skillsApplied_como_array_de_string', () => {
    expectTypeOf<AgentResult<unknown>['skillsApplied']>().toEqualTypeOf<string[]>();
  });

  it('deve_AgentResult_ter_output_e_error_opcionais', () => {
    expectTypeOf<AgentResult<string>['output']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<AgentResult<string>['error']>().toEqualTypeOf<string | undefined>();
  });
});
