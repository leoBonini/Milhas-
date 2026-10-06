import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ tamanho: "192" }, { tamanho: "512" }];
}

/** Ícone do PWA gerado no build (sem arquivo binário no repositório). */
export async function GET(_req: Request, { params }: { params: Promise<{ tamanho: string }> }) {
  const lado = (await params).tamanho === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f5fae",
          color: "#ffffff",
          fontSize: lado * 0.34,
          fontWeight: 800,
          letterSpacing: -lado * 0.01,
        }}
      >
        pts
      </div>
    ),
    { width: lado, height: lado },
  );
}
