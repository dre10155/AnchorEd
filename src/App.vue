<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-brand-black">
    <header class="fixed top-0 inset-x-0 z-50 bg-brand-black/90 backdrop-blur border-b border-white/10">
      <nav class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <RouterLink to="/" class="flex items-center gap-2 text-white font-bold text-xl">
          <span class="text-primary-blue text-2xl">&#9875;</span>
          Anchor<span class="text-primary-blue">Ed</span>
        </RouterLink>
        <div class="flex items-center gap-6">
          <RouterLink to="/issue" class="text-gray-300 hover:text-white transition-colors font-medium">Issue</RouterLink>
          <RouterLink to="/revoke" class="text-gray-300 hover:text-white transition-colors font-medium">Revoke</RouterLink>
          <RouterLink to="/verify" class="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium">Verify</RouterLink>
        </div>
      </nav>
    </header>
    <main class="flex-grow">
      <RouterView />
    </main>
    <footer class="border-t border-white/10 py-6">
      <div class="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
        AnchorEd — credentials anchored on the XRP Ledger · Testnet
      </div>
    </footer>
  </div>
</template>
