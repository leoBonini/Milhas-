import Link from "next/link";
import { dados, melhoresDoDia } from "@/lib/dados";
import { AvisoDemonstracao, BotoesCategoria, CampoBusca, NomePrograma, Valor } from "@/components/Comuns";

// Os dados mudam no máximo 3 vezes por dia (coleta agendada): página regenerada a cada 5 min
export const revalidate = 300;

const CATEGORIA_INICIAL = "eletronicos";

export default async function Inicio() {
  const fonte = dados();
  const [categorias, lojas] = await Promise.all([fonte.categorias(), fonte.lojasDaCategoria(CATEGORIA_INICIAL)]);
  const top = melhoresDoDia(lojas, 5);

  return (
    <main>
      <AvisoDemonstracao ativo={fonte.demonstracao} />
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
          {!top.length && <li>Nenhuma pontuação coletada hoje ainda.</li>}
        </ol>
      </div>

      <h2>Categorias</h2>
      <BotoesCategoria categorias={categorias} />
    </main>
  );
}
