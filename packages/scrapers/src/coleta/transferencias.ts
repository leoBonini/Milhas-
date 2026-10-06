// Transferência de pontos para programas de milhas (LATAM Pass, Smiles, Azul...).

export interface TransferenciaColetada {
  programa: "livelo" | "esfera";
  /** Programa de destino, ex: "LATAM Pass" */
  destino: string;
  /** Paridade sem bônus, ex: "1:1" (pontos:milhas). Null quando o site não informa. */
  paridade: string | null;
  /** Maior bônus anunciado hoje, em %. 0 = sem campanha. Ex: 35 = 100 mil viram 135 mil. */
  bonusPercentual: number;
  /** Menor bônus da campanha (o que vale para todos os clientes), quando há faixas */
  bonusMinimo: number;
  /** Fim da campanha (AAAA-MM-DD), quando informado */
  validaAte: string | null;
  /** Texto da campanha (resumido), validade e regras principais */
  campanha: string | null;
  url: string;
}

/** Ids da Esfera (bff-miles .../factor-wi) -> nome e página. Levantado em 2026-10-06. */
export const DESTINOS_ESFERA: Record<string, { nome: string; rota: string }> = {
  dlta: { nome: "LATAM Pass", rota: "/p/latam-pass/e000100101" },
  dsml: { nome: "Smiles", rota: "/p/smiles/e000100001" },
  dazl: { nome: "Azul Fidelidade", rota: "/p/azul-fidelidade/e000100002" },
  dibp: { nome: "Iberia Plus", rota: "/p/iberia-plus/e000100072" },
  dacr: { nome: "ALL Accor", rota: "/p/all-accor/e000100158" },
  dcop: { nome: "Copa ConnectMiles", rota: "/p/copa-airlines/e000100695" },
  sair: { nome: "Flying Blue", rota: "/p/flying-blue/e000100730" },
  sihg: { nome: "IHG One Rewards", rota: "/p/ihg-one-rewards/e000100736" },
  stap: { nome: "TAP Miles&Go", rota: "/p/tap-miles-and-go/e000100732" },
  saer: { nome: "Aeroméxico Rewards", rota: "/p/aeromexico-rewards/e000100738" },
  stks: { nome: "Turkish Miles&Smiles", rota: "/p/turkish-miles-and-go/e000200000" },
};

export interface ParidadeEsfera {
  partnerIdentifier: string;
  points: number;
  miles: number;
  type?: string; // "DEFAULT" ou campanha
  campaignId?: string | null;
}

const formatarRazao = (pontos: number, milhas: number) => `${+pontos.toFixed(2)}:${+milhas.toFixed(2)}`;

/** Pode haver uma linha padrão e outra de campanha por destino. Bônus = quanto a campanha rende a mais. */
export function normalizarTransferenciasEsfera(linhas: ParidadeEsfera[]): TransferenciaColetada[] {
  const porDestino = new Map<string, ParidadeEsfera[]>();
  for (const l of linhas) porDestino.set(l.partnerIdentifier, [...(porDestino.get(l.partnerIdentifier) ?? []), l]);
  const resultado: TransferenciaColetada[] = [];
  for (const [id, ls] of porDestino) {
    const destino = DESTINOS_ESFERA[id];
    const pontosPorMilha = (l: ParidadeEsfera) => l.points / l.miles;
    const padrao = ls.find((l) => (l.type ?? "DEFAULT") === "DEFAULT" && !l.campaignId) ?? ls[0]!;
    const melhor = ls.reduce((a, b) => (pontosPorMilha(b) < pontosPorMilha(a) ? b : a));
    const bonus = Math.round((pontosPorMilha(padrao) / pontosPorMilha(melhor) - 1) * 100);
    resultado.push({
      programa: "esfera",
      destino: destino?.nome ?? id,
      paridade: formatarRazao(padrao.points, padrao.miles),
      bonusPercentual: bonus,
      bonusMinimo: bonus,
      validaAte: null,
      campanha: bonus > 0 ? `Campanha ${melhor.campaignId ?? ""}`.trim() : null,
      url: destino ? `https://www.esfera.com.vc${destino.rota}` : "https://www.esfera.com.vc",
    });
  }
  return resultado.sort((a, b) => a.destino.localeCompare(b.destino));
}

const semHtml = (s: string) =>
  s
    .replace(/<\/(li|p|h\d)>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(\.\s*)+/g, ". ")
    .trim();

/** Procura no JSON da página o primeiro objeto com a chave "campaign". */
function acharCampanha(obj: unknown, profundidade = 0): Record<string, unknown> | null {
  if (!obj || typeof obj !== "object" || profundidade > 12) return null;
  const o = obj as Record<string, unknown>;
  if (o.campaign && typeof o.campaign === "object" && !Array.isArray(o.campaign)) return o.campaign as Record<string, unknown>;
  for (const v of Object.values(o)) {
    const achado = acharCampanha(v, profundidade + 1);
    if (achado) return achado;
  }
  return null;
}

/**
 * Última data citada no texto ("das 10h do dia 28/09 às 23h59 do dia 30/09/26") = fim da campanha.
 * Datas sem ano herdam o ano de outra data do texto ou o ano de referência.
 */
export function fimDaCampanha(texto: string, referencia: Date): string | null {
  const datas = [...texto.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)];
  if (!datas.length) return null;
  const anoTexto = datas.map((d) => d[3]).find(Boolean);
  const ultima = datas.at(-1)!;
  let ano = Number(ultima[3] ?? anoTexto ?? referencia.getFullYear());
  if (ano < 100) ano += 2000;
  return `${ano}-${ultima[2]!.padStart(2, "0")}-${ultima[1]!.padStart(2, "0")}`;
}

const hojeBrasilia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);

/** Lê a campanha da página de transferência da Livelo (dados embutidos __NEXT_DATA__). */
export function lerTransferenciaLivelo(html: string, destino: string, url: string, agora = new Date()): TransferenciaColetada {
  const json = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error(`transferência ${destino}: página sem dados embutidos (o site mudou?)`);
  const campanha = acharCampanha(JSON.parse(json));
  const textoBonus = String(campanha?.bonus ?? "");
  const descricao = semHtml(String(campanha?.longDescription ?? ""));
  const percentuais = [...`${textoBonus} ${descricao}`.matchAll(/(\d{1,3})\s*%/g)].map((m) => Number(m[1])).filter((n) => n > 0 && n <= 300);
  const validaAte = fimDaCampanha(descricao, agora);
  // Campanha que já terminou continua na página às vezes: não conta
  const vencida = !!validaAte && validaAte < hojeBrasilia(agora);
  const ativa = percentuais.length > 0 && !vencida;
  return {
    programa: "livelo",
    destino,
    paridade: null,
    bonusPercentual: ativa ? Math.max(...percentuais) : 0,
    bonusMinimo: ativa ? Math.min(...percentuais) : 0,
    validaAte: ativa ? validaAte : null,
    campanha: ativa ? (descricao || semHtml(textoBonus)).slice(0, 500) : null,
    url,
  };
}
