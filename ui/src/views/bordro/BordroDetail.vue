<template>
  <div class="max-w-3xl mx-auto">
    <!-- Back Button -->
    <button @click="$router.back()" class="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900">
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Geri
    </button>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <template v-else-if="bordro">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">
              {{ months[bordro.month - 1] }} {{ bordro.year }} Bordrosu
            </h1>
            <p class="text-gray-600 mt-1">{{ bordro.company?.name }}</p>
            <p class="text-sm text-gray-500 mt-1">{{ bordro.employeeName }}</p>
          </div>
          <span :class="statusClass(bordro.status)">
            {{ statusText(bordro.status) }}
          </span>
        </div>
      </div>

      <!-- Payroll Details Grid -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Bordro Detayları</h2>

        <div class="grid grid-cols-2 gap-x-8 gap-y-3">
          <!-- Gün Bilgileri -->
          <div class="col-span-2 border-b pb-2 mb-2">
            <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Gün Bilgileri</h3>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Toplam Gün</span>
            <span class="font-medium">{{ bordro.payrollData?.calismaGunu || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Normal Gün</span>
            <span class="font-medium">{{ bordro.payrollData?.normalGun || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">İzin Günü</span>
            <span class="font-medium">{{ bordro.payrollData?.izinGunu || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Eksik Gün</span>
            <span class="font-medium">{{ bordro.payrollData?.eksikGun || '-' }}</span>
          </div>

          <!-- Kanun & Ücret -->
          <div class="col-span-2 border-b pb-2 mb-2 mt-4">
            <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Kanun & Ücret Tipi</h3>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Kanun</span>
            <span class="font-medium">{{ bordro.payrollData?.kanun || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Ücret G/S</span>
            <span class="font-medium">{{ bordro.payrollData?.ucretGunSaat || '-' }}</span>
          </div>

          <!-- Kazançlar -->
          <div class="col-span-2 border-b pb-2 mb-2 mt-4">
            <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Kazançlar</h3>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Normal Kazanç</span>
            <span class="font-medium">{{ formatCurrency(bordro.payrollData?.normalKazanc) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Toplam Kazanç (Brüt)</span>
            <span class="font-medium">{{ formatCurrency(bordro.payrollData?.brutUcret) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Diğer Kazanç</span>
            <span class="font-medium">{{ formatCurrency(bordro.payrollData?.digerKazanc) }}</span>
          </div>

          <!-- SGK/SSK -->
          <div class="col-span-2 border-b pb-2 mb-2 mt-4">
            <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider">SGK/SSK</h3>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">SSK Matrah</span>
            <span class="font-medium">{{ formatCurrency(bordro.payrollData?.sskMatrah) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">SSK İşveren</span>
            <span class="font-medium">{{ formatCurrency(bordro.payrollData?.sskIsveren) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">SSK İşçi</span>
            <span class="font-medium text-red-600">{{ formatCurrency(bordro.payrollData?.sgkKesinti) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">İşsizlik Primi</span>
            <span class="font-medium text-red-600">{{ formatCurrency(bordro.payrollData?.issizlikPrimi) }}</span>
          </div>

          <!-- Gelir Vergisi -->
          <div class="col-span-2 border-b pb-2 mb-2 mt-4">
            <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Gelir Vergisi</h3>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">G.V. Matrah</span>
            <span class="font-medium">{{ formatCurrency(bordro.payrollData?.gvMatrah) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Toplam GV Matrah</span>
            <span class="font-medium">{{ formatCurrency(bordro.payrollData?.toplamGvMatrah) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Gelir Vergisi</span>
            <span class="font-medium text-red-600">{{ formatCurrency(bordro.payrollData?.gelirVergisi) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Kalan GV</span>
            <span class="font-medium">{{ formatCurrency(bordro.payrollData?.kalanGelirVergisi) }}</span>
          </div>

          <!-- Diğer Kesintiler -->
          <div class="col-span-2 border-b pb-2 mb-2 mt-4">
            <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Diğer Kesintiler</h3>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Damga Vergisi</span>
            <span class="font-medium text-red-600">{{ formatCurrency(bordro.payrollData?.damgaVergisi) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Özel Kesinti</span>
            <span class="font-medium text-red-600">{{ formatCurrency(bordro.payrollData?.ozelKesinti) }}</span>
          </div>

          <!-- Mesai -->
          <div class="col-span-2 border-b pb-2 mb-2 mt-4">
            <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Mesai</h3>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Fazla Mesai (Süre)</span>
            <span class="font-medium">{{ bordro.payrollData?.fazlaMesaiSaat || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Fazla Mesai (Tutar)</span>
            <span class="font-medium text-green-600">{{ formatCurrency(bordro.payrollData?.fazlaMesaiTutar) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Gece Mesaisi (Süre)</span>
            <span class="font-medium">{{ bordro.payrollData?.geceMesaisiSaat || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Gece Mesaisi (Tutar)</span>
            <span class="font-medium text-green-600">{{ formatCurrency(bordro.payrollData?.geceMesaisiTutar) }}</span>
          </div>
        </div>

        <!-- Net Ödeme -->
        <div class="bg-indigo-50 rounded-lg p-4 flex justify-between items-center mt-6">
          <span class="text-lg font-medium text-indigo-900">Net Ödenen</span>
          <span class="text-2xl font-bold text-indigo-600">{{ formatCurrency(bordro.payrollData?.netOdenen) }}</span>
        </div>
      </div>

      <!-- Rejection Reason (if rejected) -->
      <div v-if="bordro.status === 'rejected'" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h3 class="text-sm font-medium text-red-800 mb-2">Red Sebebi</h3>
        <p class="text-red-700">{{ bordro.rejectionReason }}</p>
        <p class="text-xs text-red-500 mt-2">
          Red Tarihi: {{ formatDate(bordro.rejectedAt) }}
        </p>
      </div>

      <!-- Approved Info -->
      <div v-if="bordro.status === 'approved'" class="bg-green-50 border border-green-200 rounded-lg p-6">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-medium text-green-900">Bordro Onaylandı</h3>
          <p class="text-green-700 mt-1">
            Onay Tarihi: {{ formatDate(bordro.employeeApprovedAt) }}
          </p>
        </div>

        <!-- Zaman Damgası Bilgisi -->
        <div v-if="bordro.timestampedAt" class="mt-4 pt-4 border-t border-green-200">
          <div class="flex items-center justify-center gap-2 text-green-700 mb-3">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">Zaman Damgası Bilgisi</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm text-green-600 mb-4">
            <div>
              <span class="text-green-500">Damga Zamanı:</span>
              <span class="ml-1 font-medium">{{ formatDate(bordro.timestampedAt) }}</span>
            </div>
            <div v-if="bordro.timestampToken?.tsaName">
              <span class="text-green-500">TSA:</span>
              <span class="ml-1 font-medium">{{ bordro.timestampToken.tsaName }}</span>
            </div>
          </div>

          <!-- PDF İndirme ve Doğrulama Butonları -->
          <div class="flex justify-center gap-3">
            <button
              @click="downloadPdf"
              :disabled="isDownloading"
              class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {{ isDownloading ? 'İndiriliyor...' : 'PDF İndir' }}
            </button>
            <button
              @click="verifyTimestamp"
              :disabled="isVerifying"
              class="flex items-center gap-2 px-4 py-2 bg-white text-green-700 border border-green-300 rounded-lg hover:bg-green-50 disabled:opacity-50"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {{ isVerifying ? 'Doğrulanıyor...' : 'Doğrula' }}
            </button>
          </div>

          <!-- Doğrulama Sonucu -->
          <div v-if="verifyResult" class="mt-4 p-3 rounded-lg" :class="verifyResult.verified ? 'bg-green-100' : 'bg-red-100'">
            <div class="flex items-center gap-2" :class="verifyResult.verified ? 'text-green-700' : 'text-red-700'">
              <svg v-if="verifyResult.verified" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span class="font-medium">
                {{ verifyResult.verified ? 'Zaman damgası doğrulandı' : 'Doğrulama başarısız' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Zaman Damgası Yoksa Sadece PDF İndir -->
        <div v-else class="mt-4 pt-4 border-t border-green-200 text-center">
          <button
            @click="downloadPdf"
            :disabled="isDownloading"
            class="flex items-center gap-2 px-4 py-2 mx-auto bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {{ isDownloading ? 'İndiriliyor...' : 'PDF İndir' }}
          </button>
        </div>
      </div>

      <!-- Company Approved - Waiting for Employee Approval -->
      <div v-if="bordro.status === 'company_approved'" class="bg-teal-50 border border-teal-200 rounded-lg p-6 text-center">
        <svg class="mx-auto h-12 w-12 text-teal-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-lg font-medium text-teal-900">Şirket Onayladı</h3>
        <p class="text-teal-700 mt-1">
          Bu bordro şirket tarafından onaylandı. Onayınızı bekliyor.
        </p>
        <p v-if="bordro.companyApprovedAt" class="text-xs text-teal-500 mt-2">
          Şirket Onay Tarihi: {{ formatDate(bordro.companyApprovedAt) }}
        </p>
      </div>

      <!-- Pending Info -->
      <div v-if="bordro.status === 'pending'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <svg class="mx-auto h-12 w-12 text-yellow-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-lg font-medium text-yellow-900">Onay Bekliyor</h3>
        <p class="text-yellow-700 mt-1">
          Bu bordro şirket yöneticisi tarafından onay bekliyor.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()

const bordro = ref(null)
const isLoading = ref(false)
const isDownloading = ref(false)
const isVerifying = ref(false)
const verifyResult = ref(null)

const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

onMounted(() => {
  loadBordro()
})

const loadBordro = async () => {
  isLoading.value = true

  try {
    const response = await api.get(`/bordro/${route.params.id}`)
    bordro.value = response.data.data || response.data
  } catch (error) {
    console.error('Bordro yüklenemedi:', error)
    alert('Bordro yüklenirken hata oluştu')
    router.back()
  } finally {
    isLoading.value = false
  }
}

const statusClass = (status) => {
  const classes = {
    pending: 'px-3 py-1 text-sm rounded-full bg-yellow-100 text-yellow-700',
    company_approved: 'px-3 py-1 text-sm rounded-full bg-teal-100 text-teal-700',
    approved: 'px-3 py-1 text-sm rounded-full bg-green-100 text-green-700',
    rejected: 'px-3 py-1 text-sm rounded-full bg-red-100 text-red-700'
  }
  return classes[status] || classes.pending
}

const statusText = (status) => {
  const texts = {
    pending: 'Onay Bekliyor',
    company_approved: 'Şirket Onaylı',
    approved: 'Onaylandı',
    rejected: 'Reddedildi'
  }
  return texts[status] || status
}

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === 0) return '-'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(value)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Zaman damgalı PDF indir
const downloadPdf = async () => {
  if (!bordro.value) return

  isDownloading.value = true
  try {
    const response = await api.get(`/bordro/${bordro.value._id}/download-pdf`, {
      responseType: 'blob'
    })

    // Blob'dan dosya indir
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    // Dosya adı
    const fileName = `Bordro_${bordro.value.employeeName}_${months[bordro.value.month - 1]}_${bordro.value.year}.pdf`
    link.setAttribute('download', fileName)

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('PDF indirme hatası:', error)
    alert('PDF indirilemedi')
  } finally {
    isDownloading.value = false
  }
}

// Zaman damgasını doğrula
const verifyTimestamp = async () => {
  if (!bordro.value) return

  isVerifying.value = true
  verifyResult.value = null

  try {
    const response = await api.get(`/bordro/${bordro.value._id}/verify-timestamp`)
    verifyResult.value = response.data.data || response.data
  } catch (error) {
    console.error('Doğrulama hatası:', error)
    verifyResult.value = { verified: false, error: error.message }
  } finally {
    isVerifying.value = false
  }
}
</script>
