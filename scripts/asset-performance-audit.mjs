import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root=path.resolve('dist');
const errors=[];
const counts={pages:0,images:0,modernImages:0,dimensionedImages:0,lazyImages:0,prioritizedHeroImages:0,externalFontLinks:0,largeSourceImagesOptimized:0};
const exists=async file=>{try{await fs.access(file);return true;}catch{return false;}};
const htmlFiles=[];
async function walk(dir){
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())await walk(full);
    else if(entry.name.endsWith('.html'))htmlFiles.push(full);
  }
}
function localPath(src,htmlFile){
  if(!src||/^(?:https?:|\/\/|data:|#|blob:|mailto:|tel:)/i.test(src))return null;
  const clean=src.split(/[?#]/)[0];
  const resolved=clean.startsWith('/')?path.resolve(root,'.'+clean):path.resolve(path.dirname(htmlFile),clean);
  return resolved===root||resolved.startsWith(root+path.sep)?resolved:null;
}
function isHero(src){return /(?:^|[/\\])hero(?:[/\\_.-])/i.test(src||'');}
await walk(root);
counts.pages=htmlFiles.length;
if(!counts.pages)errors.push('Production build has no HTML pages.');
for(const file of htmlFiles){
  const html=await fs.readFile(file,'utf8');
  const rel=path.relative(root,file);
  if(/<link\b(?=[^>]*\bhref=["'][^"']*fonts\.(?:googleapis|gstatic)\.com)[^>]*>/i.test(html)){
    counts.externalFontLinks++;
    errors.push(rel+' still requests Google Fonts CSS or opens a Google Fonts connection.');
  }
  for(const match of html.matchAll(/<img\b[^>]*>/gi)){
    counts.images++;
    const tag=match[0];
    const src=tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if(!src)continue;
    const imagePath=localPath(src,file);
    if(!imagePath||!await exists(imagePath))continue;
    const raster=/\.(?:jpe?g|png|webp|avif)$/i.test(imagePath);
    if(raster){
      const width=tag.match(/\bwidth=["']?(\d+)/i);
      const height=tag.match(/\bheight=["']?(\d+)/i);
      if(width&&height)counts.dimensionedImages++;
      else errors.push(rel+' has a local raster image without intrinsic width/height: '+src);
      if(/\.webp$|\.avif$/i.test(src))counts.modernImages++;
      if(/\bloading=["']lazy["']/i.test(tag))counts.lazyImages++;
      if(isHero(src)){
        if(/\bfetchpriority=["']high["']/i.test(tag)&&!/\bloading=["']lazy["']/i.test(tag))counts.prioritizedHeroImages++;
        else errors.push(rel+' hero image is not prioritized or is lazy-loaded: '+src);
      }
      if(/\.(?:webp|avif)$/i.test(src)){
        const stem=imagePath.replace(/\.(?:webp|avif)$/i,'');
        const candidates=[stem+'.jpg',stem+'.jpeg',stem+'.png'];
        for(const original of candidates){
          if(await exists(original)){
            const [optimizedStat,originalStat]=await Promise.all([fs.stat(imagePath),fs.stat(original)]);
            if(originalStat.size>400*1024&&optimizedStat.size<originalStat.size)counts.largeSourceImagesOptimized++;
            break;
          }
        }
      }else if(/\.(?:jpe?g|png)$/i.test(src)){
        const stem=imagePath.replace(/\.(?:jpe?g|png)$/i,'');
        const candidates=[stem+'.webp',stem+'.avif'];
        for(const candidate of candidates){
          if(await exists(candidate)){
            const [currentStat,candidateStat]=await Promise.all([fs.stat(imagePath),fs.stat(candidate)]);
            if(candidateStat.size<currentStat.size)errors.push(rel+' references a larger original instead of its optimized variant: '+src);
          }
        }
      }
    }
  }
}
const css=await fs.readFile(path.join(root,'styles.css'),'utf8');
if(!css.length)errors.push('Production stylesheet is empty.');
console.log('Production performance audit');
console.log('HTML pages checked:',counts.pages);
console.log('Local raster images checked:',counts.images);
console.log('Images served as WebP/AVIF:',counts.modernImages);
console.log('Images with intrinsic dimensions:',counts.dimensionedImages);
console.log('Lazy-loaded images:',counts.lazyImages);
console.log('High-priority hero images:',counts.prioritizedHeroImages);
console.log('Large source images with smaller modern output:',counts.largeSourceImagesOptimized);
console.log('External Google Fonts links:',counts.externalFontLinks);
console.log('Stylesheet bytes:',Buffer.byteLength(css,'utf8'));
if(errors.length){console.error('Performance audit failures:\\n- '+errors.join('\\n- '));process.exitCode=1;}
else console.log('Performance asset checks passed.');
