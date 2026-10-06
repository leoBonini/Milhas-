// Versão estática do app para demonstração: mesmas telas e componentes,
// com os dados de demonstração gerados no próprio navegador.
import { createRoot } from "react-dom/client";
import { useEffect, useState, type FormEvent } from "react";
import { encontrarCategoria, normalizarTermo, type Categoria, type LojaDoDia } from "@milhas/core";
import { fonteDemo } from "@/lib/dados/demo";
import { melhoresDoDia, ordenarLojas } from "@/lib/dados/comum";
import { montarRespostaHistorico } from "@/lib/historico";
import { AvisoDemonstracao, BotoesCategoria, CampoBusca, NomePrograma, Valor } from "@/components/Comuns";
import { ListaLojas } from "@/components/ListaLojas";
import type { CarregarHistorico } from "@/components/GraficoLoja";
import Link, { navegar } from "./link";

const carregarHistorico: CarregarHistorico = (slug) =>
  fonteDemo.historico(slug).then((h) => (h ? montarRespostaHistorico(h) : Promise.reject(new Error("loja"))));

const CATEGORIA_INICIAL = "eletronicos";

function Inicio({ categorias, lojas }: { categorias: Categoria[]; lojas: LojaDoDia[] }) {
  const top = melhoresDoDia(lojas, 5);
  return (
    <main>
      <AvisoDemonstracao ativo />
      <h1>Onde comprar hoje</h1>
      <p className="sub">Pontos por real que cada loja está pagando na Livelo e na Esfera.</p>
      <CampoBusca />
      <h2>Melhores de hoje em Eletrônicos</h2>
      <div className="cartao">
        <ol className="destaques">
          {top.map((d, i) => (
            <li key={`${d.parceiro.id}-${d.programa}`}>
              <span className="posicao">{i + 1}</span>
              <Link href={`/categoria/${CATEGORIA_INICIAL}?loja=${d.parceiro.slug}`} className="nome">
                {d.parceiro.nome}
              </Link>
              <NomePrograma programa={d.programa} />
              <Valor pontos={d.pontos} />
            </li>
          ))}
        </ol>
      </div>
      <h2>Categorias</h2>
      <BotoesCategoria categorias={categorias} />
    </main>
  );
}

function Busca({ q, categorias }: { q: string; categorias: Categoria[] }) {
  return (
    <main>
      <AvisoDemonstracao ativo />
      <CampoBusca key={q} valor={q} />
      <h1>{normalizarTermo(q) ? `Não encontramos "${q}"` : "O que você procura?"}</h1>
      <p className="sub">Escolha uma categoria:</p>
      <BotoesCategoria categorias={categorias} />
    </main>
  );
}

function PaginaCategoria({ categoria, lojas, q, loja }: { categoria: Categoria; lojas: LojaDoDia[]; q?: string; loja?: string }) {
  return (
    <main>
      <AvisoDemonstracao ativo />
      <CampoBusca key={q} valor={q} />
      <h1>{categoria.nome}</h1>
      <p className="sub">
        {q ? `Lojas para "${q}", ` : "Lojas "}ordenadas pela pontuação de hoje. Toque numa loja para ver o histórico.
      </p>
      <ListaLojas lojas={ordenarLojas(lojas)} abertaInicial={loja} carregarHistorico={carregarHistorico} />
    </main>
  );
}

function App() {
  const [rota, setRota] = useState("/");
  const [base, setBase] = useState<{ categorias: Categoria[]; lojas: LojaDoDia[]; palavras: Awaited<ReturnType<typeof fonteDemo.palavrasChave>> } | null>(null);

  useEffect(() => {
    Promise.all([fonteDemo.categorias(), fonteDemo.lojasDaCategoria(CATEGORIA_INICIAL), fonteDemo.palavrasChave()]).then(
      ([categorias, lojas, palavras]) => setBase({ categorias, lojas, palavras }),
    );
    const ouvir = (e: Event) => {
      setRota((e as CustomEvent<string>).detail);
      window.scrollTo(0, 0);
    };
    window.addEventListener("navegar", ouvir);
    return () => window.removeEventListener("navegar", ouvir);
  }, []);

  // A busca: se o termo casa com uma palavra-chave, vai direto para a categoria
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
    const termo = String(new FormData(form).get("q") ?? "");
    navegar(`/busca?q=${encodeURIComponent(termo)}`);
  };

  let tela = <p className="carregando">Carregando…</p>;
  if (base) {
    if (url.pathname.startsWith("/categoria/")) {
      const id = url.pathname.split("/")[2];
      const categoria = base.categorias.find((c) => c.id === id);
      tela = categoria ? (
        <PaginaCategoria key={rota} categoria={categoria} lojas={base.lojas} q={q} loja={url.searchParams.get("loja") ?? undefined} />
      ) : (
        <main><h1>Categoria não encontrada</h1></main>
      );
    } else if (url.pathname === "/busca") {
      tela = <Busca q={q ?? ""} categorias={base.categorias} />;
    } else {
      tela = <Inicio categorias={base.categorias} lojas={base.lojas} />;
    }
  }

  return (
    <div className="container" onSubmitCapture={aoBuscar}>
      <header className="topo">
        <Link href="/" className="marca">
          Pontos <span>por Real</span>
        </Link>
      </header>
      {tela}
      <footer className="rodape">Versão de demonstração com pontuações simuladas. Confira sempre no site do programa antes de comprar.</footer>
    </div>
  );
}

createRoot(document.getElementById("raiz")!).render(<App />);
