import {readFileSync,writeFileSync} from 'node:fs';
import {offices,regions} from './offices-data.mjs';
const project=(lon,lat)=>({x:((lon < -20?lon+360:lon)+20)*1000/360,y:(90-lat)*500/180});
const world=JSON.parse(readFileSync('world-countries.geojson','utf8')),polygons=[];
for(const f of world.features){if(f.properties.ADMIN==='Antarctica')continue;const ps=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];for(const poly of ps){for(const ring of poly){let d='',last=null;for(const [lon,lat] of ring){const p=project(lon,lat);if(last&&Math.abs(p.x-last.x)>500){if(d)polygons.push(d);d='';}d+=(d?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2);last=p;}if(d)polygons.push(d);}}}
const rs=structuredClone(regions);rs.world.bounds=[-20,-56,340,78];
let html=readFileSync('offices-map.html','utf8');
html=html.replace(/const mapData=.*?;\n/,()=> 'const mapData='+JSON.stringify({offices,regions:rs,polygons})+';\n');
html=html.replace('return {x:(lon+180)*1000/360,y:(90-lat)*500/180};','return {x:((lon < -20?lon+360:lon)+20)*1000/360,y:(90-lat)*500/180};');
html=html.replace('<title>Northgo｜全球辦公室地圖</title>','<title>Northgo｜全球辦公室・深色地圖</title>').replace('與世界連結，<br class="mobile-br">從這裡開始<span>．</span>','我們的全球辦公室');
html=html.replace('stroke="#d6e3e7"','stroke="#263b50"');
html=html.replace('</style>',readFileSync('offices-dark.css','utf8')+'</style>');
html=html.replace('官網聯絡頁 <span','聯絡頁 <span');
html=html.replace('<div class="header-label">GLOBAL NETWORK</div>','<div class="header-label">GLOBAL NETWORK</div><a class="source-link" href="index.html">網站地圖 ↗</a>');
html=html.replace('<div class="directory-head"><h2>辦公室一覽</h2>','<div class="directory-head"><h2>辦公室</h2>');
writeFileSync('offices-map-dark.html',html);console.log('Generated offices-map-dark.html');
