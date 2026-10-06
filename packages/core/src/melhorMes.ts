import type { PontoDiario } from "./tipos";

export const NOMES_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export interface EstatisticaMes {
  /** 1 a 12 */
  mes: number;
  /** Média dos picos desse mês ao longo dos anos */
  media: number;
  /** Em quantos anos o pico desse mês ficou no percentil 75 da loja ou acima */
  frequencia: number;
  /** Em quantos anos há dados desse mês */
  anos: number;
}

export interface ResultadoMelhorMes {
  /** Meses ordenados do melhor para o pior */
  ranking: EstatisticaMes[];
  /** Quantidade de meses (mês+ano) com dados */
  mesesComDados: number;
  percentil75: number;
  /** Mês vencedor, só quando os critérios mínimos são atendidos */
  sugestao: EstatisticaMes | null;
}

/** Percentil com interpolação linear (mesmo método do Excel PERCENTIL / numpy padrão). */
export function percentil(valores: number[], p: number): number {
  if (!valores.length) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const posicao = (ordenados.length - 1) * p;
  const baixo = Math.floor(posicao);
  const alto = Math.ceil(posicao);
  return ordenados[baixo]! + (ordenados[alto]! - ordenados[baixo]!) * (posicao - baixo);
}

export function calcularMelhorMes(pontos: PontoDiario[]): ResultadoMelhorMes {
  // 1) Maior pontos por real em cada mês/ano
  const picos = new Map<string, { ano: number; mes: number; pico: number }>();
  for (const p of pontos) {
    const ano = Number(p.data.slice(0, 4));
    const mes = Number(p.data.slice(5, 7));
    const chave = `${ano}-${mes}`;
    const atual = picos.get(chave);
    if (!atual || p.pontos > atual.pico) picos.set(chave, { ano, mes, pico: p.pontos });
  }
  const listaPicos = [...picos.values()];
  const p75 = percentil(listaPicos.map((x) => x.pico), 0.75);

  // 2) Média e frequência por mês do calendário
  const ranking: EstatisticaMes[] = [];
  for (let mes = 1; mes <= 12; mes++) {
    const doMes = listaPicos.filter((x) => x.mes === mes);
    if (!doMes.length) continue;
    ranking.push({
      mes,
      media: doMes.reduce((s, x) => s + x.pico, 0) / doMes.length,
      frequencia: doMes.filter((x) => x.pico >= p75).length,
      anos: doMes.length,
    });
  }

  // 3) Frequência primeiro, média no desempate
  ranking.sort((a, b) => b.frequencia - a.frequencia || b.media - a.media);

  // 4) Mínimo de 12 meses de dados e vencedor presente em pelo menos 2 anos
  const vencedor = ranking[0];
  const sugestao = listaPicos.length >= 12 && vencedor && vencedor.frequencia >= 2 ? vencedor : null;

  return { ranking, mesesComDados: listaPicos.length, percentil75: p75, sugestao };
}

export function formatarPontos(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** 5) e 6) Texto da sugestão, gerado por template. */
export function textoMelhorMes(loja: string, resultado: ResultadoMelhorMes): string {
  const s = resultado.sugestao;
  if (!s) return "Ainda estamos montando o histórico desta loja.";
  const anos = s.anos === 1 ? "no último ano" : `nos últimos ${s.anos} anos`;
  return `Historicamente, o melhor mês da ${loja} é ${NOMES_MESES[s.mes - 1]}, com média de ${formatarPontos(s.media)} pontos por real ${anos}.`;
}
