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
const productSchemaFor=(file)=>{const products={"ro-plant.html":"Industrial RO Plant","chemicals.html":"Industrial Water Treatment Chemicals","plant-spares.html":"Industrial Plant Spares","ibr-valves.html":"IBR Valves","strainers-kits.html":"Industrial Strainers and Testing Kits","boiler-spares.html":"Industrial Boiler Spares"};const name=products[path.basename(file)];if(!name)return '';const url='https://aquachemlabs.com'+routeForFile(file);return '<script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"Product","name":name,"brand":{"@type":"Brand","name":"Aqua Chem Labs"},"url":url,"manufacturer":{"@type":"Organization","name":"Aqua Chem Labs","url":"https://aquachemlabs.com"}})+'</script>';};
for(const file of files.filter(f=>f.endsWith('.html'))){let html=await fs.readFile(file,'utf8');const matches=[...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];for(const m of matches.reverse()){const src=m[1];if(!/^\/?images\//i.test(src)||/\.webp$/i.test(src))continue;const out=path.join(dist,src.replace(/^\//,'').replace(/\.(jpe?g|png)$/i,'.webp'));if(!fsSync.existsSync(out))continue;const webp=src.replace(/\.(jpe?g|png)$/i,'.webp');html=html.slice(0,m.index)+m[0].replace(/\bsrc=["'][^"']+["']/i,'src="'+webp+'"')+html.slice(m.index+m[0].length)}
// Keep image preloads aligned with the optimized image source selected above.
html=html.replace(/<link\b[^>]*\brel=["']preload["'][^>]*>/gi,tag=>{if(!/\bas=["']image["']/i.test(tag))return tag;const href=tag.match(/\bhref=["']([^"']+)["']/i)?.[1];if(!href||!/^\/?images\//i.test(href)||/\.webp$/i.test(href))return tag;const optimized=href.replace(/\.(jpe?g|png)$/i,'.webp');const optimizedPath=path.join(dist,optimized.replace(/^\//,''));if(!fsSync.existsSync(optimizedPath))return tag;return tag.replace(href,optimized)});
if(!/BreadcrumbList/.test(html) && breadcrumbFor(file)) html=html.replace('</head>',breadcrumbFor(file)+'</head>');
const productSchema=productSchemaFor(file); if(productSchema && !/"@type":"Product"/.test(html)) html=html.replace('</head>',productSchema+'</head>');
if(path.basename(file)==='index.html' && !/WebSite/.test(html)) html=html.replace('</head>','<script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"WebSite","name":"Aqua Chem Labs","url":"https://aquachemlabs.com/"})+'</script></head>');
await fs.writeFile(file,html)}
try{
  const pdf=path.join(dist,'ACL_2025.pdf');
  const tmp=path.join(dist,'ACL_2025.optimized.pdf');
  if(fsSync.existsSync(pdf)){
    const before=(await fs.stat(pdf)).size;
    await exec('gs',['-sDEVICE=pdfwrite','-dCompatibilityLevel=1.4','-dPDFSETTINGS=/ebook','-dNOPAUSE','-dQUIET','-dBATCH','-sOutputFile='+tmp,pdf]);
    if(fsSync.existsSync(tmp)){
      const after=(await fs.stat(tmp)).size;
      if(after<before){
        await fs.rename(tmp,pdf);
        console.log('Brochure optimized: '+(before/1024/1024).toFixed(2)+' MB -> '+(after/1024/1024).toFixed(2)+' MB');
      }else{
        await fs.rm(tmp,{force:true});
        console.warn('Brochure PDF optimization produced no size reduction; original retained ('+(before/1024/1024).toFixed(2)+' MB).');
      }
    }
  }
}catch(error){
  console.warn('Brochure PDF optimization unavailable; source PDF retained: '+error.message);
}
console.log('Production build complete. Smaller WebP/AVIF assets generated:',generated);