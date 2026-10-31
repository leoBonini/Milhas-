import { formatarPontos } from "@milhas/core";
import type { PromocaoDoDia } from "@/lib/dados/comum";
import { NomePrograma, Valor } from "./Comuns";

/** Lista "Em promoção hoje": pontuação atual e a normal riscada. */
export function Promocoes({ promocoes }: { promocoes: PromocaoDoDia[] }) {
  if (!promocoes.length) return null;
  return (
    <>
      <h2>Em promoção hoje</h2>
      <div className="cartao">
        <ul className="destaques">
          {promocoes.map((p) => (
            <li key={`${p.parceiro.id}-${p.programa}`}>
              <span className="nome">{p.parceiro.nome}</span>
              <NomePrograma programa={p.programa} />
              <span className="normal">era {formatarPontos(p.base)}</span>
              <Valor pontos={p.pontos} destaque />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
