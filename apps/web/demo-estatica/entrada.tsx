// Versão estática do app (uma página só), com os dados reais da última coleta
// embutidos. Mesmas telas e componentes do app Next.js.
import { createRoot } from "react-dom/client";
import { useEffect, useState, type FormEvent } from "react";
import { encontrarCategoria, normalizarTermo, type Categoria, type LojaDoDia, type PalavraChave } from "@milhas/core";
import { coletadoEm, fonteArquivo } from "@/lib/dados/arquivo";
import { melhoresDoDia, ordenarLojas } from "@/lib/dados/comum";
import { montarRespostaHistorico } from "@/lib/historico";
import { BarraCategorias, BotoesCategoria, CampoBusca, NomePrograma, Valor } from "@/components/Comuns";
import { ListaLojas } from "@/components/ListaLojas";
import type { CarregarHistorico } from "@/components/GraficoLoja";
import Transferencias from "@/app/transferencias/page";
import Link, { navegar } from "./link";

const carregarHistorico: CarregarHistorico = (slug) =>
  fonteArquivo.historico(slug).then((h) => (h ? montarRespostaHistorico(h) : Promise.reject(new Error("loja"))));

interface Base {
  categorias: Categoria[];
  lojas: LojaDoDia[];
  palavras: PalavraChave[];
  porCategoria: Record<string, LojaDoDia[]>;
}

const atualizado = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(coletadoEm));

function Inicio({ base }: { base: Base }) {
  const top = melhoresDoDia(base.lojas, 5);
  return (
    <main>
      <BarraCategorias categorias={base.categorias} />
      <h1>Onde comprar hoje</h1>
      <p className="sub">
        {base.lojas.length} lojas parceiras da Livelo e da Esfera. Atualizado em {atualizado}.
      </p>
      <CampoBusca />
      <h2>Melhores de hoje</h2>
      <div className="cartao">
        <ol className="destaques">
          {top.map((d, i) => (
            <li key={`${d.parceiro.id}-${d.programa}`}>
              <span className="posicao">{i + 1}</span>
              <span className="nome">{d.parceiro.nome}</span>
              <NomePrograma programa={d.programa} />
              <Valor pontos={d.pontos} />
            </li>
          ))}
        </ol>
      </div>
      <Link href="/transferencias" className="atalho">
        <span>
          Transferir para milhas
          <small>Bônus de hoje para LATAM Pass, Smiles e Azul</small>
        </span>
        <span aria-hidden>›</span>
      </Link>
    </main>
  );
}

function PaginaCategoria({ base, id, q }: { base: Base; id: string; q?: string }) {
  const categoria = base.categorias.find((c) => c.id === id);
  const lojas = ordenarLojas(base.porCategoria[id] ?? []);
  return (
    <main>
      <BarraCategorias categorias={base.categorias} ativa={id} />
      <CampoBusca key={q} valor={q} />
      <h1>{categoria?.nome ?? "Categoria"}</h1>
      <p className="sub">
        {lojas.length} lojas parceiras hoje{q ? ` para "${q}"` : ""}, ordenadas pela pontuação. Toque numa loja para ver detalhes e histórico.
      </p>
      <ListaLojas key={id} lojas={lojas} carregarHistorico={carregarHistorico} />
    </main>
  );
}

function App() {
  const [rota, setRota] = useState("/");
  const [base, setBase] = useState<Base | null>(null);

  useEffect(() => {
    (async () => {
      const [categorias, lojas, palavras] = await Promise.all([fonteArquivo.categorias(), fonteArquivo.lojasDeHoje(), fonteArquivo.palavrasChave()]);
      const porCategoria: Record<string, LojaDoDia[]> = {};
      for (const c of categorias) porCategoria[c.id] = await fonteArquivo.lojasDaCategoria(c.id);
      setBase({ categorias, lojas, palavras, porCategoria });
    })();
    const ouvir = (e: Event) => {
      setRota((e as CustomEvent<string>).detail);
      window.scrollTo(0, 0);
    };
    window.addEventListener("navegar", ouvir);
    return () => window.removeEventListener("navegar", ouvir);
  }, []);

  const url = new URL(rota, "https://app.local");
  const q = url.searchParams.get("q") ?? undefined;
  useEffect(() => {
    if (!base || url.pathname !== "/busca" || !q) return;
    const categoria = encontrarCategoria(q, base.palavras);
    if (categoria) setRota(`/categoria/${categoria}?q=${encodeURIComponent(q)}`);
  }, [rota, base]);

  const aoBuscar = (e: FormEvent<HTMLDivElement>) => {
    const form = e.target as HTMLFormElement;
    if (form.tagName !== "FORM") return;
    e.preventDefault();
    navegar(`/busca?q=${encodeURIComponent(String(new FormData(form).get("q") ?? ""))}`);
  };

  let tela = <p className="carregando">Carregando…</p>;
  if (base) {
    if (url.pathname.startsWith("/categoria/")) tela = <PaginaCategoria key={rota} base={base} id={url.pathname.split("/")[2]!} q={q} />;
    else if (url.pathname === "/transferencias") tela = <Transferencias />;
    else if (url.pathname === "/busca")
      tela = (
        <main>
          <BarraCategorias categorias={base.categorias} />
          <CampoBusca key={q} valor={q} />
          <h1>{normalizarTermo(q ?? "") ? `Não encontramos "${q}"` : "O que você procura?"}</h1>
          <p className="sub">Escolha uma categoria:</p>
          <BotoesCategoria categorias={base.categorias} />
        </main>
      );
    else tela = <Inicio base={base} />;
  }

  return (
    <div className="container" onSubmitCapture={aoBuscar}>
      <header className="topo">
        <Link href="/" className="marca">
          Pontos <span>por Real</span>
        </Link>
      </header>
      {tela}
      <footer className="rodape">Dados coletados dos sites da Livelo e da Esfera em {atualizado}. Confira sempre no site do programa antes de comprar.</footer>
    </div>
  );
}

createRoot(document.getElementById("raiz")!).render(<App />);
