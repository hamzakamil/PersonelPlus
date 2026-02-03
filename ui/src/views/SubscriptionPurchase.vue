<template>
  <div>
    <div class="mb-6">
      <p class="text-gray-600 mt-1">Isletmeniz icin en uygun paketi secin</p>
    </div>

    <!-- Mevcut Abonelik Bilgisi -->
    <div v-if="currentSubscription" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-blue-800">Mevcut Aboneliginiz</h3>
          <p class="text-blue-600">{{ currentSubscription.package?.name || 'Bilinmiyor' }}</p>
          <p class="text-sm text-blue-500">
            Bitis: {{ formatDate(currentSubscription.endDate) }}
            ({{ daysRemaining }} gun kaldi)
          </p>
        </div>
        <div class="text-right">
          <span
            :class="{
              'bg-green-100 text-green-800': currentSubscription.status === 'active',
              'bg-yellow-100 text-yellow-800': currentSubscription.status === 'expired',
              'bg-red-100 text-red-800': currentSubscription.status === 'suspended'
            }"
            class="px-3 py-1 rounded-full text-sm font-medium"
          >
            {{ statusText(currentSubscription.status) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Kota Bilgisi -->
    <div v-if="quota" class="bg-white rounded-lg shadow p-4 mb-6">
      <h3 class="font-semibold text-gray-800 mb-3">Kota Durumu</h3>
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <div class="flex justify-between text-sm mb-1">
            <span>Kullanilan: {{ quota.used }} / {{ quota.total }}</span>
            <span>{{ quota.percentage }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div
              class="h-3 rounded-full transition-all"
              :class="{
                'bg-green-500': quota.percentage < 70,
                'bg-yellow-500': quota.percentage >= 70 && quota.percentage < 90,
                'bg-red-500': quota.percentage >= 90
              }"
              :style="{ width: quota.percentage + '%' }"
            ></div>
          </div>
        </div>
        <div class="text-right">
          <span class="text-2xl font-bold text-gray-800">{{ quota.remaining }}</span>
          <span class="text-gray-500 text-sm block">Kalan</span>
        </div>
      </div>
    </div>

    <!-- Odeme Tipi Secimi -->
    <div class="flex justify-center mb-6">
      <div class="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-100">
        <button
          @click="changeBillingType('monthly')"
          :class="billingType === 'monthly' ? 'bg-white shadow text-blue-600' : 'text-gray-600'"
          class="px-6 py-2 rounded-lg font-medium transition-all"
        >
          Aylik
        </button>
        <button
          @click="changeBillingType('yearly')"
          :class="billingType === 'yearly' ? 'bg-white shadow text-blue-600' : 'text-gray-600'"
          class="px-6 py-2 rounded-lg font-medium transition-all"
        >
          Yillik (2 Ay Bedava)
        </button>
      </div>
    </div>

    <!-- Paket Kartlari -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="pkg in packages"
        :key="pkg._id"
        :class="[
          'bg-white rounded-lg shadow-lg overflow-hidden border-2 transition-all cursor-pointer',
          selectedPackage?._id === pkg._id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
        ]"
        @click="selectPackage(pkg)"
      >
        <!-- Vurgulama -->
        <div v-if="pkg.highlightText" class="bg-blue-500 text-white text-center py-1 text-sm font-medium">
          {{ pkg.highlightText }}
        </div>

        <div class="p-6">
          <h3 class="text-xl font-bold text-gray-800">{{ pkg.name }}</h3>
          <p class="text-gray-500 text-sm mt-1">{{ pkg.description }}</p>

          <!-- Fiyat -->
          <div class="mt-4">
            <span class="text-3xl font-bold text-gray-900">
              {{ formatCurrency(billingType === 'yearly' ? pkg.yearlyPrice : pkg.monthlyPrice) }}
            </span>
            <span class="text-gray-500">/{{ billingType === 'yearly' ? 'yil' : 'ay' }}</span>
          </div>

          <div class="text-sm text-gray-500 mt-1">
            {{ pkg.pricePerEmployee }} TL / calisan
          </div>

          <!-- Calisan Limiti -->
          <div class="mt-4 py-3 border-t border-b border-gray-100">
            <div class="flex items-center justify-center">
              <span class="text-4xl font-bold text-blue-600">{{ pkg.employeeLimit }}</span>
              <span class="text-gray-500 ml-2">Calisan</span>
            </div>
          </div>

          <!-- Ozellikler -->
          <ul class="mt-4 space-y-2">
            <li v-for="feature in pkg.features" :key="feature.name" class="flex items-center text-sm">
              <svg
                v-if="feature.enabled"
                class="w-5 h-5 text-green-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <svg v-else class="w-5 h-5 text-gray-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              <span :class="feature.enabled ? 'text-gray-700' : 'text-gray-400'">{{ feature.name }}</span>
            </li>
          </ul>

          <!-- Sec Butonu -->
          <button
            @click.stop="selectPackage(pkg)"
            :class="[
              'w-full mt-6 py-3 rounded-lg font-medium transition-all',
              selectedPackage?._id === pkg._id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ selectedPackage?._id === pkg._id ? 'Secildi' : 'Sec' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Satin Al Butonu -->
    <div v-if="selectedPackage" class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
      <div class="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div class="flex-1">
          <p class="font-semibold text-gray-800">{{ selectedPackage.name }}</p>
          <div class="flex items-center gap-2">
            <p v-if="!appliedCampaign" class="text-gray-500">
              {{ formatCurrency(billingType === 'yearly' ? selectedPackage.yearlyPrice : selectedPackage.monthlyPrice) }}
              / {{ billingType === 'yearly' ? 'yil' : 'ay' }}
            </p>
            <template v-else>
              <p class="text-gray-400 line-through text-sm">
                {{ formatCurrency(appliedCampaign.originalAmount) }}
              </p>
              <p class="text-green-600 font-semibold">
                {{ formatCurrency(appliedCampaign.finalAmount) }}
              </p>
              <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                {{ appliedCampaign.campaign.code }}
              </span>
            </template>
          </div>
        </div>
        <!-- Kampanya Kodu -->
        <div class="flex items-center gap-2">
          <input
            v-if="!appliedCampaign"
            v-model="campaignCode"
            type="text"
            placeholder="Kampanya kodu"
            class="border rounded-lg px-3 py-2 w-36 text-sm uppercase"
            @keyup.enter="applyCampaignCode"
          />
          <button
            v-if="!appliedCampaign && campaignCode"
            @click="applyCampaignCode"
            :disabled="validatingCampaign"
            class="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {{ validatingCampaign ? '...' : 'Uygula' }}
          </button>
          <button
            v-if="appliedCampaign"
            @click="removeCampaign"
            class="text-red-600 hover:text-red-800 text-sm"
          >
            Kaldir
          </button>
        </div>
        <button
          @click="proceedToPayment"
          :disabled="processing"
          class="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ processing ? 'Isleniyor...' : 'Satin Al' }}
        </button>
      </div>
    </div>

    <!-- Odeme Modal -->
    <div v-if="showPaymentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 class="text-xl font-bold mb-4">Odeme</h2>

        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <div class="flex justify-between mb-2">
            <span>Paket:</span>
            <span class="font-medium">{{ selectedPackage?.name }}</span>
          </div>
          <div class="flex justify-between mb-2">
            <span>Odeme Tipi:</span>
            <span class="font-medium">{{ billingType === 'yearly' ? 'Yillik' : 'Aylik' }}</span>
          </div>
          <template v-if="appliedCampaign">
            <div class="flex justify-between mb-2">
              <span>Ara Toplam:</span>
              <span class="text-gray-500">{{ formatCurrency(appliedCampaign.originalAmount) }}</span>
            </div>
            <div class="flex justify-between mb-2 text-green-600">
              <span>Indirim ({{ appliedCampaign.campaign.code }}):</span>
              <span>-{{ formatCurrency(appliedCampaign.discount) }}</span>
            </div>
          </template>
          <div class="flex justify-between text-lg font-bold border-t pt-2 mt-2">
            <span>Toplam:</span>
            <span class="text-blue-600">
              {{ formatCurrency(appliedCampaign ? appliedCampaign.finalAmount : (billingType === 'yearly' ? selectedPackage?.yearlyPrice : selectedPackage?.monthlyPrice)) }}
            </span>
          </div>
        </div>

        <!-- iyzico Checkout Form Alani -->
        <div id="iyzipay-checkout-form" class="min-h-[400px]"></div>

        <div v-if="!checkoutFormLoaded" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-gray-500 mt-2">Odeme formu yukleniyor...</p>
        </div>

        <button
          @click="closePaymentModal"
          class="w-full mt-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Iptal
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const packages = ref([])
const currentSubscription = ref(null)
const quota = ref(null)
const selectedPackage = ref(null)
const billingType = ref('monthly')
const processing = ref(false)
const showPaymentModal = ref(false)
const checkoutFormLoaded = ref(false)

// Kampanya
const campaignCode = ref('')
const appliedCampaign = ref(null)
const validatingCampaign = ref(false)

const daysRemaining = computed(() => {
  if (!currentSubscription.value?.endDate) return 0
  const end = new Date(currentSubscription.value.endDate)
  const now = new Date()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0
  }).format(value || 0)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

const statusText = (status) => {
  const texts = {
    active: 'Aktif',
    expired: 'Suresi Dolmus',
    suspended: 'Askida',
    cancelled: 'Iptal Edilmis'
  }
  return texts[status] || status
}

const fetchPackages = async () => {
  try {
    const response = await api.get('/packages/active')
    packages.value = response.data.data || response.data
  } catch (error) {
    console.error('Paketler yuklenirken hata:', error)
  }
}

const fetchCurrentSubscription = async () => {
  try {
    const response = await api.get('/subscriptions/my')
    const data = response.data.data || response.data
    currentSubscription.value = data.subscription
    quota.value = data.quota?.quota
  } catch (error) {
    console.error('Abonelik bilgisi yuklenirken hata:', error)
  }
}

const selectPackage = (pkg) => {
  selectedPackage.value = pkg
  // Paket degisince kampanyayi temizle
  appliedCampaign.value = null
  campaignCode.value = ''
}

const changeBillingType = (type) => {
  billingType.value = type
  // Fatura tipi degisince kampanyayi temizle
  appliedCampaign.value = null
  campaignCode.value = ''
}

const applyCampaignCode = async () => {
  if (!campaignCode.value || !selectedPackage.value) return

  validatingCampaign.value = true
  try {
    const amount = billingType.value === 'yearly'
      ? selectedPackage.value.yearlyPrice
      : selectedPackage.value.monthlyPrice

    const response = await api.post('/campaigns/validate', {
      code: campaignCode.value,
      packageId: selectedPackage.value._id,
      billingType: billingType.value,
      amount
    })

    const data = response.data.data || response.data

    if (data.valid) {
      appliedCampaign.value = data
      toast.success(data.message)
    } else {
      toast.warning(data.message || 'Geçersiz kampanya kodu')
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Kampanya kodu doğrulanamadı')
  } finally {
    validatingCampaign.value = false
  }
}

const removeCampaign = () => {
  appliedCampaign.value = null
  campaignCode.value = ''
}

const proceedToPayment = async () => {
  if (!selectedPackage.value) return

  processing.value = true
  try {
    const payload = {
      packageId: selectedPackage.value._id,
      billingType: billingType.value,
      callbackUrl: `${window.location.origin}/subscription/callback`
    }

    // Kampanya varsa ekle
    if (appliedCampaign.value?.campaign?._id) {
      payload.campaignId = appliedCampaign.value.campaign._id
    }

    const response = await api.post('/payments/create-checkout', payload)

    const data = response.data.data || response.data

    if (data.checkoutFormContent) {
      showPaymentModal.value = true

      // iyzico checkout formunu yukle
      setTimeout(() => {
        const container = document.getElementById('iyzipay-checkout-form')
        if (container) {
          container.innerHTML = data.checkoutFormContent
          checkoutFormLoaded.value = true
        }
      }, 100)
    }
  } catch (error) {
    console.error('Ödeme formu oluşturma hatası:', error)
    toast.error(error.response?.data?.message || 'Ödeme formu oluşturulamadı')
  } finally {
    processing.value = false
  }
}

const closePaymentModal = () => {
  showPaymentModal.value = false
  checkoutFormLoaded.value = false
}

onMounted(() => {
  fetchPackages()
  fetchCurrentSubscription()
})
</script>

<style scoped>
/* iyzico formunun margin'ini duzelt */
:deep(#iyzipay-checkout-form) {
  margin: 0;
}
</style>
