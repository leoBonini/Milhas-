import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pontos por Real",
  description: "Quantos pontos Livelo e Esfera cada loja está pagando hoje, com histórico e melhor mês para comprar.",
  applicationName: "Pontos por Real",
  appleWebApp: { capable: true, title: "Pontos", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="container">
          <header className="topo">
            <Link href="/" className="marca">
              Pontos <span>por Real</span>
            </Link>
          </header>
          {children}
          <footer className="rodape">Pontuações coletadas dos sites da Livelo e da Esfera. Confira sempre no site do programa antes de comprar.</footer>
        </div>
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
