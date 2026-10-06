// Dados de demonstração: usados quando o Supabase não está configurado.
// São gerados de forma determinística (mesmo resultado a cada execução) e NÃO
// representam pontuações reais. Servem para ver e testar o app antes da coleta.

import type { Categoria, LojaDoDia, Parceiro, PalavraChave, PontoDiario, ProgramaId } from "@milhas/core";
import { hojeBrasilia, somarDias } from "../datas";
import type { FonteDados, HistoricoLoja } from "./tipos";

const CATEGORIAS: Categoria[] = [{ id: "eletronicos", nome: "Eletrônicos" }];

const TERMOS = [
  "iphone", "celular", "smartphone", "galaxy", "samsung", "motorola", "xiaomi", "ipad", "tablet",
  "notebook", "macbook", "computador", "monitor", "tv", "televisao", "smart tv", "airpods", "fone",
  "apple watch", "smartwatch", "playstation", "ps5", "xbox", "nintendo", "switch", "console", "camera",
  "caixa de som", "jbl", "alexa", "echo", "kindle",
];

/** base = pontuação padrão; mesFavorito = mês em que a loja costuma fazer promoção */
const LOJAS: { nome: string; slug: string; base: number; mesFavorito: number; programas: ProgramaId[] }[] = [
  { nome: "Apple", slug: "apple", base: 2, mesFavorito: 9, programas: ["livelo", "esfera"] },
  { nome: "Fast Shop", slug: "fast-shop", base: 3, mesFavorito: 3, programas: ["livelo", "esfera"] },
  { nome: "Magalu", slug: "magalu", base: 2, mesFavorito: 11, programas: ["livelo", "esfera"] },
  { nome: "Casas Bahia", slug: "casas-bahia", base: 3, mesFavorito: 11, programas: ["livelo", "esfera"] },
  { nome: "Extra", slug: "extra", base: 2, mesFavorito: 8, programas: ["livelo", "esfera"] },
  { nome: "Ponto", slug: "ponto", base: 3, mesFavorito: 5, programas: ["livelo", "esfera"] },
  { nome: "Amazon", slug: "amazon", base: 1, mesFavorito: 7, programas: ["livelo", "esfera"] },
  { nome: "Carrefour", slug: "carrefour", base: 2, mesFavorito: 4, programas: ["livelo", "esfera"] },
  { nome: "Americanas", slug: "americanas", base: 2, mesFavorito: 6, programas: ["livelo", "esfera"] },
  { nome: "Samsung", slug: "samsung", base: 4, mesFavorito: 2, programas: ["livelo", "esfera"] },
  { nome: "Mercado Livre", slug: "mercado-livre", base: 1, mesFavorito: 10, programas: ["livelo", "esfera"] },
  { nome: "Kabum", slug: "kabum", base: 3, mesFavorito: 11, programas: ["livelo", "esfera"] },
  { nome: "Girafa", slug: "girafa", base: 4, mesFavorito: 12, programas: ["livelo"] },
];

const INICIO = "2023-01-01";

/** Gerador pseudoaleatório simples e determinístico (mulberry32). */
function aleatorio(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function gerarSerie(loja: (typeof LOJAS)[number], programa: ProgramaId, ate: string): PontoDiario[] {
  const rnd = aleatorio(hash(`${loja.slug}:${programa}`));
  const base = programa === "esfera" ? Math.max(1, loja.base - (rnd() < 0.5 ? 1 : 0)) : loja.base;
  const serie: PontoDiario[] = [];
  let promoAte = "";
  let promoValor = 0;
  for (let data = INICIO; data <= ate; data = somarDias(data, 1)) {
    const mes = Number(data.slice(5, 7));
    if (data > promoAte) {
      // Chance diária de começar promoção: alta na Black Friday e no mês favorito da loja
      const chance = mes === 11 ? 0.12 : mes === loja.mesFavorito ? 0.09 : 0.012;
      if (rnd() < chance) {
        const forte = mes === 11 || mes === loja.mesFavorito;
        promoValor = Math.round(base * (forte ? 2.5 + rnd() * 2 : 1.5 + rnd()));
        promoAte = somarDias(data, 1 + Math.floor(rnd() * 5));
      }
    }
    serie.push({ data, pontos: data <= promoAte ? promoValor : base });
  }
  return serie;
}

let cache: { dia: string; series: Map<string, Record<ProgramaId, PontoDiario[] | null>> } | undefined;

function series() {
  const hoje = hojeBrasilia();
  if (cache?.dia !== hoje) {
    const m = new Map<string, Record<ProgramaId, PontoDiario[] | null>>();
    for (const l of LOJAS) {
      m.set(l.slug, {
        livelo: l.programas.includes("livelo") ? gerarSerie(l, "livelo", hoje) : null,
        esfera: l.programas.includes("esfera") ? gerarSerie(l, "esfera", hoje) : null,
      });
    }
    cache = { dia: hoje, series: m };
  }
  return cache.series;
}

const parceiro = (l: (typeof LOJAS)[number]): Parceiro => ({ id: l.slug, nome: l.nome, slug: l.slug });

export const fonteDemo: FonteDados = {
  demonstracao: true,
  async categorias() {
    return CATEGORIAS;
  },
  async categoria(id) {
    return CATEGORIAS.find((c) => c.id === id) ?? null;
  },
  async palavrasChave(): Promise<PalavraChave[]> {
    return TERMOS.map((termo) => ({ termo, categoria_id: "eletronicos" }));
  },
  async lojasDaCategoria(categoriaId): Promise<LojaDoDia[]> {
    if (categoriaId !== "eletronicos") return [];
    const s = series();
    return LOJAS.map((l) => {
      const { livelo, esfera } = s.get(l.slug)!;
      return {
        parceiro: parceiro(l),
        livelo: livelo?.at(-1)?.pontos ?? null,
        esfera: esfera?.at(-1)?.pontos ?? null,
        data: hojeBrasilia(),
      };
    });
  },
  async historico(slug): Promise<HistoricoLoja | null> {
    const l = LOJAS.find((x) => x.slug === slug);
    if (!l) return null;
    const { livelo, esfera } = series().get(slug)!;
    return { parceiro: parceiro(l), livelo: livelo ?? [], esfera: esfera ?? [] };
  },
};
