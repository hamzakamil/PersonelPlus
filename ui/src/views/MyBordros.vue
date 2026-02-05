<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Bordrolarım</h1>
      <p class="text-gray-600 mt-1">Maaş bordrolarınızı görüntüleyin ve onaylayın</p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-[150px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Yıl</label>
          <select
            v-model="filters.year"
            @change="loadBordros"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Tümü</option>
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        <div class="flex-1 min-w-[150px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Ay</label>
          <select
            v-model="filters.month"
            @change="loadBordros"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Tümü</option>
            <option v-for="(month, index) in months" :key="index" :value="index + 1">
              {{ month }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <!-- Empty State -->
    <div v-else-if="bordros.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">Bordro bulunamadı</h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ filters.year || filters.month ? 'Filtrelerinize uygun bordro yok.' : 'Henüz bordronuz bulunmuyor.' }}
      </p>
    </div>

    <!-- Bordro List -->
    <div v-else class="space-y-4">
      <!-- Toplam Özet -->
      <div class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-4 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-indigo-100">Toplam Net Ödenecek</p>
            <p class="text-2xl font-bold">{{ formatCurrency(totalNetAmount) }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-indigo-100">Bordro Sayısı</p>
            <p class="text-2xl font-bold">{{ bordros.length }}</p>
          </div>
        </div>
      </div>

      <div
        v-for="bordro in bordros"
        :key="bordro._id"
        class="bg-white rounded-lg shadow p-4 transition-all hover:shadow-md"
        :class="getBorderClass(bordro.status)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4 cursor-pointer" @click="viewBordro(bordro)">
            <div class="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <span class="text-lg font-bold text-indigo-600">{{ months[bordro.month - 1]?.substring(0, 1) }}</span>
            </div>
            <div>
              <h3 class="font-medium text-gray-900">
                {{ months[bordro.month - 1] }} {{ bordro.year }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ bordro.company?.name }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-lg font-bold text-gray-900">
                {{ formatCurrency(bordro.payrollData?.netOdenen) }}
              </p>
              <p class="text-xs text-gray-500">Net Ücret</p>
            </div>

            <!-- Status Badge -->
            <span :class="getStatusBadgeClass(bordro.status)">
              {{ getStatusText(bordro.status) }}
            </span>

            <!-- Action Buttons for company_approved -->
            <div v-if="bordro.status === 'company_approved'" class="flex gap-2">
              <button
                @click.stop="openApproveModal(bordro)"
                class="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                Onayla
              </button>
              <button
                @click.stop="openRejectModal(bordro)"
                class="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                İtiraz Et
              </button>
            </div>

            <!-- View Icon for approved -->
            <svg v-else class="h-5 w-5 text-gray-400 cursor-pointer" @click="viewBordro(bordro)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Approve Modal (Kod Giriş) -->
    <div v-if="showApproveModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeApproveModal"></div>

        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="text-center">
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">Bordro Onayı</h3>
              <p class="text-sm text-gray-500 mb-4">
                {{ selectedBordro ? `${months[selectedBordro.month - 1]} ${selectedBordro.year}` : '' }} bordronuzu onaylamak için email adresinize gönderilen 6 haneli kodu girin.
              </p>

              <!-- Request Code Button -->
              <div v-if="!codeRequested" class="mb-4">
                <button
                  @click="requestApprovalCode"
                  :disabled="isRequestingCode"
                  class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <span v-if="isRequestingCode">Gönderiliyor...</span>
                  <span v-else>Onay Kodu Gönder</span>
                </button>
              </div>

              <!-- Code Input -->
              <div v-else>
                <p class="text-sm text-green-600 mb-4">
                  Onay kodu {{ maskedEmail }}'e gönderildi
                </p>
                <div class="flex justify-center gap-2 mb-4">
                  <input
                    v-for="i in 6"
                    :key="i"
                    type="text"
                    maxlength="1"
                    :ref="el => { if (el) codeInputs[i-1] = el }"
                    v-model="codeDigits[i-1]"
                    @input="onCodeInput(i-1)"
                    @keydown="onCodeKeydown($event, i-1)"
                    class="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <button
                  @click="requestApprovalCode"
                  :disabled="isRequestingCode || codeRequestCooldown > 0"
                  class="text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
                >
                  {{ codeRequestCooldown > 0 ? `Yeni kod için ${codeRequestCooldown}s bekleyin` : 'Yeni kod gönder' }}
                </button>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              v-if="codeRequested"
              @click="submitApproval"
              :disabled="isApproving || approvalCode.length !== 6"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {{ isApproving ? 'Onaylanıyor...' : 'Onayla' }}
            </button>
            <button
              @click="closeApproveModal"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeRejectModal"></div>

        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="text-center">
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">Bordro İtirazı</h3>
              <p class="text-sm text-gray-500 mb-4">
                {{ selectedBordro ? `${months[selectedBordro.month - 1]} ${selectedBordro.year}` : '' }} bordronuza itiraz etmek istiyorsanız, lütfen sebebini açıklayın.
              </p>
              <textarea
                v-model="rejectReason"
                rows="4"
                placeholder="İtiraz sebebinizi yazın (en az 10 karakter)..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              ></textarea>
              <p class="text-xs text-gray-500 mt-2 text-left">
                {{ rejectReason.length }}/500 karakter
              </p>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="submitReject"
              :disabled="isRejecting || rejectReason.trim().length < 10"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {{ isRejecting ? 'Gönderiliyor...' : 'İtiraz Et' }}
            </button>
            <button
              @click="closeRejectModal"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()

const bordros = ref([])
const isLoading = ref(false)
const filters = ref({
  year: '',
  month: ''
})

// Approve Modal State
const showApproveModal = ref(false)
const selectedBordro = ref(null)
const codeRequested = ref(false)
const maskedEmail = ref('')
const codeDigits = ref(['', '', '', '', '', ''])
const codeInputs = ref([])
const isRequestingCode = ref(false)
const isApproving = ref(false)
const codeRequestCooldown = ref(0)

// Reject Modal State
const showRejectModal = ref(false)
const rejectReason = ref('')
const isRejecting = ref(false)

const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear, currentYear - 1, currentYear - 2]
})

const approvalCode = computed(() => codeDigits.value.join(''))

// Toplam net ödenecek tutar
const totalNetAmount = computed(() => {
  return bordros.value.reduce((sum, b) => sum + (b.payrollData?.netOdenen || 0), 0)
})

onMounted(() => {
  loadBordros()
})

const loadBordros = async () => {
  isLoading.value = true

  try {
    const params = new URLSearchParams()
    if (filters.value.year) params.append('year', filters.value.year)
    if (filters.value.month) params.append('month', filters.value.month)

    const response = await api.get(`/bordro/my-bordros?${params.toString()}`)
    const data = response.data.data || response.data

    bordros.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Bordrolar yüklenemedi:', error)
    bordros.value = []
  } finally {
    isLoading.value = false
  }
}

const viewBordro = (bordro) => {
  router.push(`/bordro/${bordro._id}`)
}

const getBorderClass = (status) => {
  if (status === 'company_approved') return 'border-l-4 border-amber-500'
  if (status === 'approved') return 'border-l-4 border-green-500'
  return 'border-l-4 border-gray-300'
}

const getStatusBadgeClass = (status) => {
  if (status === 'company_approved') return 'px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700'
  if (status === 'approved') return 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-700'
  return 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700'
}

const getStatusText = (status) => {
  if (status === 'company_approved') return 'Onay Bekliyor'
  if (status === 'approved') return 'Onaylandı'
  return status
}

// Approve Modal Functions
const openApproveModal = (bordro) => {
  selectedBordro.value = bordro
  showApproveModal.value = true
  codeRequested.value = false
  codeDigits.value = ['', '', '', '', '', '']
  maskedEmail.value = ''
}

const closeApproveModal = () => {
  showApproveModal.value = false
  selectedBordro.value = null
  codeRequested.value = false
  codeDigits.value = ['', '', '', '', '', '']
}

const requestApprovalCode = async () => {
  if (!selectedBordro.value) return

  isRequestingCode.value = true
  try {
    const response = await api.post(`/bordro/${selectedBordro.value._id}/request-approval-code`)
    maskedEmail.value = response.data.email || ''
    codeRequested.value = true
    codeRequestCooldown.value = 60

    // Start cooldown timer
    const timer = setInterval(() => {
      codeRequestCooldown.value--
      if (codeRequestCooldown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    // Focus first input
    setTimeout(() => {
      if (codeInputs.value[0]) {
        codeInputs.value[0].focus()
      }
    }, 100)
  } catch (error) {
    alert(error.response?.data?.message || 'Kod gönderilemedi')
  } finally {
    isRequestingCode.value = false
  }
}

const onCodeInput = (index) => {
  if (codeDigits.value[index] && index < 5) {
    codeInputs.value[index + 1]?.focus()
  }
}

const onCodeKeydown = (event, index) => {
  if (event.key === 'Backspace' && !codeDigits.value[index] && index > 0) {
    codeInputs.value[index - 1]?.focus()
  }
}

const submitApproval = async () => {
  if (approvalCode.value.length !== 6 || !selectedBordro.value) return

  isApproving.value = true
  try {
    await api.post(`/bordro/${selectedBordro.value._id}/employee-approve`, {
      code: approvalCode.value
    })
    alert('Bordronuz başarıyla onaylandı!')
    closeApproveModal()
    loadBordros()
  } catch (error) {
    alert(error.response?.data?.message || 'Onay işlemi başarısız')
    // Reset code if wrong
    if (error.response?.data?.message?.includes('Hatalı kod')) {
      codeDigits.value = ['', '', '', '', '', '']
      codeInputs.value[0]?.focus()
    }
  } finally {
    isApproving.value = false
  }
}

// Reject Modal Functions
const openRejectModal = (bordro) => {
  selectedBordro.value = bordro
  showRejectModal.value = true
  rejectReason.value = ''
}

const closeRejectModal = () => {
  showRejectModal.value = false
  selectedBordro.value = null
  rejectReason.value = ''
}

const submitReject = async () => {
  if (rejectReason.value.trim().length < 10 || !selectedBordro.value) return

  isRejecting.value = true
  try {
    await api.post(`/bordro/${selectedBordro.value._id}/employee-reject`, {
      reason: rejectReason.value.trim()
    })
    alert('İtirazınız kaydedildi ve bayiye bildirildi.')
    closeRejectModal()
    loadBordros()
  } catch (error) {
    alert(error.response?.data?.message || 'İtiraz işlemi başarısız')
  } finally {
    isRejecting.value = false
  }
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(value || 0)
}
</script>
