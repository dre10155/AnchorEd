import { Buffer } from 'buffer'

export interface DidCheckResult {
  ok: boolean
  domain: string
  didUrl?: string
  listsAddress?: boolean
  error?: string
}

/** did:web spec: the DID document lives at https://<domain>/.well-known/did.json */
export function makeIssuerDidWeb(domain: string): string {
  return `did:web:${domain.trim().toLowerCase()}`
}

/** Decode the hex Domain field of an XRPL account into a plain domain string. */
export function decodeHexDomain(hex?: string): string {
  if (!hex) return ''
  try {
    return Buffer.from(hex, 'hex').toString('utf8').trim().toLowerCase()
  } catch {
    return ''
  }
}

/**
 * Resolve a domain's did.json (via our server proxy, avoiding CORS) and check
 * whether it lists the given XRPL address. This is direction 1 of the handshake;
 * direction 2 is the account's on-ledger Domain field pointing back at the domain.
 */
export async function checkDidListsAddress(domain: string, address: string): Promise<DidCheckResult> {
  try {
    const res = await fetch(`/api/did/resolve?domain=${encodeURIComponent(domain)}`)
    const data = await res.json()
    if (!res.ok) return { ok: false, domain, error: data.error || 'DID resolution failed' }
    const listsAddress = JSON.stringify(data.document).includes(address)
    return { ok: true, domain, didUrl: data.url, listsAddress }
  } catch (e: any) {
    return { ok: false, domain, error: e?.message || String(e) }
  }
}

/** Template DID document an institution hosts at /.well-known/did.json */
export function makeDidDocument(domain: string, xrplAddress: string) {
  const did = makeIssuerDidWeb(domain)
  return {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: did,
    verificationMethod: [
      {
        id: `${did}#xrpl-issuer`,
        type: 'EcdsaSecp256k1RecoveryMethod2020',
        controller: did,
        // CAIP-10 style account binding: this institution's official XRPL issuing wallet
        blockchainAccountId: `xrpl:0:${xrplAddress}`,
      },
    ],
    service: [
      {
        id: `${did}#anchored-verifier`,
        type: 'CredentialVerification',
        serviceEndpoint: 'https://anchor-ed.vercel.app/verify',
      },
    ],
  }
}
