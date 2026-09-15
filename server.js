const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // 1. Chess.com API Proxy to bypass browser User-Agent restrictions and CORS/firewall blocks
  if (req.url.startsWith('/api/chesscom/')) {
    let subPath = req.url.replace('/api/chesscom/', '').replace(/^\/+/, '');
    // If client passed a full URL encoded or raw
    if (subPath.startsWith('http')) {
      subPath = subPath.replace(/^https?:\/\/api\.chess\.com\/pub\/?/i, '');
    }
    const targetUrl = 'https://api.chess.com/pub/' + subPath;

    const proxyReq = https.get(targetUrl, {
      headers: {
        'User-Agent': 'ChessReps-Trainer-App (https://github.com/chessreps; contact@chessreps.com)',
        'Accept': 'application/json'
      }
    }, (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      upstreamRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
    });
    return;
  }

  // 2. Lichess API Proxy
  if (req.url.startsWith('/api/lichess/')) {
    let subPath = req.url.replace('/api/lichess/', '').replace(/^\/+/, '');
    if (subPath.startsWith('http')) {
      subPath = subPath.replace(/^https?:\/\/lichess\.org\/api\/?/i, '');
    }
    const targetUrl = 'https://lichess.org/api/' + subPath;

    const proxyReq = https.get(targetUrl, {
      headers: {
        'User-Agent': 'ChessReps-Trainer-App (https://github.com/chessreps)',
        'Accept': req.headers['accept'] || 'application/json'
      }
    }, (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode, {
        'Content-Type': upstreamRes.headers['content-type'] || 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      upstreamRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
    });
    return;
  }

  // 3. Static File Server
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  
  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`ChessReps Trainer dev server running at http://localhost:${PORT}/`);
});
