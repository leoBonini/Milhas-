export type ProgramaId = "livelo" | "esfera";

export const PROGRAMAS: { id: ProgramaId; nome: string }[] = [
  { id: "livelo", nome: "Livelo" },
  { id: "esfera", nome: "Esfera" },
];

export interface Categoria {
  id: string;
  nome: string;
}

export interface Parceiro {
  id: string;
  nome: string;
  slug: string;
}

/** Valor do dia de um parceiro num programa (já é o máximo entre as fontes). */
export interface PontoDiario {
  /** AAAA-MM-DD */
  data: string;
  pontos: number;
}

/** Linha da lista de lojas: pontuação de hoje em cada programa. */
export interface LojaDoDia {
  parceiro: Parceiro;
  livelo: number | null;
  esfera: number | null;
  /** Data do valor mostrado (pode ser anterior a hoje se a coleta do dia ainda não rodou) */
  data: string | null;
}

export function melhorValor(l: Pick<LojaDoDia, "livelo" | "esfera">): number {
  return Math.max(l.livelo ?? 0, l.esfera ?? 0);
}
