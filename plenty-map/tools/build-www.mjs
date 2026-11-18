// Copies the web app into www/ for the phone apps. The apps carry everything except the map tiles,
// which they read from our own site, so the app's CSP gets that one extra address.
import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

const SITE_ORIGIN = "https://plentymap.com"; // keep in step with SITE in js/config.js
const root = new URL("..", import.meta.url).pathname;
const out = join(root, "www");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const f of ["index.html", "favicon.ico", "css", "js", "fonts", "icons", "i18n", "vendor", "data"]) {
  await cp(join(root, f), join(out, f), { recursive: true, filter: s => !s.includes(join("data", "tiles")) });
}
let html = await readFile(join(out, "index.html"), "utf8");
html = html
  .replace("connect-src 'self'", `connect-src 'self' ${SITE_ORIGIN}`)
  .replace(/<link rel="manifest"[^>]*>\n?/, "");
await writeFile(join(out, "index.html"), html);
console.log("www/ ready");
