import { notFound } from "next/navigation";
import { dados, ordenarLojas } from "@/lib/dados";
import { formatarData, hojeBrasilia } from "@/lib/datas";
import { AvisoDemonstracao, BarraCategorias, CampoBusca } from "@/components/Comuns";
import { ListaLojas } from "@/components/ListaLojas";

export const revalidate = 300;

export default async function PaginaCategoria({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; loja?: string }>;
}) {
  const { id } = await params;
  const { q, loja } = await searchParams;
  const fonte = dados();
  const [categoria, categorias] = await Promise.all([fonte.categoria(id), fonte.categorias()]);
  if (!categoria) notFound();

  const lojas = ordenarLojas(await fonte.lojasDaCategoria(id));
  const hoje = hojeBrasilia();
  const ultima = lojas.map((l) => l.data).filter((d): d is string => !!d).sort().at(-1);

  return (
    <main>
      <BarraCategorias categorias={categorias} ativa={id} />
      <AvisoDemonstracao ativo={fonte.demonstracao} />
      <CampoBusca valor={q} />
      <h1>{categoria.nome}</h1>
      <p className="sub">
        {lojas.length
          ? `${lojas.length} ${lojas.length === 1 ? "loja parceira" : "lojas parceiras"} ${ultima && ultima !== hoje ? `em ${formatarData(ultima)}` : "hoje"}${q ? ` para "${q}"` : ""}, ordenadas pela pontuação. Toque numa loja para ver o histórico.`
          : "Nenhuma loja desta categoria é parceira da Livelo ou da Esfera hoje."}
      </p>
      {lojas.length > 0 && <ListaLojas lojas={lojas} abertaInicial={loja} />}
    </main>
  );
}
