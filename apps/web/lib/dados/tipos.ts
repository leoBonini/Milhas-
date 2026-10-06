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
  /** Todas as lojas parceiras HOJE (presentes na coleta mais recente de algum programa). */
  lojasDeHoje(): Promise<LojaDoDia[]>;
  /** Lojas parceiras hoje dentro de uma categoria. Loja fora da coleta de hoje não aparece. */
  lojasDaCategoria(categoriaId: string): Promise<LojaDoDia[]>;
  historico(slug: string): Promise<HistoricoLoja | null>;
}
