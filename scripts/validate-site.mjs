import { readdir, readFile, access } from "node:fs/promises";
import { join, posix } from "node:path";

const root = process.cwd();
const entries = await readdir(root, { withFileTypes: true });
const pages = entries.filter((e) => e.isFile() && e.name.endsWith(".html")).map((e) => e.name).sort();

const errors = [];
const warnings = [];
const routeMap = {
  "/": "index.html",
  "/about-us": "about-us.html",
  "/services": "services.html",
  "/products": "products.html",
  "/ro-plant": "ro-plant.html",
  "/etp-plant": "etp-plant.html",
  "/stp-plant": "stp-plant.html",
  "/dm-plant": "dm-plant.html",
  "/softener-plant": "softener-plant.html",
  "/filtration-systems": "filtration-systems.html",
  "/boiler-water-treatment": "boiler-water-treatment.html",
  "/cooling-tower-water-treatment": "cooling-tower-water-treatment.html",
  "/zld-plant": "zld-plant.html",
  "/chemicals": "chemicals.html",
  "/plant-spares": "plant-spares.html",
  "/ibr-valves": "ibr-valves.html",
  "/strainers-kits": "strainers-kits.html",
  "/boiler-spares": "boiler-spares.html",
  "/plant-care-guide": "plant-care-guide.html",
  "/gallery": "gallery.html",
  "/reviews": "reviews.html",
  "/brochure": "brochure.html",
  "/contact": "contact.html",
  "/privacy-policy": "privacy-policy.html",
  "/terms": "terms.html",
  "/review-admin": "review-admin.html",
  "/image-credits": "image-credits.html",
  "/projects": "projects.html",
  "/plant-chemical-guide": "plant-chemical-guide.html",
};

async function exists(relativePath) {
  try {
    await access(join(root, relativePath.replace(/^\//, "")));
    return true;
  } catch {
    return false;
  }
}

function isExternal(value) {
  return /^(?:https?:|mailto:|tel:|javascript:|data:|blob:|whatsapp:)/i.test(value);
}

async function validateLink(page, rawValue) {
  const value = rawValue.trim();
  if (!value || value.startsWith("#") || isExternal(value)) return;

  const [pathname] = value.split(/[?#]/, 1);
  if (!pathname) return;

  if (pathname.startsWith("/")) {
    if (pathname.startsWith("/api/")) return;
    if (routeMap[pathname]) {
      if (!(await exists(routeMap[pathname]))) errors.push(`${page}: route ${pathname} maps to missing ${routeMap[pathname]}`);
      return;
    }
    if (!(await exists(pathname))) errors.push(`${page}: missing internal target ${pathname}`);
    return;
  }

  if (pathname.endsWith(".html")) {
    warnings.push(`${page}: legacy relative .html URL found: ${pathname}`);
    return;
  }
  if (!(await exists(pathname))) errors.push(`${page}: missing local asset ${pathname}`);
}

for (const page of pages) {
  const html = await readFile(join(root, page), "utf8");
  const title = html.match(/<title>([\\s\\S]*?)<\\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1]?.trim();
  const h1s = [...html.matchAll(/<h1\b[^>]*>/gi)].length;

  if (!title) errors.push(`${page}: missing <title>`);
  if (!description) errors.push(`${page}: missing meta description`);
  if (h1s !== 1) warnings.push(`${page}: expected 1 H1, found ${h1s}`);

  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = match[1];
    if (!/\balt\s*=/.test(attrs)) warnings.push(`${page}: image without alt attribute`);
  }

  for (const match of html.matchAll(/<(?:a|area)\\b[^>]*href=["']([^"']+)["']/gi)) {
    await validateLink(page, match[1]);
  }
  for (const match of html.matchAll(/<script\\b[^>]+src=["']([^"']+)["']/gi)) {
    await validateLink(page, match[1]);
  }
  for (const match of html.matchAll(/<link\\b[^>]+href=["']([^"']+)["']/gi)) {
    await validateLink(page, match[1]);
  }
  for (const match of html.matchAll(/<img\\b[^>]+src=["']([^"']+)["']/gi)) {
    await validateLink(page, match[1]);
  }

  if (/(?:href|src)=["'][^"']+\\.html(?:["'#])/i.test(html)) {
    warnings.push(`${page}: legacy .html internal URL found; prefer clean route`);
  }
}

const robots = await readFile(join(root, "robots.txt"), "utf8");
if (!/Sitemap:\s*https:\/\/aquachemlabs\.com\/sitemap\.xml/i.test(robots)) {
  errors.push("robots.txt: missing sitemap declaration");
}

const sitemap = await readFile(join(root, "sitemap.xml"), "utf8");
for (const route of ["/", "/about-us", "/services", "/products", "/ro-plant", "/plant-care-guide", "/projects", "/plant-chemical-guide", "/contact"]) {
  if (!sitemap.includes(`https://aquachemlabs.com${route}`)) {
    errors.push(`sitemap.xml: missing ${route}`);
  }
}

const services = await readFile(join(root, "services.html"), "utf8");
const guides = [...services.matchAll(/<details class=["']service-guide["'][^>]*data-document=["']([^"']+)["']/gi)].map((m) => m[1]);
const directGuideLinks = [...services.matchAll(/<a class=["'][^"']*service-guide__link[^"']*["'][^>]+href=["']([^"']+)["']/gi)].map((m) => m[1]);
if (guides.length !== 10) errors.push(`services.html: expected 10 service technical guides, found ${guides.length}`);
if (directGuideLinks.length !== guides.length) errors.push("services.html: technical guide button count does not match guide count");
for (const target of guides) {
  if (!(await exists(target))) errors.push(`services.html: missing technical guide PDF ${target}`);
}
for (const target of directGuideLinks) {
  if (!guides.includes(target)) errors.push(`services.html: direct technical guide link is not mapped to a service PDF: ${target}`);
}
const chemistryLinks = [...services.matchAll(/href=["']\/plant-chemical-guide#[^"']+["']/gi)].length;
if (chemistryLinks !== guides.length) warnings.push(`services.html: expected one chemical programme link per service card; found ${chemistryLinks}`);

const contact = await readFile(join(root, "contact.html"), "utf8");
if (!/type=["']file["'][^>]+name=["']water_analysis["']/i.test(contact)) {
  warnings.push("contact.html: optional water-analysis upload field not found");
}

console.log(`Checked ${pages.length} HTML pages, local links/assets, service PDFs, sitemap and contact form.`);
if (warnings.length) {
  console.log("\\nWarnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length) {
  console.error("\\nErrors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("\\nSite structure checks passed.");
