import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), fail=[], pass=[];
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const exists=f=>fs.existsSync(path.join(root,f));
const htmlFiles=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!['404.html','review-admin.html'].includes(f));
const routes=new Map([['/','index.html'],...htmlFiles.filter(f=>f!=='index.html').map(f=>['/'+f.replace(/\.html$/,''),f])]);
const sitemap=read('sitemap.xml'), robots=read('robots.txt'), redirects=read('_redirects');
const sitemapUrls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const sitemapPathSet=new Set(sitemapUrls.map(u=>new URL(u).pathname));
if(robots.includes('Sitemap: https://aquachemlabs.com/sitemap.xml')) pass.push('robots.txt declares sitemap'); else fail.push('robots.txt missing sitemap declaration');
if(!robots.includes('Disallow: /review-admin')||!robots.includes('Disallow: /api/')) fail.push('private/admin paths are not disallowed'); else pass.push('private/admin paths blocked');
if(!sitemapUrls.includes('https://aquachemlabs.com/')) fail.push('homepage missing from sitemap'); else pass.push('homepage present in sitemap');
for(const u of sitemapUrls){const p=new URL(u).pathname;if(p.endsWith('.pdf')){if(!exists(p.slice(1))) fail.push('sitemap PDF missing: '+p);} else if(!routes.has(p)) fail.push('sitemap route missing source: '+p);}
for(const f of htmlFiles){const h=read(f);const canonicalRoute=f==='index.html'?'/':'/'+f.replace(/\.html$/,'');const noindex=/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(h);if(noindex&&sitemapPathSet.has(canonicalRoute))fail.push(f+': noindex page must not be in sitemap');if(!noindex&&!sitemapPathSet.has(canonicalRoute))fail.push(f+': indexable canonical route missing from sitemap');const title=(h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.trim()||'';const desc=(h.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)||[])[1]?.trim()||'';const can=(h.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)||[])[1]||'';const h1=(h.match(/<h1(?:\s|>)/gi)||[]).length;
if(!title) fail.push(f+': missing title'); else if(title.length<30||title.length>65) fail.push(f+': title length '+title.length); 
if(!desc) fail.push(f+': missing description'); else if(desc.length<70||desc.length>165) fail.push(f+': description length '+desc.length);
if(!can.startsWith('https://aquachemlabs.com/')) fail.push(f+': canonical is not HTTPS/non-www'); if(/\.html(?:[?#]|$)/i.test(can)) fail.push(f+': canonical should use the clean extensionless route'); if(h1!==1) fail.push(f+': H1 count '+h1);
for(const m of h.matchAll(/<img\b([^>]*)>/gi)) if(!/\balt=["'][^"']*["']/i.test(m[1])) fail.push(f+': image missing alt');
}
const publicRoutes=[...routes.keys()].filter(x=>x!=='/review-admin');
for(const r of publicRoutes){if(!redirects.includes(r+' ' ) && r!=='/') fail.push('route missing redirect/rewrite mapping: '+r);}
if(!/http:\/\/aquachemlabs\.com\/\*/.test(redirects)||!/https:\/\/www\.aquachemlabs\.com\/\*/.test(redirects)) fail.push('HTTPS/www host redirects missing'); else pass.push('HTTPS and www redirects configured');
const inbound=new Map(htmlFiles.map(f=>[f,0]));
for(const f of htmlFiles){const h=read(f);for(const m of h.matchAll(/href=["']([^"'#]+)(?:#[^"']*)?["']/gi)){const x=m[1];if(x.startsWith('/')){const target=x==='/'?'index.html':x.slice(1).replace(/\/$/,'')+'.html';if(inbound.has(target)) inbound.set(target,inbound.get(target)+1);}}}
const orphans=[...inbound].filter(([f,n])=>n===0&&f!=='index.html'&&!['privacy-policy.html','terms.html','image-credits.html'].includes(f)).map(([f])=>f);
if(orphans.length) fail.push('orphan public pages: '+orphans.join(', ')); else pass.push('no orphan public HTML pages');
console.log('SEO hardening audit');
pass.forEach(x=>console.log('PASS: '+x)); fail.forEach(x=>console.error('FAIL: '+x));
if(process.env.LIVE_BASE_URL){const base=process.env.LIVE_BASE_URL.replace(/\/$/,'');const targets=['/','/about-us','/services','/products','/ro-plant','/chemicals','/contact','/locations','/raisen-water-treatment'];for(const p of targets){try{const r=await fetch(base+p,{redirect:'manual'});console.log('LIVE',p,r.status,r.headers.get('location')||'');if(r.status>=400) fail.push('live '+p+' returned '+r.status);}catch(e){fail.push('live '+p+' failed: '+e.message);}}}
console.log('Result: '+fail.length+' failures');
if(fail.length) process.exit(1);