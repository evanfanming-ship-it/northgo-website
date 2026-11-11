// The same language controller is embedded in both standalone HTML files.
const language=document.querySelector('#language');
const views=[...document.querySelectorAll('.locale-view')];
const controllers=new Map();
let current='zh-tw';
for(const view of views){
 const l=view.dataset.locale,u=localeConfig[l].ui;
 const search=view.querySelector('.search-input');
 const filters=[...view.querySelectorAll('[data-filter]')];
 const groups=[...view.querySelectorAll('[data-group]')];
 const details=[...view.querySelectorAll('details')];
 const expand=view.querySelector('.expand');
 let active='all';
 function update(){
  if(!search)return;
  const q=search.value.trim().toLocaleLowerCase();let count=0,bad=0;
  for(const group of groups){let visible=0;for(const card of group.querySelectorAll('.page-card')){const show=(active==='all'||group.dataset.group===active)&&card.dataset.search.includes(q);card.hidden=!show;if(show){visible++;count++;if(card.classList.contains('is-bad'))bad++;}}group.hidden=!visible;}
  view.querySelector('.map-grid').classList.toggle('filtered',active!=='all'||!!q);
  view.querySelector('.result').textContent=u.result.replace('{n}',count).replace('{bad}',bad);
  view.querySelector('.empty').hidden=count>0;
  filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===active)));
 }
 function sync(){const open=details.some(d=>d.open);expand.textContent=open?u.collapse:u.expand;expand.setAttribute('aria-expanded',String(open));}
 expand.addEventListener('click',()=>{const open=expand.getAttribute('aria-expanded')!=='true';details.forEach(d=>d.open=open);sync();});
 details.forEach(d=>d.addEventListener('toggle',sync));
 filters.forEach(b=>b.addEventListener('click',()=>{active=b.dataset.filter;update();}));
 if(search){search.addEventListener('input',update);view.querySelector('.reset').addEventListener('click',()=>{search.value='';active='all';update();search.focus();});}
 view.querySelector('.print').addEventListener('click',()=>window.print());
 controllers.set(l,{beforePrint(){const state={q:search?.value,active,details:details.map(d=>d.open)};if(search){search.value='';active='all';update();}details.forEach(d=>d.open=true);return state;},afterPrint(state){if(search){search.value=state.q;active=state.active;update();}details.forEach((d,i)=>d.open=state.details[i]);sync();}});
}
function selectLanguage(l,persist=true){
 if(!Object.hasOwn(localeConfig,l))l='zh-tw';
 current=l;const config=localeConfig[l],u=config.ui;
 language.value=l;language.setAttribute('aria-label',u.language);
 document.documentElement.lang=config.lang;
 document.title='Northgo | '+(document.body.dataset.mode==='tree'?u.treeTitle:u.title);
 views.forEach(v=>v.hidden=v.dataset.locale!==l);
 document.querySelectorAll('[data-ui]').forEach(el=>el.textContent=u[el.dataset.ui]);
 const other=document.body.dataset.mode==='tree'?'index.html':'sitemap-tree.html';
 document.querySelector('#view-switch').setAttribute('href',other+'?lang='+l);
 document.querySelector('.brand').setAttribute('href','index.html?lang='+l);
 document.querySelector('#visit').setAttribute('href','https://www.northgo.com'+(config.prefix||'/'));
 document.querySelector('#visit').setAttribute('hreflang',config.lang);
 if(persist){try{localStorage.setItem('northgo-sitemap-language',l);}catch{}try{const url=new URL(location.href);url.searchParams.set('lang',l);history.replaceState(null,'',url.href);}catch{}}
}
language.addEventListener('change',()=>selectLanguage(language.value));
let preferred='zh-tw';
try{preferred=new URL(location.href).searchParams.get('lang')||localStorage.getItem('northgo-sitemap-language')||preferred;}catch{}
selectLanguage(preferred,false);
window.addEventListener('popstate',()=>{let l='zh-tw';try{l=new URL(location.href).searchParams.get('lang')||'zh-tw';}catch{}selectLanguage(l,false);});
let printState;
window.addEventListener('beforeprint',()=>{if(!printState)printState={locale:current,state:controllers.get(current).beforePrint()};});
window.addEventListener('afterprint',()=>{if(printState){controllers.get(printState.locale).afterPrint(printState.state);printState=null;}});
