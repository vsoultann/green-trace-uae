import http from 'node:http'; import fs from 'node:fs/promises'; import fssync from 'node:fs'; import path from 'node:path';
import puppeteer from 'puppeteer-core';
const APP = path.resolve('app');
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.bin':'application/octet-stream'};
const server=http.createServer(async(req,res)=>{let rel=decodeURIComponent(new URL(req.url,'http://x').pathname); if(rel.endsWith('/'))rel+='index.html';
 const f=path.join(APP,rel); try{const b=await fs.readFile(f); res.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'}); res.end(b);}catch{res.writeHead(404).end('nf');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/`;
const exe=['/usr/bin/chromium','/usr/bin/google-chrome-stable'].find(p=>fssync.existsSync(p));
const browser=await puppeteer.launch({executablePath:exe,headless:'shell',protocolTimeout:600000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage(); await page.setViewport({width:1366,height:860});
page.on('pageerror',e=>console.log('PAGEERROR',e.message));

// Shorten the idle window before the kiosk view mounts.
await page.goto(base,{waitUntil:'networkidle2'});
await page.evaluate(async()=>{ const {CONFIG}=await import('./js/config.js'); CONFIG.kiosk.idleMs = 3000; });
await page.evaluate(()=>{location.hash='#/showcase';});
await new Promise(r=>setTimeout(r,900));
console.log('kiosk mounted:', await page.evaluate(()=>({chrome:document.body.dataset.chrome, session:document.body.dataset.kioskSession, route:document.querySelector('#view')?.dataset.route})));

// A visitor scans, then walks away.
await page.evaluate(()=>{location.hash='#/?sample=ghaf.jpg';});
await page.waitForFunction(()=>document.querySelector('#view')?.dataset.route==='result',{timeout:180000});
console.log('after scan:', await page.evaluate(async()=>({route:document.querySelector('#view')?.dataset.route, scan: !!(await import('./js/state.js')).lastScan()})));

await new Promise(r=>setTimeout(r,5000));
console.log('after idle:', await page.evaluate(async()=>({route:document.querySelector('#view')?.dataset.route, hash:location.hash, scan: !!(await import('./js/state.js')).lastScan()})));

// Escape leaves kiosk mode for good.
await page.keyboard.press('Escape');
await new Promise(r=>setTimeout(r,700));
console.log('after escape:', await page.evaluate(()=>({hash:location.hash, session:document.body.dataset.kioskSession})));
await new Promise(r=>setTimeout(r,5000));
console.log('idle after escape (should stay):', await page.evaluate(()=>location.hash));
await browser.close(); server.close();
