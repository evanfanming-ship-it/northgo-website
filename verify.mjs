import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { locales, paths, anchors, localizedPath } from './content.mjs';
const crawl=['crawl.json','crawl-additional.json','crawl-locales.json','crawl-locale-anchors.json'].flatMap(f=>JSON.parse(readFileSync(f,'utf8')));
for(const l of Object.keys(locales)){
 for(const p of paths){const path=localizedPath(p,l),r=crawl.find(r=>r.path===path);assert.ok(r,'Missing crawl '+path);if(p==='/news')assert.ok(r.status===404||r.error?.includes('404'));else assert.equal(r.status,200);}
 for(const p of Object.values(anchors).flat()){const [path,id]=localizedPath(p,l).split('#');assert.ok(crawl.some(r=>r.path===path&&r.ids?.includes(id)),'Missing anchor '+path+'#'+id);}
}
const element=(more={})=>({hidden:false,value:'',attrs:{},dataset:{},listeners:{},textContent:'',classList:{contains:()=>false,toggle(){}},addEventListener(k,f){this.listeners[k]=f},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},focus(){},...more});
const report=[];
for(const file of ['index.html','sitemap-tree.html']){
 const html=readFileSync(file,'utf8'),mode=file==='index.html'?'full':'tree';
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
 const views=[...html.matchAll(/<div class="locale-view" data-locale="([^"]+)" lang="[^"]+"(?: hidden)?>([\s\S]*?)(?=<div class="locale-view"|<\/main>)/g)].map(([,l,markup])=>{
  const cards=[...markup.matchAll(/<li class="page-card ([^"]*)" data-path="([^"]*)" data-search="([^"]*)"/g)].map(([,cls,path,search])=>element({dataset:{path,search},classList:{contains:c=>c==='is-bad'&&cls.includes('is-bad')}}));
  const groups=['company','services','legal'].map((group,i)=>element({dataset:{group},querySelectorAll:()=>cards.slice(i*4,i*4+4)}));
  const filters=['all','company','services','legal'].map(filter=>element({dataset:{filter}}));
  const details=[...markup.matchAll(/<details( open)?[ >]/g)].map(m=>element({open:!!m[1]}));
  const els=Object.fromEntries(['.search-input','.map-grid','.result','.empty','.reset','.expand','.print'].map(k=>[k,element()]));
  els['.expand'].attrs['aria-expanded']='true';
  if(mode==='tree')els['.search-input']=null;
  const view=element({hidden:l!=='zh-tw',dataset:{locale:l},querySelector:s=>els[s],querySelectorAll:s=>s==='[data-filter]'?(mode==='full'?filters:[]):s==='[data-group]'?(mode==='full'?groups:[]):s==='details'?details:[],cards,filters,details,els});
  assert.ok(markup.includes(locales[l].pages[4][0]));
  assert.ok(markup.includes(locales[l].ui[mode==='tree'?'treeTitle':'title']));
  if(mode==='full')assert.equal(cards.length,12);
  const urls=[...markup.matchAll(/href="https:\/\/www.northgo.com([^"]*)"/g)].map(m=>m[1]);
  const prefix=locales[l].prefix;
  assert.ok(urls.every(p=>prefix?p===prefix||p.startsWith(prefix+'/')||p.startsWith(prefix+'#'):!/^\/(zh-tw|ja|vi)(?:\/|#|$)/.test(p)),'Mixed language URL in '+l);
  return view;
 });
 assert.equal(views.length,4);
 const ids=Object.fromEntries(['#language','#view-switch','.brand','#visit'].map(k=>[k,element()]));
 const uiNodes=['skip','language','footer',mode==='tree'?'detail':'tree','visit'].map(ui=>element({dataset:{ui}}));
 const doc={documentElement:{lang:''},body:{dataset:{mode}},title:'',querySelector:s=>ids[s],querySelectorAll:s=>s==='.locale-view'?views:s==='[data-ui]'?uiNodes:[]};
 const events={},memory=new Map();let savedUrl='';
 const ctx=vm.createContext({document:doc,window:{addEventListener:(k,f)=>events[k]=f,print(){}},location:{href:'file:///C:/map/'+file+'?lang=en'},history:{replaceState:(a,b,u)=>savedUrl=u},localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},URL});
 vm.runInContext(script,ctx);assert.equal(doc.documentElement.lang,'en');
 for(const l of ['en','ja','vi','zh-tw']){
  ids['#language'].value=l;ids['#language'].listeners.change();
  assert.equal(doc.documentElement.lang,locales[l].lang);assert.equal(views.filter(v=>!v.hidden).length,1);assert.equal(views.find(v=>!v.hidden).dataset.locale,l);
  assert.ok(doc.title.includes(locales[l].ui[mode==='tree'?'treeTitle':'title']));assert.ok(savedUrl.includes('lang='+l));
  assert.equal(ids['#view-switch'].attrs.href,(mode==='tree'?'index.html':'sitemap-tree.html')+'?lang='+l);
  assert.equal(ids['#visit'].attrs.href,'https://www.northgo.com'+(locales[l].prefix||'/'));
  assert.equal(uiNodes[1].textContent,locales[l].ui.language);
  const v=views.find(v=>v.dataset.locale===l),visible=()=>v.cards.filter(c=>!c.hidden).length;
  if(mode==='full'){
   v.filters[2].listeners.click();assert.equal(visible(),4);
   v.els['.search-input'].value=locales[l].children[4][0].toLocaleLowerCase();v.els['.search-input'].listeners.input();assert.equal(visible(),1);
   v.els['.search-input'].value='zzzzmissing';v.els['.search-input'].listeners.input();assert.equal(visible(),0);assert.equal(v.els['.empty'].hidden,false);
   v.els['.reset'].listeners.click();assert.equal(visible(),12);
  }
  v.els['.expand'].listeners.click();assert.ok(v.details.every(d=>!d.open));assert.equal(v.els['.expand'].textContent,locales[l].ui.expand);
  v.els['.expand'].listeners.click();assert.ok(v.details.every(d=>d.open));
  if(mode==='full')v.filters[3].listeners.click();events.beforeprint();if(mode==='full')assert.equal(visible(),12);events.afterprint();if(mode==='full')assert.equal(visible(),4);
 }
 vm.runInContext("selectLanguage('invalid')",ctx);assert.equal(doc.documentElement.lang,'zh-Hant');
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1">/);assert.match(html,/@media\(max-width:760px\)/);
 report.push({file,languages:4,checks:['localized page content and URL consistency','URL initial language and invalid fallback','language selector, document language and title','cross-view language preservation','expand / collapse and print restoration',...(mode==='full'?['localized search, category filters, no results and reset']:[])]});
}
const result={files:report,pageUrlsChecked:48,anchorsChecked:32,visualVerification:'Unavailable: browser policy blocks local file inspection.'};
writeFileSync('verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
