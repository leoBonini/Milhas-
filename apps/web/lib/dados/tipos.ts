import type { Categoria, LojaDoDia, Parceiro, PalavraChave, PontoDiario, ProgramaId } from "@milhas/core";

export interface DestaqueDoDia {
  parceiro: Parceiro;
  programa: ProgramaId;
  pontos: number;
}

export interface HistoricoLoja {
  parceiro: Parceiro;
  livelo: PontoDiario[];
  esfera: PontoDiario[];
}

/**
 * Tudo o que o app lê. Só leitura de dados prontos: nenhuma implementação pode
 * chamar sites externos durante a requisição do usuário.
 */
export interface FonteDados {
  demonstracao: boolean;
  categorias(): Promise<Categoria[]>;
  categoria(id: string): Promise<Categoria | null>;
  palavrasChave(): Promise<PalavraChave[]>;
  lojasDaCategoria(categoriaId: string): Promise<LojaDoDia[]>;
  historico(slug: string): Promise<HistoricoLoja | null>;
}
