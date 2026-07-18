// Vercel serverless function: GET /api/did/resolve?domain=<domain>
// Fetches an institution's did.json server-side so the browser verifier
// isn't blocked by the institution's CORS policy.
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const domain = String(req.query.domain || '').trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain) || domain.endsWith('.local')) {
    res.status(400).json({ error: 'Invalid domain' })
    return
  }
  const url = `https://${domain}/.well-known/did.json`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const r = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    clearTimeout(timer)
    if (!r.ok) {
      res.status(502).json({ error: `HTTP ${r.status} fetching ${url}` })
      return
    }
    const document = await r.json()
    res.status(200).json({ url, document })
  } catch (err: any) {
    res.status(502).json({ error: `Could not fetch ${url}: ${err?.message || String(err)}` })
  }
}
