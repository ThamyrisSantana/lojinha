// Servidor local só para testar o site antes de publicar. Não guarda dados:
// com config.js preenchido o site fala direto com o Supabase; vazio, roda em modo demonstração.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = Number(process.env.PORT) || 3737;
const PUBLIC = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { rel = '/'; }
  const file = path.join(PUBLIC, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.log(`A porta ${PORT} já está em uso. Talvez o painel já esteja aberto: http://localhost:${PORT}`);
  else console.error(e);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  const link = `http://localhost:${PORT}`;
  console.log(`\n  Painel da Lojinha (teste local) em ${link}\n  Para desligar, feche esta janela ou aperte Ctrl+C.\n`);
  if (!process.env.NO_OPEN) exec(process.platform === 'win32' ? `start "" "${link}"` : `open ${link} || xdg-open ${link}`);
});
