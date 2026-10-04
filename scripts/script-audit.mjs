import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const exec=promisify(execFile);
const root=process.cwd();
const ignored=new Set(['.git','node_modules','dist']);
const scriptExtensions=new Set(['.js','.mjs','.cjs','.mts']);
const errors=[];

async function walk(dir){
  const result=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    if(ignored.has(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) result.push(...await walk(full));
    else result.push(full);
  }
  return result;
}

const allFiles=await walk(root);
const scripts=allFiles.filter(file=>scriptExtensions.has(path.extname(file).toLowerCase()));
const htmlFiles=allFiles.filter(file=>path.extname(file).toLowerCase()==='.html');

for(const file of scripts){
  const rel=path.relative(root,file);
  const args=path.extname(file).toLowerCase()==='.mts'
    ? ['--experimental-strip-types','--check',file]
    : ['--check',file];
  try{await exec(process.execPath,args,{cwd:root});}
  catch(error){errors.push(rel+': '+String(error.stderr||error.message).trim());}
}

for(const file of htmlFiles){
  const rel=path.relative(root,file);
  const html=await fs.readFile(file,'utf8');
  let inlineIndex=0;
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    const attrs=match[1],body=match[2].trim();
    if(!body||/\bsrc\s*=/.test(attrs)||/\btype\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue;
    inlineIndex++;
    const tmp=path.join(root,'.script-audit-inline-'+process.pid+'-'+inlineIndex+'.js');
    try{await fs.writeFile(tmp,body,'utf8');await exec(process.execPath,['--check',tmp],{cwd:root});}
    catch(error){errors.push(rel+': inline JavaScript #'+inlineIndex+': '+String(error.stderr||error.message).trim());}
    finally{await fs.rm(tmp,{force:true});}
  }
  for(const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)){
    const src=match[1].trim();
    if(/^(?:https?:|\/\/|data:|blob:)/i.test(src)) continue;
    const local=src.split(/[?#]/)[0].replace(/^\//,'');
    const target=path.resolve(root,local);
    if(target!==root&&!target.startsWith(root+path.sep)){errors.push(rel+': script escapes repository root: '+src);continue;}
    try{await fs.access(target);}catch{errors.push(rel+': referenced script does not exist: '+src);}
  }
}

console.log('Script audit: '+scripts.length+' source scripts, '+htmlFiles.length+' HTML pages scanned.');
errors.forEach(error=>console.error('ERROR '+error));
if(errors.length) process.exit(1);
console.log('Script syntax and HTML script-reference checks passed.');