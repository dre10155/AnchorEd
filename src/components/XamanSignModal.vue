<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white p-5 sm:p-6 rounded-xl shadow-2xl relative w-full max-w-sm text-center">
      <button v-if="allowCancel" @click="$emit('cancel')" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center">
        ✕
      </button>
      <h3 class="text-xl font-bold text-brand-black mb-2">{{ title }}</h3>
      <p class="text-sm text-gray-500 mb-4">Scan with the Xaman app to sign</p>

      <img v-if="qrPng && status === 'pending'" :src="qrPng" alt="Xaman sign QR" class="w-48 h-48 sm:w-56 sm:h-56 mx-auto border-4 border-gray-200 rounded-lg" />

      <div v-if="status === 'pending'" class="mt-4 text-gray-500 text-sm">Waiting for signature…</div>
      <div v-else-if="status === 'signed'" class="mt-4 text-green-700 font-medium">Signed — anchoring on the ledger…</div>
      <div v-else-if="status === 'rejected'" class="mt-4 text-red-700 font-medium">Signature rejected in Xaman.</div>
      <div v-else-if="status === 'expired'" class="mt-4 text-red-700 font-medium">Sign request expired.</div>
      <div v-else-if="status === 'error'" class="mt-4 text-red-700 font-medium">{{ errorMessage }}</div>

      <a v-if="deeplink && status === 'pending'" :href="deeplink" target="_blank" class="inline-block mt-4 text-primary-blue hover:text-blue-700 text-sm font-medium">
        Open in Xaman app
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  qrPng: string
  deeplink: string
  status: 'pending' | 'signed' | 'rejected' | 'expired' | 'error'
  errorMessage?: string
  allowCancel?: boolean
}>()
defineEmits<{ cancel: [] }>()
</script>
