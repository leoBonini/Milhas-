// Coleta agendada (GitHub Actions, 3x ao dia). Busca Livelo e Esfera, grava:
//   dados/coleta/hoje.json       -> lojas parceiras HOJE, com pontos por real e categorias
//   dados/coleta/historico.json  -> máximo diário por loja e programa (para o gráfico)
// Falha de forma visível (exit 1) se um programa vier vazio ou muito menor que o normal.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CATEGORIAS_APP, categoriasPorNome } from "@milhas/core";
import { coletarEsfera } from "./esfera";
import { coletarLivelo } from "./livelo";
import { coletarTransferenciasEsfera, coletarTransferenciasLivelo } from "./coletarTransferencias";
import type { ParceiroColetado } from "./tipos";
import type { TransferenciaColetada } from "./transferencias";
import { chaveLoja, esperar, slugLoja } from "./util";

const UA = process.env.COLETA_USER_AGENT || "MilhasBot/0.1 (+https://github.com/leoBonini/Milhas-)";
const PASTA = path.resolve(process.cwd(), process.env.COLETA_SAIDA || "../../dados/coleta");

export interface OfertaPrograma {
  pontosPorReal: number;
  pontosBase: number | null;
  escopo: string;
  promocao: boolean;
  url: string | null;
  regra: string;
}

export interface LojaHoje {
  slug: string;
  nome: string;
  categorias: string[];
  livelo: OfertaPrograma | null;
  esfera: OfertaPrograma | null;
}

export interface ArquivoHoje {
  coletadoEm: string;
  data: string;
  totais: Record<string, number>;
  lojas: LojaHoje[];
  transferencias: TransferenciaColetada[];
}

/** { slug: { livelo: { "2026-10-06": 4 }, esfera: {...}, nome } } */
export type ArquivoHistorico = Record<string, { nome: string; livelo?: Record<string, number>; esfera?: Record<string, number> }>;

const hojeBrasilia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

const oferta = (p: ParceiroColetado): OfertaPrograma => ({
  pontosPorReal: p.pontosPorReal,
  pontosBase: p.pontosBase,
  escopo: p.escopo,
  promocao: p.promocao,
  url: p.url,
  regra: p.regra,
});

/** Junta a mesma loja dos dois programas pelo nome normalizado. */
export function juntarProgramas(livelo: ParceiroColetado[], esfera: ParceiroColetado[]): LojaHoje[] {
  const lojas = new Map<string, LojaHoje>();
  for (const p of [...livelo, ...esfera]) {
    const chave = chaveLoja(p.nome);
    const loja = lojas.get(chave) ?? { slug: slugLoja(p.nome), nome: p.nome, categorias: [], livelo: null, esfera: null };
    const atual = loja[p.programa];
    // Mesma loja duas vezes no mesmo programa: fica a maior pontuação
    if (!atual || p.pontosPorReal > atual.pontosPorReal) loja[p.programa] = oferta(p);
    loja.categorias = [...new Set([...loja.categorias, ...p.categorias])];
    lojas.set(chave, loja);
  }
  const ordem = CATEGORIAS_APP.map((c) => c.id as string);
  for (const l of lojas.values()) {
    // Lojas conhecidas sempre ganham as categorias do que vendem; sem nada, vai para "outros"
    l.categorias = [...new Set([...l.categorias, ...categoriasPorNome(l.nome)])];
    if (!l.categorias.length) l.categorias = ["outros"];
    l.categorias.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
  }
  return [...lojas.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Atualiza o histórico com o máximo do dia (rodar várias vezes no dia não duplica). */
export function atualizarHistorico(hist: ArquivoHistorico, lojas: LojaHoje[], data: string): ArquivoHistorico {
  for (const l of lojas) {
    const h = (hist[l.slug] ??= { nome: l.nome });
    h.nome = l.nome;
    for (const prog of ["livelo", "esfera"] as const) {
      const v = l[prog]?.pontosPorReal;
      if (v == null) continue;
      const serie = (h[prog] ??= {});
      serie[data] = Math.max(serie[data] ?? 0, v);
    }
  }
  return hist;
}

async function lerJson<T>(arquivo: string, padrao: T): Promise<T> {
  try {
    return JSON.parse(await readFile(arquivo, "utf8")) as T;
  } catch {
    return padrao;
  }
}

async function principal() {
  await mkdir(PASTA, { recursive: true });
  const anterior = await lerJson<ArquivoHoje | null>(path.join(PASTA, "hoje.json"), null);
  const erros: string[] = [];

  const tentar = async <T>(nome: string, f: () => Promise<T>, padrao: T): Promise<T> => {
    try {
      return await f();
    } catch (e) {
      erros.push(`${nome}: ${e instanceof Error ? e.message : e}`);
      return padrao;
    }
  };

  const esfera = await tentar("Esfera", () => coletarEsfera(UA), []);
  await esperar(3000);
  const livelo = await tentar("Livelo", () => coletarLivelo(UA), []);
  await esperar(3000);
  const transferencias = [
    ...(await tentar("Transferências Esfera", () => coletarTransferenciasEsfera(UA), [])),
    ...(await tentar("Transferências Livelo", () => coletarTransferenciasLivelo(UA), [])),
  ];

  // Verificação: vazio ou queda brusca indica que o site mudou
  for (const [nome, lista] of [["livelo", livelo], ["esfera", esfera]] as const) {
    const antes = anterior?.totais[nome] ?? 0;
    if (!lista.length) erros.push(`${nome}: nenhum parceiro coletado`);
    else if (antes && lista.length < antes * 0.5) erros.push(`${nome}: ${lista.length} parceiros, antes eram ${antes} (o site mudou?)`);
  }

  const lojas = juntarProgramas(livelo, esfera);
  const data = hojeBrasilia();
  const arquivo: ArquivoHoje = {
    coletadoEm: new Date().toISOString(),
    data,
    totais: { livelo: livelo.length, esfera: esfera.length, lojas: lojas.length },
    lojas,
    transferencias,
  };

  // Log para revisão: lojas novas e sem categoria
  const antigas = new Set(anterior?.lojas.map((l) => l.slug) ?? []);
  const novas = lojas.filter((l) => !antigas.has(l.slug));
  const semCategoria = lojas.filter((l) => l.categorias.includes("outros"));
  console.log(`Livelo: ${livelo.length} | Esfera: ${esfera.length} | Lojas: ${lojas.length} | Transferências: ${transferencias.length}`);
  if (anterior && novas.length) console.log(`Lojas novas (${novas.length}): ${novas.map((l) => l.nome).join(", ")}`);
  console.log(`Sem categoria (${semCategoria.length}): ${semCategoria.map((l) => l.nome).join(", ")}`);
  for (const t of transferencias) console.log(`Transferência ${t.programa} -> ${t.destino}: ${t.paridade ?? "?"}, bônus ${t.bonusPercentual}%${t.campanha ? ` (${t.campanha.slice(0, 120)})` : ""}`);

  // Só grava se os dois programas vieram: não apaga dados bons com uma coleta quebrada
  if (livelo.length && esfera.length) {
    await writeFile(path.join(PASTA, "hoje.json"), JSON.stringify(arquivo, null, 1) + "\n");
    const hist = atualizarHistorico(await lerJson<ArquivoHistorico>(path.join(PASTA, "historico.json"), {}), lojas, data);
    await writeFile(path.join(PASTA, "historico.json"), JSON.stringify(hist) + "\n");
  }

  if (erros.length) {
    console.error("\nERROS NA COLETA:\n- " + erros.join("\n- "));
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("executar.ts")) {
  principal().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
