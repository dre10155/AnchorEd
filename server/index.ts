import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { xumm } from './xumm'

const app = express()
app.use(cors())
app.use(express.json())

const port = Number(process.env.API_PORT) || 8787

app.post('/api/xaman/payload', async (req, res) => {
  try {
    const { txjson } = req.body
    if (!txjson || typeof txjson !== 'object' || !txjson.TransactionType || !txjson.Account) {
      res.status(400).json({ error: 'txjson with TransactionType and Account is required' })
      return
    }

    const created = await xumm.payload.create({ txjson })
    if (!created) {
      res.status(502).json({ error: 'Xaman did not return a payload' })
      return
    }

    res.json({
      uuid: created.uuid,
      qrPng: created.refs.qr_png,
      deeplink: created.next.always,
      websocketUrl: created.refs.websocket_status,
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) })
  }
})

app.get('/api/xaman/payload/:uuid', async (req, res) => {
  try {
    const payload = await xumm.payload.get(req.params.uuid)
    if (!payload) {
      res.status(404).json({ error: 'Payload not found' })
      return
    }

    res.json({
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
})

app.listen(port, () => {
  console.log(`AnchorEd Xaman signing API listening on http://localhost:${port}`)
})
