"use client";

import { useEffect, useState } from "react";
import { melhorValor, type LojaDoDia } from "@milhas/core";
import { Valor } from "./Comuns";
import { GraficoLoja, type CarregarHistorico } from "./GraficoLoja";

export function ListaLojas({
  lojas,
  abertaInicial,
  carregarHistorico,
}: {
  lojas: LojaDoDia[];
  abertaInicial?: string;
  carregarHistorico?: CarregarHistorico;
}) {
  const [aberta, setAberta] = useState<string | undefined>(abertaInicial);

  useEffect(() => {
    if (abertaInicial) document.getElementById(`loja-${abertaInicial}`)?.scrollIntoView({ block: "start" });
  }, [abertaInicial]);

  if (!lojas.length) return <p className="sub">Nenhuma loja cadastrada nesta categoria ainda.</p>;

  return (
    <div className="cartao">
      <div className="cabecalho-lista">
        <span className="sub" style={{ margin: 0 }}>Loja</span>
        <span className="programa livelo">Livelo</span>
        <span className="programa esfera">Esfera</span>
      </div>
      {lojas.map((l) => {
        const estaAberta = aberta === l.parceiro.slug;
        const melhor = melhorValor(l);
        return (
          <div key={l.parceiro.id} id={`loja-${l.parceiro.slug}`} className={`loja${estaAberta ? " aberta" : ""}`}>
            <button
              className="linha-loja"
              aria-expanded={estaAberta}
              onClick={() => setAberta(estaAberta ? undefined : l.parceiro.slug)}
            >
              <span className="nome">
                <span className="seta" aria-hidden>▶</span>
                {l.parceiro.nome}
              </span>
              <Valor pontos={l.livelo} destaque={l.livelo != null && l.livelo === melhor} />
              <Valor pontos={l.esfera} destaque={l.esfera != null && l.esfera === melhor} />
            </button>
            {estaAberta && <GraficoLoja slug={l.parceiro.slug} carregar={carregarHistorico} />}
          </div>
        );
      })}
    </div>
  );
}
