export interface GateEngine {
  confirm(prompt: string, data?: unknown): Promise<boolean>;
}

export class InteractiveGateEngine implements GateEngine {
  async confirm(prompt: string, _data?: unknown): Promise<boolean> {
    console.log(`\n[GATE] ${prompt}`);
    console.log('[GATE] (simulado - retornando true)');
    return true;
  }
}
