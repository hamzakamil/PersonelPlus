<template>
  <div>
    <!-- Sayfa Başlığı -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 no-uppercase">Abonelik Paketleri</h1>
      <p class="text-gray-600 mt-2 no-uppercase">İşletmeniz için en uygun paketi seçin ve hemen kullanmaya başlayın</p>
    </div>

    <!-- Güvenlik & Ödeme Yöntemleri Badge'leri -->
    <div class="flex flex-wrap items-center justify-center gap-6 mb-8 text-sm text-gray-600">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
        <span class="font-medium">256-bit SSL Güvenli Ödeme</span>
      </div>
      <div class="flex items-center gap-2">
        <span>Kabul Edilen Kartlar:</span>
        <span class="font-semibold">Visa, Mastercard, Troy</span>
      </div>
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="font-medium">3D Secure Güvencesi</span>
      </div>
    </div>

    <!-- Adım Göstergesi -->
    <div class="flex items-center justify-center mb-8">
      <div class="flex items-center">
        <div class="flex items-center">
          <div :class="currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'" class="rounded-full w-10 h-10 flex items-center justify-center font-semibold">1</div>
          <span :class="currentStep >= 1 ? 'font-semibold text-gray-900' : 'text-gray-500'" class="ml-2">Paket Seçimi</span>
        </div>
        <div :class="currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'" class="w-20 h-1 mx-4"></div>
        <div class="flex items-center">
          <div :class="currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'" class="rounded-full w-10 h-10 flex items-center justify-center font-semibold">2</div>
          <span :class="currentStep >= 2 ? 'font-semibold text-gray-900' : 'text-gray-500'" class="ml-2">Ödeme</span>
        </div>
        <div :class="currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'" class="w-20 h-1 mx-4"></div>
        <div class="flex items-center">
          <div :class="currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'" class="rounded-full w-10 h-10 flex items-center justify-center font-semibold">3</div>
          <span :class="currentStep >= 3 ? 'font-semibold text-gray-900' : 'text-gray-500'" class="ml-2">Tamamlandı</span>
        </div>
      </div>
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
          <h3 class="text-xl font-bold text-gray-800 package-name">{{ pkg.name }}</h3>
          <p class="text-gray-500 text-sm mt-1 no-uppercase">{{ pkg.description }}</p>

          <!-- Fiyat -->
          <div class="mt-4">
            <span class="text-3xl font-bold text-gray-900 preserve-case">
              {{ formatCurrency(billingType === 'yearly' ? pkg.yearlyPrice : pkg.monthlyPrice) }}
            </span>
            <span class="text-gray-500 no-uppercase">/{{ billingType === 'yearly' ? 'yıl' : 'ay' }}</span>
          </div>

          <div class="text-sm text-gray-500 mt-1 no-uppercase">
            {{ pkg.pricePerEmployee }} TL / çalışan
          </div>

          <!-- Taksit Bilgisi -->
          <div class="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded no-uppercase">
            Taksit seçenekleri: 1-2-3-6 ay
          </div>

          <!-- Calisan Limiti -->
          <div class="mt-4 py-3 border-t border-b border-gray-100">
            <div class="flex items-center justify-center">
              <span class="text-4xl font-bold text-blue-600 preserve-case">{{ pkg.employeeLimit }}</span>
              <span class="text-gray-500 ml-2 no-uppercase">Çalışan</span>
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
              <span :class="feature.enabled ? 'text-gray-700 no-uppercase' : 'text-gray-400 no-uppercase'">{{ feature.name }}</span>
            </li>
          </ul>

          <!-- Sec Butonu -->
          <button
            @click.stop="selectPackage(pkg)"
            :class="[
              'w-full mt-6 py-3 rounded-lg font-medium transition-all no-uppercase',
              selectedPackage?._id === pkg._id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ selectedPackage?._id === pkg._id ? 'Seçildi' : 'Seç' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Satin Al Butonu -->
    <div v-if="selectedPackage" class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
      <div class="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div class="flex-1">
          <p class="font-semibold text-gray-800 package-name">{{ selectedPackage.name }}</p>
          <div class="flex items-center gap-2">
            <p v-if="!appliedCampaign" class="text-gray-500 preserve-case">
              {{ formatCurrency(billingType === 'yearly' ? selectedPackage.yearlyPrice : selectedPackage.monthlyPrice) }}
              / {{ billingType === 'yearly' ? 'yıl' : 'ay' }}
            </p>
            <template v-else>
              <p class="text-gray-400 line-through text-sm preserve-case">
                {{ formatCurrency(appliedCampaign.originalAmount) }}
              </p>
              <p class="text-green-600 font-semibold preserve-case">
                {{ formatCurrency(appliedCampaign.finalAmount) }}
              </p>
              <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase-text">
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
          class="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed no-uppercase"
        >
          {{ processing ? 'İşleniyor...' : 'Satın Al' }}
        </button>
      </div>
    </div>

    <!-- Odeme Modal -->
    <div v-if="showPaymentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto modal-content">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2 no-uppercase">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
          Güvenli Kredi Kartı Ödemesi
        </h2>

        <!-- 3D Secure Açıklaması -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p class="text-sm text-blue-800 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
            <span><strong>3D Secure:</strong> Ödemeniz bankınız tarafından güvenli bir şekilde onaylanacaktır</span>
          </p>
        </div>

        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <div class="flex justify-between mb-2">
            <span class="no-uppercase">Paket:</span>
            <span class="font-medium package-name">{{ selectedPackage?.name }}</span>
          </div>
          <div class="flex justify-between mb-2">
            <span class="no-uppercase">Ödeme Tipi:</span>
            <span class="font-medium no-uppercase">{{ billingType === 'yearly' ? 'Yıllık' : 'Aylık' }}</span>
          </div>
          <template v-if="appliedCampaign">
            <div class="flex justify-between mb-2">
              <span class="no-uppercase">Ara Toplam:</span>
              <span class="text-gray-500 preserve-case">{{ formatCurrency(appliedCampaign.originalAmount) }}</span>
            </div>
            <div class="flex justify-between mb-2 text-green-600">
              <span class="no-uppercase">İndirim ({{ appliedCampaign.campaign.code }}):</span>
              <span class="preserve-case">-{{ formatCurrency(appliedCampaign.discount) }}</span>
            </div>
          </template>
          <div class="flex justify-between text-lg font-bold border-t pt-2 mt-2">
            <span class="no-uppercase">Toplam:</span>
            <span class="text-blue-600 preserve-case">
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

        <!-- Fatura Bilgisi -->
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
          <p class="text-xs text-gray-600 text-center flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <span>Faturanız ödeme sonrası e-posta adresinize gönderilecektir</span>
          </p>
        </div>

        <button
          @click="closePaymentModal"
          class="w-full mt-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 no-uppercase"
        >
          İptal
        </button>
      </div>
    </div>

    <!-- Yardım Butonu -->
    <button
      @click="showHelpDialog"
      class="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-all z-40"
      title="Yardım"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </button>

    <!-- Yardım Dialogu -->
    <div v-if="showHelp" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md modal-content">
        <h3 class="text-xl font-bold mb-4 no-uppercase">Yardıma mı İhtiyacınız Var?</h3>
        <p class="text-gray-600 mb-4 no-uppercase">
          Paket seçimi veya ödeme konusunda sorularınız için bizimle iletişime geçebilirsiniz:
        </p>
        <div class="space-y-3">
          <a :href="`mailto:${supportInfo.supportEmail}`" class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <div>
              <div class="font-medium no-uppercase">E-posta</div>
              <div class="text-sm text-gray-500 email-text">{{ supportInfo.supportEmail }}</div>
            </div>
          </a>
          <a :href="`tel:+90${supportInfo.supportPhone.replace(/\s/g, '')}`" class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
            </svg>
            <div>
              <div class="font-medium no-uppercase">Telefon</div>
              <div class="text-sm text-gray-500 preserve-case">{{ formatPhone(supportInfo.supportPhone) }}</div>
            </div>
          </a>
        </div>
        <button
          @click="showHelp = false"
          class="w-full mt-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 no-uppercase"
        >
          Kapat
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useToastStore } from '@/stores/toast'
import { formatPhone } from '@/utils/formatters'

const toast = useToastStore()
const packages = ref([])
const currentSubscription = ref(null)
const quota = ref(null)
const selectedPackage = ref(null)
const billingType = ref('monthly')
const processing = ref(false)
const showPaymentModal = ref(false)
const checkoutFormLoaded = ref(false)
const currentStep = ref(1) // Adım göstergesi için

// Kampanya
const campaignCode = ref('')
const appliedCampaign = ref(null)
const validatingCampaign = ref(false)

// Yardım
const showHelp = ref(false)
const supportInfo = ref({
  supportEmail: 'destek@personelplus.com',
  supportPhone: '0544 742 74 42'
})

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
  currentStep.value = 2 // Ödeme adımına geç
  try {
    const payload = {
      packageId: selectedPackage.value._id,
      billingType: billingType.value
      // callbackUrl backend tarafından belirlenir
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
    currentStep.value = 1 // Hata durumunda geri dön
  } finally {
    processing.value = false
  }
}

const closePaymentModal = () => {
  showPaymentModal.value = false
  checkoutFormLoaded.value = false
  currentStep.value = 1 // Paket seçimine geri dön
}

const showHelpDialog = () => {
  showHelp.value = true
}

const fetchSupportInfo = async () => {
  try {
    const response = await api.get('/global-settings/support-info')
    if (response.data.success) {
      supportInfo.value = response.data.data
    }
  } catch (error) {
    console.error('Destek bilgileri yuklenirken hata:', error)
    // Hata durumunda varsayılan değerler kullanılacak
  }
}

onMounted(() => {
  fetchPackages()
  fetchCurrentSubscription()
  fetchSupportInfo()
})
</script>

<style scoped>
/* iyzico formunun margin'ini duzelt */
:deep(#iyzipay-checkout-form) {
  margin: 0;
}
</style>
