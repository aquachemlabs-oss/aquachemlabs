import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const htmlFiles = fs.readdirSync(root).filter(f => f.endsWith('.html') && f !== 'review-admin.html');

const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const strip = s => s.split('#')[0].split('?')[0];

function routeToFile(href) {
  const clean = strip(href);
  if (!clean || clean.startsWith('http') || clean.startsWith('//') || clean.startsWith('mailto:') || clean.startsWith('tel:') || clean.startsWith('javascript:')) return null;
  if (clean.startsWith('/')) {
    if (clean === '/') return 'index.html';
    if (clean.endsWith('.html') || clean.endsWith('.pdf') || clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.webp') || clean.endsWith('.svg') || clean.endsWith('.js') || clean.endsWith('.css')) return clean.slice(1);
    return clean.slice(1) + '.html';
  }
  if (clean.startsWith('#')) return null;
  return clean;
}

const titles = new Map();
const canonicals = new Map();

for (const file of htmlFiles) {
  const html = read(file);
  const title = html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]?.trim() || '';
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() || '';
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]?.trim() || '';
  const h1 = (html.match(/<h1(?:\\s|>)/gi) || []).length;

  if (!title) errors.push(file + ': missing <title>');
  else if (title.length < 20 || title.length > 70) warnings.push(file + ': title length ' + title.length);
  if (!description) errors.push(file + ': missing meta description');
  else if (description.length < 50 || description.length > 170) warnings.push(file + ': meta description length ' + description.length);
  if (!canonical) errors.push(file + ': missing canonical');
  if (h1 !== 1) errors.push(file + ': expected exactly one H1, found ' + h1);

  if (title) titles.set(title, [...(titles.get(title)||[]), file]);
  if (canonical) canonicals.set(canonical, [...(canonicals.get(canonical)||[]), file]);

  for (const match of html.matchAll(/<(?:a|link|script|img|iframe)[^>]+(?:href|src)=["']([^"']+)["']/gi)) {
    const target = routeToFile(match[1]);
    if (!target) continue;
    if (!fs.existsSync(path.join(root, target))) errors.push(file + ': missing local target ' + match[1]);
  }

  for (const match of html.matchAll(/<img\\b([^>]*)>/gi)) {
    if (!/\\balt=["'][^"']*["']/i.test(match[1])) warnings.push(file + ': image missing alt attribute');
  }

  for (const match of html.matchAll(/<script[^>]+type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi)) {
    try { JSON.parse(match[1].trim()); } catch { errors.push(file + ': invalid JSON-LD'); }
  }
}

for (const [title, files] of titles) if (files.length > 1) errors.push('duplicate title: ' + files.join(', '));
for (const [canonical, files] of canonicals) if (files.length > 1) errors.push('duplicate canonical: ' + canonical + ' => ' + files.join(', '));

if (fs.existsSync(path.join(root,'sitemap.xml'))) {
  const sitemap = read('sitemap.xml');
  for (const url of sitemap.matchAll(/<loc>([^<]+)<\\/loc>/g)) {
    const pathname = new URL(url[1]).pathname;
    const target = pathname === '/' ? 'index.html' : pathname.slice(1) + '.html';
    if (!fs.existsSync(path.join(root,target))) errors.push('sitemap target missing: ' + url[1]);
  }
}

console.log('Aqua Chem Labs repository audit');
console.log('HTML pages checked:', htmlFiles.length);
console.log('Errors:', errors.length);
console.log('Warnings:', warnings.length);
warnings.slice(0,80).forEach(x => console.log('WARN', x));
errors.forEach(x => console.error('ERROR', x));
if (errors.length) process.exit(1);
