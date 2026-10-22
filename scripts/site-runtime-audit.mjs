import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';

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
  // Reuse the browser context's supported API request client. This avoids
  // relying on the test-runner's `request` fixture in a standalone Node script.
  const api=context.request;
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
      const rr=await api.get(url);
      if(!rr.ok()) failures.push(route+' script failed '+url+' '+rr.status());
    }

    if(route==='/'){
      const labVitals=await page.evaluate(async()=>{
        const fcp=performance.getEntriesByType('paint').find(entry=>entry.name==='first-contentful-paint')?.startTime??null;
        let lcp=null,cls=0,sessionValue=0,sessionStart=0,lastShift=0;
        let lcpObserver,clsObserver;
        try{
          lcpObserver=new PerformanceObserver(list=>{for(const entry of list.getEntries())lcp=entry.startTime;});
          lcpObserver.observe({type:'largest-contentful-paint',buffered:true});
        }catch{}
        try{
          clsObserver=new PerformanceObserver(list=>{for(const entry of list.getEntries()){if(entry.hadRecentInput)continue;const gap=entry.startTime-lastShift;if(gap>1000||entry.startTime-sessionStart>5000){sessionStart=entry.startTime;sessionValue=entry.value;}else sessionValue+=entry.value;lastShift=entry.startTime;cls=Math.max(cls,sessionValue);}});
          clsObserver.observe({type:'layout-shift',buffered:true});
        }catch{}
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        lcpObserver?.disconnect();clsObserver?.disconnect();
        return {fcpMs:fcp,lcpMs:lcp,cls};
      });
      console.log('Homepage local lab metrics (not field data): '+JSON.stringify(labVitals));
      const blankSections=await page.locator('main section').evaluateAll(sections=>sections.filter(section=>{
        const rect=section.getBoundingClientRect();
        const text=(section.textContent||'').trim(); // textContent remains available when content-visibility:auto skips offscreen rendering.
        const media=section.querySelector('img,svg,video,iframe,canvas');
        return rect.height>600&&text.length<40&&!media;
      }).map(section=>({id:section.id||'',className:section.className||'',height:Math.round(section.getBoundingClientRect().height)})));
      if(blankSections.length) failures.push('large empty homepage sections: '+JSON.stringify(blankSections));
      const diagnostic=page.locator('#prob');
      if(await diagnostic.count()){
        await diagnostic.selectOption('tds');
        const result=await page.locator('#res').textContent();
        if(!result?.includes('Industrial RO Plant')) failures.push('homepage diagnostic interaction failed');
      }
      await page.setViewportSize({width:390,height:844});
      await page.locator('#menuToggle').click();
      if(!(await page.locator('#navMenu').evaluate(el=>el.classList.contains('active')))) failures.push('mobile navigation did not open');
      await page.keyboard.press('Escape');
      if(await page.locator('#navMenu').evaluate(el=>el.classList.contains('active'))) failures.push('mobile navigation did not close on Escape');
      await page.setViewportSize({width:1280,height:900});
    }

    if(route==='/contact'){
      const form=page.locator('#qf');
      if(await form.count()!==1) failures.push('contact quote form missing or duplicated');
      if(!(await form.locator('[name="name"][required]').count())) failures.push('contact form required name field missing');
      if(!(await form.locator('[name="email"][type="email"][required]').count())) failures.push('contact form required email field missing');
      if(!(await form.locator('button[type="submit"],input[type="submit"]').count())) failures.push('contact form submit control missing');
      if(!(await form.locator('[data-form-status]').count())) failures.push('contact form status region missing');
      if(await form.count()&&await form.evaluate(el=>el.checkValidity())) failures.push('empty contact form unexpectedly passes native validation');
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
      const modal=page.locator('#calculator-result-modal');
      if(!(await modal.evaluate(el=>el.classList.contains('is-open')))) failures.push('calculator popup did not open');
      if(!(await modal.isVisible())) failures.push('calculator popup is not visible to the browser');
      const modalGeometry=await modal.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),panel=el.querySelector('.calculator-result-modal__panel'),p=panel?.getBoundingClientRect(),ps=panel?getComputedStyle(panel):null;return {width:r.width,height:r.height,display:s.display,visibility:s.visibility,opacity:s.opacity,panelWidth:p?.width,panelHeight:p?.height,panelDisplay:ps?.display,panelVisibility:ps?.visibility};});
      if(!(modalGeometry.width>0&&modalGeometry.height>0&&modalGeometry.display!=='none'&&modalGeometry.visibility!=='hidden'&&Number(modalGeometry.opacity)>0&&modalGeometry.panelWidth>0&&modalGeometry.panelHeight>0&&modalGeometry.panelDisplay!=='none'&&modalGeometry.panelVisibility!=='hidden')) failures.push('calculator popup has invalid rendered geometry/styles: '+JSON.stringify(modalGeometry));
      if(!(await page.locator('.calculator-result-modal__inputs').textContent())?.includes('7.5')) failures.push('calculator popup did not show entered values');
      if(!(await page.locator('.calculator-result-modal__value').textContent())?.includes('75%')) failures.push('calculator popup result value mismatch');
      await page.locator('[data-close-calculator]').last().click();
      if(await modal.evaluate(el=>el.classList.contains('is-open'))) failures.push('calculator popup did not close');
      await page.setViewportSize({width:390,height:844});
      await page.locator('[data-calc="ro"]').click();
      if(!(await modal.isVisible())) failures.push('calculator popup not visible on mobile viewport');
      const mobilePanel=await modal.locator('.calculator-result-modal__panel').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};});
      if(!(mobilePanel.width>0&&mobilePanel.height>0&&mobilePanel.left>=0&&mobilePanel.right<=390&&mobilePanel.top<844&&mobilePanel.bottom>0)) failures.push('calculator popup panel is outside mobile viewport: '+JSON.stringify(mobilePanel));
      await page.locator('[data-close-calculator]').last().click();
      await page.setViewportSize({width:1280,height:900});
    }

    if(route==='/products'){
      await page.locator('#productsDropdown .dd-label').click();
      if(!(await page.locator('#productsDropdown').evaluate(el=>el.classList.contains('active')))) failures.push('products dropdown interaction failed');
    }

    if(route==='/services'){
      const pdfs=await page.locator('a[href$=".pdf"]').evaluateAll(anchors=>anchors.map(a=>a.href));
      for(const url of pdfs){
        const rr=await api.head(url);
        const type=(rr.headers()['content-type']||'').split(';')[0];
        if(!rr.ok()||type!=='application/pdf') failures.push('service PDF invalid '+url+' '+rr.status()+' '+type);
      }
      const guides=page.locator('.service-guide[data-document]');
      const guideCount=await guides.count();
      if(!guideCount) failures.push('services page has no technical guide cards');
      if(guideCount){
        const guide=guides.first();
        await guide.locator('summary strong').click();
        const iframe=guide.locator('iframe');
        await iframe.waitFor({state:'attached',timeout:3000}).catch(()=>{});
        const loaded=await guide.getAttribute('data-loaded');
        const iframeCount=await iframe.count();
        if(loaded!=='true'||iframeCount!==1) failures.push('technical guide preview failed for '+(await guide.getAttribute('data-document')));
        if(iframeCount===1){
          const src=await iframe.getAttribute('src');
          if(!src?.includes('.pdf')) failures.push('technical guide preview has invalid PDF source for '+(await guide.getAttribute('data-document')));
        }
        await guide.locator('summary strong').click();
      }
    }
  }

  await context.close();
  await browser.close();
} catch(error){
  failures.push((error && error.stack) ? error.stack : String(error));
} finally {
  server.kill('SIGTERM');
}

console.log('Runtime pages: '+htmlFiles.length+' failures: '+failures.length);
failures.forEach(failure=>console.error(failure));
if(failures.length) process.exit(1);