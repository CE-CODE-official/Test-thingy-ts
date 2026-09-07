import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const publicDir = join(process.cwd(), 'public')
let bestScore = 0
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' }

function reply(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body))
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (url.pathname === '/api/score' && req.method === 'GET') return reply(res, 200, { bestScore })
  if (url.pathname === '/api/score' && req.method === 'POST') {
    let body = ''
    for await (const chunk of req) body += chunk
    const score = Number(JSON.parse(body || '{}').score)
    if (!Number.isFinite(score) || score < 0) return reply(res, 400, { error: 'Score must be a positive number.' })
    bestScore = Math.max(bestScore, Math.floor(score))
    return reply(res, 200, { bestScore })
  }
  const requested = url.pathname === '/' ? '/index.html' : url.pathname
  const file = normalize(join(publicDir, requested))
  if (!file.startsWith(publicDir)) return reply(res, 403, 'Forbidden', 'text/plain')
  try { return reply(res, 200, await readFile(file), types[extname(file)] || 'application/octet-stream') }
  catch { return reply(res, 404, 'Not found', 'text/plain') }
}).listen(process.env.PORT || 3000, () => console.log('Turtle Tide is swimming at http://localhost:3000'))
