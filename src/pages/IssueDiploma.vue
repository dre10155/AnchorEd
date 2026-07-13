<template>
  <div class="min-h-screen pt-20">
    <section class="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-brand-black via-gray-900 to-brand-black"></div>

      <div class="absolute inset-0">
        <div class="absolute top-0 right-1/3 w-96 h-96 bg-primary-blue rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div class="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
      </div>

      <div class="max-w-4xl mx-auto relative z-10">
        <div class="text-center mb-12">
          <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">Issue Credentials</h1>
          <p class="text-xl text-gray-300 max-w-2xl mx-auto">
            Anchor verifiable diploma credentials on the XRP Ledger
          </p>
          <div v-if="devSeedMode" class="inline-block mt-4 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 text-xs font-medium">
            Dev seed mode — local signing, testnet only
          </div>
        </div>

        <div v-if="!mintMode" class="flex gap-4 justify-center mb-12">
          <button @click="mintMode = 'single'" class="px-8 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg shadow-blue-500/30">
            Single Mint
          </button>
          <button @click="mintMode = 'batch'" class="px-8 py-3 bg-white text-brand-black rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-lg border border-gray-200">
            Batch Mint
          </button>
        </div>
        <div v-if="mintMode === 'single'" class="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <div>
              <label class="block font-medium text-brand-black mb-2">Student Name</label>
              <input v-model="studentName" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all" required />
            </div>
            <div>
              <label class="block font-medium text-brand-black mb-2">University</label>
              <input v-model="university" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all" required />
            </div>
            <div>
              <label class="block font-medium text-brand-black mb-2">Degree</label>
              <input v-model="degree" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all" required />
            </div>
            <div>
              <label class="block font-medium text-brand-black mb-2">Year</label>
              <input v-model.number="year" type="number" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all" required min="1900" max="2100" />
            </div>
            <div class="pt-4 border-t border-gray-200">
              <label class="block font-medium text-brand-black text-sm mb-2">Issuer Account</label>
              <input v-model="issuerAccount" class="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all font-mono" required placeholder="r..." />
            </div>
            <div v-if="devSeedMode">
              <label class="block font-medium text-brand-black text-sm mb-2">Issuer Seed (dev only)</label>
              <input v-model="issuerSeed" class="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all font-mono" required placeholder="s..." />
            </div>
            <p v-else class="text-xs text-gray-500">
              You'll sign this mint with the Xaman app — no seed is ever entered here.
            </p>
            <button type="submit" :disabled="loading" class="w-full px-8 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg shadow-blue-500/30 disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed">
              {{ loading ? 'Issuing...' : 'Issue Diploma NFT' }}
            </button>
          </form>

          <div v-if="error" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-red-700 font-medium">{{ error }}</p>
          </div>

          <div v-if="success" class="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div class="font-bold text-green-700 text-lg mb-4">Diploma NFT minted successfully!</div>
            <div class="space-y-2 text-sm text-gray-700">
              <div><span class="font-semibold">NFT ID:</span> <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{{ nftId }}</span></div>
              <div v-if="nftMintTime"><span class="font-semibold">Minted On:</span> <span class="font-mono">{{ nftMintTime }}</span></div>
            </div>
            <a :href="downloadUrl" download="diploma-vc.json" class="inline-block mt-4 px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium">
              Download VC JSON
            </a>
            <div class="mt-6 pt-6 border-t border-gray-200">
              <img v-if="qrUrl" :src="qrUrl" alt="Verifier QR" class="w-48 h-48 mx-auto border-4 border-gray-200 rounded-lg" />
              <div class="text-xs text-gray-500 mt-3 text-center">Scan to verify (issuer/hash)</div>
              <div v-if="issuerAccount" class="text-xs text-gray-700 mt-2 text-center">
                Issuer Address: <span class="font-mono bg-gray-100 px-2 py-1 rounded">{{ issuerAccount }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="mintMode === 'batch'" class="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
          <div v-if="!devSeedMode" class="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm mb-6">
            Batch minting requires <span class="font-mono">VITE_DEV_SEED_MODE=true</span> (testnet only) until
            multi-signature Xaman batch signing is implemented. Each diploma otherwise needs its own individual
            QR-signed mint — use Single Mint instead.
          </div>
          <template v-else>
            <form @submit.prevent class="mb-8 space-y-6">
              <div>
                <label class="block font-medium text-brand-black text-sm mb-2">Issuer Account (dev only)</label>
                <input v-model="issuerAccount" class="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all font-mono" required placeholder="r..." />
              </div>
              <div>
                <label class="block font-medium text-brand-black text-sm mb-2">Issuer Seed (dev only)</label>
                <input v-model="issuerSeed" class="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all font-mono" required placeholder="s..." />
              </div>
            </form>

            <div class="border-t border-gray-200 pt-8">
              <h2 class="text-2xl font-bold text-brand-black mb-6">Bulk Upload / Batch Issue</h2>
              <div class="space-y-4">
                <input
                  type="file"
                  accept=".csv,.json"
                  @change="handleBulkFileChange"
                  class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-blue file:text-white hover:file:bg-blue-700 file:cursor-pointer file:transition-all file:duration-200"
                />
                <button
                  @click="handleBulkSubmit"
                  :disabled="bulkLoading || !bulkFile"
                  class="w-full px-8 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg shadow-blue-500/30 disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {{ bulkLoading ? 'Issuing in Batch...' : 'Bulk Issue Diplomas' }}
                </button>
              </div>

              <div v-if="bulkError" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-red-700 font-medium">{{ bulkError }}</p>
              </div>

              <div v-if="bulkResults.length" class="mt-8">
                <h3 class="text-xl font-bold text-brand-black mb-4">Results:</h3>
                <div class="overflow-x-auto rounded-lg border border-gray-200">
                  <table class="w-full text-sm bg-white">
                    <thead>
                      <tr class="bg-gradient-to-r from-primary-blue to-blue-600 text-white">
                        <th class="px-4 py-3 text-left font-semibold">#</th>
                        <th class="px-4 py-3 text-left font-semibold">Student</th>
                        <th class="px-4 py-3 text-left font-semibold">NFT ID</th>
                        <th class="px-4 py-3 text-left font-semibold">Download</th>
                        <th class="px-4 py-3 text-left font-semibold">QR</th>
                        <th class="px-4 py-3 text-left font-semibold">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="r in bulkResults" :key="r.index" class="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                        <td class="px-4 py-3">{{ r.index }}</td>
                        <td class="px-4 py-3 font-medium text-gray-900">{{ r.studentName }}</td>
                        <td class="px-4 py-3">
                          <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{{ r.nftId }}</span>
                        </td>
                        <td class="px-4 py-3">
                          <a v-if="r.downloadUrl" :href="r.downloadUrl" download="diploma-vc.json" class="text-primary-blue hover:text-blue-700 font-medium">
                            Download
                          </a>
                        </td>
                        <td class="px-4 py-3">
                          <img v-if="r.qr" :src="r.qr" alt="QR" class="w-12 h-12 border-2 border-gray-200 rounded" />
                          <div v-if="issuerAccount && r.qr" class="text-xs text-gray-600 mt-1">
                            <span class="font-mono">{{ issuerAccount.substring(0, 8) }}...</span>
                          </div>
                        </td>
                        <td class="px-4 py-3 text-red-600 text-xs">{{ r.error }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </template>
        </div>
        <div v-if="issuerAccount && nftCount !== null" class="mt-12 bg-white rounded-xl shadow-xl p-8 border border-gray-200">
          <h2 class="text-2xl font-bold text-brand-black mb-4">Diplomas Minted by Institution</h2>
          <div class="mb-6 text-gray-700">
            Total Diplomas Minted: <span class="font-bold text-primary-blue text-xl">{{ nftCount }}</span>
          </div>

          <div v-if="mintedNfts.length" class="overflow-x-auto rounded-lg border border-gray-200">
            <table class="w-full bg-white">
              <thead>
                <tr class="bg-gradient-to-r from-primary-blue to-blue-600 text-white">
                  <th class="px-4 py-3 font-semibold text-left">NFT ID</th>
                  <th class="px-4 py-3 font-semibold text-left">Issuer</th>
                  <th class="px-4 py-3 font-semibold text-left">Minted At</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="nft in mintedNfts" :key="nft.NFTokenID" class="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 text-xs break-all">
                    <span class="font-mono bg-gray-100 px-2 py-1 rounded text-primary-blue">{{ nft.NFTokenID }}</span>
                  </td>
                  <td class="px-4 py-3 text-xs break-all">
                    <span class="font-mono text-gray-700">{{ nft.Issuer }}</span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-700">{{ nft.mintTime || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-gray-500 text-center py-8">
            No diplomas (NFTs) found for this institution wallet.
          </div>
        </div>
      </div>
    </section>

    <XamanSignModal
      v-if="xaman.visible"
      title="Sign diploma mint"
      :qr-png="xaman.qrPng"
      :deeplink="xaman.deeplink"
      :status="xaman.status"
      :error-message="xaman.errorMessage"
      :allow-cancel="xaman.status === 'pending'"
      @cancel="cancelXamanSign"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { credentialHash, buildVC, makeIssuerDID } from '../lib/crypto'
import { withXrpl, submitAndWait, resolveMintedNft, validateMintTx } from '../lib/xrplClient'
import { makeDownloadUrlForVC, revokeObjectUrl, makeVerifierQR } from '../lib/vc'
import { createXamanPayload, waitForXamanSignature } from '../lib/xaman'
import { Client, Wallet, getNFTokenID } from 'xrpl'
import { Buffer } from 'buffer'
import XamanSignModal from '../components/XamanSignModal.vue'

// Local-seed signing is a testnet development convenience only. It is disabled
// by default; production issuance signs via Xaman so seeds never touch the browser.
const devSeedMode = import.meta.env.VITE_DEV_SEED_MODE === 'true'

const studentName = ref('')
const university = ref('')
const degree = ref('')
const year = ref(new Date().getFullYear())
const issuerAccount = ref('')
const issuerSeed = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const nftId = ref('')
const downloadUrl = ref('')
const qrUrl = ref('')
const nftMintTime = ref('')

interface BulkResult {
  index: number
  studentName: string
  nftId?: string
  downloadUrl?: string
  qr?: string
  error?: string
}

const bulkResults = ref<BulkResult[]>([])
const bulkLoading = ref(false)
const bulkError = ref('')
const bulkFile = ref<File | null>(null)
const mintMode = ref<'' | 'single' | 'batch'>('')
const nftCount = ref<number | null>(null)

interface MintedNFT {
  NFTokenID: string
  Issuer: string
  mintTime?: string
  Flags: number
  NFTokenTaxon: number
  URI?: string
  nft_serial: number
}

const mintedNfts = ref<MintedNFT[]>([])
let lastDownloadUrl = ''

const xaman = reactive<{
  visible: boolean
  qrPng: string
  deeplink: string
  status: 'pending' | 'signed' | 'rejected' | 'expired' | 'error'
  errorMessage: string
  cancelled: boolean
}>({
  visible: false,
  qrPng: '',
  deeplink: '',
  status: 'pending',
  errorMessage: '',
  cancelled: false,
})

function cancelXamanSign() {
  xaman.cancelled = true
  xaman.visible = false
}

function buildMintTx(vc: any, hash: string, account: string) {
  return {
    TransactionType: 'NFTokenMint',
    Account: account,
    // Ensure URI is hex and ≤ 256 bytes
    URI: (() => {
      const json = JSON.stringify(vc)
      let buf = Buffer.from(json)
      if (buf.length > 256) {
        // Truncate and add a warning, or use a hash if needed
        buf = buf.slice(0, 256)
      }
      return buf.toString('hex')
    })(),
    Flags: 8,
    NFTokenTaxon: 0,
    // Store the salted hash as a memo in the NFT (anchor hash)
    Memos: [
      {
        Memo: {
          MemoType: Buffer.from('vc-hash').toString('hex'),
          // MemoData contains only the salted hash as anchor
          MemoData: Buffer.from(JSON.stringify({ hash })).toString('hex'),
        }
      }
    ]
  }
}

/** Mint via Xaman: create a sign request, show the QR, poll until signed, then resolve the NFTokenID. */
async function mintViaXaman(tx: any): Promise<{ nftId: string; mintTime: string }> {
  xaman.cancelled = false
  xaman.status = 'pending'
  xaman.errorMessage = ''
  xaman.visible = true

  const payload = await createXamanPayload(tx)
  xaman.qrPng = payload.qrPng
  xaman.deeplink = payload.deeplink

  const resolution = await waitForXamanSignature(payload.uuid)
  if (xaman.cancelled) throw new Error('Signing cancelled.')

  if (resolution.cancelled) {
    xaman.status = 'rejected'
    throw new Error('Signature was rejected in Xaman.')
  }
  if (resolution.expired) {
    xaman.status = 'expired'
    throw new Error('The sign request expired before it was signed.')
  }
  if (!resolution.signed || !resolution.txid) {
    xaman.status = 'error'
    xaman.errorMessage = 'Xaman did not return a signed transaction.'
    throw new Error(xaman.errorMessage)
  }

  xaman.status = 'signed'
  const minted = await withXrpl((client) => resolveMintedNft(client, resolution.txid!))
  xaman.visible = false
  return minted
}

function validateIssuer() {
  if (!issuerAccount.value.startsWith('r')) {
    error.value = 'Issuer account must start with r.'
    return false
  }
  if (devSeedMode && !issuerSeed.value.startsWith('s')) {
    error.value = 'Issuer seed must start with s.'
    return false
  }
  return true
}

function randomSalt(len = 16) {
  const arr = new Uint8Array(len)
  window.crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function handleSubmit() {
  error.value = ''
  success.value = false
  nftId.value = ''
  nftMintTime.value = ''
  loading.value = true
  if (lastDownloadUrl) revokeObjectUrl(lastDownloadUrl)
  downloadUrl.value = ''
  qrUrl.value = ''

  if (!validateIssuer()) {
    loading.value = false
    return
  }

  try {
    // 1. Build VC
    const issuer = await makeIssuerDID(issuerAccount.value)
    const subject = { studentName: studentName.value, university: university.value, degree: degree.value, year: year.value, issuerAccount: issuerAccount.value }
    const salt = randomSalt()
    const vc = await buildVC({ issuer, subject, claim: {}, salt })
    // 2. Hash
    const hash = await credentialHash(vc, salt)
    // 3. Mint NFT with memo
    const tx = buildMintTx(vc, hash, issuerAccount.value)
    validateMintTx(tx)

    if (devSeedMode) {
      const wallet = Wallet.fromSeed(issuerSeed.value)
      await withXrpl(async (client) => {
        const result = await submitAndWait(client, wallet, tx)
        const meta = result.result?.meta
        nftId.value = getNFTokenID(meta as any) || '(unknown)'
        nftMintTime.value = (result.result as any)?.close_time_iso
          ? new Date((result.result as any).close_time_iso).toLocaleString()
          : ''
      })
    } else {
      const minted = await mintViaXaman(tx)
      nftId.value = minted.nftId
      nftMintTime.value = minted.mintTime ? new Date(minted.mintTime).toLocaleString() : ''
    }

    // 4. Download link and QR
    lastDownloadUrl = makeDownloadUrlForVC({ vc, salt })
    downloadUrl.value = lastDownloadUrl
    qrUrl.value = await makeVerifierQR({ salt, hash, subject, issuerAccount: issuerAccount.value })
    success.value = true
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

function handleBulkFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  bulkFile.value = target.files?.[0] || null
}

async function handleBulkSubmit() {
  bulkError.value = ''
  bulkResults.value = []
  if (!bulkFile.value) {
    bulkError.value = 'Please select a file.'
    return
  }
  if (!validateIssuer()) return
  bulkLoading.value = true
  try {
    const text = await bulkFile.value!.text()
    let records: any[]
    if (bulkFile.value!.name.endsWith('.json')) {
      records = JSON.parse(text)
    } else if (bulkFile.value!.name.endsWith('.csv')) {
      const [header, ...rows] = text.trim().split(/\r?\n/)
      const keys = header.split(',')
      records = rows.map((row: string) => {
        const vals = row.split(',')
        return Object.fromEntries(keys.map((k: string, i: number) => [k.trim(), vals[i]?.trim()]))
      })
    } else {
      bulkError.value = 'Unsupported file type. Use .csv or .json.'
      bulkLoading.value = false
      return
    }
    if (!Array.isArray(records) || !records.length) throw new Error('No records found.')
    const results: BulkResult[] = []
    for (const [i, rec] of records.entries()) {
      try {
        const issuer = await makeIssuerDID(issuerAccount.value)
        const subject = { studentName: rec.studentName, university: rec.university, degree: rec.degree, year: rec.year }
        const salt = randomSalt()
        const vc = await buildVC({ issuer, subject, claim: {}, salt })
        const hash = await credentialHash(vc, salt)
        const wallet = Wallet.fromSeed(issuerSeed.value)
        const tx = buildMintTx(vc, hash, issuerAccount.value)
        validateMintTx(tx)
        let nftId = ''
        await withXrpl(async (client) => {
          const result = await submitAndWait(client, wallet, tx)
          nftId = getNFTokenID(result.result?.meta as any) || '(unknown)'
        })
        const downloadUrl = makeDownloadUrlForVC({ vc, salt })
        const qr = await makeVerifierQR({ salt, hash, subject, issuerAccount: issuerAccount.value })
        results.push({
          index: i + 1,
          studentName: rec.studentName,
          nftId,
          downloadUrl,
          qr
        })
      } catch (e: any) {
        results.push({ index: i + 1, studentName: rec.studentName, error: e?.message || String(e) })
      }
    }
    bulkResults.value = results
  } catch (e: any) {
    bulkError.value = e?.message || String(e)
  } finally {
    bulkLoading.value = false
  }
}

async function fetchMintedNfts() {
  if (!issuerAccount.value || !issuerAccount.value.startsWith('r')) {
    nftCount.value = 0
    mintedNfts.value = []
    return
  }
  let client
  try {
    // Try multiple public XRPL endpoints so we can detect where the account lives
    const endpoints = [
      'wss://s.altnet.rippletest.net:51233', // alt/testnet
      'wss://s1.ripple.com' // mainnet
    ]
    let response: any = null
    let txsResp: any = null
    let usedEndpoint: string | null = null

    for (const url of endpoints) {
      client = new Client(url)
      try {
        await client.connect()
        response = await client.request({ command: 'account_nfts', account: issuerAccount.value })
        // If the server reports the account doesn't exist, try the next endpoint
        if (response && response.result && response.result.error === 'actNotFound') {
          await client.disconnect()
          client = undefined as any
          continue
        }
        // otherwise we found the account (or an empty list)
        usedEndpoint = url
        txsResp = await client.request({ command: 'account_tx', account: issuerAccount.value, limit: 200 })
        break
      } catch (e) {
        // ensure we disconnect before trying the next endpoint
        try { if (client?.isConnected()) await client.disconnect() } catch (_) {}
        client = undefined as any
        // try next endpoint
        continue
      }
    }

    if (!response || !usedEndpoint) {
      // Account wasn't found on any endpoint we tried
      nftCount.value = 0
      mintedNfts.value = []
      error.value = 'Account not found on testnet/mainnet. Verify the address or choose the correct network.'
      return
    }

    const nfts = (response && response.result && Array.isArray(response.result.account_nfts)) ? response.result.account_nfts : [];
    const txs = txsResp && txsResp.result && Array.isArray(txsResp.result.transactions) ? txsResp.result.transactions : []
    const nftsWithTime = nfts.map((nft: any) => {
      let mintTime = ''
      for (const txObj of txs) {
        const tx = txObj.tx || (txObj as any).tx_json
        if (tx && tx.TransactionType === 'NFTokenMint' && typeof txObj.meta === 'object' && 'AffectedNodes' in txObj.meta) {
          const closeTimeIso = (txObj as any).close_time_iso
          if (closeTimeIso) {
            const d = new Date(closeTimeIso)
            const mm = String(d.getMonth() + 1).padStart(2, '0')
            const dd = String(d.getDate()).padStart(2, '0')
            const yyyy = d.getFullYear()
            mintTime = `${mm}/${dd}/${yyyy}`
          }
          break
        }
      }
      return { ...nft, mintTime } as MintedNFT
    })
    nftCount.value = nftsWithTime.length
    mintedNfts.value = nftsWithTime
  } catch (err: any) {
    nftCount.value = 0
    mintedNfts.value = []
    error.value = err?.message || String(err)
  } finally {
    try { if (client?.isConnected()) await client.disconnect() } catch (_) {}
  }
}

watch(issuerAccount, () => {
  fetchMintedNfts()
})
</script>
