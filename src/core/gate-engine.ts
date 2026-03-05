import * as readline from 'readline';

export interface GateEngine {
  confirm(prompt: string, data?: unknown): Promise<boolean>;
}

export class InteractiveGateEngine implements GateEngine {
  async confirm(prompt: string, data?: unknown): Promise<boolean> {
    console.log('\n' + '═'.repeat(60));
    console.log(`[GATE] ${prompt}`);
    console.log('─'.repeat(60));

    if (data) {
      console.log('\nDados para revisão:');
      console.log(JSON.stringify(data, null, 2));
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question('\nAprovar? (y/n): ', (answer) => {
        const approved = answer.toLowerCase().startsWith('y');
        if (approved) {
          console.log('✓ Aprovado.');
        } else {
          console.log('✗ Reprovado.');
        }
        rl.close();
        resolve(approved);
      });
    });
  }
}