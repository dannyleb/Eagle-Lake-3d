// Build: bundle src/ with esbuild and assemble the site in dist/ (what
// GitHub Pages serves). public/ holds the static files (page, styles,
// audio) and is copied over as-is.
//
//   node build.mjs           one production build into dist/
//   node build.mjs --serve   dev server on http://localhost:8080 that
//                            rebuilds the bundle on every page load
import * as esbuild from "esbuild";
import { createHash } from "node:crypto";
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const OUT = "dist";
const serve = process.argv.includes("--serve");

const options = {
  entryPoints: ["src/main.js"],
  bundle: true,
  minify: !serve,
  sourcemap: serve,
  format: "iife",
  target: ["es2019"],
  outfile: `${OUT}/bundle.js`,
  logLevel: "info",
};

rmSync(OUT, { recursive: true, force: true });
cpSync("public", OUT, { recursive: true });

if (serve) {
  const ctx = await esbuild.context(options);
  const { port } = await ctx.serve({ servedir: OUT, port: 8080 });
  console.log(`  dev server: http://localhost:${port}/  (edits to public/ need a restart)`);
} else {
  await esbuild.build(options);

  // Cache-busting: stamp content hashes onto the script and stylesheet links
  // so a browser can never pair a fresh index.html with a stale bundle.js
  // (GitHub Pages lets browsers cache files for ~10 minutes). The same hash
  // shows on the start screen as the build number.
  const hash = (f) => createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 8);
  const js = hash(`${OUT}/bundle.js`), css = hash(`${OUT}/style.css`);
  const htmlPath = `${OUT}/index.html`;
  const html = readFileSync(htmlPath, "utf8")
    .replace(/bundle\.js(\?v=\w+)?"/, `bundle.js?v=${js}"`)
    .replace(/style\.css(\?v=\w+)?"/, `style.css?v=${css}"`)
    .replace(/(<span id="buildTag">)[^<]*(<\/span>)/, `$1build ${js}$2`);
  writeFileSync(htmlPath, html);
  console.log(`  stamped bundle.js?v=${js}, style.css?v=${css}`);
}
