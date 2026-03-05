import { describe, it, expect, expectTypeOf } from 'vitest';
import type { GateStatus, GateResult } from '../../src/types/gate';

describe('gate types', () => {
  it('deve_aceitar_GateResult_com_todos_os_campos', () => {
    const result: GateResult = {
      status: 'approved',
      checkedAt: '2026-01-01T00:00:00Z',
      approvedBy: 'developer',
      evidence: ['build passou', 'testes passaram'],
      blockers: [],
    };
    expect(result.status).toBe('approved');
    expect(result.approvedBy).toBe('developer');
  });

  it('deve_aceitar_GateResult_apenas_com_campo_obrigatorio', () => {
    const result: GateResult = { status: 'pending' };
    expect(result.status).toBe('pending');
  });

  it('deve_ser_union_type_GateStatus_com_quatro_valores', () => {
    expectTypeOf<GateStatus>().toEqualTypeOf<'pending' | 'approved' | 'blocked' | 'bypassed'>();
  });

  it('deve_tipar_approvedBy_como_developer_ou_auto_ou_undefined', () => {
    expectTypeOf<GateResult['approvedBy']>().toEqualTypeOf<'developer' | 'auto' | undefined>();
  });

  it('deve_narrowing_funcionar_em_switch_sobre_GateStatus', () => {
    const status: GateStatus = 'blocked';
    let label = '';
    switch (status) {
      case 'pending':
        label = 'pendente';
        break;
      case 'approved':
        label = 'aprovado';
        break;
      case 'blocked':
        label = 'bloqueado';
        break;
      case 'bypassed':
        label = 'ignorado';
        break;
    }
    expect(label).toBe('bloqueado');
  });
});
