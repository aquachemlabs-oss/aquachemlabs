import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';

const origin=(process.env.LIVE_BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const sitemap=await fs.readFile('sitemap.xml','utf8');
const paths=[...sitemap.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)]
  .map(match=>new URL(match[1]))
  .filter(url=>url.hostname==='aquachemlabs.com'&&!url.pathname.toLowerCase().endsWith('.pdf'))
  .map(url=>url.pathname);
const uniquePaths=[...new Set(paths)];
const issues=[];
const rows=[];
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1365,height:900}});
const page=await context.newPage();
page.setDefaultNavigationTimeout(25000);

for(const pathname of uniquePaths){
  const url=origin+pathname;
  try{
    const response=await page.goto(url,{waitUntil:'load',timeout:25000});
    await page.waitForTimeout(900);
    const data=await page.evaluate(()=>{
      const meta=(name)=>document.querySelector('meta[name="'+name+'"]')?.content?.trim()||'';
      const canonical=document.querySelector('link[rel="canonical"]')?.href||'';
      const nav=performance.getEntriesByType('navigation')[0];
      const paint=performance.getEntriesByType('paint');
      let lcp=null,cls=0;
      try{
        const lcpObserver=new PerformanceObserver(list=>{for(const entry of list.getEntries())lcp=entry.startTime;});
        lcpObserver.observe({type:'largest-contentful-paint',buffered:true});
      }catch{}
      try{
        const clsObserver=new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)cls+=entry.value;});
        clsObserver.observe({type:'layout-shift',buffered:true});
      }catch{}
      return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({
        title:document.title.trim(),
        description:meta('description'),
        robots:meta('robots').toLowerCase(),
        canonical,
        h1:document.querySelectorAll('h1').length,
        fcp:paint.find(item=>item.name==='first-contentful-paint')?.startTime??null,
        lcp,cls,
        domContentLoaded:nav?.domContentLoadedEventEnd??null,
        load:nav?.loadEventEnd??null,
        transferBytes:nav?.transferSize??null,
        htmlBytes:document.documentElement.outerHTML.length
      }))));
    });
    const status=response?.status()??0;
    const noindex=/noindex/.test(data.robots);
    if(status!==200)issues.push(pathname+' returned HTTP '+status);
    if(status===200&&!data.title)issues.push(pathname+' missing title');
    if(status===200&&!data.description)issues.push(pathname+' missing meta description');
    if(status===200&&!data.canonical.startsWith('https://aquachemlabs.com/'))issues.push(pathname+' has missing/noncanonical canonical URL: '+data.canonical);
    if(status===200&&data.h1!==1)issues.push(pathname+' has '+data.h1+' H1 elements');
    if(noindex)issues.push(pathname+' is noindex but appears in sitemap');
    if(data.fcp!==null&&data.fcp>2500)issues.push(pathname+' FCP over 2.5s ('+Math.round(data.fcp)+'ms)');
    if(data.lcp!==null&&data.lcp>2500)issues.push(pathname+' LCP over 2.5s ('+Math.round(data.lcp)+'ms)');
    if(data.cls>0.1)issues.push(pathname+' CLS over 0.1 ('+data.cls.toFixed(3)+')');
    rows.push({path:pathname,status,title:data.title,fcp:data.fcp,lcp:data.lcp,cls:data.cls,domContentLoaded:data.domContentLoaded,load:data.load,transferBytes:data.transferBytes,htmlBytes:data.htmlBytes,noindex});
    console.log('URL '+status+' '+pathname+' | FCP '+fmt(data.fcp)+' | LCP '+fmt(data.lcp)+' | CLS '+(data.cls??0).toFixed(3)+' | bytes '+(data.transferBytes??'n/a'));
  }catch(error){
    issues.push(pathname+' navigation/measurement failed: '+error.message);
    console.error('URL ERROR '+pathname+': '+error.message);
  }
}
await context.close();
await browser.close();

function fmt(value){return value===null||value===undefined?'n/a':Math.round(value)+'ms';}
const measured=rows.filter(row=>row.status===200);
const average=(key)=>{const values=measured.map(row=>row[key]).filter(value=>typeof value==='number'&&Number.isFinite(value));return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;};
const summary={
  origin,urlsChecked:uniquePaths.length,http200:measured.length,
  non200:rows.filter(row=>row.status!==200).map(row=>({path:row.path,status:row.status})),
  averageFcpMs:average('fcp'),averageLcpMs:average('lcp'),averageCls:Number((average('cls')??0).toFixed(3)),
  averageDomContentLoadedMs:average('domContentLoaded'),averageLoadMs:average('load'),
  performanceThresholdIssues:issues.length,issues
};
console.log('PERFORMANCE_AND_INDEXABILITY_SUMMARY '+JSON.stringify(summary,null,2));
if(process.env.STRICT_LIVE_AUDIT==='true'&&issues.length)process.exit(1);
