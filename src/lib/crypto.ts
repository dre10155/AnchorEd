function canonicalize(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  } else if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalize(obj[key]);
        return acc;
      }, {} as Record<string, any>);
  }
  return obj;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  // globalThis (not window) so hashing also runs under Node in the test suite
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

export async function credentialHash(credential: any, salt: string): Promise<string> {
  const canonical = JSON.stringify(canonicalize(credential));
  return await sha256Hex(salt + canonical);
}

/**
 * Issuer identifier for the VC. With a domain we emit a spec-compliant did:web
 * (resolvable at https://<domain>/.well-known/did.json); without one we fall
 * back to the raw XRPL address.
 */
export function makeIssuerDID(issuerAccount: string, domain?: string): string {
  const d = domain?.trim().toLowerCase();
  return d ? `did:web:${d}` : issuerAccount;
}

interface BuildVCParams {
  issuer: string;
  subject: Record<string, any>;
  claim: Record<string, any>;
  salt: string;
}

export async function buildVC({ issuer, subject, claim, salt }: BuildVCParams) {
  const issuanceDate = new Date().toISOString();
  const credential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential'],
    issuer,
    issuanceDate,
    credentialSubject: subject,
    claim,
  };
  const hash = await credentialHash(credential, salt);
  return {
    ...credential,
    proof: {
      type: 'SaltedHashProof',
      created: issuanceDate,
      salt,
      hash,
    },
  };
}
