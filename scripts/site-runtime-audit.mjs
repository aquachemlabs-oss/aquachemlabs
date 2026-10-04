import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
const pages=['/','/about-us','/services','/products','/ro-plant','/chemicals','/plant-care-guide','/plant-chemical-guide','/projects','/reviews','/gallery','/technical-resources','/engineering-tools','/technical-documents','/locations','/bhopal-water-treatment','/indore-water-treatment','/jabalpur-water-treatment','/contact'];
const browser=await chromium.launch({headless:true});const page=await browser.newPage();const failures=[];page.on('pageerror',e=>failures.push('pageerror: '+e.message));page.on('response',res=>{if(res.status()>=400&&res.url().startsWith('http://127.0.0.1:4173/')) failures.push('resource '+res.status()+': '+res.url())});
for(const p of pages){const r=await page.goto('http://127.0.0.1:4173'+p,{waitUntil:'networkidle'});if(!r||!r.ok())failures.push(p+' HTTP '+(r?.status()||0));const h1=await page.locator('h1').count();if(h1!==1)failures.push(p+' H1='+h1);const links=await page.locator('a[href]').evaluateAll(as=>as.map(a=>a.href).filter(h=>h.startsWith(location.origin)));for(const h of links){const rr=await page.request.get(h);if(!rr.ok())failures.push(p+' broken '+h+' '+rr.status())} if(p==='/'){await page.locator('#prob').selectOption('tds');if(!(await page.locator('#res').textContent()).includes('Industrial RO Plant'))failures.push('homepage diagnostic interaction failed')} if(p==='/engineering-tools'){const cases=[
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
for(let i=0;i<test.ids.length;i++){await page.locator('#'+test.ids[i]).fill(test.values[i])}
const resultText=await page.locator('#'+test.ids[test.ids.length-1].replace(/-flow|-perm|-ppm|-l|-w|-d|-makeup|-circ|-conc|-dose|-strength|-head|-eff|-dia|-bod|-mlss|-volume$/,'')+'-out').textContent().catch(()=>null);
const cardOutput=page.locator('.calculator-card').filter({has:page.locator('#'+test.ids[0])}).locator('.calculator-result');
const text=await cardOutput.textContent();
if(!text.includes(test.expected))failures.push('calculator failed '+test.ids.join(',')+' got '+text);
}
const popupButton=page.locator('[data-calc="ro"]');
await page.locator('#ro-feed').fill('10');await page.locator('#ro-perm').fill('7.5');await popupButton.click();
if(!(await page.locator('#calculator-result-modal').evaluate(e=>e.classList.contains('is-open'))))failures.push('calculator popup did not open');
if(!(await page.locator('.calculator-result-modal__inputs').textContent()).includes('7.5'))failures.push('calculator popup did not show entered values');
await page.locator('[data-close-calculator]').first().click();
if(await page.locator('#calculator-result-modal').evaluate(e=>e.classList.contains('is-open')))failures.push('calculator popup did not close');
if(await page.locator('.technical-toc').count())failures.push('unexpected On This Page ribbon present')} if(p==='/products'){await page.locator('#productsDropdown .dd-label').click();if(!(await page.locator('#productsDropdown').evaluate(e=>e.classList.contains('active'))))failures.push('products dropdown interaction failed')} if(p==='/services'){const pdfs=await page.locator('a[href$=".pdf"]').evaluateAll(as=>as.map(a=>a.href));for(const h of pdfs){const rr=await page.request.get(h);if(!rr.ok()||rr.headers()['content-type']?.split(';')[0]!=='application/pdf')failures.push('service PDF invalid '+h+' '+(rr.status()||0))}}}
await browser.close();console.log('Runtime pages:',pages.length,'failures:',failures.length);failures.forEach(x=>console.error(x));if(failures.length)process.exit(1);