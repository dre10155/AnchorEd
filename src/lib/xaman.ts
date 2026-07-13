export interface XamanPayload {
  uuid: string
  qrPng: string
  deeplink: string
  websocketUrl: string
}

export interface XamanResolution {
  resolved: boolean
  signed: boolean
  cancelled: boolean
  expired: boolean
  account?: string
  txid?: string
}

export async function createXamanPayload(txjson: Record<string, any>): Promise<XamanPayload> {
  const res = await fetch('/api/xaman/payload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txjson }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create Xaman sign request')
  return data
}

export async function getXamanPayloadStatus(uuid: string): Promise<XamanResolution> {
  const res = await fetch(`/api/xaman/payload/${uuid}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch Xaman payload status')
  return data
}

export async function waitForXamanSignature(
  uuid: string,
  { intervalMs = 2000, timeoutMs = 5 * 60 * 1000 }: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<XamanResolution> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const status = await getXamanPayloadStatus(uuid)
    if (status.resolved) return status
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error('Timed out waiting for Xaman signature')
}
