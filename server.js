import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), 'public')
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' }

function reply(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body))
}

export function createApp() {
 let bestScore = 0
 return createServer(async (req, res) => {
 try {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/api/score' && req.method === 'GET') return reply(res, 200, { bestScore })
  if (url.pathname === '/api/score' && req.method === 'POST') {
    let body = ''
    for await (const chunk of req) {
      body += chunk
      if (Buffer.byteLength(body) > 1024) return reply(res, 413, { error: 'Request too large.' })
    }
    let data
    try { data = JSON.parse(body) } catch { return reply(res, 400, { error: 'Invalid JSON.' }) }
    const score = data?.score
    if (!Number.isSafeInteger(score) || score < 0 || score > 1000000) return reply(res, 400, { error: 'Score must be an integer between 0 and 1000000.' })
    bestScore = Math.max(bestScore, score)
    return reply(res, 200, { bestScore })
  }
  if (!['GET', 'HEAD'].includes(req.method)) return reply(res, 405, { error: 'Method not allowed.' })
  let requested
  try { requested = decodeURIComponent(url.pathname) } catch { return reply(res, 400, { error: 'Invalid URL.' }) }
  if (requested === '/') requested = '/index.html'
  const file = resolve(publicDir, '.' + requested)
  if (!file.startsWith(publicDir + sep)) return reply(res, 403, 'Forbidden', 'text/plain')
  try { return reply(res, 200, await readFile(file), types[extname(file)] || 'application/octet-stream') }
  catch { return reply(res, 404, 'Not found', 'text/plain') }
 } catch { if (!res.headersSent) reply(res, 500, { error: 'Request failed.' }) }
 })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000
  createApp().listen(port, () => console.log(`ABYSS / RUN is ready at http://localhost:${port}`))
}
