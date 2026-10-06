// Coletor da Esfera. Fonte documentada em docs/fontes.md.
import { CATEGORIAS_ESFERA, categoriasDoParceiro } from "@milhas/core";
import type { ParceiroColetado } from "./tipos.js";

export const URL_PARCEIROS_ESFERA = "https://apigw.esfera.com.vc/bff-product/ehcs/products?categoryId=esf02163";

type ItemEsfera = Record<string, unknown> & {
  id?: string;
  displayName?: string;
  route?: string;
  active?: boolean;
  esf_accumulationValue?: string | number | null;
  esf_accumulationFactorValue?: string | number | null;
  esf_accumulationFactorDescription?: string | null;
  esf_accumulationPrefix?: string | null;
  esf_tempOfferAccumulationValue?: string | null;
  esf_tempOfferInit?: string | null;
  esf_tempOfferEnd?: string | null;
  externalInfo?: { amount?: string | null; rule?: string | null } | null;
  skuForShowcase?: { categoryIds?: string[] } | null;
  parentCategories?: { repositoryId?: string }[] | null;
};

/** Maior número de um texto como "De 6 a 8 pts" ou "2,5 pontos". */
export function maiorNumero(texto: string | null | undefined): number | null {
  const nums = (texto ?? "").match(/\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(",", ".")));
  return nums?.length ? Math.max(...nums) : null;
}

/** Reais por unidade na regra: "a cada 2 reais" -> 2, "a cada real" -> 1. */
function reaisDaRegra(regra: string | null | undefined): number | null {
  if (!regra) return null;
  const n = regra.match(/a cada\s+(\d+(?:[.,]\d+)?)/i);
  if (n) return Number(n[1]!.replace(",", "."));
  return /a cada (real|d[oó]lar)/i.test(regra) ? 1 : null;
}

/** "15-07-2025 23:00" -> Date (horário de Brasília). Placeholders "dd-mm-yyyy" viram null. */
export function lerDataEsfera(texto: string | null | undefined): Date | null {
  const m = texto?.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, d, mes, a, h = "00", min = "00"] = m;
  return new Date(`${a}-${mes}-${d}T${h}:${min}:00-03:00`);
}

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function normalizarItemEsfera(item: ItemEsfera, agora = new Date()): ParceiroColetado | null {
  if (!item.id || !item.displayName || item.active === false) return null;

  const porDolar = /d[oó]lar/i.test(`${item.esf_accumulationFactorDescription ?? ""} ${item.externalInfo?.rule ?? ""}`);

  // Regra padrão: X pontos a cada Y reais
  const pontos = num(item.esf_accumulationValue);
  const reais = num(item.esf_accumulationFactorValue) ?? 1;
  const base = pontos != null ? pontos / reais : null;

  // Texto exibido no site (às vezes traz faixa: "De 6 a 8 pts" "a cada 2 reais")
  const exibido = maiorNumero(item.externalInfo?.amount);
  const reaisExibido = reaisDaRegra(item.externalInfo?.rule) ?? reais;
  const valorExibido = exibido != null ? exibido / reaisExibido : null;

  // Oferta temporária, válida só dentro da janela
  const inicio = lerDataEsfera(item.esf_tempOfferInit);
  const fim = lerDataEsfera(item.esf_tempOfferEnd);
  const ofertaAtiva = !!inicio && !!fim && agora >= inicio && agora <= fim;
  const valorOferta = ofertaAtiva ? maiorNumero(item.esf_tempOfferAccumulationValue) : null;

  const candidatos = [base, valorExibido, valorOferta].filter((v): v is number => v != null);
  if (!candidatos.length) return null;
  const pontosPorReal = Math.round(Math.max(...candidatos) * 100) / 100;

  const ids = [
    ...(item.skuForShowcase?.categoryIds ?? []),
    ...(item.parentCategories ?? []).map((c) => c.repositoryId).filter((x): x is string => !!x),
  ];
  const categoriasOriginais = [...new Set(ids)];
  const temFaixa = /^\s*de\s/i.test(item.externalInfo?.amount ?? "") || /at[eé]/i.test(item.esf_accumulationPrefix ?? "");

  return {
    programa: "esfera",
    idExterno: item.id,
    nome: item.displayName.trim(),
    pontosPorReal,
    pontosBase: base != null ? Math.round(base * 100) / 100 : null,
    escopo: porDolar ? "por dólar" : temFaixa ? "até (varia por produto ou cliente)" : "loja toda",
    promocao: ofertaAtiva || (base != null && pontosPorReal > base),
    categorias: categoriasDoParceiro(categoriasOriginais, CATEGORIAS_ESFERA),
    categoriasOriginais,
    url: item.route ? `https://www.esfera.com.vc${item.route}` : null,
    regra: [item.esf_accumulationPrefix, item.externalInfo?.amount ?? `${pontos ?? "?"} pts`, item.externalInfo?.rule ?? `a cada ${reais} real(is)`]
      .filter(Boolean)
      .join(" "),
  };
}

export async function coletarEsfera(userAgent: string): Promise<ParceiroColetado[]> {
  const r = await fetch(URL_PARCEIROS_ESFERA, {
    headers: {
      "user-agent": userAgent,
      accept: "application/json",
      siteid: "esfera",
      origin: "https://www.esfera.com.vc",
      referer: "https://www.esfera.com.vc/",
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw new Error(`Esfera respondeu ${r.status}`);
  const json = (await r.json()) as { items?: ItemEsfera[]; totalResults?: number };
  if (!Array.isArray(json.items)) throw new Error("Esfera: resposta sem 'items' (o formato mudou?)");
  if (json.totalResults && json.totalResults > json.items.length) {
    throw new Error(`Esfera: ${json.totalResults} parceiros, mas veio só ${json.items.length} (falta paginar)`);
  }
  return json.items.map((i) => normalizarItemEsfera(i)).filter((x): x is ParceiroColetado => !!x);
}
