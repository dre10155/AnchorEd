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

interface VerifierQRParams {
  salt: string;
  hash: string;
  subject: Record<string, any>;
  issuerAccount: string;
}

export async function makeVerifierQR({ salt, hash, subject, issuerAccount }: VerifierQRParams): Promise<string> {
  const payload = JSON.stringify({ salt, hash, subject, issuerAccount })
  return await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', width: 256 })
}
