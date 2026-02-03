<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
      <!-- Error Icon -->
      <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>

      <h1 class="text-2xl font-bold text-gray-800 mt-6">Odeme Basarisiz</h1>
      <p class="text-gray-500 mt-2">
        Odeme islemi tamamlanamadi. Lutfen tekrar deneyin veya farkli bir odeme yontemi kullanin.
      </p>

      <!-- Error Message -->
      <div v-if="errorMessage" class="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-700 text-sm">{{ errorMessage }}</p>
      </div>

      <!-- Common Error Reasons -->
      <div class="mt-6 bg-gray-50 rounded-lg p-4 text-left">
        <h3 class="font-semibold text-gray-700 mb-3">Olasi Nedenler</h3>
        <ul class="space-y-2 text-sm text-gray-600">
          <li class="flex items-start">
            <svg class="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Yetersiz bakiye veya limit
          </li>
          <li class="flex items-start">
            <svg class="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Kart bilgileri hatali girilmis olabilir
          </li>
          <li class="flex items-start">
            <svg class="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            3D Secure dogrulamasi basarisiz
          </li>
          <li class="flex items-start">
            <svg class="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Banka tarafindan reddedilmis olabilir
          </li>
        </ul>
      </div>

      <!-- Actions -->
      <div class="mt-8 space-y-3">
        <button
          @click="tryAgain"
          class="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Tekrar Dene
        </button>
        <button
          @click="goToDashboard"
          class="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
        >
          Anasayfaya Don
        </button>
      </div>

      <!-- Support Link -->
      <p class="mt-6 text-sm text-gray-500">
        Sorun devam ederse
        <a href="mailto:destek@example.com" class="text-blue-600 hover:underline">destek ekibimizle</a>
        iletisime gecin.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const errorMessage = computed(() => {
  return route.query.error || null
})

const tryAgain = () => {
  router.push('/subscription')
}

const goToDashboard = () => {
  router.push('/')
}
</script>
