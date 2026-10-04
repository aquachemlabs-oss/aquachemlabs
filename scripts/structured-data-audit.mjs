import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), errors=[];
const files=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!['review-admin.html','404.html'].includes(f));
for(const file of files){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 for(const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  let data; try{data=JSON.parse(match[1].trim())}catch{errors.push(file+': invalid JSON-LD syntax');continue}
  for(const n of (data['@graph']||[data])){
   if(!n?.['@type']) errors.push(file+': JSON-LD node missing @type');
   const types=Array.isArray(n?.['@type'])?n['@type']:[n?.['@type']];
   if(types.includes('Organization')||types.includes('LocalBusiness')) for(const k of ['name','url']) if(!n[k]) errors.push(file+': '+types.join('/')+' missing '+k);
   if(types.includes('LocalBusiness')&&(!n.address?.addressLocality||!n.address?.addressCountry)) errors.push(file+': LocalBusiness address incomplete');
   if(types.includes('BreadcrumbList')&&(!Array.isArray(n.itemListElement)||n.itemListElement.length<2)) errors.push(file+': BreadcrumbList incomplete');
   if(types.includes('Service')&&(!n.name||!n.provider)) errors.push(file+': Service missing name/provider');
  }
 }
}
console.log('Structured-data validation: '+files.length+' pages scanned; '+errors.length+' errors');
errors.forEach(e=>console.error(e)); if(errors.length) process.exit(1);