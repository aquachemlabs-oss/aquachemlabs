import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.xml':'application/xml','.pdf':'application/pdf','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml'};
http.createServer((req,res)=>{let u=decodeURIComponent((req.url||'/').split('?')[0]);let f=path.join(root,u==='/'?'index.html':u.slice(1));if(!path.extname(f)&&fs.existsSync(f+'.html'))f+='.html';if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.statusCode=200;res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res)}else{res.statusCode=404;res.end('Not found')}}).listen(4173,'127.0.0.1',()=>console.log('QA server on 4173'));