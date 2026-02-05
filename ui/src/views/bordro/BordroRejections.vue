<template>
  <div class="max-w-6xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Reddedilen Bordrolar</h1>
      <p class="text-gray-600 mt-1">Çalışanlar tarafından itiraz edilen bordroları görüntüleyin</p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Şirket</label>
          <select
            v-model="filters.company"
            @change="loadRejections"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tümü</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }}
            </option>
          </select>
        </div>
        <div class="flex-1 min-w-[120px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Yıl</label>
          <select
            v-model="filters.year"
            @change="loadRejections"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tümü</option>
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        <div class="flex-1 min-w-[120px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Ay</label>
          <select
            v-model="filters.month"
            @change="loadRejections"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
    <div v-else-if="rejections.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">Reddedilen bordro yok</h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ filters.year || filters.month || filters.company ? 'Filtrelerinize uygun reddedilen bordro bulunamadı.' : 'Henüz reddedilen bordro bulunmuyor.' }}
      </p>
    </div>

    <!-- Rejections List -->
    <div v-else class="space-y-4">
      <div
        v-for="bordro in rejections"
        :key="bordro._id"
        class="bg-white rounded-lg shadow p-4 border-l-4 border-red-500"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-medium text-gray-900">{{ bordro.employeeName }}</h3>
              <span class="text-sm text-gray-500">{{ bordro.tcKimlik }}</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">
              {{ bordro.company?.name }} - {{ months[bordro.month - 1] }} {{ bordro.year }}
            </p>
            <div class="bg-red-50 rounded-lg p-3">
              <p class="text-sm font-medium text-red-800 mb-1">İtiraz Sebebi:</p>
              <p class="text-sm text-red-700">{{ bordro.rejectionReason }}</p>
            </div>
          </div>
          <div class="ml-4 text-right">
            <p class="text-lg font-bold text-gray-900">
              {{ formatCurrency(bordro.payrollData?.netUcret) }}
            </p>
            <p class="text-xs text-gray-500">Net Ücret</p>
            <p class="text-xs text-red-500 mt-2">
              Red: {{ formatDate(bordro.rejectedAt) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const rejections = ref([])
const companies = ref([])
const isLoading = ref(false)
const filters = ref({
  company: '',
  year: '',
  month: ''
})

const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 1, currentYear, currentYear + 1]
})

onMounted(async () => {
  await loadCompanies()
  await loadRejections()
})

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data.data || response.data || []
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  }
}

const loadRejections = async () => {
  isLoading.value = true

  try {
    const params = new URLSearchParams()
    if (filters.value.company) params.append('company', filters.value.company)
    if (filters.value.year) params.append('year', filters.value.year)
    if (filters.value.month) params.append('month', filters.value.month)

    const response = await api.get(`/bordro/rejections?${params.toString()}`)
    rejections.value = response.data.data || response.data || []
  } catch (error) {
    console.error('Reddedilenler yüklenemedi:', error)
    rejections.value = []
  } finally {
    isLoading.value = false
  }
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(value || 0)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
