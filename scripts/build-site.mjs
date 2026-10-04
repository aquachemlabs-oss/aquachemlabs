import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
const exec=promisify(execFile), root=process.cwd(), dist=path.join(root,'dist');
const skip=new Set(['.git','node_modules','dist']);
function copyDir(src,dst){fs.mkdirSync(dst,{recursive:true});for(const e of fs.readdirSync(src,{withFileTypes:true})){if(skip.has(e.name))continue;const a=path.join(src,e.name),b=path.join(dst,e.name);if(e.isDirectory())copyDir(a,b);else fs.copyFileSync(a,b);}}
fs.rmSync(dist,{recursive:true,force:true});copyDir(root,dist);
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else out.push(p);}return out;}
const files=walk(dist);let optimized=0;
for(const file of files.filter(f=>/\.(jpe?g|png)$/i.test(f))){try{const out=file.replace(/\.(jpe?g|png)$/i,'.webp');await sharp(file).webp({quality:78}).toFile(out);if(fs.statSync(out).size<fs.statSync(file).size)optimized++;else fs.rmSync(out,{force:true});}catch{}}
for(const file of walk(dist).filter(f=>f.endsWith('.html'))){let html=fs.readFileSync(file,'utf8');html=html.replace(/(src)=["'](\/?images\/[^"']+)\.(jpe?g|png)["']/gi,(all,attr,url,ext)=>{const candidate=path.join(dist,url.replace(/^\//,''))+'.webp';return fs.existsSync(candidate)?attr+'="'+url+'.webp"':all;});fs.writeFileSync(file,html);}
const pdf=path.join(dist,'ACL_2025.pdf');if(fs.existsSync(pdf)){try{const tmp=path.join(dist,'ACL_2025.optimized.pdf');await exec('gs',['-sDEVICE=pdfwrite','-dCompatibilityLevel=1.4','-dPDFSETTINGS=/ebook','-dNOPAUSE','-dQUIET','-dBATCH','-sOutputFile='+tmp,pdf]);if(fs.statSync(tmp).size<fs.statSync(pdf).size)fs.renameSync(tmp,pdf);else fs.rmSync(tmp,{force:true});}catch{}}
console.log('Build complete. Optimized WebP assets: '+optimized);