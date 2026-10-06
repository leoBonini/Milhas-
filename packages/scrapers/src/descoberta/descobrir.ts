// Fase 0: descoberta das fontes.
//
// Abre os sites da Livelo e da Esfera com Playwright, navega até as páginas de parceiros,
// grava todas as requisições XHR/fetch e aponta quais respostas JSON parecem ser
// "lista de parceiros com pontuação". Se nada for encontrado em JSON, registra
// elementos do HTML cujo texto parece pontuação, para servir de base aos seletores.
//
// Uso:
//   npm run descobrir                         # livelo e esfera
//   npm run descobrir -- --programa livelo
//   npm run descobrir -- --programa esfera --url https://.../pagina-de-parceiros
//   npm run descobrir -- --com-tela           # abre o navegador visível (útil se o site bloquear headless)
//
// Saída em saida/descoberta/<programa>/ (relatorio.md, requisicoes.json, corpos/, paginas/).

import { chromium, type Page, type Response } from "playwright";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { caminhoPermitido, interpretarRobots, type RegrasRobots } from "./robots.js";
import { encontrarListasCandidatas, REGEX_TEXTO_PONTOS, type ListaCandidata } from "./analise.js";

interface ConfigPrograma {
  id: "livelo" | "esfera";
  /** Páginas iniciais. Além delas, os links de parceiros encontrados são seguidos. */
  inicio: string[];
  /** Textos de link que levam às páginas de parceiros/pontuação */
  palavrasLink: RegExp;
}

const PROGRAMAS: ConfigPrograma[] = [
  {
    id: "livelo",
    // Página de parceiros informada pelo usuário em 2026-10-06
    inicio: ["https://www.livelo.com.br/juntar-pontos/todos-os-parceiros", "https://www.livelo.com.br/"],
    palavrasLink: /parceir|compre e pontue|ganhe pontos|ganhar pontos|shopping|lojas/i,
  },
  {
    id: "esfera",
    inicio: ["https://www.esfera.com.vc/"],
    palavrasLink: /parceir|acumul|compre e pontue|ganhe pontos|lojas|shopping/i,
  },
];

const USER_AGENT = process.env.COLETA_USER_AGENT ?? "MilhasBot/0.1 (descoberta de fontes; +https://github.com/leoBonini/Milhas-)";
const INTERVALO_MS = Number(process.env.COLETA_INTERVALO_MS ?? 3000);
const MAX_PAGINAS = 6;
const MAX_CORPO_BYTES = 5_000_000;
const PASTA_SAIDA = path.resolve(process.cwd(), process.env.DESCOBERTA_SAIDA ?? "../../saida/descoberta");

interface RequisicaoCapturada {
  n: number;
  pagina: string;
  metodo: string;
  url: string;
  status: number;
  tipoConteudo: string;
  tipoRecurso: string;
  /** Headers enviados, sem cookies nem tokens de sessão */
  headersRequisicao: Record<string, string>;
  corpoRequisicao?: string;
  tamanho: number;
  arquivoCorpo?: string;
  candidatas: ListaCandidata[];
}

interface GrupoHtml {
  seletor: string;
  quantidade: number;
  exemplos: string[];
}

interface PaginaVisitada {
  url: string;
  status: number | null;
  titulo: string;
  arquivoHtml: string;
  arquivoPrint: string;
  gruposHtml: GrupoHtml[];
  erro?: string;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

const HEADERS_SENSIVEIS = /^(cookie|authorization|x-csrf|x-xsrf|x-auth|x-api-key|x-access-token)/i;

function limparHeaders(h: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(h).filter(([k]) => !HEADERS_SENSIVEIS.test(k) && !k.startsWith(":")));
}

async function lerRobots(origem: string): Promise<RegrasRobots | undefined> {
  try {
    const r = await fetch(new URL("/robots.txt", origem), { headers: { "user-agent": USER_AGENT } });
    if (!r.ok) return undefined;
    return interpretarRobots(await r.text(), "MilhasBot");
  } catch {
    return undefined;
  }
}

/** Rola a página devagar para disparar carregamentos preguiçosos (lazy load). */
async function rolarAteOFim(page: Page) {
  for (let i = 0; i < 12; i++) {
    const chegouAoFim = await page.evaluate(
      "window.scrollBy(0, window.innerHeight), window.innerHeight + window.scrollY >= document.body.scrollHeight - 10",
    );
    await esperar(700);
    if (chegouAoFim) break;
  }
}

// Roda dentro do navegador. Fica como texto porque o tsx injeta helpers (__name)
// em funções TypeScript, e eles não existem no contexto da página.
const SCRIPT_GRUPOS_HTML = `(fonteRegex) => {
  const regex = new RegExp(fonteRegex, "i");
  const caminhoCss = (el) => {
    const partes = [];
    let atual = el;
    for (let i = 0; atual && i < 4 && atual !== document.body; i++) {
      const classes = [...atual.classList].filter((c) => !/\\d{3,}|^(active|selected|hover)$/.test(c)).slice(0, 2);
      partes.unshift(atual.tagName.toLowerCase() + classes.map((c) => "." + CSS.escape(c)).join(""));
      atual = atual.parentElement;
    }
    return partes.join(" > ");
  };
  const grupos = new Map();
  for (const el of document.querySelectorAll("body *")) {
    const texto = (el.innerText || "").trim();
    if (!texto || texto.length > 200 || !regex.test(texto)) continue;
    // Só a folha: ignora elementos cujos filhos também casam
    if ([...el.children].some((f) => regex.test(f.innerText || ""))) continue;
    const seletor = caminhoCss(el);
    const g = grupos.get(seletor) || { quantidade: 0, exemplos: [] };
    g.quantidade++;
    if (g.exemplos.length < 3) g.exemplos.push(texto.replace(/\\s+/g, " "));
    grupos.set(seletor, g);
  }
  return [...grupos].map(([seletor, g]) => ({ seletor, ...g })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);
}`;

/** Agrupa elementos do HTML cujo texto parece pontuação ("10 pontos por real", "8x1"). */
async function gruposDeTextoDePontos(page: Page): Promise<GrupoHtml[]> {
  return page.evaluate(`(${SCRIPT_GRUPOS_HTML})(${JSON.stringify(REGEX_TEXTO_PONTOS.source)})`) as Promise<GrupoHtml[]>;
}

async function descobrir(programa: ConfigPrograma, urlsExtras: string[], comTela: boolean) {
  const pasta = path.join(PASTA_SAIDA, programa.id);
  await mkdir(path.join(pasta, "corpos"), { recursive: true });
  await mkdir(path.join(pasta, "paginas"), { recursive: true });

  const origem = new URL(urlsExtras[0] ?? programa.inicio[0]!).origin;
  const robots = await lerRobots(origem);
  const intervalo = Math.max(INTERVALO_MS, (robots?.intervaloSegundos ?? 0) * 1000);
  const permitido = (url: string) => {
    const u = new URL(url);
    return !robots || u.origin !== origem || caminhoPermitido(robots, u.pathname + u.search);
  };

  const navegador = await chromium.launch({ headless: !comTela });
  const contexto = await navegador.newContext({
    userAgent: USER_AGENT,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1366, height: 900 },
  });
  const page = await contexto.newPage();

  const requisicoes: RequisicaoCapturada[] = [];
  const paginas: PaginaVisitada[] = [];
  const bloqueadasPorRobots: string[] = [];
  let paginaAtual = "";
  const pendentes: Promise<void>[] = [];

  page.on("response", (resposta: Response) => {
    const tarefa = (async () => {
      const req = resposta.request();
      const tipoRecurso = req.resourceType();
      const tipoConteudo = resposta.headers()["content-type"] ?? "";
      const pareceJson = /json/i.test(tipoConteudo);
      if (!(tipoRecurso === "xhr" || tipoRecurso === "fetch" || pareceJson)) return;

      const n = requisicoes.length + 1;
      const registro: RequisicaoCapturada = {
        n,
        pagina: paginaAtual,
        metodo: req.method(),
        url: req.url(),
        status: resposta.status(),
        tipoConteudo,
        tipoRecurso,
        headersRequisicao: limparHeaders(await req.allHeaders().catch(() => req.headers())),
        corpoRequisicao: req.postData() ?? undefined,
        tamanho: 0,
        candidatas: [],
      };
      requisicoes.push(registro);

      try {
        const corpo = await resposta.body();
        registro.tamanho = corpo.length;
        if (corpo.length > MAX_CORPO_BYTES) return;
        const texto = corpo.toString("utf8");
        let json: unknown;
        try {
          json = JSON.parse(texto);
        } catch {
          return;
        }
        registro.arquivoCorpo = `corpos/${String(n).padStart(3, "0")}.json`;
        await writeFile(path.join(pasta, registro.arquivoCorpo), JSON.stringify(json, null, 2));
        registro.candidatas = encontrarListasCandidatas(json).slice(0, 3);
      } catch {
        // Respostas de redirecionamento ou já descartadas não têm corpo
      }
    })();
    pendentes.push(tarefa);
  });

  const visitar = async (url: string) => {
    if (!permitido(url)) {
      bloqueadasPorRobots.push(url);
      return;
    }
    paginaAtual = url;
    const indice = paginas.length + 1;
    const visitada: PaginaVisitada = {
      url,
      status: null,
      titulo: "",
      arquivoHtml: `paginas/${String(indice).padStart(2, "0")}.html`,
      arquivoPrint: `paginas/${String(indice).padStart(2, "0")}.png`,
      gruposHtml: [],
    };
    paginas.push(visitada);
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      visitada.status = resp?.status() ?? null;
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
      await rolarAteOFim(page);
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      visitada.titulo = await page.title();
      visitada.gruposHtml = await gruposDeTextoDePontos(page);
      await writeFile(path.join(pasta, visitada.arquivoHtml), await page.content());
      await page.screenshot({ path: path.join(pasta, visitada.arquivoPrint), fullPage: true }).catch(() => undefined);
    } catch (e) {
      visitada.erro = e instanceof Error ? e.message.split("\n")[0] : String(e);
    }
    await esperar(intervalo);
  };

  // 1) Página inicial (ou as URLs passadas na linha de comando)
  const iniciais = urlsExtras.length ? urlsExtras : programa.inicio;
  for (const url of iniciais) await visitar(url);

  // 2) Links do próprio domínio cujo texto indica parceiros/pontuação (a partir da última página aberta)
  {
    const links = (await page
      .evaluate(`[...document.querySelectorAll("a[href]")].map((a) => ({ href: a.href, texto: (a.textContent || "").trim() }))`)
      .catch(() => [])) as { href: string; texto: string }[];
    const seguir = [
      ...new Set(
        links
          .filter((l) => programa.palavrasLink.test(l.texto) || programa.palavrasLink.test(l.href))
          .map((l) => l.href.split("#")[0]!)
          .filter((h) => h.startsWith(origem) && !paginas.some((p) => p.url === h)),
      ),
    ].slice(0, MAX_PAGINAS - 1);
    for (const url of seguir) await visitar(url);
  }

  await Promise.allSettled(pendentes);
  await navegador.close();

  await writeFile(
    path.join(pasta, "requisicoes.json"),
    JSON.stringify(requisicoes.map(({ candidatas, ...r }) => ({ ...r, candidatas: candidatas.map(({ exemplos, ...c }) => c) })), null, 2),
  );

  const relatorio = montarRelatorio(programa, robots, paginas, requisicoes, bloqueadasPorRobots);
  await writeFile(path.join(pasta, "relatorio.md"), relatorio);
  return { relatorio, paginas, requisicoes };
}

function montarRelatorio(
  programa: ConfigPrograma,
  robots: RegrasRobots | undefined,
  paginas: PaginaVisitada[],
  requisicoes: RequisicaoCapturada[],
  bloqueadas: string[],
): string {
  const l: string[] = [];
  l.push(`## ${programa.id} — descoberta em ${new Date().toISOString()}`, "");
  l.push(`User agent: \`${USER_AGENT}\``, "");
  l.push("### robots.txt", "");
  if (!robots) l.push("Não foi possível ler (ausente ou bloqueado).");
  else {
    l.push(`Disallow aplicáveis: ${robots.bloquear.length ? robots.bloquear.map((b) => `\`${b}\``).join(", ") : "nenhum"}`);
    if (robots.intervaloSegundos) l.push(`Crawl-delay: ${robots.intervaloSegundos}s`);
  }
  if (bloqueadas.length) l.push("", `Páginas não visitadas por causa do robots.txt: ${bloqueadas.join(", ")}`);

  l.push("", "### Páginas visitadas", "", "| # | status | título | url | erro |", "|---|---|---|---|---|");
  paginas.forEach((p, i) => l.push(`| ${i + 1} | ${p.status ?? "-"} | ${p.titulo.replace(/\|/g, "/")} | ${p.url} | ${p.erro ?? ""} |`));

  const json = requisicoes.filter((r) => r.arquivoCorpo);
  l.push("", `### Requisições XHR/fetch: ${requisicoes.length} (com JSON: ${json.length})`, "");
  const candidatas = json
    .flatMap((r) => r.candidatas.map((c) => ({ r, c })))
    .filter(({ c }) => c.pontuacao >= 5)
    .sort((a, b) => b.c.pontuacao - a.c.pontuacao)
    .slice(0, 8);

  if (!candidatas.length) l.push("Nenhuma resposta JSON parece conter lista de parceiros com pontuação.");
  for (const { r, c } of candidatas) {
    l.push(`#### Candidato (pontuação ${c.pontuacao}): ${r.metodo} ${r.url}`, "");
    l.push(`- status ${r.status}, ${r.tipoConteudo}, ${r.tamanho} bytes, corpo salvo em \`${r.arquivoCorpo}\``);
    l.push(`- lista em \`${c.caminho}\` com ${c.quantidade} itens`);
    l.push(`- campos de nome: ${c.chavesNome.join(", ") || "-"} | pontos: ${c.chavesPontos.join(", ") || "-"} | id: ${c.chavesId.join(", ") || "-"}`);
    l.push(`- lojas conhecidas encontradas: ${c.lojasEncontradas.join(", ") || "-"}`);
    if (r.corpoRequisicao) l.push(`- corpo da requisição: \`${r.corpoRequisicao.slice(0, 300)}\``);
    l.push("- headers enviados:", "```json", JSON.stringify(r.headersRequisicao, null, 2), "```");
    l.push("- exemplo de item:", "```json", JSON.stringify(c.exemplos[0], null, 2).slice(0, 2500), "```", "");
  }

  l.push("", "### Todas as requisições JSON", "", "| # | método | status | bytes | url |", "|---|---|---|---|---|");
  for (const r of json) l.push(`| ${r.n} | ${r.metodo} | ${r.status} | ${r.tamanho} | ${r.url.slice(0, 180)} |`);

  l.push("", "### Texto de pontuação no HTML (alternativa se não houver JSON)", "");
  const comGrupos = paginas.filter((p) => p.gruposHtml.length);
  if (!comGrupos.length) l.push("Nenhum texto no formato \"X pontos por real\" / \"NxN\" encontrado.");
  for (const p of comGrupos) {
    l.push(`Em ${p.url}:`, "");
    for (const g of p.gruposHtml.slice(0, 5)) l.push(`- \`${g.seletor}\` (${g.quantidade}x): ${g.exemplos.map((e) => `"${e}"`).join(" · ")}`);
    l.push("");
  }
  return l.join("\n") + "\n";
}

async function principal() {
  const { values } = parseArgs({
    options: {
      programa: { type: "string", default: "todos" },
      url: { type: "string", multiple: true, default: [] },
      "com-tela": { type: "boolean", default: false },
    },
  });
  const escolhidos = PROGRAMAS.filter((p) => values.programa === "todos" || p.id === values.programa);
  if (!escolhidos.length) throw new Error(`Programa desconhecido: ${values.programa}`);
  if (values.url!.length && escolhidos.length > 1) throw new Error("--url exige --programa livelo ou --programa esfera");
  // --url troca as páginas iniciais; os links de parceiros encontrados nelas continuam sendo seguidos

  let falhou = false;
  for (const programa of escolhidos) {
    console.log(`\n>>> Descobrindo ${programa.id}...`);
    const { relatorio, paginas } = await descobrir(programa, values.url!, values["com-tela"]!);
    console.log(relatorio);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, relatorio);
    // Falha visível se nenhuma página carregou (site fora do ar, bloqueio de rede ou de bot)
    if (!paginas.some((p) => p.status !== null && p.status < 400)) {
      console.error(`ERRO: nenhuma página de ${programa.id} carregou com sucesso.`);
      falhou = true;
    }
  }
  console.log(`\nArquivos em ${PASTA_SAIDA}`);
  if (falhou) process.exit(1);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
