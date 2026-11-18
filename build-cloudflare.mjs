import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const output = '.cloudflare-dist/';
mkdirSync(output, { recursive:true });
const home = readFileSync('dist/index.html', 'utf8')
  .replace('</head>', '<meta name="northgo-enquiry-api" content="/api/enquiries"></head>');
writeFileSync(output + 'index.html', home);
writeFileSync(output + 'northgo-updated.html', home);
for (const file of ['sitemap.html', 'sitemap-tree.html', 'offices-map.html', 'offices-map-dark.html', 'version.json']) {
  copyFileSync('dist/' + file, output + file);
}
copyFileSync('admin/index.html', output + 'admin.html');
for (const file of ['admin.css', 'admin.js']) copyFileSync('admin/' + file, output + file);
writeFileSync(output + '_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
/admin.html
  Cache-Control: no-store
`);
console.log('Cloudflare assets prepared in ' + output);
