import { calcularMelhorMes, PROGRAMAS, textoMelhorMes } from "@milhas/core";
import type { HistoricoLoja } from "./dados/tipos";

export interface RespostaHistorico {
  nome: string;
  /** Uma linha por dia; null quando o programa não tem dado naquele dia */
  serie: { data: string; livelo: number | null; esfera: number | null }[];
  sugestoes: { programa: string; texto: string; temSugestao: boolean }[];
}

/** Junta as séries por dia e calcula a sugestão de melhor mês de cada programa. */
export function montarRespostaHistorico(h: HistoricoLoja): RespostaHistorico {
  const porDia = new Map<string, RespostaHistorico["serie"][number]>();
  const linha = (data: string) => porDia.get(data) ?? porDia.set(data, { data, livelo: null, esfera: null }).get(data)!;
  for (const p of h.livelo) linha(p.data).livelo = p.pontos;
  for (const p of h.esfera) linha(p.data).esfera = p.pontos;

  const sugestoes = PROGRAMAS.filter((p) => h[p.id].length).map((p) => {
    const r = calcularMelhorMes(h[p.id]);
    return { programa: p.nome, texto: textoMelhorMes(`${h.parceiro.nome} na ${p.nome}`, r), temSugestao: !!r.sugestao };
  });

  return {
    nome: h.parceiro.nome,
    serie: [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data)),
    sugestoes,
  };
}
