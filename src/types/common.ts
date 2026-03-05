// Tipo Result usado em todas as funções assíncronas do projeto.
// Convenção do CLAUDE.md: nunca throw direto — sempre retornar Result.
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
