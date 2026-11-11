const {offices,regions,polygons}=mapData;
const svg=document.querySelector('#world-map'),land=document.querySelector('#land'),markers=document.querySelector('#markers'),stage=document.querySelector('#map-stage');
const rows=[...document.querySelectorAll('[data-office]')],tabs=[...document.querySelectorAll('[data-region]')];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function project(lon,lat){return {x:(lon+180)*1000/360,y:(90-lat)*500/180};}
function visibleOffices(region){return offices.filter(o=>region==='world'||(region==='asia'?o.region!=='north-america':o.region===region));}
function boundsCamera(bounds){const a=project(bounds[0],bounds[3]),b=project(bounds[2],bounds[1]);return {x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y};}
function mapUrl(o){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(o.address);}
let region='world',selected=null,camera=boundsCamera(regions.world.bounds),size={w:1000,h:440},drag=null,suppressClick=false;
land.innerHTML=polygons.map(d=>'<path d="'+d+'"/>').join('');
function transform(){const scale=Math.min((size.w-34)/camera.w,(size.h-68)/camera.h);return {s:scale,x:(size.w-camera.w*scale)/2-camera.x*scale,y:(size.h-camera.h*scale)/2-camera.y*scale};}
function labelLayout(points,w,h){
 const placed=[];
 const collision=(a,b)=>!(a.x+a.w+5<b.x||b.x+b.w+5<a.x||a.y+a.h+5<b.y||b.y+b.h+5<a.y);
 const reserved=[{x:0,y:0,w:190,h:38},{x:0,y:h-132,w:62,h:132},{x:Math.max(0,w-200),y:h-32,w:200,h:32}];
 const order=[...points].sort((a,b)=>a.y-b.y||a.x-b.x);
 for(const p of order){
  const bw=p.office.name.length*12+40,bh=29;
  const hints={tpe:[-125,-62],txg:[-145,-16],khh:[-125,30],lax:[-65,-48],hcm:[-110,42],tyo:[18,-46],osa:[22,5]};
  const [hx,hy]=hints[p.office.id];const candidates=[[hx,hy],[18,-40],[-bw-18,-40],[18,12],[-bw-18,12]];
  for(let radius=40;radius<300;radius+=35)for(const side of [-1,1])for(const y of [-radius,0,radius])candidates.push([side===1?20:-bw-20,y]);
  let best=null,bestScore=Infinity;
  for(const [dx,dy] of candidates){const box={x:Math.max(8,Math.min(w-bw-8,p.x+dx)),y:Math.max(42,Math.min(h-bh-38,p.y+dy)),w:bw,h:bh};const overlaps=[...placed,...reserved].filter(b=>collision(box,b)).length;const dist=Math.hypot(box.x+bw/2-p.x,box.y+bh/2-p.y);const score=overlaps*10000+dist+(dx===hx&&dy===hy?-24:0);if(score<bestScore){best=box;bestScore=score;}}
  placed.push(best);p.box=best;
 }
 return points;
}
function render(){
 const t=transform();land.setAttribute('transform','translate('+t.x+' '+t.y+') scale('+t.s+')');
 const points=visibleOffices(region).map(office=>{const p=project(office.lon,office.lat);return {office,x:p.x*t.s+t.x,y:p.y*t.s+t.y};}).filter(p=>p.x>=-10&&p.x<=size.w+10&&p.y>=-10&&p.y<=size.h+10);
 labelLayout(points,size.w,size.h);
 markers.innerHTML=points.map(p=>{const o=p.office,b=p.box,n=String(offices.indexOf(o)+1).padStart(2,'0');const lx=Math.max(b.x,Math.min(b.x+b.w,p.x)),ly=Math.max(b.y,Math.min(b.y+b.h,p.y));return '<g class="office-marker '+(o.head?'head ':'')+(selected===o.id?'active':'')+'" data-marker="'+o.id+'" role="button" tabindex="0" aria-label="'+o.name+'辦公室'+(o.head?'，總部':'')+'" aria-pressed="'+(selected===o.id)+'"><title>'+o.name+' · '+o.en+'</title><path class="leader" d="M'+p.x.toFixed(1)+','+p.y.toFixed(1)+'L'+lx.toFixed(1)+','+ly.toFixed(1)+'"/><circle class="halo" cx="'+p.x+'" cy="'+p.y+'" r="11"/><circle class="dot" cx="'+p.x+'" cy="'+p.y+'" r="4.5"/><rect class="label-box" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'"/><text class="number" x="'+(b.x+8)+'" y="'+(b.y+18)+'">'+n+'</text><text x="'+(b.x+29)+'" y="'+(b.y+19)+'">'+o.name+'</text></g>';}).join('');
}
function selectOffice(id){
 const o=offices.find(o=>o.id===id);if(!o||!visibleOffices(region).some(o=>o.id===id))return;
 selected=id;rows.forEach(row=>row.setAttribute('aria-pressed',String(row.dataset.office===id)));
 const no=String(offices.indexOf(o)+1).padStart(2,'0');
 document.querySelector('#selection').innerHTML='<div class="office-detail-head"><div class="detail-title"><h3>'+o.name+'辦公室'+(o.head?'<span class="detail-tag">總部</span>':'')+'<small lang="en">'+o.en+' Office</small></h3></div><button type="button" class="focus-office" id="focus-office">聚焦此據點 ↗</button></div><div class="contact-grid"><div><span class="contact-label">'+no+' / '+o.country+' · ADDRESS</span><address lang="en">'+esc(o.address)+'</address><a class="map-link" href="'+mapUrl(o)+'" target="_blank" rel="noopener noreferrer">Google Maps <span aria-hidden="true">↗</span></a></div><div><span class="contact-label">CONTACT</span><div class="contact-line"><span>電話</span><a href="tel:'+o.tel.replaceAll('-','')+'">'+o.tel+'</a></div>'+(o.fax?'<div class="contact-line"><span>傳真</span>'+o.fax+'</div>':'')+'<div class="contact-line"><span>Email</span><a href="mailto:'+o.email+'">'+o.email+'</a></div></div></div>';
 document.querySelector('#focus-office').addEventListener('click',()=>{camera=boundsCamera(regions[o.region].bounds);render();});
 render();
}
const emptySelection=document.querySelector('#selection').innerHTML;
function selectRegion(id){
 if(!Object.hasOwn(regions,id))return;
 region=id;camera=boundsCamera(regions[id].bounds);const list=visibleOffices(id);
 tabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.region===id)));
 rows.forEach(row=>row.closest('li').hidden=!list.some(o=>o.id===row.dataset.office));
 if(selected&&!list.some(o=>o.id===selected)){selected=null;rows.forEach(row=>row.setAttribute('aria-pressed','false'));document.querySelector('#selection').innerHTML=emptySelection;}
 document.querySelector('#map-title').textContent=id==='world'?'全球辦公室':regions[id].name+'辦公室';
 document.querySelector('#map-count').textContent='區域內 '+list.length+' / 7 個據點';
 document.querySelector('#list-count').textContent=String(list.length).padStart(2,'0');
 render();
}
tabs.forEach(tab=>tab.addEventListener('click',()=>selectRegion(tab.dataset.region)));
rows.forEach(row=>row.addEventListener('click',()=>selectOffice(row.dataset.office)));
markers.addEventListener('click',e=>{if(suppressClick)return;const target=e.target.closest('[data-marker]');if(target)selectOffice(target.dataset.marker);});
markers.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const target=e.target.closest('[data-marker]');if(target){e.preventDefault();const id=target.dataset.marker;selectOffice(id);markers.querySelector('[data-marker="'+id+'"]').focus();}}});
function zoom(factor){const cx=camera.x+camera.w/2,cy=camera.y+camera.h/2,w=Math.max(3,Math.min(1100,camera.w*factor)),h=camera.h*(w/camera.w);camera={x:cx-w/2,y:cy-h/2,w,h};render();}
document.querySelector('#zoom-in').addEventListener('click',()=>zoom(.7));
document.querySelector('#zoom-out').addEventListener('click',()=>zoom(1/.7));
document.querySelector('#reset-map').addEventListener('click',()=>{camera=boundsCamera(regions[region].bounds);render();});
svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('[data-marker]'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,camera:{...camera},scale:transform().s,moved:false};suppressClick=false;svg.setPointerCapture(e.pointerId);svg.classList.add('dragging');});
svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>3)drag.moved=true;const cx=Math.max(-40,Math.min(1040,drag.camera.x+drag.camera.w/2-dx/drag.scale)),cy=Math.max(-20,Math.min(480,drag.camera.y+drag.camera.h/2-dy/drag.scale));camera={...drag.camera,x:cx-drag.camera.w/2,y:cy-drag.camera.h/2};render();});
function endDrag(e){if(!drag||e.pointerId!==drag.id)return;suppressClick=drag.moved;drag=null;svg.classList.remove('dragging');if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);}
svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
// A marker click starts a fresh gesture and is never swallowed by a previous pan.
markers.addEventListener('pointerdown',()=>{suppressClick=false;});
function resize(){const rect=stage.getBoundingClientRect();size={w:Math.max(240,rect.width),h:Math.max(250,rect.height)};svg.setAttribute('viewBox','0 0 '+size.w+' '+size.h);render();}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(stage);else window.addEventListener('resize',resize);
window.addEventListener('beforeprint',resize);window.addEventListener('afterprint',resize);
resize();selectRegion('world');
