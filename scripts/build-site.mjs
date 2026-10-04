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
for(const file of files.filter(f=>/\.(jpe?g|png)$/i.test(f))){try{const out=file.replace(/\.(jpe?g|png)$/i,'.webp');await sharp(file).webp({quality:78}).toFile(out);const[a,b]=await Promise.all([fs.stat(file),fs.stat(out)]);if(b.size<a.size)generated++;else await fs.rm(out,{force:true})}catch{}}
for(const file of files.filter(f=>f.endsWith('.html'))){let html=await fs.readFile(file,'utf8');const matches=[...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];for(const m of matches.reverse()){const src=m[1];if(!/^\/?images\//i.test(src)||/\.webp$/i.test(src))continue;const out=path.join(dist,src.replace(/^\//,'').replace(/\.(jpe?g|png)$/i,'.webp'));if(!fsSync.existsSync(out))continue;const img=m[0],before=html.slice(0,m.index);if(before.slice(-30).includes('<picture'))continue;html=before+'<picture><source type="image/webp" srcset="'+src.replace(/\.(jpe?g|png)$/i,'.webp')+'">'+img+'</picture>'+html.slice(m.index+img.length)}await fs.writeFile(file,html)}
try{const pdf=path.join(dist,'ACL_2025.pdf'),tmp=path.join(dist,'ACL_2025.optimized.pdf');if(fsSync.existsSync(pdf)){await exec('gs',['-sDEVICE=pdfwrite','-dCompatibilityLevel=1.4','-dPDFSETTINGS=/ebook','-dNOPAUSE','-dQUIET','-dBATCH','-sOutputFile='+tmp,pdf]);if(fsSync.existsSync(tmp)&&(await fs.stat(tmp)).size<(await fs.stat(pdf)).size)await fs.rename(tmp,pdf);else await fs.rm(tmp,{force:true})}}catch{}
console.log('Production build complete. Smaller WebP assets generated:',generated);