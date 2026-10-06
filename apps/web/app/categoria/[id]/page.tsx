import { notFound } from "next/navigation";
import { dados, ordenarLojas } from "@/lib/dados";
import { formatarData, hojeBrasilia } from "@/lib/datas";
import { AvisoDemonstracao, CampoBusca } from "@/components/Comuns";
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
  const categoria = await fonte.categoria(id);
  if (!categoria) notFound();

  const lojas = ordenarLojas(await fonte.lojasDaCategoria(id));
  const hoje = hojeBrasilia();
  const datas = [...new Set(lojas.map((l) => l.data).filter((d): d is string => !!d))].sort();
  const ultima = datas.at(-1);

  return (
    <main>
      <AvisoDemonstracao ativo={fonte.demonstracao} />
      <CampoBusca valor={q} />
      <h1>{categoria.nome}</h1>
      <p className="sub">
        {q ? `Lojas para "${q}", ` : "Lojas "}
        ordenadas pela pontuação {ultima && ultima !== hoje ? `de ${formatarData(ultima)}` : "de hoje"}. Toque numa loja para ver o histórico.
      </p>
      <ListaLojas lojas={lojas} abertaInicial={loja} />
    </main>
  );
}
