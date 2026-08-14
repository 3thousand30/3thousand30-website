const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
  let file = pathname === '/' ? path.join(root, 'index.html') : path.resolve(root, `.${pathname}`);
  if (file.startsWith(`${root}${path.sep}`) && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, '404.html');
  const extension = path.extname(file).toLowerCase();
  const types = { '.css': 'text/css', '.html': 'text/html', '.ico': 'image/x-icon', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
  response.writeHead(file.endsWith('404.html') && pathname !== '/404.html' ? 404 : 200, { 'Content-Type': types[extension] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Static site listening on http://127.0.0.1:${port}`));
