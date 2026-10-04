import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const entries = await readdir(root, { withFileTypes: true });
const pages = entries.filter((e) => e.isFile() && e.name.endsWith(".html")).map((e) => e.name).sort();

const errors = [];
const warnings = [];

for (const page of pages) {
  const html = await readFile(join(root, page), "utf8");
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1]?.trim();
  const h1s = [...html.matchAll(/<h1\b[^>]*>/gi)].length;

  if (!title) errors.push(`${page}: missing <title>`);
  if (!description) errors.push(`${page}: missing meta description`);
  if (h1s !== 1) warnings.push(`${page}: expected 1 H1, found ${h1s}`);

  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = match[1];
    if (!/\balt\s*=/.test(attrs)) warnings.push(`${page}: image without alt attribute`);
  }

  if (/(?:href|src)=["'][^"']+\.html(?:["'#])/i.test(html)) {
    warnings.push(`${page}: legacy .html internal URL found; prefer clean route`);
  }
}

const robots = await readFile(join(root, "robots.txt"), "utf8");
if (!/Sitemap:\s*https:\/\/aquachemlabs\.com\/sitemap\.xml/i.test(robots)) {
  errors.push("robots.txt: missing sitemap declaration");
}

const sitemap = await readFile(join(root, "sitemap.xml"), "utf8");
for (const route of ["/", "/about-us", "/services", "/products", "/ro-plant", "/plant-care-guide", "/contact"]) {
  if (!sitemap.includes(`https://aquachemlabs.com${route}`)) {
    errors.push(`sitemap.xml: missing ${route}`);
  }
}

console.log(`Checked ${pages.length} HTML pages.`);
if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length) {
  console.error("\nErrors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("\nSite structure checks passed.");
