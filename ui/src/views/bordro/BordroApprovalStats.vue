<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Bordro Onay İstatistikleri</h1>
      <p class="text-gray-600 mt-1">Çalışan bordro onay durumlarını takip edin</p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Şirket</label>
          <select
            v-model="filters.company"
            @change="loadStats"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tüm Şirketler</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }}
            </option>
          </select>
        </div>
        <div class="flex-1 min-w-[120px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Yıl</label>
          <select
            v-model="filters.year"
            @change="loadStats"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        <div class="flex-1 min-w-[120px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Ay</label>
          <select
            v-model="filters.month"
            @change="loadStats"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tüm Aylar</option>
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

    <template v-else>
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-3xl font-bold text-gray-900">{{ stats.total }}</div>
          <div class="text-sm text-gray-500">Toplam</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
          <div class="text-3xl font-bold text-gray-600">{{ stats.pending }}</div>
          <div class="text-sm text-gray-500">Beklemede</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div class="text-3xl font-bold text-blue-600">{{ stats.notified + stats.viewed }}</div>
          <div class="text-sm text-gray-500">Bildirildi</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div class="text-3xl font-bold text-green-600">{{ stats.approved }}</div>
          <div class="text-sm text-gray-500">Onaylandı</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div class="text-3xl font-bold text-red-600">{{ stats.rejected }}</div>
          <div class="text-sm text-gray-500">Reddedildi</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Onay Durumu</h2>
        <div class="h-8 bg-gray-200 rounded-full overflow-hidden flex">
          <div
            v-if="stats.approved > 0"
            class="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
            :style="{ width: `${(stats.approved / stats.total) * 100}%` }"
          >
            {{ Math.round((stats.approved / stats.total) * 100) }}%
          </div>
          <div
            v-if="stats.rejected > 0"
            class="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
            :style="{ width: `${(stats.rejected / stats.total) * 100}%` }"
          >
            {{ Math.round((stats.rejected / stats.total) * 100) }}%
          </div>
          <div
            v-if="stats.notified + stats.viewed > 0"
            class="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
            :style="{ width: `${((stats.notified + stats.viewed) / stats.total) * 100}%` }"
          >
          </div>
          <div
            v-if="stats.pending > 0"
            class="bg-gray-400 flex items-center justify-center text-white text-xs font-medium"
            :style="{ width: `${(stats.pending / stats.total) * 100}%` }"
          >
          </div>
        </div>
        <div class="flex justify-between mt-2 text-xs text-gray-500">
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded bg-green-500"></span> Onaylandı
          </span>
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded bg-red-500"></span> Reddedildi
          </span>
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded bg-blue-500"></span> Bekliyor
          </span>
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded bg-gray-400"></span> Bildirilmedi
          </span>
        </div>
      </div>

      <!-- Rejection Link -->
      <div v-if="stats.rejected > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <svg class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span class="text-red-700 font-medium">
              {{ stats.rejected }} adet reddedilen bordro var
            </span>
          </div>
          <router-link
            to="/bordro-rejections"
            class="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Detayları Gör →
          </router-link>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const stats = ref({
  total: 0,
  pending: 0,
  notified: 0,
  viewed: 0,
  approved: 0,
  rejected: 0
})
const companies = ref([])
const isLoading = ref(false)
const filters = ref({
  company: '',
  year: new Date().getFullYear(),
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
  await loadStats()
})

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data.data || response.data || []
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  }
}

const loadStats = async () => {
  isLoading.value = true

  try {
    const params = new URLSearchParams()
    if (filters.value.company) params.append('company', filters.value.company)
    if (filters.value.year) params.append('year', filters.value.year)
    if (filters.value.month) params.append('month', filters.value.month)

    const response = await api.get(`/bordro/stats?${params.toString()}`)
    stats.value = response.data.data || response.data || stats.value
  } catch (error) {
    console.error('İstatistikler yüklenemedi:', error)
  } finally {
    isLoading.value = false
  }
}
</script>
