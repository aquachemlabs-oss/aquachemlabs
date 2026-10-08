import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
const exec=promisify(execFile), root=process.cwd(), dist=path.join(root,'dist'), skip=new Set(['.git','node_modules','dist']);
async function copyDir(src,dst){await fs.mkdir(dst,{recursive:true});for(const e of await fs.readdir(src,{withFileTypes:true})){if(skip.has(e.name))continue;const s=path.join(src,e.name),d=path.join(dst,e.name);if(e.isDirectory())await copyDir(s,d);else await fs.copyFile(s,d)}}
await fs.rm(dist,{recursive:true,force:true}); await copyDir(root,dist);
const files=[]; async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else files.push(p)}}
await walk(dist); let generated=0;
await Promise.all(files.filter(f=>/\.(jpe?g|png)$/i.test(f)).map(async file=>{try{const out=file.replace(/\.(jpe?g|png)$/i,'.webp');const avif=file.replace(/\.(jpe?g|png)$/i,'.avif');await Promise.all([sharp(file).webp({quality:78}).toFile(out),sharp(file).avif({quality:50}).toFile(avif)]);const[a,b,d]=await Promise.all([fs.stat(file),fs.stat(out),fs.stat(avif)]);if(b.size<a.size||d.size<a.size)generated++;if(b.size>=a.size)await fs.rm(out,{force:true});if(d.size>=a.size)await fs.rm(avif,{force:true})}catch{}}));
const routeForFile=(file)=>{const name=path.basename(file);if(name==='index.html')return '/';return '/'+name.replace(/\.html$/,'');};
const breadcrumbFor=(file)=>{const route=routeForFile(file);if(route==='/'||/review-admin|404/.test(path.basename(file)))return '';const label=path.basename(file,'.html').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());return '<script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://aquachemlabs.com/"},{"@type":"ListItem","position":2,"name":label,"item":"https://aquachemlabs.com"+route}]})+'</script>';};
for(const file of files.filter(f=>f.endsWith('.html'))){let html=await fs.readFile(file,'utf8');const matches=[...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];for(const m of matches.reverse()){const src=m[1];if(!/^\/?images\//i.test(src)||/\.webp$/i.test(src))continue;const out=path.join(dist,src.replace(/^\//,'').replace(/\.(jpe?g|png)$/i,'.webp'));if(!fsSync.existsSync(out))continue;const webp=src.replace(/\.(jpe?g|png)$/i,'.webp');html=html.slice(0,m.index)+m[0].replace(/\bsrc=["'][^"']+["']/i,'src="'+webp+'"')+html.slice(m.index+m[0].length)}
if(!/BreadcrumbList/.test(html) && breadcrumbFor(file)) html=html.replace('</head>',breadcrumbFor(file)+'</head>');
if(path.basename(file)==='index.html' && !/\\"@type\\":\\"WebSite\\"/.test(html)) html=html.replace('</head>','<script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"WebSite","name":"Aqua Chem Labs","url":"https://aquachemlabs.com/"})+'</script></head>');
await fs.writeFile(file,html)}
try{const pdf=path.join(dist,'ACL_2025.pdf'),tmp=path.join(dist,'ACL_2025.optimized.pdf');if(fsSync.existsSync(pdf)){await exec('gs',['-sDEVICE=pdfwrite','-dCompatibilityLevel=1.4','-dPDFSETTINGS=/ebook','-dNOPAUSE','-dQUIET','-dBATCH','-sOutputFile='+tmp,pdf]);if(fsSync.existsSync(tmp)&&(await fs.stat(tmp)).size<(await fs.stat(pdf)).size)await fs.rename(tmp,pdf);else await fs.rm(tmp,{force:true})}}catch{}
console.log('Production build complete. Smaller WebP/AVIF assets generated:',generated);