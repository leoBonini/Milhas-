// Coletor da Livelo. Fontes documentadas em docs/fontes.md:
// - paridades: API pública usada pelo site (pontos por real de cada código de parceiro)
// - nomes/categorias: página "todos os parceiros" (HTML)
import type { ParceiroColetado } from "./tipos";

export const URL_PARIDADES_LIVELO = "https://apis.pontoslivelo.com.br/api-bff-partners-parities/v1/parities/active";
export const URL_PARCEIROS_LIVELO = "https://www.livelo.com.br/juntar-pontos/todos-os-parceiros";

export interface ParidadeLivelo {
  partnerCode: string;
  currency?: string; // "R$" | "U$"
  currencyValue?: number; // a cada N reais/dólares
  parity?: number; // pontos hoje (com promoção)
  parityClub?: number; // pontos para assinantes do Clube Livelo
  parityBau?: number; // pontuação padrão ("business as usual")
  promotion?: boolean;
  separator?: string; // "=" | "até"
  legalTerms?: string;
  url?: string;
  categoryParities?: { name: string; parity: number }[];
}

export interface InfoParceiroLivelo {
  codigo: string;
  nome: string;
  slug: string;
  categorias: string[];
}

const arred = (n: number) => Math.round(n * 100) / 100;

export function normalizarParidadeLivelo(p: ParidadeLivelo, info: InfoParceiroLivelo | undefined): ParceiroColetado | null {
  if (!p.partnerCode || !info) return null; // sem nome: não é exibível (fica no log para revisão)
  const divisor = p.currencyValue && p.currencyValue > 0 ? p.currencyValue : 1;
  const pontos = Math.max(p.parity ?? 0, ...(p.categoryParities ?? []).map((c) => c.parity));
  if (!(pontos > 0)) return null;
  const porDolar = p.currency === "U$";
  const ate = p.separator === "até" || !!p.categoryParities?.length;
  return {
    programa: "livelo",
    idExterno: p.partnerCode,
    nome: info.nome,
    pontosPorReal: arred(pontos / divisor),
    pontosBase: p.parityBau != null ? arred(p.parityBau / divisor) : null,
    escopo: porDolar ? "por dólar" : ate ? "até (varia por produto ou categoria)" : "loja toda",
    promocao: !!p.promotion,
    categorias: [],
    categoriasOriginais: info.categorias,
    url: `https://www.livelo.com.br/juntar-pontos/parceiros/${info.slug}/${p.partnerCode}`,
    regra: `${ate ? "até " : ""}${pontos} pts a cada ${divisor} ${porDolar ? "dólar(es)" : "real(is)"}${
      p.parityClub && p.parityClub > pontos ? ` · Clube Livelo: ${p.parityClub}` : ""
    }`,
  };
}
