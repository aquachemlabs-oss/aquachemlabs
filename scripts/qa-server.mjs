import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const port = Number(process.env.QA_PORT || 4173);
const host = '127.0.0.1';
const mime = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8',
  '.txt':'text/plain; charset=utf-8','.pdf':'application/pdf','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.png':'image/png','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.ico':'image/x-icon'
};
const json = (res,status,body) => { res.statusCode=status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store'); res.end(JSON.stringify(body)); };
function safeFile(urlPath){
  let pathname;
  try { pathname=decodeURIComponent(urlPath.split('?')[0]||'/'); } catch { return null; }
  if(!pathname.startsWith('/') || pathname.includes('\0')) return null;
  const relative=pathname==='/'?'index.html':pathname.slice(1);
  const candidate=path.resolve(root,relative);
  if(candidate!==root&&!candidate.startsWith(root+path.sep)) return null;
  if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile()) return candidate;
  if(!path.extname(candidate)){
    const htmlCandidate=candidate+'.html';
    if(htmlCandidate.startsWith(root+path.sep)&&fs.existsSync(htmlCandidate)&&fs.statSync(htmlCandidate).isFile()) return htmlCandidate;
  }
  return null;
}
const server=http.createServer((req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');res.statusCode=405;res.end('Method not allowed');return;}
  const pathname=req.url||'/';
  if(pathname.split('?')[0]==='/api/google-business'){json(res,200,{configured:false,mapsUrl:'https://www.google.com/maps'});return;}
  if(pathname.split('?')[0]==='/api/company-reviews'){json(res,200,{reviews:[],average:0,count:0});return;}
  const file=safeFile(pathname);
  if(!file){res.statusCode=404;res.setHeader('Content-Type','text/plain; charset=utf-8');res.end('Not found');return;}
  const stat=fs.statSync(file);res.statusCode=200;res.setHeader('Content-Type',mime[path.extname(file).toLowerCase()]||'application/octet-stream');res.setHeader('Content-Length',String(stat.size));res.setHeader('Cache-Control','no-store');
  if(req.method==='HEAD'){res.end();return;}
  fs.createReadStream(file).on('error',()=>{if(!res.headersSent)res.statusCode=500;res.end('File read error');}).pipe(res);
});
server.on('error',e=>{console.error('QA server error:',e);process.exitCode=1;});
server.listen(port,host,()=>console.log('QA server listening at http://'+host+':'+port));
const shutdown=()=>server.close(()=>process.exit(0));
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);