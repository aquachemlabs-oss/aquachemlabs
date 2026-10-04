import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium, request} from '@playwright/test';

const root=process.cwd();
const base='http://127.0.0.1:4173';
const failures=[];
const ignored=new Set(['404.html','review-admin.html']);

const htmlFiles=(await fs.readdir(root,{withFileTypes:true}))
  .filter(entry=>entry.isFile()&&entry.name.endsWith('.html')&&!ignored.has(entry.name))
  .map(entry=>entry.name)
  .sort();

const server=spawn(process.execPath,['scripts/qa-server.mjs'],{
  cwd:root,
  env:{...process.env,QA_PORT:'4173'},
  stdio:['ignore','pipe','pipe']
});
server.stderr.on('data',data=>process.stderr.write('[qa-server] '+data));
server.on('error',error=>failures.push('QA server failed to start: '+error.message));

async function waitForServer(timeout=10000){
  const started=Date.now();
  while(Date.now()-started<timeout){
    try{
      const response=await fetch(base+'/');
      if(response.ok) return;
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('QA server did not become ready within '+timeout+'ms');
}

function routeFor(file){return file==='index.html'?'/' : '/'+file.replace(/\.html$/i,'');}

try{
  await waitForServer();
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const api=await request.newContext();
  const page=await context.newPage();

  page.on('pageerror',error=>failures.push('pageerror: '+error.message));
  page.on('console',message=>{
    if(message.type()==='error') failures.push('console error: '+message.text());
  });
  page.on('response',response=>{
    if(response.status()>=400&&response.url().startsWith(base)) failures.push('resource '+response.status()+': '+response.url());
  });

  for(const file of htmlFiles){
    const route=routeFor(file);
    const response=await page.goto(base+route,{waitUntil:'networkidle'});
    if(!response||!response.ok()) failures.push(route+' HTTP '+(response?.status()||0));

    const h1=await page.locator('h1').count();
    if(h1!==1) failures.push(route+' H1='+h1);

    const localLinks=await page.locator('a[href]').evaluateAll(anchors=>anchors.map(a=>a.href)
      .filter(h=>h.startsWith(location.origin))
      .map(h=>h.split('#')[0])
      .filter(Boolean));
    for(const url of [...new Set(localLinks)]){
      const rr=await api.get(url);
      if(!rr.ok()) failures.push(route+' broken '+url+' '+rr.status());
    }

    const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src).filter(Boolean));
    for(const url of [...new Set(scripts)]){
      const rr=await request.get(url);
      if(!rr.ok()) failures.push(route+' script failed '+url+' '+rr.status());
    }

    if(route==='/'){
      const diagnostic=page.locator('#prob');
      if(await diagnostic.count()){
        await diagnostic.selectOption('tds');
        const result=await page.locator('#res').textContent();
        if(!result?.includes('Industrial RO Plant')) failures.push('homepage diagnostic interaction failed');
      }
    }

    if(route==='/engineering-tools'){
      const cases=[
        {ids:['ro-feed','ro-perm'],values:['10','7.5'],expected:'75%'},
        {ids:['dose-flow','dose-ppm'],values:['10','100'],expected:'1 kg/h'},
        {ids:['tank-l','tank-w','tank-d'],values:['2','3','1.5'],expected:'9 m³'},
        {ids:['ct-makeup','ct-circ'],values:['1000','3000'],expected:'3'},
        {ids:['cod-flow','cod-conc'],values:['100','500'],expected:'50 kg/day'},
        {ids:['chlor-flow','chlor-dose','chlor-strength'],values:['10','2','10'],expected:'0.2 L/h'},
        {ids:['pump-flow','pump-head','pump-eff'],values:['10','30','75'],expected:'1.09 kW'},
        {ids:['det-volume','det-flow'],values:['100','20'],expected:'5 h'},
        {ids:['filter-flow','filter-dia'],values:['10','2'],expected:'3.18 m³/m²/h'},
        {ids:['fm-flow','fm-bod','fm-mlss','fm-volume'],values:['100','200','3000','100'],expected:'0.067'}
      ];
      for(const test of cases){
        const first=page.locator('#'+test.ids[0]);
        if(!(await first.count())){failures.push('calculator input missing '+test.ids[0]);continue;}
        for(let i=0;i<test.ids.length;i++) await page.locator('#'+test.ids[i]).fill(test.values[i]);
        const text=await first.locator('xpath=ancestor::article[contains(@class,"calculator-card")]').locator('.calculator-result').textContent();
        if(!text?.includes(test.expected)) failures.push('calculator failed '+test.ids.join(',')+' got '+text);
      }
      await page.locator('#ro-feed').fill('10');
      await page.locator('#ro-perm').fill('7.5');
      await page.locator('[data-calc="ro"]').click();
      if(!(await page.locator('#calculator-result-modal').evaluate(el=>el.classList.contains('is-open')))) failures.push('calculator popup did not open');
      if(!(await page.locator('.calculator-result-modal__inputs').textContent())?.includes('7.5')) failures.push('calculator popup did not show entered values');
      await page.locator('[data-close-calculator]').first().click();
      if(await page.locator('#calculator-result-modal').evaluate(el=>el.classList.contains('is-open'))) failures.push('calculator popup did not close');
    }

    if(route==='/products'){
      await page.locator('#productsDropdown .dd-label').click();
      if(!(await page.locator('#productsDropdown').evaluate(el=>el.classList.contains('active')))) failures.push('products dropdown interaction failed');
    }

    if(route==='/services'){
      const pdfs=await page.locator('a[href$=".pdf"]').evaluateAll(anchors=>anchors.map(a=>a.href));
      for(const url of pdfs){
        const rr=await request.get(url);
        const type=(rr.headers()['content-type']||'').split(';')[0];
        if(!rr.ok()||type!=='application/pdf') failures.push('service PDF invalid '+url+' '+rr.status()+' '+type);
      }
    }
  }

  await request.dispose();
  await api.dispose();
  await context.close();
  await browser.close();
} catch(error){
  failures.push(error.message);
} finally {
  server.kill('SIGTERM');
}

console.log('Runtime pages: '+htmlFiles.length+' failures: '+failures.length);
failures.forEach(failure=>console.error(failure));
if(failures.length) process.exit(1);