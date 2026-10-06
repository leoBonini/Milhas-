import { redirect } from "next/navigation";
import { encontrarCategoria, normalizarTermo } from "@milhas/core";
import { dados } from "@/lib/dados";
import { AvisoDemonstracao, BotoesCategoria, CampoBusca } from "@/components/Comuns";

export default async function Busca({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const fonte = dados();
  const termo = normalizarTermo(q);

  if (termo) {
    const categoria = encontrarCategoria(termo, await fonte.palavrasChave());
    if (categoria) redirect(`/categoria/${categoria}?q=${encodeURIComponent(q)}`);
  }

  return (
    <main>
      <AvisoDemonstracao ativo={fonte.demonstracao} />
      <CampoBusca valor={q} />
      <h1>{termo ? `Não encontramos "${q}"` : "O que você procura?"}</h1>
      <p className="sub">Escolha uma categoria:</p>
      <BotoesCategoria categorias={await fonte.categorias()} />
    </main>
  );
}
