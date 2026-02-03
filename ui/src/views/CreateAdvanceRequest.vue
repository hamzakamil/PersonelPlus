<template>
  <div class="p-6">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Avans Talebi Oluştur</h1>

      <!-- Maaş Bilgisi Eksik Uyarısı -->
      <div v-if="employee && !employee.salary" class="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">Maaş Bilgisi Eksik</h3>
            <div class="mt-2 text-sm text-yellow-700">
              <p>Avans talebinde bulunabilmek için maaş bilginizin sisteme girilmiş olması gerekiyor. Lütfen İK departmanı ile iletişime geçin.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Şirket Ayarları Bilgilendirme -->
      <div v-if="settings" class="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 class="font-semibold text-blue-900 mb-2">📋 Avans Kuralları</h3>
        <ul class="text-sm text-blue-800 space-y-1">
          <li v-if="settings.maxAmountType === 'PERCENTAGE'">
            💰 Maksimum Tutar: Maaşınızın %{{ settings.maxAmountValue }}'si
            <span v-if="employee && employee.salary" class="font-semibold">
              ({{ calculateMaxAmount().toFixed(2) }} TL)
            </span>
            <span v-else class="text-yellow-700 font-semibold">
              (Maaş bilgisi girilmemiş)
            </span>
          </li>
          <li v-else-if="settings.maxAmountType === 'FIXED'">
            💰 Maksimum Tutar: {{ settings.maxAmountValue.toFixed(2) }} TL
          </li>
          <li v-else>
            💰 Maksimum Tutar: Sınırsız
          </li>
          <li v-if="settings.allowInstallments">
            📅 Maksimum Taksit: {{ settings.maxInstallments }} ay
          </li>
          <li v-if="settings.allowInstallments && employee && employee.salary">
            ⚠️ Taksit Limiti: Aylık taksit tutarı net maaşın %25'ini ({{ (employee.salary * 0.25).toFixed(2) }} TL) geçemez
          </li>
          <li v-if="settings.minWorkMonths > 0">
            ⏱️ Minimum Çalışma Süresi: {{ settings.minWorkMonths }} ay
          </li>
          <li v-if="settings.requestStartDay > 0">
            📆 Talep Tarihi: Ayın {{ settings.requestStartDay }}. gününden itibaren
          </li>
          <li v-if="settings.monthlyRequestLimit > 0">
            🔢 Aylık Limit: {{ settings.monthlyRequestLimit }} talep
          </li>
        </ul>
      </div>

      <!-- Form -->
      <form @submit.prevent="submitRequest" class="bg-white rounded-lg shadow p-6 space-y-6">
        <!-- Tutar -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Avans Tutarı (TL) <span class="text-red-500">*</span>
          </label>
          <input
            v-model.number="form.amount"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="Örn: 5000"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            :disabled="loading"
          />
          <p v-if="maxAmount > 0" class="text-xs text-gray-500 mt-1">
            Maksimum talep edebileceğiniz tutar: {{ maxAmount.toFixed(2) }} TL
          </p>
        </div>

        <!-- Taksit Seçimi -->
        <div v-if="settings && settings.allowInstallments">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Taksit Sayısı
          </label>
          <select
            v-model.number="form.installments"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            :disabled="loading"
          >
            <option :value="1">Tek Çekim</option>
            <template v-for="n in settings.maxInstallments" :key="n">
              <option v-if="n > 1" :value="n">
                {{ n }} Taksit
              </option>
            </template>
          </select>
          <p v-if="form.amount > 0 && form.installments > 1" class="text-xs text-gray-500 mt-1">
            Aylık taksit tutarı: {{ (form.amount / form.installments).toFixed(2) }} TL
          </p>
        </div>

        <!-- %25 Limit Uyarısı -->
        <div v-if="installmentLimitWarning.show" class="p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Taksit Limiti Aşıldı</h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{{ installmentLimitWarning.message }}</p>
                <p class="mt-1 font-medium">{{ installmentLimitWarning.suggestion }}</p>
              </div>
              <div class="mt-3 flex gap-2">
                <button
                  type="button"
                  @click="form.installments = installmentLimitWarning.minInstallments"
                  class="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded text-red-700 bg-white hover:bg-red-50"
                >
                  {{ installmentLimitWarning.minInstallments }} taksit yap
                </button>
                <button
                  type="button"
                  @click="form.amount = installmentLimitWarning.maxAmountWithCurrentInstallments"
                  class="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded text-red-700 bg-white hover:bg-red-50"
                >
                  Tutarı {{ installmentLimitWarning.maxAmountWithCurrentInstallments.toFixed(2) }} TL yap
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- %25 Limit Bilgilendirmesi (uyarı değil, genel bilgi) -->
        <div v-if="employee && employee.salary && form.installments > 1 && !installmentLimitWarning.show" class="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div class="flex items-center gap-2 text-sm text-green-700">
            <svg class="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <span>
              Taksit tutarı ({{ installmentAmount.toFixed(2) }} TL) net maaşın %25 limitini ({{ maxMonthlyDeduction.toFixed(2) }} TL) geçmiyor
            </span>
          </div>
        </div>

        <!-- Gerekçe -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Gerekçe <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="form.reason"
            rows="4"
            required
            placeholder="Avans talebinizin gerekçesini belirtiniz..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            :disabled="loading"
          ></textarea>
        </div>

        <!-- Ödeme Planı Önizleme -->
        <div v-if="form.amount > 0 && form.installments > 1" class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-700 mb-2">📅 Ödeme Planı Önizleme</h4>
          <div class="space-y-1 text-sm">
            <div v-for="(payment, index) in paymentPreview" :key="index" class="flex justify-between">
              <span class="text-gray-600">{{ payment.month }}</span>
              <span class="font-semibold text-gray-900">{{ payment.amount.toFixed(2) }} TL</span>
            </div>
          </div>
        </div>

        <!-- Hata Mesajı -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>

        <!-- Butonlar -->
        <div class="flex gap-3 justify-end">
          <button
            type="button"
            @click="$router.push('/advance-requests')"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            :disabled="loading"
          >
            İptal
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            :disabled="loading || !isFormValid"
          >
            {{ loading ? 'Gönderiliyor...' : 'Talep Oluştur' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const router = useRouter()
const toast = useToastStore()

const settings = ref(null)
const employee = ref(null)
const loading = ref(false)
const error = ref('')

const form = ref({
  amount: null,
  reason: '',
  installments: 1
})

const maxAmount = computed(() => {
  if (!settings.value || !employee.value) return 0

  if (settings.value.maxAmountType === 'PERCENTAGE') {
    return (employee.value.salary || 0) * (settings.value.maxAmountValue / 100)
  } else if (settings.value.maxAmountType === 'FIXED') {
    return settings.value.maxAmountValue
  } else {
    return Infinity
  }
})

const calculateMaxAmount = () => {
  return maxAmount.value
}

const isFormValid = computed(() => {
  // %25 limit aşılıyorsa form geçersiz
  if (installmentLimitWarning.value.show) return false
  return form.value.amount > 0 && form.value.reason.trim() !== ''
})

// Aylık taksit tutarı
const installmentAmount = computed(() => {
  if (!form.value.amount || !form.value.installments) return 0
  return form.value.amount / form.value.installments
})

// Net maaşın %25'i (maksimum aylık kesinti)
const maxMonthlyDeduction = computed(() => {
  return (employee.value?.salary || 0) * 0.25
})

// %25 limit uyarısı
const installmentLimitWarning = computed(() => {
  // Maaş yoksa kontrol yapma
  if (!employee.value?.salary) return { show: false }

  // Taksitli değilse kontrol yapma (tek çekim için bu limit geçerli değil)
  if (form.value.installments <= 1) return { show: false }

  // Tutar girilmemişse kontrol yapma
  if (!form.value.amount || form.value.amount <= 0) return { show: false }

  const installment = installmentAmount.value
  const maxDeduction = maxMonthlyDeduction.value

  if (installment > maxDeduction) {
    const minInstallments = Math.ceil(form.value.amount / maxDeduction)
    const maxAmountWithCurrentInstallments = maxDeduction * form.value.installments

    return {
      show: true,
      message: `Taksit tutarı (${installment.toFixed(2)} TL) net maaşın %25'ini (${maxDeduction.toFixed(2)} TL) geçemez.`,
      suggestion: `En az ${minInstallments} taksit seçin veya tutarı ${maxAmountWithCurrentInstallments.toFixed(2)} TL'ye düşürün.`,
      minInstallments,
      maxAmountWithCurrentInstallments
    }
  }

  return { show: false }
})

const paymentPreview = computed(() => {
  if (!form.value.amount || form.value.installments <= 1) return []

  const preview = []
  const installmentAmount = form.value.amount / form.value.installments
  const today = new Date()

  for (let i = 0; i < form.value.installments; i++) {
    const paymentDate = new Date(today)
    paymentDate.setMonth(paymentDate.getMonth() + i + 1)

    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

    preview.push({
      month: `${monthNames[paymentDate.getMonth()]} ${paymentDate.getFullYear()}`,
      amount: installmentAmount
    })
  }

  return preview
})

const loadSettings = async () => {
  try {
    const response = await api.get('/settings/company')
    if (response.data && response.data.advanceSettings) {
      settings.value = response.data.advanceSettings

      if (!settings.value.enabled) {
        toast.error('Avans talebi sistemi bu şirket için aktif değil')
        router.push('/dashboard')
      }
    }
  } catch (err) {
    console.error('Ayarlar yüklenemedi:', err)
    toast.error('Şirket ayarları yüklenemedi')
  }
}

const loadEmployee = async () => {
  try {
    const response = await api.get('/employees/me')
    if (response.data) {
      employee.value = response.data
    }
  } catch (err) {
    console.error('Çalışan bilgileri yüklenemedi:', err)
  }
}

const submitRequest = async () => {
  try {
    loading.value = true
    error.value = ''

    // Validasyon
    if (maxAmount.value !== Infinity && form.value.amount > maxAmount.value) {
      error.value = `Maksimum talep edebileceğiniz tutar ${maxAmount.value.toFixed(2)} TL'dir`
      return
    }

    const response = await api.post('/advance-requests', {
      amount: form.value.amount,
      reason: form.value.reason,
      installments: form.value.installments
    })

    if (response.data.success) {
      toast.success('Avans talebiniz başarıyla oluşturuldu')
      router.push('/advance-requests')
    }
  } catch (err) {
    console.error('Avans talebi oluşturma hatası:', err)
    error.value = err.response?.data?.message || 'Avans talebi oluşturulamadı'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  await loadEmployee()
})
</script>
