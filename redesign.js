const app=document.querySelector('#app');
let language='zh-tw',region='world',chosenOffice=null,formValues={};
const regionKeys=['world','asia','taiwan','japan','north-america','southeast-asia'];
function localOffices(){return siteData.offices.filter(o=>region==='world'||(region==='asia'?o.region!=='north-america':o.region===region));}
function point(o){return {x:((o.lon < -20?o.lon+360:o.lon)+20)*1000/360,y:(90-o.lat)*500/180};}
function renderMap(){
 const list=localOffices(),t=siteData.copy[language];
 const map=document.querySelector('#office-map'),bounds={world:[-20,-56,340,78],asia:[94,0,150,47],taiwan:[119.2,21.2,123.2,26.3],japan:[129,30,144,40],'north-america':[-132,23,-104,49],'southeast-asia':[98,3,112,20]}[region];
 const a=point({lon:bounds[0],lat:bounds[3]}),b=point({lon:bounds[2],lat:bounds[1]});let w=b.x-a.x,h=b.y-a.y;const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;if(w/h<2)w=h*2;else h=w/2;w*=1.12;h*=1.12;
 map.setAttribute('viewBox',`${cx-w/2} ${cy-h/2} ${w} ${h}`);document.querySelector('#map-bg').setAttribute('x',cx-w/2);document.querySelector('#map-bg').setAttribute('y',cy-h/2);document.querySelector('#map-bg').setAttribute('width',w);document.querySelector('#map-bg').setAttribute('height',h);
 const scale=w/1000;
 document.querySelector('#map-markers').innerHTML=list.map(o=>{const i=siteData.offices.indexOf(o),p=point(o),labels=[2,3,4,0,5,0,1],column=region==='world'||region==='asia';let x,y;if(column&&o.id!=='lax'){x=region==='world'?530:cx+w*.26;y=region==='world'?130+labels[i]*43:cy-h*.30+labels[i]*h*.12;}else{x=p.x+15*scale;y=p.y-18*scale;}const text=escapeHtml(t.cities[i]);return `<g data-marker="${o.id}" tabindex="0" role="button" aria-label="${text}" aria-pressed="${chosenOffice===o.id}"><path class="leader" d="M${p.x},${p.y}L${x},${y}" fill="none" stroke="#a4dbcc" stroke-width="${1.3*scale}"/><circle cx="${p.x}" cy="${p.y}" r="${11*scale}" fill="#a4dbcc" opacity=".2"/><circle cx="${p.x}" cy="${p.y}" r="${5*scale}" fill="${o.head?'white':'#a4dbcc'}" stroke="#c6f2e4" stroke-width="${1.5*scale}"/><rect class="label-box" x="${x}" y="${y-19*scale}" width="${Math.max(85,t.cities[i].length*11+20)*scale}" height="${29*scale}" rx="${5*scale}" fill="#102b36" stroke="${chosenOffice===o.id?'#fff':'#548e91'}" stroke-width="${scale}"/><text x="${x+9*scale}" y="${y}" fill="white" font-size="${16*scale}">${text}</text></g>`;}).join('');
 document.querySelectorAll('[data-office]').forEach(b=>{b.hidden=!list.some(o=>o.id===b.dataset.office);b.setAttribute('aria-pressed',String(b.dataset.office===chosenOffice));});
 document.querySelectorAll('[data-region]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.region===region)));
}
function showOffice(id){
 const o=siteData.offices.find(o=>o.id===id);if(!o)return;chosenOffice=id;const t=siteData.copy[language],name=t.cities[siteData.offices.indexOf(o)],e=escapeHtml;
 document.querySelector('#office-detail').innerHTML=`<h3>${e(name)}${o.head?' · '+e(t.head):''}</h3><address lang="en">${e(o.address)}</address><a href="tel:${o.tel.replaceAll('-','')}">${e(t.phone)} ${e(o.tel)}</a><a href="mailto:${o.email}">${o.email}</a><a class="map-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}" target="_blank" rel="noopener noreferrer">${e(t.mapLink)} ↗</a>`;renderMap();
}
function capture(){const f=document.querySelector('#enquiry-form');if(!f)return;for(const el of f.elements){if(el.name)formValues[el.name]=el.type==='checkbox'?el.checked:el.value;}}
const enquiryEndpoint = document.querySelector('meta[name=northgo-enquiry-api]')?.content;
const submissionCopy = {
 'zh-tw': ['確認後即可送出詢問，並取得收件編號。','送出詢問','已收到詢問。收件編號','送出失敗，請稍後重試。','送出中…'],
 en: ['Review your details before submitting. You will receive a reference number.','Submit enquiry','Enquiry received. Reference','Could not submit. Please try again.','Submitting…'],
 ja: ['内容を確認して送信すると、受付番号が発行されます。','お問い合わせを送信','受け付けました。受付番号','送信できませんでした。もう一度お試しください。','送信中…'],
 vi: ['Kiểm tra nội dung trước khi gửi để nhận mã yêu cầu.','Gửi yêu cầu','Đã nhận yêu cầu. Mã','Không gửi được. Vui lòng thử lại.','Đang gửi…'],
};
const anotherEnquiry = { 'zh-tw':'再送一筆詢問', en:'Start another enquiry', ja:'新しいお問い合わせ', vi:'Gửi yêu cầu khác' };
let pendingEnquiry;
function connectEnquiry(form, lang) {
 if (!enquiryEndpoint) return;
 const [instructions, submit, received, failed, sending] = submissionCopy[lang];
 document.querySelector('.enquiry-grid > div > .form-notice').textContent = instructions;
 const review = document.querySelector('#enquiry-review');
 const message = review.querySelector('.form-notice');
 message.textContent = instructions;
 message.setAttribute('role', 'status');
 const button = document.createElement('button');
 button.type = 'button';
 button.className = 'button';
 button.textContent = submit;
 review.querySelector('.review-actions').prepend(button);
 for (const selector of ['#email-draft', '#download']) review.querySelector(selector).hidden = true;
 button.onclick = async () => {
   const payload = { ...formValues, language: lang };
   const signature = JSON.stringify(payload);
   if (pendingEnquiry?.signature !== signature) {
     const bytes = crypto.getRandomValues(new Uint8Array(16));
     const id = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
     pendingEnquiry = { signature, id };
   }
   button.disabled = true;
   const edit = review.querySelector('#edit');
   const languageControl = document.querySelector('#language');
   edit.disabled = languageControl.disabled = true;
   message.textContent = sending;
   try {
     const response = await fetch(enquiryEndpoint, {
       method: 'POST', headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ ...payload, requestId: pendingEnquiry.id }),
     });
     if (!response.ok) throw new Error('Submission failed');
     const { id } = await response.json();
     message.textContent = received + ' ' + id;
     review.querySelector('#review-data').replaceChildren();
     review.querySelector('.review-actions').hidden = true;
     pendingEnquiry = null;
     formValues = {};
     form.reset();
     const again = document.createElement('button');
     again.type = 'button';
     again.className = 'button';
     again.textContent = anotherEnquiry[lang];
     again.onclick = () => {
       hydrate(lang);
       document.querySelector('#enquiry-form select').focus();
     };
     review.append(again);
   } catch {
     message.textContent = failed;
     button.disabled = edit.disabled = false;
   } finally { languageControl.disabled = false; }
 };
 form.addEventListener('submit', () => { message.textContent = instructions; });
}
function hydrate(l){
 if(!Object.hasOwn(siteData.copy,l))l='zh-tw';language=l;const t=siteData.copy[l];app.innerHTML=renderPage(l);document.documentElement.lang=t.lang;document.title='Northgo | '+t.title;
 document.querySelector('meta[name=description]').content=t.lead;
 const form=document.querySelector('#enquiry-form');for(const el of form.elements){if(el.name&&Object.hasOwn(formValues,el.name)){if(el.type==='checkbox')el.checked=formValues[el.name];else el.value=formValues[el.name];}}
 connectEnquiry(form, l);
 function serviceFields(){const i=Number(form.elements.service.value),hasDestination=form.elements.service.value===''||i<2;const fromLabels={'zh-tw':['起運地','起運地／專案地點','倉儲需求地點','港口／船舶作業地點'],en:['Origin','Origin / project location','Warehouse location','Port / vessel location'],ja:['出発地','出発地／プロジェクト所在地','倉庫の所在地','港／船舶の作業場所'],vi:['Điểm đi','Điểm đi / địa điểm dự án','Địa điểm kho','Cảng / địa điểm hoạt động tàu']};form.elements.to.closest('label').hidden=!hasDestination;form.elements.to.required=hasDestination;const label=form.elements.from.closest('label');label.firstChild.textContent=form.elements.service.value===''?t.labels[5]:fromLabels[language][i];}
 form.elements.service.addEventListener('change',serviceFields);serviceFields();
 document.querySelector('#language').addEventListener('change',e=>{capture();const y=scrollY;hydrate(e.target.value);window.scrollTo({top:y,behavior:'instant'});try{localStorage.setItem('northgo-redesign-language',language);const u=new URL(location.href);u.searchParams.set('lang',language);history.replaceState(null,'',u.href);}catch{}});
 document.querySelector('#menu-toggle').addEventListener('click',()=>{const n=document.querySelector('#main-nav'),open=n.classList.toggle('open');document.querySelector('#menu-toggle').setAttribute('aria-expanded',String(open));});
 document.querySelectorAll('#main-nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('#main-nav').classList.remove('open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');}));
 document.querySelectorAll('[data-service]').forEach(b=>b.addEventListener('click',()=>{form.elements.service.value=b.dataset.service;serviceFields();document.querySelector('#enquiry').scrollIntoView({behavior:'smooth'});form.elements.service.focus({preventScroll:true});}));
 document.querySelectorAll('[data-region]').forEach(b=>b.addEventListener('click',()=>{region=b.dataset.region;if(chosenOffice&&!localOffices().some(o=>o.id===chosenOffice)){chosenOffice=null;document.querySelector('#office-detail').innerHTML='<p>'+escapeHtml(t.chooseOffice)+'</p>';}renderMap();}));
 document.querySelectorAll('[data-office]').forEach(b=>b.addEventListener('click',()=>showOffice(b.dataset.office)));
 const markers=document.querySelector('#map-markers');markers.addEventListener('click',e=>{const b=e.target.closest('[data-marker]');if(b)showOffice(b.dataset.marker);});markers.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const b=e.target.closest('[data-marker]');if(b){e.preventDefault();const id=b.dataset.marker;showOffice(id);document.querySelector('[data-marker="'+id+'"]').focus();}}});
 form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;capture();const d=formValues,o=siteData.offices.find(o=>o.id===d.office);const vals=[siteData.catalog[language][Number(d.service)][0],t.cities[siteData.offices.indexOf(o)],d.name,d.company,d.email,d.from,form.elements.to.closest('label').hidden?'—':d.to,d.cargo,d.date||'—'];
 document.querySelector('#review-data').innerHTML=vals.map((v,i)=>'<dt>'+escapeHtml(t.labels[i])+'</dt><dd>'+escapeHtml(v)+'</dd>').join('');const body=vals.map((v,i)=>t.labels[i]+': '+v).join('\n\n');document.querySelector('#email-draft').href='mailto:'+o.email+'?subject='+encodeURIComponent(t.subject)+'&body='+encodeURIComponent(body);document.querySelector('#download').onclick=()=>{const u=URL.createObjectURL(new Blob([t.subject+'\n\n'+body],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='northgo-enquiry.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};form.hidden=true;document.querySelector('#enquiry-review').hidden=false;const heading=document.querySelector('#enquiry-review h3');heading.tabIndex=-1;heading.focus();});
 document.querySelector('#edit').addEventListener('click',()=>{document.querySelector('#enquiry-review').hidden=true;form.hidden=false;form.elements.service.focus();});
 renderMap();if(chosenOffice)showOffice(chosenOffice);
}
let initial='zh-tw';try{initial=new URL(location.href).searchParams.get('lang')||localStorage.getItem('northgo-redesign-language')||initial;}catch{}hydrate(initial);

