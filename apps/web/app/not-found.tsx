import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main>
      <h1>Página não encontrada</h1>
      <p className="sub">
        <Link href="/" className="melhor">Voltar ao início</Link>
      </p>
    </main>
  );
}
