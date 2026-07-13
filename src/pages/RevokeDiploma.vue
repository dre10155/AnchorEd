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
          <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">Revoke a Credential</h1>
          <p class="text-xl text-gray-300 max-w-2xl mx-auto">
            Burn a diploma NFT so verifiers see it as revoked — for rescinded degrees
          </p>
        </div>

        <div class="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
          <div>
            <label class="block font-medium text-brand-black mb-2">Issuer Account</label>
            <input v-model="issuerAccount" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all font-mono" placeholder="r..." />
          </div>
          <div v-if="devSeedMode" class="mt-4">
            <label class="block font-medium text-brand-black text-sm mb-2">Issuer Seed (dev only)</label>
            <input v-model="issuerSeed" class="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all font-mono" placeholder="s..." />
          </div>

          <div v-if="error" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-red-700 font-medium">{{ error }}</p>
          </div>
          <div v-if="revokedMsg" class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-green-700 font-medium">{{ revokedMsg }}</p>
          </div>

          <div v-if="fetching" class="mt-8 text-gray-500 text-center py-6">Loading credentials…</div>
          <div v-else-if="nfts.length" class="mt-8 overflow-x-auto rounded-lg border border-gray-200">
            <table class="w-full text-sm bg-white">
              <thead>
                <tr class="bg-gradient-to-r from-primary-blue to-blue-600 text-white">
                  <th class="px-4 py-3 text-left font-semibold">NFT ID</th>
                  <th class="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="nft in nfts" :key="nft.NFTokenID" class="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 text-xs break-all">
                    <span class="font-mono bg-gray-100 px-2 py-1 rounded text-primary-blue">{{ nft.NFTokenID }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <button @click="askRevoke(nft.NFTokenID)" :disabled="revoking" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-xs font-medium disabled:bg-gray-400 disabled:cursor-not-allowed">
                      Revoke
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="issuerAccount" class="mt-8 text-gray-500 text-center py-6">
            No credentials found for this issuer wallet.
          </div>
        </div>
      </div>
    </section>

    <!-- Confirmation dialog -->
    <div v-if="confirmNftId" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full">
        <h3 class="text-xl font-bold text-brand-black mb-3">Revoke this credential?</h3>
        <p class="text-sm text-gray-600 mb-2">
          This permanently burns the diploma NFT. Verifiers will see the credential as
          <span class="font-semibold text-amber-700">REVOKED</span>. This cannot be undone.
        </p>
        <div class="text-xs font-mono bg-gray-100 p-3 rounded-lg break-all mb-4">{{ confirmNftId }}</div>
        <label class="block font-medium text-brand-black text-sm mb-2">Reason (required, kept off-chain)</label>
        <textarea v-model="revokeReason" rows="2" class="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all" placeholder="e.g. Degree rescinded following academic misconduct finding"></textarea>
        <div class="flex gap-3 mt-5">
          <button @click="confirmNftId = ''" class="flex-1 px-6 py-3 bg-gray-100 text-brand-black rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium">
            Cancel
          </button>
          <button @click="handleRevoke" :disabled="!revokeReason.trim() || revoking" class="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed">
            {{ revoking ? 'Revoking…' : 'Revoke Credential' }}
          </button>
        </div>
      </div>
    </div>

    <XamanSignModal
      v-if="xaman.visible"
      title="Sign credential revocation"
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
import { ref, watch } from 'vue'
import { withXrpl, submitAndWait, waitForValidatedTx } from '../lib/xrplClient'
import { useXamanSign } from '../composables/useXamanSign'
import { Wallet } from 'xrpl'
import XamanSignModal from '../components/XamanSignModal.vue'

const devSeedMode = import.meta.env.VITE_DEV_SEED_MODE === 'true'

const issuerAccount = ref('')
const issuerSeed = ref('')
const nfts = ref<any[]>([])
const fetching = ref(false)
const revoking = ref(false)
const error = ref('')
const revokedMsg = ref('')
const confirmNftId = ref('')
const revokeReason = ref('')

const { xaman, cancel: cancelXamanSign, close: closeXaman, signViaXaman } = useXamanSign()

async function fetchNfts() {
  error.value = ''
  nfts.value = []
  if (!/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(issuerAccount.value.trim())) return
  fetching.value = true
  try {
    await withXrpl(async (client) => {
      const resp = await client.request({ command: 'account_nfts', account: issuerAccount.value.trim() })
      nfts.value = Array.isArray(resp.result?.account_nfts) ? resp.result.account_nfts : []
    })
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    fetching.value = false
  }
}

function askRevoke(nftId: string) {
  revokedMsg.value = ''
  revokeReason.value = ''
  confirmNftId.value = nftId
}

async function handleRevoke() {
  const nftId = confirmNftId.value
  confirmNftId.value = ''
  error.value = ''
  revokedMsg.value = ''
  revoking.value = true
  try {
    const tx = {
      TransactionType: 'NFTokenBurn',
      Account: issuerAccount.value.trim(),
      NFTokenID: nftId,
    }
    if (devSeedMode) {
      const wallet = Wallet.fromSeed(issuerSeed.value)
      await withXrpl((client) => submitAndWait(client, wallet, tx))
    } else {
      const txid = await signViaXaman(tx)
      await withXrpl((client) => waitForValidatedTx(client, txid))
      closeXaman()
    }
    revokedMsg.value = `Credential revoked. NFT ${nftId} has been burned; verifiers will now see it as REVOKED.`
    await fetchNfts()
  } catch (e: any) {
    error.value = e?.message || String(e)
    closeXaman()
  } finally {
    revoking.value = false
  }
}

watch(issuerAccount, fetchNfts)
</script>
