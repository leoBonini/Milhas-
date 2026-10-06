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

import { arredondar as arred } from "./util";

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

function decodificar(texto: string): string {
  return texto
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const tituloDoSlug = (slug: string) => slug.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

/**
 * Lê os cartões da página "todos os parceiros". Cada cartão é um link
 * /juntar-pontos/parceiros/<slug>/<CODIGO> com imagem (alt) e textos.
 */
export function lerCartoesLivelo(html: string): InfoParceiroLivelo[] {
  const resultado = new Map<string, InfoParceiroLivelo>();
  for (const pedaco of html.split('data-testid="a_PartnerCard_card_link"').slice(1)) {
    const cartao = pedaco.slice(0, pedaco.indexOf("</a>") > 0 ? pedaco.indexOf("</a>") : 20000);
    const link = cartao.match(/juntar-pontos\/parceiros\/([a-z0-9-]+)\/([A-Z0-9]{2,4})/);
    if (!link) continue;
    const [, slug, codigo] = link;
    const img =
      cartao.match(/data-testid="img_PartnerCard_partnerImage"[^>]*?alt="([^"]*)"/)?.[1] ??
      cartao.match(/alt="([^"]*)"[^>]*?data-testid="img_PartnerCard_partnerImage"/)?.[1];
    const textos = [...cartao.matchAll(/data-testid="Text_Typography"[^>]*>([^<]{2,80})</g)].map((m) => decodificar(m[1]!));
    // Textos de pontuação ("Até 5 pontos por R$1") e selos ("Promoção") não são o nome
    const textoNome = textos.find((t) => !/ponto|pts|r\$|promo|clube|novo|exclusiv|ir para|regras|saiba|confira|ver mais/i.test(t));
    const altLimpo = img ? decodificar(img).replace(/^logo( d[aoe])?\s+/i, "") : "";
    const nome = (altLimpo && !/ponto|ganhe/i.test(altLimpo) ? altLimpo : textoNome) || tituloDoSlug(slug!);
    if (!resultado.has(codigo!)) resultado.set(codigo!, { codigo: codigo!, nome, slug: slug!, categorias: [] });
  }
  return [...resultado.values()];
}

export async function coletarLivelo(userAgent: string): Promise<ParceiroColetado[]> {
  const cab = { "user-agent": userAgent, origin: "https://www.livelo.com.br", referer: "https://www.livelo.com.br/" };
  const rp = await fetch(URL_PARIDADES_LIVELO, { headers: { ...cab, accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
  if (!rp.ok) throw new Error(`paridades responderam ${rp.status}`);
  const paridades = (await rp.json()) as ParidadeLivelo[];
  if (!Array.isArray(paridades)) throw new Error("paridades: resposta não é lista (o formato mudou?)");

  await new Promise((r) => setTimeout(r, 3000));
  const rh = await fetch(URL_PARCEIROS_LIVELO, { headers: { ...cab, accept: "text/html" }, signal: AbortSignal.timeout(60_000) });
  if (!rh.ok) throw new Error(`página de parceiros respondeu ${rh.status}`);
  const cartoes = lerCartoesLivelo(await rh.text());
  if (!cartoes.length) throw new Error("nenhum cartão de parceiro na página (o HTML mudou?)");

  const porCodigo = new Map(paridades.map((p) => [p.partnerCode, p]));
  const resultado: ParceiroColetado[] = [];
  const semParidade: string[] = [];
  for (const c of cartoes) {
    const p = porCodigo.get(c.codigo);
    const n = p ? normalizarParidadeLivelo(p, c) : null;
    if (n) resultado.push(n);
    else semParidade.push(`${c.nome} (${c.codigo})`);
  }
  console.log(`Livelo: ${cartoes.length} cartões, ${paridades.length} paridades, ${resultado.length} casados`);
  if (semParidade.length) console.log(`Livelo sem paridade: ${semParidade.join(", ")}`);
  console.log(`Livelo exemplos de nome: ${cartoes.slice(0, 8).map((c) => `${c.codigo}=${c.nome}`).join(" | ")}`);
  return resultado;
}
