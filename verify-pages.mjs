import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
assert.equal(readFileSync('VERSION','utf8').trim(),version);
assert.equal(JSON.parse(readFileSync('dist/version.json','utf8')).version,version);
for(const f of ['index.html','northgo-updated.html','sitemap.html','sitemap-tree.html','offices-map.html','offices-map-dark.html']){
 const html=readFileSync('dist/'+f,'utf8');
 assert.ok(html.includes(`<meta name="version" content="${version}">`));
 for(const [,js] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(js);
 for(const [,url] of html.matchAll(/href="([^"#]+\.html)(?:\?[^"#]*)?(?:#[^"]*)?"/g))if(!url.includes('://'))assert.ok(existsSync('dist/'+url),'Missing local link '+url);
}
const home=readFileSync('dist/index.html','utf8');
assert.ok(home.includes('id="enquiry-form"'));
assert.ok(home.includes('href="sitemap.html?lang='));
assert.ok(!home.includes('href="index.html?lang='));
assert.ok(existsSync('dist/.nojekyll'));
console.log('Pages '+version+': homepage, links, embedded JavaScript and release metadata verified.');
