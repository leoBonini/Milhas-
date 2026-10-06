import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pontos por Real",
    short_name: "Pontos",
    description: "Quantos pontos Livelo e Esfera cada loja está pagando hoje.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6f4",
    theme_color: "#1f5fae",
    icons: [
      { src: "/icones/192", sizes: "192x192", type: "image/png" },
      { src: "/icones/512", sizes: "512x512", type: "image/png" },
      { src: "/icones/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
