import {readFileSync,writeFileSync} from 'node:fs';
import {copy} from './redesign-content.mjs';
import {locales,paths,localizedPath} from './content.mjs';
import {offices} from './offices-data.mjs';
import {escapeHtml,renderPage} from './redesign-render.mjs';
const map=JSON.parse(readFileSync('offices-map-dark.html','utf8').match(/const mapData=(.*?);\n/)[1]);
globalThis.siteData={copy,offices,catalog:{},serviceUrls:{},aboutUrls:{},privacyUrls:{},baseUrls:{},land:map.polygons.map(d=>`<path d="${d}"/>`).join('')};
siteData.logos=Object.fromEntries(['dark','light'].map(theme=>[theme,'data:image/svg+xml;base64,'+Buffer.from(readFileSync('assets/northgo-logo-'+theme+'.svg')).toString('base64')]));
for(const [l,v] of Object.entries(locales)){siteData.catalog[l]=v.pages.slice(4,8);siteData.serviceUrls[l]=paths.slice(4,8).map(p=>'https://www.northgo.com'+localizedPath(p,l));siteData.aboutUrls[l]='https://www.northgo.com'+localizedPath('/about',l);siteData.privacyUrls[l]='https://www.northgo.com'+localizedPath('/legal/privacy-policy',l);siteData.baseUrls[l]='https://www.northgo.com'+localizedPath('/',l);}
const html=`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="description" content="Northgo 網站更新提案：四大物流服務、全球七個辦公室與詢價引導。"><title>Northgo｜讓每一段物流，更清楚</title><style>${readFileSync('redesign.css','utf8')}</style></head><body><div id="app">${renderPage('zh-tw')}</div><script>const siteData=${JSON.stringify(siteData).replaceAll('<','\\u003c')};\nconst escapeHtml=${escapeHtml.toString()};\n${renderPage.toString()}\n${readFileSync('redesign.js','utf8')}</script></body></html>`;
writeFileSync('northgo-updated.html',html);console.log('Generated northgo-updated.html');

