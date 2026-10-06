import Link from "next/link";
import { formatarPontos, type Categoria, type ProgramaId } from "@milhas/core";

export function AvisoDemonstracao({ ativo }: { ativo: boolean }) {
  if (!ativo) return null;
  return (
    <p className="aviso">
      <strong>Dados de demonstração.</strong> Os valores são simulados até a coleta da Livelo e da Esfera estar ligada.
    </p>
  );
}

export function CampoBusca({ valor = "" }: { valor?: string }) {
  return (
    <form className="busca" action="/busca" role="search">
      <input name="q" defaultValue={valor} placeholder="Ex: iPhone, notebook, TV" aria-label="Buscar produto" />
      <button type="submit">Buscar</button>
    </form>
  );
}

/** Barra de categorias no topo, rolável no celular. A ativa fica destacada. */
export function BarraCategorias({ categorias, ativa }: { categorias: Categoria[]; ativa?: string }) {
  return (
    <nav className="barra-categorias" aria-label="Categorias">
      {categorias.map((c) => (
        <Link key={c.id} href={`/categoria/${c.id}`} className="aba" aria-current={c.id === ativa ? "page" : undefined}>
          {c.nome}
        </Link>
      ))}
    </nav>
  );
}

export function BotoesCategoria({ categorias }: { categorias: Categoria[] }) {
  return (
    <nav className="categorias" aria-label="Categorias">
      {categorias.map((c) => (
        <Link key={c.id} href={`/categoria/${c.id}`} className="chip">
          {c.nome}
        </Link>
      ))}
    </nav>
  );
}

export function NomePrograma({ programa }: { programa: ProgramaId }) {
  return <span className={`programa ${programa}`}>{programa === "livelo" ? "Livelo" : "Esfera"}</span>;
}

export function Valor({ pontos, destaque }: { pontos: number | null; destaque?: boolean }) {
  if (pontos == null) return <span className="valor vazio">—</span>;
  return (
    <span className={`valor${destaque ? " melhor" : ""}`}>
      {formatarPontos(pontos)}
      <small>pts/R$</small>
    </span>
  );
}
