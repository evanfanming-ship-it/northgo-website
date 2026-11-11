import http from 'node:http';
import {readFileSync} from 'node:fs';
const server=http.createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const files={'/':'offices-map.html','/offices-map.html':'offices-map.html','/offices-map-dark.html':'offices-map-dark.html','/northgo-updated.html':'northgo-updated.html'};
 if(!Object.hasOwn(files,path)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
 res.end(readFileSync(new URL('./'+files[path],import.meta.url)));
});
server.listen(4174,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4174/offices-map.html'));
