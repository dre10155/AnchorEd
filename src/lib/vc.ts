import * as QRCode from 'qrcode'

export function makeDownloadUrlForVC(vcWithSalt: any): string {
  const blob = new Blob([
    JSON.stringify(vcWithSalt, null, 2)
  ], { type: 'application/json' })
  return URL.createObjectURL(blob)
}

export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url)
}

/** Membership proof carried by a credential that was anchored as part of a batch. */
export interface BatchProof {
  root: string;
  proof: string[];
}

interface VerifierQRParams {
  salt: string;
  hash: string;
  subject: Record<string, any>;
  issuerAccount: string;
  batch?: BatchProof;
}

export async function makeVerifierQR({ salt, hash, subject, issuerAccount, batch }: VerifierQRParams): Promise<string> {
  const payload = JSON.stringify({ salt, hash, subject, issuerAccount, ...(batch ? { batch } : {}) })
  return await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', width: 256 })
}
