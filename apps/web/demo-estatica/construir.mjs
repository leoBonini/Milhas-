// Gera um único HTML com a demonstração do app (para publicar como página estática).
// Uso: node demo-estatica/construir.mjs <arquivo-de-saida.html>
import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(aqui, "..");
const saida = process.argv[2] ?? path.join(web, "demo-estatica", "pontos-por-real.html");

const r = await build({
  entryPoints: [path.join(aqui, "entrada.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  tsconfig: path.join(web, "tsconfig.json"),
  alias: { "next/link": path.join(aqui, "link.tsx") },
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = await readFile(path.join(web, "app", "globals.css"), "utf8");

const html = `<title>Pontos por Real</title>
<meta name="description" content="Pontos por real das lojas parceiras Livelo e Esfera hoje, e bônus de transferência para milhas.">
<style>
${css}
</style>
<div id="raiz"></div>
<script>${js}</script>
`;
await writeFile(saida, html);
console.log(`${saida} (${(html.length / 1024).toFixed(0)} KB)`);
