<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
      <!-- Loading State -->
      <div v-if="loading" class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
        <h2 class="text-xl font-semibold text-gray-800 mt-6">Odeme Dogrulanıyor</h2>
        <p class="text-gray-500 mt-2">Lutfen bekleyin, odemeniz kontrol ediliyor...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-800 mt-6">Dogrulama Hatasi</h2>
        <p class="text-gray-500 mt-2">{{ error }}</p>
        <button
          @click="goToDashboard"
          class="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Anasayfaya Don
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref(null)

const verifyPayment = async () => {
  try {
    // iyzico callback'ten gelen token'i al
    const token = route.query.token

    if (!token) {
      error.value = 'Odeme token bulunamadi'
      loading.value = false
      return
    }

    // Backend'e token'i gonder ve odemeyi dogrula
    const response = await api.get(`/payments/verify/${token}`)
    const data = response.data.data || response.data

    if (data.status === 'completed' || data.payment?.status === 'completed') {
      // Basarili - success sayfasina yonlendir
      router.replace({
        name: 'SubscriptionSuccess',
        query: {
          paymentId: data.payment?._id || data.paymentId
        }
      })
    } else if (data.status === 'failed' || data.payment?.status === 'failed') {
      // Basarisiz - failed sayfasina yonlendir
      router.replace({
        name: 'SubscriptionFailed',
        query: {
          error: data.message || data.payment?.errorMessage || 'Odeme basarisiz oldu'
        }
      })
    } else {
      // Beklemede veya baska durum
      error.value = 'Odeme durumu belirsiz. Lutfen destek ekibiyle iletisime gecin.'
      loading.value = false
    }
  } catch (err) {
    console.error('Odeme dogrulama hatasi:', err)

    // API hatasi durumunda failed sayfasina yonlendir
    router.replace({
      name: 'SubscriptionFailed',
      query: {
        error: err.response?.data?.message || 'Odeme dogrulanamadi'
      }
    })
  }
}

const goToDashboard = () => {
  router.push('/')
}

onMounted(() => {
  verifyPayment()
})
</script>
