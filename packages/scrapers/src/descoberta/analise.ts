// Análise das respostas JSON capturadas: procura listas de objetos que pareçam
// "parceiros com pontuação". Não presume formato: só pontua pela forma dos dados.

/** Lojas que esperamos encontrar (seed). Usadas só para pontuar candidatos. */
export const LOJAS_ESPERADAS = [
  "apple", "fast shop", "fastshop", "magalu", "magazine luiza", "casas bahia", "extra",
  "ponto", "amazon", "carrefour", "americanas", "samsung", "mercado livre", "kabum", "girafa",
];

const CHAVE_NOME = /^(name|nome|title|titulo|partner.?name|parceiro|store.?name|loja|displayname)$/i;
const CHAVE_PONTOS = /(point|ponto|pts|parity|paridade|multiplier|multiplicador|accrual|acumulo|rate|taxa|factor|fator|bonus)/i;
const CHAVE_CATEGORIA = /(categor|segment|department|departamento|tag|group|grupo)/i;
const CHAVE_ID = /^(id|_id|code|codigo|slug|partner.?id|partner.?code|store.?id)$/i;

export interface ListaCandidata {
  /** Caminho dentro do JSON, ex: "$.data.partners" */
  caminho: string;
  quantidade: number;
  chaves: string[];
  chavesNome: string[];
  chavesPontos: string[];
  chavesId: string[];
  chavesCategoria: string[];
  /** Todos os itens da lista (para extrair nome/pontos/categoria no relatório) */
  itens: Record<string, unknown>[];
  lojasEncontradas: string[];
  pontuacao: number;
  exemplos: unknown[];
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Chaves de um objeto, incluindo um nível de aninhamento (ex: "pontuacao.valor"). */
function chavesAchatadas(obj: Record<string, unknown>): string[] {
  const chaves: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    chaves.push(k);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const k2 of Object.keys(v as Record<string, unknown>)) chaves.push(`${k}.${k2}`);
    }
  }
  return chaves;
}

function ultimoSegmento(chave: string): string {
  return chave.split(".").pop() ?? chave;
}

function avaliarLista(caminho: string, lista: unknown[]): ListaCandidata | undefined {
  const objetos = lista.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x));
  if (objetos.length < 3 || objetos.length < lista.length * 0.8) return undefined;

  // Chaves presentes em pelo menos metade dos itens
  const contagem = new Map<string, number>();
  for (const o of objetos) for (const k of chavesAchatadas(o)) contagem.set(k, (contagem.get(k) ?? 0) + 1);
  const chaves = [...contagem].filter(([, n]) => n >= objetos.length / 2).map(([k]) => k);

  const chavesNome = chaves.filter((k) => CHAVE_NOME.test(ultimoSegmento(k)));
  const chavesPontos = chaves.filter((k) => CHAVE_PONTOS.test(k));
  const chavesId = chaves.filter((k) => CHAVE_ID.test(ultimoSegmento(k)));
  const chavesCategoria = Object.keys(objetos[0] ?? {}).filter((k) => CHAVE_CATEGORIA.test(k));

  const textoLista = normalizar(JSON.stringify(objetos));
  // Palavra inteira: evita que a loja "Ponto" case com a chave "pontos"
  const lojasEncontradas = LOJAS_ESPERADAS.filter((l) => new RegExp(`(^|[^a-z])${l}([^a-z]|$)`).test(textoLista));

  let pontuacao = 0;
  if (chavesNome.length) pontuacao += 3;
  if (chavesPontos.length) pontuacao += 4;
  if (chavesId.length) pontuacao += 1;
  pontuacao += Math.min(lojasEncontradas.length, 6);
  if (objetos.length >= 20) pontuacao += 2;

  return {
    caminho,
    quantidade: objetos.length,
    chaves,
    chavesNome,
    chavesPontos,
    chavesId,
    chavesCategoria,
    itens: objetos,
    lojasEncontradas,
    pontuacao,
    exemplos: objetos.slice(0, 2),
  };
}

/** Percorre o JSON e devolve todas as listas de objetos, ordenadas pela pontuação. */
export function encontrarListasCandidatas(json: unknown, limiteProfundidade = 8): ListaCandidata[] {
  const resultado: ListaCandidata[] = [];
  const visitar = (valor: unknown, caminho: string, profundidade: number) => {
    if (profundidade > limiteProfundidade || !valor || typeof valor !== "object") return;
    if (Array.isArray(valor)) {
      const candidata = avaliarLista(caminho, valor);
      if (candidata) resultado.push(candidata);
      // Também desce no primeiro item: listas dentro de listas (ex: categorias > parceiros)
      if (valor.length) visitar(valor[0], `${caminho}[0]`, profundidade + 1);
      return;
    }
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) visitar(v, `${caminho}.${k}`, profundidade + 1);
  };
  visitar(json, "$", 0);
  return resultado.sort((a, b) => b.pontuacao - a.pontuacao);
}

/**
 * Padrões de texto de pontuação usados nos sites e blogs.
 * Ex: "10 pontos por real", "até 7 pts/R$", "8x1", "paridade de 10×1".
 */
export const REGEX_TEXTO_PONTOS =
  /(at[eé]\s+)?(\d+(?:[.,]\d+)?)\s*(?:pontos?|pts?)\s*(?:por|\/|a cada)\s*(?:r\$|real|reais)|(\d+(?:[.,]\d+)?)\s*[x×]\s*1\b/i;

function lerCaminho(obj: Record<string, unknown>, chave: string): unknown {
  return chave.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function resumirValor(v: unknown): string {
  if (v == null) return "";
  if (typeof v !== "object") return String(v);
  if (Array.isArray(v)) return v.map(resumirValor).filter(Boolean).join(", ").slice(0, 120);
  const o = v as Record<string, unknown>;
  const nome = o.name ?? o.nome ?? o.title ?? o.label ?? o.id;
  return nome != null ? String(nome) : JSON.stringify(v).slice(0, 120);
}

/** Uma linha por item: nome | campos de pontos | campos de categoria. */
export function linhasDosItens(c: ListaCandidata): string[] {
  const colunas = [...c.chavesNome.slice(0, 1), ...c.chavesPontos, ...c.chavesCategoria, ...c.chavesId.slice(0, 1)];
  const unicas = [...new Set(colunas)];
  return [
    unicas.join(" | "),
    ...c.itens.map((item) => unicas.map((k) => resumirValor(lerCaminho(item, k)).replace(/\s+/g, " ")).join(" | ")),
  ];
}
