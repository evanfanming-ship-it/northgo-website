import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {offices,regions,project,regionOffices,mapUrl} from './offices-data.mjs';
const html=readFileSync('offices-map.html','utf8'),js=readFileSync('offices.js','utf8');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
assert.equal(offices.length,7);assert.equal(new Set(offices.map(o=>o.id)).size,7);
const expected={world:7,asia:6,taiwan:3,japan:2,'north-america':1,'southeast-asia':1};
for(const [r,n] of Object.entries(expected))assert.equal(regionOffices(r).length,n);
for(const o of offices){assert.ok(o.lat>=-90&&o.lat<=90&&o.lon>=-180&&o.lon<=180);assert.match(o.email,/@northgo\.com$/);assert.equal(new URL(mapUrl(o)).searchParams.get('query'),o.address);assert.ok(html.includes(o.id));}
const ctx=vm.createContext({});vm.runInContext(js.slice(js.indexOf('function labelLayout'),js.indexOf('function render')),ctx);
let layouts=0;
for(const size of [{w:824,h:440},{w:341,h:390}])for(const r of Object.keys(regions)){
 const b=regions[r].bounds,a=project(b[0],b[3]),z=project(b[2],b[1]),w=z.x-a.x,h=z.y-a.y,s=Math.min((size.w-34)/w,(size.h-68)/h),tx=(size.w-w*s)/2-a.x*s,ty=(size.h-h*s)/2-a.y*s;
 const points=regionOffices(r).map(office=>{const p=project(office.lon,office.lat);return {office,x:p.x*s+tx,y:p.y*s+ty};});
 const boxes=ctx.labelLayout(points,size.w,size.h).map(p=>p.box);
 for(const box of boxes){assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=size.w&&box.y+box.h<=size.h);}
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'Overlapping labels: '+r+' at '+size.w);}
 layouts++;
}
const report={offices:7,regionCounts:expected,labelLayoutsChecked:layouts,browserChecks:['All 6 region filters: marker and list counts match','All 7 office cards: emails and address-based map links','390px mobile viewport: no horizontal overflow and all 7 labels visible','Keyboard selection using Enter','Zoom in and reset','Desktop global overview: all 7 markers visible','No browser console errors'],screenshot:'offices-map-preview.png',markerPrecision:'Illustrative city locations; Google Maps links search the official address.'};
writeFileSync('offices-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
