import type { CategoriaAppId, ProgramaId } from "@milhas/core";

/** Formato normalizado que todo coletor devolve, independente do programa. */
export interface ParceiroColetado {
  programa: ProgramaId;
  /** Id da loja no site do programa */
  idExterno: string;
  nome: string;
  /** Pontos por real hoje (já com promoção, se houver) */
  pontosPorReal: number;
  /** Pontuação padrão, sem promoção, quando o programa informa */
  pontosBase: number | null;
  /** Ex: "loja toda", "até (varia por produto)", "por dólar" */
  escopo: string;
  promocao: boolean;
  categorias: CategoriaAppId[];
  /** Ids/nomes de categoria como vieram do programa (para revisão do mapeamento) */
  categoriasOriginais: string[];
  url: string | null;
  /** Texto original da regra, para conferência */
  regra: string;
}
