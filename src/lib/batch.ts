import Papa from 'papaparse'
import JSZip from 'jszip'
import { buildVC, credentialHash, makeIssuerDID, randomSalt } from './crypto'
import { buildMerkleTree, type MerkleTree } from './merkle'
import { makeVerifierQR } from './vc'

export interface RosterRecord {
  studentName: string
  university: string
  degree: string
  year: number
}

export interface RosterError {
  row: number
  message: string
}

export interface ParsedRoster {
  records: RosterRecord[]
  errors: RosterError[]
}

const REQUIRED_FIELDS = ['studentName', 'university', 'degree', 'year'] as const

/** Normalise a header so "Student Name", "student_name" and "studentname" all match. */
function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]/g, '')
}

const FIELD_ALIASES: Record<string, (typeof REQUIRED_FIELDS)[number]> = {
  studentname: 'studentName',
  name: 'studentName',
  university: 'university',
  institution: 'university',
  school: 'university',
  degree: 'degree',
  program: 'degree',
  qualification: 'degree',
  year: 'year',
  gradyear: 'year',
  graduationyear: 'year',
}

function normaliseRow(raw: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(raw)) {
    const field = FIELD_ALIASES[normaliseKey(key)]
    if (field && out[field] === undefined) out[field] = typeof value === 'string' ? value.trim() : value
  }
  return out
}

function validateRow(row: Record<string, any>, rowNumber: number): { record?: RosterRecord; error?: RosterError } {
  const missing = REQUIRED_FIELDS.filter((f) => row[f] === undefined || row[f] === '')
  if (missing.length) {
    return { error: { row: rowNumber, message: `Missing ${missing.join(', ')}` } }
  }
  const year = Number(row.year)
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return { error: { row: rowNumber, message: `Invalid year "${row.year}" (expected 1900–2100)` } }
  }
  return {
    record: {
      studentName: String(row.studentName),
      university: String(row.university),
      degree: String(row.degree),
      year,
    },
  }
}

/**
 * Parse a CSV or JSON roster. Every row is validated up front so the registrar
 * sees all problems before anything is anchored on the ledger.
 */
export function parseRoster(text: string, filename: string): ParsedRoster {
  let rawRows: Record<string, any>[]

  if (filename.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) throw new Error('JSON roster must be an array of records.')
    rawRows = parsed
  } else {
    // Papa handles quoted fields ("Doe, Jane"), CRLF and stray whitespace
    const result = Papa.parse<Record<string, any>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    })
    rawRows = result.data
  }

  const records: RosterRecord[] = []
  const errors: RosterError[] = []
  rawRows.forEach((raw, i) => {
    const rowNumber = i + 1
    const { record, error } = validateRow(normaliseRow(raw), rowNumber)
    if (record) records.push(record)
    else if (error) errors.push(error)
  })

  return { records, errors }
}

export interface BatchEntry {
  record: RosterRecord
  vc: any
  salt: string
  /** Salted credential hash — this is the Merkle leaf */
  leaf: string
}

export interface BuiltBatch {
  entries: BatchEntry[]
  tree: MerkleTree
}

/**
 * Turn a validated roster into credentials and anchor them into a single Merkle
 * tree. Only the tree's root goes on-chain; each student keeps their credential
 * plus a proof of membership.
 */
export async function buildBatch(
  records: RosterRecord[],
  issuerAccount: string,
  issuerDomain?: string,
  onProgress?: (done: number, total: number) => void
): Promise<BuiltBatch> {
  const issuer = makeIssuerDID(issuerAccount, issuerDomain)
  const entries: BatchEntry[] = []

  for (const [i, record] of records.entries()) {
    const salt = randomSalt()
    const subject = { ...record, issuerAccount }
    const vc = await buildVC({ issuer, subject, claim: {}, salt })
    entries.push({ record, vc, salt, leaf: await credentialHash(vc, salt) })
    if (onProgress && (i % 25 === 0 || i === records.length - 1)) {
      onProgress(i + 1, records.length)
      // yield to the event loop so a large class doesn't freeze the tab
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return { entries, tree: await buildMerkleTree(entries.map((e) => e.leaf)) }
}

/** The on-chain anchor for a batch: only the root, never any student data. */
export function batchUri(root: string): string {
  return `vc:merkle:${root}`
}

function safeFilename(name: string, index: number): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'student'
  return `${String(index + 1).padStart(4, '0')}-${slug}`
}

export interface BatchZipParams {
  entries: BatchEntry[]
  tree: MerkleTree
  issuerAccount: string
  issuerDomain?: string
  nftId: string
  onProgress?: (done: number, total: number) => void
}

/**
 * Package one credential file + QR per student, plus a manifest, into a ZIP the
 * registrar can distribute.
 */
export async function makeBatchZip({
  entries,
  tree,
  issuerAccount,
  issuerDomain,
  nftId,
  onProgress,
}: BatchZipParams): Promise<Blob> {
  const zip = new JSZip()
  const issuedAt = new Date().toISOString()
  const folder = zip.folder(`anchored-batch-${tree.root.slice(0, 12)}`)!

  for (const [i, entry] of entries.entries()) {
    const batch = { root: tree.root, proof: tree.proofs[i] }
    const credentialFile = {
      anchoredVersion: 2,
      vc: entry.vc,
      salt: entry.salt,
      batch: { ...batch, issuerAccount, nftId },
    }
    const base = safeFilename(entry.record.studentName, i)
    folder.file(`${base}.json`, JSON.stringify(credentialFile, null, 2))

    const qrDataUrl = await makeVerifierQR({
      salt: entry.salt,
      hash: entry.leaf,
      subject: entry.vc.credentialSubject,
      issuerAccount,
      batch,
    })
    folder.file(`${base}-qr.png`, qrDataUrl.split(',')[1], { base64: true })

    if (onProgress && (i % 10 === 0 || i === entries.length - 1)) {
      onProgress(i + 1, entries.length)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  folder.file(
    'batch-manifest.json',
    JSON.stringify(
      {
        anchoredVersion: 2,
        issuedAt,
        issuerAccount,
        issuerDomain: issuerDomain || null,
        merkleRoot: tree.root,
        nftId,
        credentialCount: entries.length,
        credentials: entries.map((e, i) => ({
          studentName: e.record.studentName,
          degree: e.record.degree,
          year: e.record.year,
          leaf: e.leaf,
          file: `${safeFilename(e.record.studentName, i)}.json`,
        })),
      },
      null,
      2
    )
  )

  folder.file(
    'README.txt',
    [
      'AnchorEd — batch credential package',
      '===================================',
      '',
      `Issued:          ${issuedAt}`,
      `Institution:     ${issuerDomain || issuerAccount}`,
      `Credentials:     ${entries.length}`,
      `Merkle root:     ${tree.root}`,
      `Anchor NFT ID:   ${nftId}`,
      '',
      'This package contains one credential file and one QR code per graduate.',
      'Send each graduate ONLY their own two files — the .json is their credential',
      'and the QR is how a verifier checks it in seconds.',
      '',
      'Anyone can verify a credential at https://anchor-ed.vercel.app/verify by',
      'uploading the .json file or scanning the QR code. No login required.',
      '',
      'Privacy: no student data is on the public ledger. The ledger holds only the',
      'Merkle root above — a fingerprint of the whole class that reveals nothing',
      'about any individual. batch-manifest.json is YOUR internal record; it lists',
      'every graduate, so do not distribute it to third parties.',
    ].join('\n')
  )

  return zip.generateAsync({ type: 'blob' })
}
