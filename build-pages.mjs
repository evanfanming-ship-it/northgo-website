import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
if(readFileSync('VERSION','utf8').trim()!==version)throw new Error('VERSION does not match package.json');
mkdirSync('dist',{recursive:true});
const stamp=html=>html.replace('</head>',`<meta name="version" content="${version}"></head>`);
const home=stamp(readFileSync('northgo-updated.html','utf8').replaceAll('href="index.html?lang=','href="sitemap.html?lang='));
writeFileSync('dist/index.html',home);
writeFileSync('dist/northgo-updated.html',home);
// Keep the original sitemap route relationships within the deployment.
const map=stamp(readFileSync('index.html','utf8').replaceAll('index.html','sitemap.html'));
writeFileSync('dist/sitemap.html',map);
writeFileSync('dist/sitemap-tree.html',stamp(readFileSync('sitemap-tree.html','utf8').replaceAll('index.html','sitemap.html')));
for(const file of ['offices-map.html','offices-map-dark.html'])writeFileSync('dist/'+file,stamp(readFileSync(file,'utf8')));
writeFileSync('dist/version.json',JSON.stringify({version},null,2)+'\n');
copyFileSync('VERSION','dist/VERSION');
writeFileSync('dist/.nojekyll','');
console.log('Pages release '+version+' prepared in dist/');
