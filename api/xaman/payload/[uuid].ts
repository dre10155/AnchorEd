import { XummSdk } from 'xumm-sdk'

// Vercel serverless function: GET /api/xaman/payload/:uuid
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const uuid = req.query.uuid as string
    const xumm = new XummSdk(process.env.XUMM_APIKEY!, process.env.XUMM_APISECRET!)
    const payload = await xumm.payload.get(uuid)
    if (!payload) {
      res.status(404).json({ error: 'Payload not found' })
      return
    }

    res.status(200).json({
      resolved: Boolean(payload.meta.resolved),
      signed: Boolean(payload.meta.signed),
      cancelled: Boolean(payload.meta.cancelled),
      expired: Boolean(payload.meta.expired),
      account: payload.response.account,
      txid: payload.response.txid,
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) })
  }
}
