import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), errors=[];
const files=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!['review-admin.html','404.html'].includes(f));
for(const file of files){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 for(const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  let data; try{data=JSON.parse(match[1].trim())}catch(e){errors.push(file+': invalid JSON-LD syntax');continue}
  const nodes=data['@graph']||[data];
  for(const n of nodes){
   if(!n||typeof n!=='object') {errors.push(file+': JSON-LD node is not an object');continue}
   if(!n['@type']) errors.push(file+': JSON-LD node missing @type');
   const types=Array.isArray(n['@type'])?n['@type']:[n['@type']];
   if(types.includes('Organization')||types.includes('LocalBusiness')){
    for(const k of ['name','url']) if(!n[k]) errors.push(file+': '+types.join('/')+' missing '+k);
   }
   if(types.includes('LocalBusiness')){
    if(!n.address?.addressLocality||!n.address?.addressCountry) errors.push(file+': LocalBusiness address incomplete');
    if(!n.telephone) errors.push(file+': LocalBusiness telephone missing');
   }
   if(types.includes('BreadcrumbList')){
    if(!Array.isArray(n.itemListElement)||n.itemListElement.length<2) errors.push(file+': BreadcrumbList needs at least Home + current page');
   }
   if(types.includes('WebPage')&&!n.url) errors.push(file+': WebPage url missing');
   if(types.includes('Service')){
    if(!n.name) errors.push(file+': Service name missing');
    if(!n.provider) errors.push(file+': Service provider missing');
   }
  }
 }
}
console.log('Structured-data validation: '+files.length+' HTML files scanned; '+errors.length+' errors');
errors.forEach(e=>console.error(e));
if(errors.length) process.exit(1);
