import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
const exec=promisify(execFile), root=process.cwd(), dist=path.join(root,'dist'), skip=new Set(['.git','node_modules','dist','.github','scripts','.lighthouserc.json','.gitignore','package.json','package-lock.json','netlify.toml','SEO-OPERATIONS.md','README.md']);
async function copyDir(src,dst){await fs.mkdir(dst,{recursive:true});for(const e of await fs.readdir(src,{withFileTypes:true})){if(skip.has(e.name))continue;const s=path.join(src,e.name),d=path.join(dst,e.name);if(e.isDirectory())await copyDir(s,d);else await fs.copyFile(s,d)}}
await fs.rm(dist,{recursive:true,force:true}); await copyDir(root,dist);
// The scripts/ folder holds build tooling and is skipped above, but these browser calculator scripts are loaded by pages at /scripts/*.js.
await fs.mkdir(path.join(dist,'scripts'),{recursive:true});
for(const f of ['engineering-tools.js','technical-resources-calculators.js']) await fs.copyFile(path.join(root,'scripts',f),path.join(dist,'scripts',f));
// Generate installable PWA icons from the existing company logo; no new remote assets.
const sourceLogo=path.join(root,'logo.png');
if(!fsSync.existsSync(sourceLogo)) throw new Error('PWA icon source missing: logo.png');
await Promise.all([192,512].map(size=>sharp(sourceLogo)
  .resize(size,size,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}})
  .png().toFile(path.join(dist,'pwa-'+size+'.png'))));
const files=[]; async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else files.push(p)}}
await walk(dist); let generated=0;
const imageFiles=files.filter(f=>/\.(jpe?g|png)$/i.test(f));
let nextImage=0;
async function optimizeImage(file){
  try{
    const out=file.replace(/\.(jpe?g|png)$/i,'.webp');
    const avif=file.replace(/\.(jpe?g|png)$/i,'.avif');
    const metadata=await sharp(file).metadata();
    const swap=metadata.orientation>=5&&metadata.orientation<=8;
    const width=swap?metadata.height:metadata.width;
    const height=swap?metadata.width:metadata.height;
    const hero=/[/\\]images[/\\]hero[/\\]/i.test(file);
    // Keep large hero photography sharp while bounding oversized catalogue images.
    const maxWidth=hero?1920:1440;
    const maxHeight=hero?1200:1440;
    const preserveDetail=/(?:diagram|flow[-_ ]?chart|schematic|process[-_ ]?flow|pfd|technical[-_ ]?guide)/i.test(file);
    const resize=!preserveDetail&&(width>maxWidth||height>maxHeight);
    const pipeline=()=> {
      let image=sharp(file).rotate();
      if(resize) image=image.resize({width:maxWidth,height:maxHeight,fit:'inside',withoutEnlargement:true});
      return image;
    };
    await Promise.all([
      pipeline().webp({quality:78,effort:4}).toFile(out),
      pipeline().avif({quality:48,effort:4}).toFile(avif)
    ]);
    const[a,b,d]=await Promise.all([fs.stat(file),fs.stat(out),fs.stat(avif)]);
    if(b.size<a.size||d.size<a.size)generated++;
    if(b.size>=a.size)await fs.rm(out,{force:true});
    if(d.size>=a.size)await fs.rm(avif,{force:true});
  }catch(error){
    console.warn('Image optimization skipped for '+path.relative(dist,file)+': '+error.message);
  }
}
const imageWorkers=Array.from({length:Math.min(4,imageFiles.length)},async()=>{
  while(nextImage<imageFiles.length){
    const file=imageFiles[nextImage++];
    await optimizeImage(file);
  }
});
await Promise.all(imageWorkers);
console.log('Image optimization processed '+imageFiles.length+' source images with '+imageWorkers.length+' workers.');

// Point CSS backgrounds at smaller WebP variants when the build generated them.
// This includes the shared static ETP backdrop, without changing source assets or design.
for (const file of files.filter(f => f.endsWith('.css'))) {
  let css = await fs.readFile(file, 'utf8');
  css = css.replace(/url\((["']?)([^)"']+\.(?:jpe?g|png))\1\)/gi, (whole, quote, url) => {
    if (/^(?:https?:|\/\/|data:|#)/i.test(url)) return whole;
    const clean = url.split(/[?#]/)[0];
    const candidates = [clean.replace(/\.(?:jpe?g|png)$/i, '.webp'), clean.replace(/\.(?:jpe?g|png)$/i, '.avif')];
    const optimizedUrl = candidates.find(candidate => {
      const optimizedPath = clean.startsWith('/') ? path.join(dist, candidate.slice(1)) : path.resolve(path.dirname(file), candidate);
      return fsSync.existsSync(optimizedPath);
    });
    if (!optimizedUrl) return whole;
    return 'url(' + quote + optimizedUrl + quote + ')';
  });
  await fs.writeFile(file, css);
}
const routeForFile=(file)=>{const name=path.basename(file);if(name==='index.html')return '/';return '/'+name.replace(/\.html$/,'');};
const breadcrumbFor=(file)=>{const route=routeForFile(file);if(route==='/'||/review-admin|404/.test(path.basename(file)))return '';const label=path.basename(file,'.html').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());return '<script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://aquachemlabs.com/"},{"@type":"ListItem","position":2,"name":label,"item":"https://aquachemlabs.com"+route}]})+'</script>';};
// The company serves customers nationwide. Normalize legacy LocalBusiness markup
// to Organization schema in the published build; preserve Manufacturer when present.
function normalizeOrganizationSchema(html){
  return html.replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,(whole,open,json,close)=>{
    let data;
    try{data=JSON.parse(json.trim());}catch{return whole;}
    const visit=node=>{
      if(Array.isArray(node)){node.forEach(visit);return;}
      if(!node||typeof node!=='object')return;
      if(node['@type']==='LocalBusiness')node['@type']='Organization';
      else if(Array.isArray(node['@type']))node['@type']=[...new Set(node['@type'].map(type=>type==='LocalBusiness'?'Organization':type))];
      const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
      if(types.includes('Organization')){delete node.aggregateRating;delete node.review;}
      Object.values(node).forEach(visit);
    };
    visit(data);
    return open+JSON.stringify(data)+close;
  });
};
const productSchemaFor=(file)=>{const products={"ro-plant.html":"Industrial RO Plant","etp-plant.html":"Industrial Effluent Treatment Plant (ETP)","stp-plant.html":"Industrial Sewage Treatment Plant (STP)","wtp-plant.html":"Industrial Water Treatment Plant (WTP)","dm-plant.html":"Industrial Demineralization (DM) Plant","softener-plant.html":"Industrial Water Softener Plant","filtration-systems.html":"Industrial Water Filtration & Clarification Systems","zld-plant.html":"Zero Liquid Discharge (ZLD) Plant","chemicals.html":"Industrial Water Treatment Chemicals","boiler-chemicals.html":"Boiler Water Treatment Chemicals","cooling-tower-chemicals.html":"Cooling Tower Water Treatment Chemicals","ro-chemicals.html":"RO Water Treatment Chemicals","etp-stp-chemicals.html":"ETP & STP Water Treatment Chemicals","plant-spares.html":"Industrial Plant Spares","ibr-valves.html":"IBR Valves","strainers-kits.html":"Industrial Strainers and Testing Kits","boiler-spares.html":"Industrial Boiler Spares"};const name=products[path.basename(file)];if(!name)return '';const url='https://aquachemlabs.com'+routeForFile(file);return '<script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"Product","name":name,"brand":{"@type":"Brand","name":"Aqua Chem Labs"},"url":url,"manufacturer":{"@type":"Organization","name":"Aqua Chem Labs","url":"https://aquachemlabs.com"},"offers":{"@type":"Offer","priceCurrency":"INR","availability":"https://schema.org/InStock","itemCondition":"https://schema.org/NewCondition","url":url,"seller":{"@type":"Organization","name":"Aqua Chem Labs","url":"https://aquachemlabs.com"}}})+'</script>';};
for(const file of files.filter(f=>f.endsWith('.html'))){let html=await fs.readFile(file,'utf8');
html=normalizeOrganizationSchema(html);
// Avoid render-blocking third-party font CSS. The shared stylesheet provides robust
// system-font fallbacks, so pages remain fully styled without waiting on Google Fonts.
html=html.replace(/<link\b(?=[^>]*\bhref=["'][^"']*fonts\.(?:googleapis|gstatic)\.com)[^>]*>\s*/gi,'');
function localAssetPath(src,htmlFile){
  if(!src||/^(?:https?:|\/\/|data:|#|blob:)/i.test(src))return null;
  const clean=src.split(/[?#]/)[0];
  const resolved=clean.startsWith('/')?path.resolve(dist,'.'+clean):path.resolve(path.dirname(htmlFile),clean);
  return resolved===dist||resolved.startsWith(dist+path.sep)?resolved:null;
}
const matches=[...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
for(let imageIndex=matches.length-1;imageIndex>=0;imageIndex--){
  const m=matches[imageIndex]; let tag=m[0]; const src=m[1];
  const originalPath=localAssetPath(src,file);
  if(/\.(?:jpe?g|png)$/i.test(src)){
    const candidates=[src.replace(/\.(jpe?g|png)$/i,'.webp'),src.replace(/\.(jpe?g|png)$/i,'.avif')];
    const optimized=candidates.find(candidate=>{
      const candidatePath=localAssetPath(candidate,file);
      return candidatePath&&fsSync.existsSync(candidatePath);
    });
    if(optimized)tag=tag.replace(/\bsrc=["'][^"']+["']/i,'src="'+optimized+'"');
  }
  // Explicit dimensions let the browser reserve image space before decoding, reducing CLS.
  const dimensionPath=originalPath&&fsSync.existsSync(originalPath)?originalPath:localAssetPath(tag.match(/\bsrc=["']([^"']+)["']/i)?.[1],file);
  if(dimensionPath&&/\.(?:jpe?g|png|webp|avif)$/i.test(dimensionPath)&&fsSync.existsSync(dimensionPath)){
    try{
      const meta=await sharp(dimensionPath).metadata();
      if(meta.width&&meta.height){
        const swap=meta.orientation>=5&&meta.orientation<=8;
        const intrinsicWidth=swap?meta.height:meta.width;
        const intrinsicHeight=swap?meta.width:meta.height;
        const widthAttr=tag.match(/\bwidth=["']?(\d+)/i);
        const heightAttr=tag.match(/\bheight=["']?(\d+)/i);
        const width=widthAttr?Number(widthAttr[1]):intrinsicWidth;
        const height=heightAttr?Number(heightAttr[1]):intrinsicHeight;
        const ratio=intrinsicWidth/intrinsicHeight;
        const add=[];
        if(!widthAttr)add.push('width="'+Math.max(1,Math.round(heightAttr?height*ratio:intrinsicWidth))+'"');
        if(!heightAttr)add.push('height="'+Math.max(1,Math.round(widthAttr?width/ratio:intrinsicHeight))+'"');
        if(add.length)tag=tag.replace(/^<img\b/i,'<img '+add.join(' '));
      }
    }catch(error){console.warn('Image dimensions skipped for '+path.relative(dist,dimensionPath)+': '+error.message);}
  }
  const isHero=/(?:^|[/\\])hero(?:[/\\_.-])/i.test(src);
  if(isHero){
    tag=tag.replace(/\sloading=["']lazy["']/i,'');
    if(!/\bloading=/i.test(tag))tag=tag.replace(/^<img\b/i,'<img loading="eager"');
    if(!/\bfetchpriority=/i.test(tag))tag=tag.replace(/^<img\b/i,'<img fetchpriority="high"');
  }else if(imageIndex>=2&&!/\bloading=/i.test(tag)&&!/\bfetchpriority=["']high/i.test(tag)){
    tag=tag.replace(/^<img\b/i,'<img loading="lazy"');
  }
  if(!/\bdecoding=/i.test(tag))tag=tag.replace(/^<img\b/i,'<img decoding="async"');
  html=html.slice(0,m.index)+tag+html.slice(m.index+m[0].length);
}
// Keep image preloads aligned with the optimized image source selected above.
html=html.replace(/<link\b[^>]*\brel=["']preload["'][^>]*>/gi,tag=>{if(!/\bas=["']image["']/i.test(tag))return tag;const href=tag.match(/\bhref=["']([^"']+)["']/i)?.[1];if(!href||!/^\/?images\//i.test(href)||/\.(?:webp|avif)$/i.test(href))return tag;const candidates=[href.replace(/\.(jpe?g|png)$/i,'.webp'),href.replace(/\.(jpe?g|png)$/i,'.avif')];const optimized=candidates.find(candidate=>fsSync.existsSync(path.join(dist,candidate.replace(/^\//,''))));if(!optimized)return tag;return tag.replace(href,optimized)});
if(!/BreadcrumbList/.test(html) && breadcrumbFor(file)) html=html.replace('</head>',breadcrumbFor(file)+'</head>');
const productSchema=productSchemaFor(file); if(productSchema && !/"@type":"Product"/.test(html)) html=html.replace('</head>',productSchema+'</head>');
if(path.basename(file)==='index.html' && !/WebSite/.test(html)) html=html.replace('</head>','<script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"WebSite","name":"Aqua Chem Labs","url":"https://aquachemlabs.com/"})+'</script></head>');
// Add PWA metadata at build time so every published route gets it consistently.
if(path.basename(file)!=='offline.html'){
  if(!/rel=["']manifest["']/.test(html)) html=html.replace('</head>','<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#0B2F7A"></head>');
  if(!/pwa-register\.js/.test(html)) html=html.replace('</body>','<script src="/pwa-register.js" defer></script></body>');
}
// Mark existing in-content contact actions for conversion-event reporting (no form values are collected).
html=html.replace(/<a\b([^>]*href=["']\/contact(?:\?[^"']*)?#qf["'][^>]*)>/gi,(tag,attrs)=>/\bdata-cta-type=/.test(attrs)?tag:'<a'+attrs+' data-cta-type="quote" data-cta-location="page-content">');
html=html.replace(/<a\b([^>]*href=["']tel:[^"']+["'][^>]*)>/gi,(tag,attrs)=>/\bdata-cta-type=/.test(attrs)?tag:'<a'+attrs+' data-cta-type="phone" data-cta-location="page-content">');
html=html.replace(/<a\b([^>]*href=["']https:\/\/wa\.me\/[^"']+["'][^>]*)>/gi,(tag,attrs)=>/\bdata-cta-type=/.test(attrs)?tag:'<a'+attrs+' data-cta-type="whatsapp" data-cta-location="page-content">');
// Add contextual quote/contact paths to every public route without changing its canonical URL.
const baseName=path.basename(file);
const excludedConversionRoutes=new Set(['offline.html','404.html','review-admin.html','image-credits.html']);
const isNoindexPage=/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
if(!excludedConversionRoutes.has(baseName) && !isNoindexPage){
  const productContexts={
    'ro-plant.html':'Industrial RO Plant',
    'etp-plant.html':'ETP Plant',
    'stp-plant.html':'STP Plant',
    'wtp-plant.html':'WTP Plant',
    'dm-plant.html':'DM Plant',
    'softener-plant.html':'Water Softener Plant',
    'filtration-systems.html':'Filtration Systems',
    'zld-plant.html':'ZLD Plant',
    'boiler-chemicals.html':'Boiler Water-Treatment Chemicals',
    'cooling-tower-chemicals.html':'Cooling-Tower Chemicals',
    'ro-chemicals.html':'RO / Membrane Chemicals',
    'etp-stp-chemicals.html':'ETP / STP Chemicals',
    'plant-spares.html':'Industrial Plant Spares',
    'ibr-valves.html':'IBR Valves',
    'strainers-kits.html':'Strainers and Testing Kits',
    'boiler-spares.html':'Boiler Spares'
  };
  const context=productContexts[baseName] || '';
  const quoteHref='/contact'+(context?'?product='+encodeURIComponent(context):'')+'#qf';
  const message='Hello Aqua Chem Labs, I need a quote'+(context?' for '+context:'')+'. Please advise on the suitable product and pricing.';
  const whatsappHref='https://wa.me/917974999929?text='+encodeURIComponent(message);
  const dock='<nav class="enquiry-dock" aria-label="Quick enquiry options"><a class="enquiry-dock__quote" href="'+quoteHref+'" data-cta-type="quote" data-cta-location="mobile-dock">Get a Quote</a><a class="enquiry-dock__whatsapp" href="'+whatsappHref+'" target="_blank" rel="noopener" data-cta-type="whatsapp" data-cta-location="mobile-dock">WhatsApp</a><a class="enquiry-dock__call" href="tel:+917974999929" data-cta-type="phone" data-cta-location="mobile-dock">Call</a></nav>';
  if(!/class=["']enquiry-dock["']/.test(html)) html=html.replace('</body>',dock+'<script src="/conversion-tracking.js" defer></script></body>');
}
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