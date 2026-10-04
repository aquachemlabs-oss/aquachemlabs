import { chromium } from '@playwright/test';
const pages=['/','/about-us','/services','/products','/ro-plant','/chemicals','/plant-care-guide','/plant-chemical-guide','/projects','/reviews','/gallery','/technical-resources','/engineering-tools','/technical-documents','/locations','/bhopal-water-treatment','/indore-water-treatment','/jabalpur-water-treatment','/contact'];
const browser=await chromium.launch({headless:true}), page=await browser.newPage(), failures=[];
page.on('console',m=>{if(m.type()==='error')failures.push('console: '+m.text())});
page.on('pageerror',e=>failures.push('pageerror: '+e.message));
for(const p of pages){
 const r=await page.goto('http://127.0.0.1:4173'+p,{waitUntil:'domcontentloaded'});
 if(!r||!r.ok())failures.push(p+' HTTP '+(r?.status()||0));
 const h=await page.locator('h1').count();if(h!==1)failures.push(p+' H1 count '+h);
 const links=await page.locator('a[href]').evaluateAll(as=>as.map(a=>a.href).filter(h=>h.startsWith(location.origin)));
 for(const href of links){const x=await page.request.get(href);if(!x.ok())failures.push(p+' broken '+href+' '+x.status())}
 if(p==='/'&&await page.locator('#prob').count()){await page.locator('#prob').selectOption('tds');const text=await page.locator('#res').textContent();if(!text.includes('Industrial RO Plant'))failures.push('homepage diagnostic interaction failed')}
 if(p==='/products'&&await page.locator('#productsDropdown .dd-label').count()){await page.locator('#productsDropdown .dd-label').click();if(!(await page.locator('#productsDropdown').evaluate(e=>e.classList.contains('active'))))failures.push('products dropdown interaction failed')}
}
await browser.close();
console.log('Runtime pages checked: '+pages.length);
console.log('Runtime failures: '+failures.length);
failures.forEach(x=>console.error(x));
if(failures.length)process.exit(1);