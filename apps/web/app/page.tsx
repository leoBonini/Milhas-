import Link from "next/link";
import { dados, melhoresDoDia } from "@/lib/dados";
import { AvisoDemonstracao, BarraCategorias, CampoBusca, NomePrograma, Valor } from "@/components/Comuns";

// Os dados mudam no máximo 3 vezes por dia (coleta agendada): página regenerada a cada 5 min
export const revalidate = 300;

export default async function Inicio() {
  const fonte = dados();
  const [categorias, lojas] = await Promise.all([fonte.categorias(), fonte.lojasDeHoje()]);
  const top = melhoresDoDia(lojas, 5);

  return (
    <main>
      <BarraCategorias categorias={categorias} />
      <AvisoDemonstracao ativo={fonte.demonstracao} />
      <h1>Onde comprar hoje</h1>
      <p className="sub">
        {lojas.length} lojas parceiras da Livelo e da Esfera hoje. Escolha uma categoria acima ou busque um produto.
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
          {!top.length && <li>Nenhuma pontuação coletada hoje ainda.</li>}
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
