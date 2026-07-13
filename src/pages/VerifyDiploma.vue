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
          <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">Verify a Diploma</h1>
          <p class="text-xl text-gray-300 max-w-2xl mx-auto">
            Check any AnchorEd credential against the XRP Ledger
          </p>
        </div>

        <div class="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
          <form @submit.prevent="handleVerify" class="space-y-6">
            <div>
              <label class="block font-medium text-brand-black mb-2">Issuer Account</label>
              <input v-model="issuerAccount" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all font-mono" required placeholder="r..." />
            </div>
            <div>
              <label class="block font-medium text-brand-black mb-2">Upload VC File</label>
              <input type="file" @change="handleFileUpload" class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-blue file:text-white hover:file:bg-blue-700 file:cursor-pointer file:transition-all file:duration-200" accept=".json" />
            </div>
            <div class="flex gap-4">
              <button type="button" @click="showQrScanner = true" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg">
                Scan QR Code
              </button>
              <button type="submit" :disabled="loading || !vcFile" class="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-lg disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed">
                {{ loading ? 'Verifying...' : 'Verify Diploma' }}
              </button>
            </div>
          </form>

          <div v-if="error" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-red-700 font-medium">{{ error }}</p>
          </div>

          <div v-if="resultState !== null" class="mt-6 p-6 rounded-lg border-2" :class="resultState ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'">
            <div class="font-bold text-xl mb-3" :class="resultState ? 'text-green-700' : 'text-red-700'">
              {{ resultState ? 'Diploma Verified ✅' : 'Diploma Not Verified ❌' }}
            </div>
            <div class="text-sm text-gray-700 mb-4">{{ resultReason }}</div>
            <div v-if="diplomaDetails" class="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <h3 class="font-semibold text-brand-black mb-3 text-lg">Diploma Details</h3>
              <div class="space-y-2 text-sm">
                <p class="text-gray-700"><strong class="text-brand-black">Student Name:</strong> {{ diplomaDetails.studentName }}</p>
                <p class="text-gray-700"><strong class="text-brand-black">University:</strong> {{ diplomaDetails.university }}</p>
                <p class="text-gray-700"><strong class="text-brand-black">Degree:</strong> {{ diplomaDetails.degree }}</p>
                <p class="text-gray-700"><strong class="text-brand-black">Year:</strong> {{ diplomaDetails.year }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="showQrScanner" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white p-6 rounded-xl shadow-2xl relative max-w-lg w-full">
        <button @click="showQrScanner = false" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center">
          ✕
        </button>
        <h3 class="text-xl font-bold text-brand-black mb-4">Scan QR Code</h3>
        <QrcodeStream @decode="onDecode" @init="onInit" class="rounded-lg overflow-hidden" />
        <div v-if="qrError" class="text-red-600 mt-4 p-3 bg-red-50 rounded-lg">{{ qrError }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { credentialHash } from '../lib/crypto'
import { Client } from 'xrpl'
import { Buffer } from 'buffer'
import { QrcodeStream } from 'qrcode-reader-vue3'

const issuerAccount = ref('')
const diplomaDetails = ref<any>(null)
const loading = ref(false)
const error = ref('')
const resultState = ref<boolean | null>(null)
const resultReason = ref('')
const vcFile = ref<File | null>(null)
const salt = ref('')
const hash = ref('')
const showQrScanner = ref(false)
const qrError = ref('')

function cleanAccount(account: string) {
  if (!account) return ''
  let acc = account.trim()
  if (acc.startsWith('did:web:')) acc = acc.replace('did:web:', '')
  if (!/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(acc)) return ''
  return acc
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  vcFile.value = file
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      const vc = data.vc || data
      salt.value = data.salt || (vc.proof && vc.proof.salt) || ''
      hash.value = await credentialHash(vc, salt.value)
      diplomaDetails.value = vc.credentialSubject
      if (!issuerAccount.value) {
        issuerAccount.value = cleanAccount(vc.issuer)
      }
      resultState.value = null
      resultReason.value = ''
      error.value = ''
    } catch (err: any) {
      error.value = 'Invalid VC file: ' + err.message
      resultState.value = null
      resultReason.value = ''
    }
  }
  reader.readAsText(file)
}

const handleVerify = async () => {
  loading.value = true
  error.value = ''
  resultState.value = null
  resultReason.value = ''
  const account = cleanAccount(issuerAccount.value)
  if (!account) {
    error.value = 'Issuer account is malformed. Please check the address.'
    resultState.value = false
    resultReason.value = 'Malformed XRPL account address.'
    loading.value = false
    return
  }
  let client
  try {
    client = new Client('wss://s.altnet.rippletest.net:51233')
    await client.connect()
    const response = await client.request({
      command: 'account_nfts',
      account,
    })
    const nfts = (response && response.result && Array.isArray(response.result.account_nfts)) ? response.result.account_nfts : []
    const txsResp = await client.request({
      command: 'account_tx',
      account,
      limit: 100
    })
    const txs = txsResp.result && Array.isArray(txsResp.result.transactions) ? txsResp.result.transactions : []
    let found = false
    let matchedNftId = ''
    for (const nft of nfts) {
      if (!nft.NFTokenID) continue
      for (const txObj of txs) {
        const tx = txObj.tx || (txObj as any).tx_json
        if (tx.TransactionType === 'NFTokenMint' && Array.isArray((txObj.meta as any).AffectedNodes)) {
          let createdNode = false
          let validNFToken = false
          const affectedNodes = (txObj.meta as any).AffectedNodes
          const createdNodeObj = affectedNodes.find((n: any) => n.CreatedNode && n.CreatedNode.LedgerEntryType === 'NFTokenPage')
          if (createdNodeObj) {
            createdNode = true
            validNFToken = createdNodeObj.CreatedNode && Array.isArray(createdNodeObj.CreatedNode.NewFields.NFTokens) && createdNodeObj.CreatedNode.NewFields.NFTokens.some((t: any) => t.NFToken.NFTokenID === nft.NFTokenID)
          } else {
            const modifiedNodeObj = affectedNodes.find((n: any) => n.ModifiedNode && n.ModifiedNode.LedgerEntryType === 'NFTokenPage')
            if (modifiedNodeObj) {
              createdNode = true
              validNFToken = modifiedNodeObj.ModifiedNode && Array.isArray(modifiedNodeObj.ModifiedNode.FinalFields.NFTokens) && modifiedNodeObj.ModifiedNode.FinalFields.NFTokens.some((t: any) => t.NFToken.NFTokenID === nft.NFTokenID)
            }
          }
          if (createdNode && validNFToken) {
            if (Array.isArray(tx.Memos)) {
              for (const memoObj of tx.Memos) {
                try {
                  const memoData = Buffer.from(memoObj.Memo.MemoData, 'hex').toString()
                  const memo = JSON.parse(memoData)
                  if (memo.hash === hash.value) {
                    // Second binding: NFTs minted with the hash-anchor URI format
                    // must carry the same hash there too (legacy URIs pass on memo alone)
                    const uriStr = nft.URI ? Buffer.from(nft.URI, 'hex').toString() : ''
                    if (uriStr.startsWith('vc:sha256:') && uriStr !== `vc:sha256:${hash.value}`) continue
                    found = true
                    matchedNftId = nft.NFTokenID
                    break
                  }
                } catch {}
              }
            }
          }
        }
        if (found) break
      }
      if (found) break
    }
    if (found) {
      resultState.value = true
      resultReason.value = `Match found: The diploma is authentic and anchored on XRPL. NFT ID: ${matchedNftId}`
    } else {
      resultState.value = false
      resultReason.value = 'No NFT memo found with this anchor hash.'
    }
  } catch (err: any) {
    error.value = 'Error verifying NFT: ' + err.message
    resultState.value = false
    resultReason.value = 'Verification failed due to an error.'
  } finally {
    loading.value = false
    if (client?.isConnected()) await client.disconnect()
  }
}

const onDecode = async (result: string) => {
  try {
    const data = JSON.parse(result)
    const vc = data.vc || data
    salt.value = data.salt || (vc.proof && vc.proof.salt) || ''
    hash.value = data.hash || (vc.proof && vc.proof.hash) || ''
    diplomaDetails.value = vc.credentialSubject || data.subject
    if (!issuerAccount.value) {
      issuerAccount.value = data.issuerAccount || cleanAccount(vc.issuer)
    }
    resultState.value = null
    resultReason.value = ''
    showQrScanner.value = false
    vcFile.value = new File([JSON.stringify(data)], 'scanned-vc.json', { type: 'application/json' })
    await handleVerify()
  } catch (err: any) {
    qrError.value = 'Invalid QR code: ' + err.message
  }
}

const onInit = async (capabilities: any) => {
  try {
    await capabilities.requestCamera()
  } catch (error: any) {
    if (error.name === 'NotAllowedError') {
      qrError.value = 'Camera access denied. Please grant permission in your browser settings.'
    } else if (error.name === 'NotFoundError') {
      qrError.value = 'No camera found on this device.'
    } else {
      qrError.value = `Error initializing camera: ${error.message}`
    }
  }
}
</script>
