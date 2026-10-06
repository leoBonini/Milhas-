"use client";

import { useEffect, useState } from "react";
import { melhorValor, type LojaDoDia } from "@milhas/core";
import { formatarPontos } from "@milhas/core";
import { NomePrograma, Valor } from "./Comuns";
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
            {estaAberta && (
              <>
                <Ofertas loja={l} />
                <GraficoLoja slug={l.parceiro.slug} carregar={carregarHistorico} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Regra de cada programa e link para comprar pela loja via Livelo/Esfera (é o link que garante os pontos). */
function Ofertas({ loja }: { loja: LojaDoDia }) {
  const lista = (["livelo", "esfera"] as const).flatMap((p) => (loja.ofertas?.[p] ? [{ programa: p, o: loja.ofertas[p]! }] : []));
  if (!lista.length) return null;
  return (
    <div className="detalhe ofertas">
      {lista.map(({ programa, o }) => (
        <div key={programa} className="oferta">
          <span>
            <NomePrograma programa={programa} /> <b>{formatarPontos(o.pontosPorReal)} pts/R$</b>
            {o.promocao && <span className="selo">promoção</span>}
          </span>
          <span className="regra">
            {o.regra}
            {o.escopo !== "loja toda" ? ` · ${o.escopo}` : ""}
          </span>
          {o.url && (
            <a href={o.url} target="_blank" rel="noopener noreferrer">
              Ir pela {programa === "livelo" ? "Livelo" : "Esfera"}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
