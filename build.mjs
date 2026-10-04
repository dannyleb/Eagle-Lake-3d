import * as esbuild from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

await esbuild.build({
  entryPoints: ["src/main.js"],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: "iife",
  target: ["es2019"],
  outfile: "public/bundle.js",
  logLevel: "info",
});

// Cache-busting: stamp content hashes onto the script and stylesheet links
// so a browser can never pair a fresh index.html with a stale bundle.js
// (GitHub Pages lets browsers cache files for ~10 minutes). The same hash
// shows on the start screen as the build number.
const hash = (f) => createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 8);
const js = hash("public/bundle.js"), css = hash("public/style.css");
const htmlPath = "public/index.html";
const html = readFileSync(htmlPath, "utf8")
  .replace(/bundle\.js(\?v=\w+)?"/, `bundle.js?v=${js}"`)
  .replace(/style\.css(\?v=\w+)?"/, `style.css?v=${css}"`)
  .replace(/(<span id="buildTag">)[^<]*(<\/span>)/, `$1build ${js}$2`);
writeFileSync(htmlPath, html);
console.log(`  stamped bundle.js?v=${js}, style.css?v=${css}`);
