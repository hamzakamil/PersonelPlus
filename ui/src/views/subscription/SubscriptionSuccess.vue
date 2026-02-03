<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
      <!-- Success Icon -->
      <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg class="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>

      <h1 class="text-2xl font-bold text-gray-800 mt-6">Odeme Basarili!</h1>
      <p class="text-gray-500 mt-2">
        Aboneliginiz basariyla aktiflestirildi. Artik tum ozellikleri kullanabilirsiniz.
      </p>

      <!-- Payment Details -->
      <div v-if="paymentDetails" class="mt-6 bg-gray-50 rounded-lg p-4 text-left">
        <h3 class="font-semibold text-gray-700 mb-3">Odeme Detaylari</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Paket:</span>
            <span class="font-medium">{{ paymentDetails.package?.name || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Tutar:</span>
            <span class="font-medium text-green-600">{{ formatCurrency(paymentDetails.amount) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Odeme Tipi:</span>
            <span class="font-medium">{{ paymentDetails.billingType === 'yearly' ? 'Yillik' : 'Aylik' }}</span>
          </div>
          <div v-if="paymentDetails.invoiceNumber" class="flex justify-between">
            <span class="text-gray-500">Fatura No:</span>
            <span class="font-medium">{{ paymentDetails.invoiceNumber }}</span>
          </div>
        </div>
      </div>

      <!-- Subscription Info -->
      <div v-if="subscriptionDetails" class="mt-4 bg-blue-50 rounded-lg p-4 text-left">
        <h3 class="font-semibold text-blue-700 mb-3">Abonelik Bilgileri</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-blue-500">Durum:</span>
            <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Aktif</span>
          </div>
          <div class="flex justify-between">
            <span class="text-blue-500">Bitis Tarihi:</span>
            <span class="font-medium">{{ formatDate(subscriptionDetails.endDate) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-blue-500">Calisan Kotasi:</span>
            <span class="font-medium">{{ subscriptionDetails.employeeQuota }} Calisan</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-8 space-y-3">
        <button
          @click="goToSubscription"
          class="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Aboneligimi Goruntule
        </button>
        <button
          @click="goToDashboard"
          class="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
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
const paymentDetails = ref(null)
const subscriptionDetails = ref(null)

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0
  }).format(value || 0)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const fetchPaymentDetails = async () => {
  const paymentId = route.query.paymentId
  if (!paymentId) return

  try {
    const response = await api.get(`/payments/${paymentId}`)
    const data = response.data.data || response.data
    paymentDetails.value = data

    if (data.subscription) {
      subscriptionDetails.value = data.subscription
    }
  } catch (error) {
    console.error('Odeme detaylari yuklenirken hata:', error)
  }
}

const goToSubscription = () => {
  router.push('/subscription')
}

const goToDashboard = () => {
  router.push('/')
}

onMounted(() => {
  fetchPaymentDetails()
})
</script>
