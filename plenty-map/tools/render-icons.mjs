// One-time: renders the native app icons from the SVG masters (run locally; outputs are committed).
// Usage: NODE_PATH=$(npm root -g) node tools/render-icons.mjs
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)("playwright");
const root = new URL("..", import.meta.url).pathname;
const out = root + "icons/native/";
await mkdir(out, { recursive: true });
const svg = async f => (await readFile(root + "icons/" + f, "utf8")).replace(/<svg /, '<svg style="display:block;width:100%;height:100%" ');
const app = await svg("plenty-map-app-icon.svg"), mask = await svg("plenty-map-maskable.svg");
const b = await chromium.launch();
async function shot(markup, size, name) {
  const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<html><body style="margin:0;background:#1F3B2D">${markup}</body></html>`);
  await p.screenshot({ path: out + name, omitBackground: false });
  await p.close();
}
await shot(app, 1024, "ios-1024.png");
const D = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(D)) {
  await shot(app, Math.round(48 * k), `android-${d}-launcher.png`);
  await shot(mask, Math.round(108 * k), `android-${d}-foreground.png`);
}
await shot(app, 512, "play-512.png");
{ // launch screen: the mark, small, on the board color
  const mark = (await readFile(root + "icons/plenty-map-mark.svg", "utf8")).replace(/<svg /, '<svg style="width:520px;height:520px" ');
  await shot(`<div style="width:2732px;height:2732px;display:grid;place-items:center">${mark}</div>`, 2732, "splash-2732.png");
}
await b.close();
console.log("icons rendered");
