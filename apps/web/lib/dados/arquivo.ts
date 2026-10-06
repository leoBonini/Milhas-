// Fonte de dados a partir dos arquivos gravados pela coleta agendada
// (dados/coleta/hoje.json e historico.json). Sem banco e sem chamadas externas:
// os arquivos entram no build e o app é republicado a cada coleta.
import {
  CATEGORIAS_APP,
  PALAVRAS_CHAVE,
  type Categoria,
  type LojaDoDia,
  type OfertaDoDia,
  type PalavraChave,
  type PontoDiario,
} from "@milhas/core";
import hojeJson from "../../../../dados/coleta/hoje.json";
import historicoJson from "../../../../dados/coleta/historico.json";
import type { FonteDados, HistoricoLoja } from "./tipos";

interface LojaArquivo {
  slug: string;
  nome: string;
  categorias: string[];
  livelo: OfertaDoDia | null;
  esfera: OfertaDoDia | null;
}

export interface TransferenciaArquivo {
  programa: "livelo" | "esfera";
  destino: string;
  paridade: string | null;
  bonusPercentual: number;
  bonusMinimo?: number;
  validaAte?: string | null;
  campanha: string | null;
  url: string;
}

const hoje = hojeJson as unknown as { coletadoEm: string; data: string; lojas: LojaArquivo[]; transferencias: TransferenciaArquivo[] };
const historico = historicoJson as unknown as Record<string, { nome: string; livelo?: Record<string, number>; esfera?: Record<string, number> }>;

export const coletadoEm = hoje.coletadoEm;
export const transferencias = hoje.transferencias;

function paraLojaDoDia(l: LojaArquivo): LojaDoDia {
  const ofertas: LojaDoDia["ofertas"] = {};
  if (l.livelo) ofertas.livelo = l.livelo;
  if (l.esfera) ofertas.esfera = l.esfera;
  return {
    parceiro: { id: l.slug, nome: l.nome, slug: l.slug },
    livelo: l.livelo?.pontosPorReal ?? null,
    esfera: l.esfera?.pontosPorReal ?? null,
    data: hoje.data,
    ofertas,
  };
}

/** Só categorias com pelo menos uma loja parceira hoje, na ordem definida no core. */
const categoriasComLojas: Categoria[] = CATEGORIAS_APP.filter((c) => hoje.lojas.some((l) => l.categorias.includes(c.id))).map((c) => ({
  id: c.id,
  nome: c.nome,
}));

const serie = (pontos: Record<string, number> | undefined): PontoDiario[] =>
  Object.entries(pontos ?? {})
    .map(([data, p]) => ({ data, pontos: p }))
    .sort((a, b) => a.data.localeCompare(b.data));

export const fonteArquivo: FonteDados = {
  demonstracao: false,
  async categorias() {
    return categoriasComLojas;
  },
  async categoria(id) {
    return categoriasComLojas.find((c) => c.id === id) ?? null;
  },
  async palavrasChave(): Promise<PalavraChave[]> {
    return Object.entries(PALAVRAS_CHAVE).flatMap(([categoria_id, termos]) => termos.map((termo) => ({ termo, categoria_id })));
  },
  async lojasDeHoje() {
    return hoje.lojas.map(paraLojaDoDia);
  },
  async lojasDaCategoria(categoriaId) {
    return hoje.lojas.filter((l) => l.categorias.includes(categoriaId)).map(paraLojaDoDia);
  },
  async historico(slug): Promise<HistoricoLoja | null> {
    const h = historico[slug];
    if (!h) return null;
    return { parceiro: { id: slug, nome: h.nome, slug }, livelo: serie(h.livelo), esfera: serie(h.esfera) };
  },
};
