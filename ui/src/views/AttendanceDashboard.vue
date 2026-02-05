<template>
  <div class="p-6">
    <!-- Baslik ve Kontroller -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
      <h1 class="text-2xl font-bold text-gray-800">Devam Takip Raporu</h1>

      <div class="flex items-center gap-4">
        <!-- Tarih Secici -->
        <div class="flex items-center gap-2">
          <button
            @click="goToPreviousDay"
            class="p-2 rounded-lg border hover:bg-gray-50"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <input
            type="date"
            v-model="selectedDate"
            class="px-4 py-2 border rounded-lg"
            @change="loadData"
          />

          <button
            @click="goToNextDay"
            class="p-2 rounded-lg border hover:bg-gray-50"
            :disabled="isToday"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Bugunme Git -->
        <button
          v-if="!isToday"
          @click="goToToday"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Bugune Git
        </button>

        <!-- Yenile -->
        <button
          @click="loadData"
          class="px-4 py-2 border rounded-lg hover:bg-gray-50"
          :disabled="loading"
        >
          <svg class="w-5 h-5" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Yukleniyor -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>

    <!-- Icerik -->
    <div v-else>
      <!-- Istatistik Kartlari -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div class="text-3xl font-bold text-blue-600">{{ stats.total }}</div>
          <div class="text-sm text-gray-600">Toplam</div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div class="text-3xl font-bold text-green-600">{{ stats.present }}</div>
          <div class="text-sm text-gray-600">Geldi</div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div class="text-3xl font-bold text-yellow-600">{{ stats.late }}</div>
          <div class="text-sm text-gray-600">Gec Kaldi</div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div class="text-3xl font-bold text-red-600">{{ stats.absent }}</div>
          <div class="text-sm text-gray-600">Gelmedi</div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div class="text-3xl font-bold text-purple-600">{{ stats.onLeave }}</div>
          <div class="text-sm text-gray-600">Izinli</div>
        </div>
      </div>

      <!-- Filtreler -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex flex-wrap items-center gap-4">
          <span class="text-sm font-medium text-gray-700">Filtrele:</span>

          <button
            @click="statusFilter = null"
            :class="[
              'px-3 py-1 rounded-full text-sm transition-colors',
              statusFilter === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Tumu ({{ stats.total }})
          </button>

          <button
            @click="statusFilter = 'PRESENT'"
            :class="[
              'px-3 py-1 rounded-full text-sm transition-colors',
              statusFilter === 'PRESENT'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Geldi ({{ stats.present }})
          </button>

          <button
            @click="statusFilter = 'LATE'"
            :class="[
              'px-3 py-1 rounded-full text-sm transition-colors',
              statusFilter === 'LATE'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Gec Kaldi ({{ stats.late }})
          </button>

          <button
            @click="statusFilter = 'ABSENT'"
            :class="[
              'px-3 py-1 rounded-full text-sm transition-colors',
              statusFilter === 'ABSENT'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Gelmedi ({{ stats.absent }})
          </button>

          <!-- Arama -->
          <div class="ml-auto">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Calisan ara..."
              class="px-4 py-1 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <!-- Tablo -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calisan
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giris
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cikis
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calisma Suresi
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gec Kalma
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erken Cikis
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fazla Mesai
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="item in filteredSummaries"
                :key="item._id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm mr-3">
                      {{ getInitials(item.employee) }}
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-900">
                        {{ item.employee?.firstName }} {{ item.employee?.lastName }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ item.employee?.employeeNumber || '-' }}
                      </div>
                    </div>
                  </div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="item.checkInTime" class="text-sm text-gray-900">
                    {{ formatTime(item.checkInTime) }}
                  </div>
                  <div v-else class="text-sm text-gray-400">-</div>
                  <div v-if="item.expectedCheckIn" class="text-xs text-gray-500">
                    Beklenen: {{ formatTime(item.expectedCheckIn) }}
                  </div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="item.checkOutTime" class="text-sm text-gray-900">
                    {{ formatTime(item.checkOutTime) }}
                  </div>
                  <div v-else class="text-sm text-gray-400">-</div>
                  <div v-if="item.expectedCheckOut" class="text-xs text-gray-500">
                    Beklenen: {{ formatTime(item.expectedCheckOut) }}
                  </div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium" :class="getWorkHoursClass(item.totalWorkMinutes)">
                    {{ formatMinutes(item.totalWorkMinutes) }}
                  </div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="item.lateMinutes > 0" class="text-sm font-medium text-yellow-600">
                    {{ item.lateMinutes }} dk
                  </div>
                  <div v-else class="text-sm text-gray-400">-</div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="item.earlyDepartureMinutes > 0" class="text-sm font-medium text-orange-600">
                    {{ item.earlyDepartureMinutes }} dk
                  </div>
                  <div v-else class="text-sm text-gray-400">-</div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="item.overtimeMinutes > 0" class="text-sm font-medium text-green-600">
                    {{ formatMinutes(item.overtimeMinutes) }}
                  </div>
                  <div v-else class="text-sm text-gray-400">-</div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStatusBadgeClass(item.status)">
                    {{ getStatusLabel(item.status) }}
                  </span>
                </td>
              </tr>

              <tr v-if="filteredSummaries.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                  <div v-if="summaries.length === 0">
                    Bu tarih icin kayit bulunmuyor
                  </div>
                  <div v-else>
                    Filtreye uyan kayit bulunamadi
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const authStore = useAuthStore()

const loading = ref(false)
const selectedDate = ref(new Date().toISOString().split('T')[0])
const summaries = ref([])
const stats = ref({
  total: 0,
  present: 0,
  late: 0,
  absent: 0,
  onLeave: 0,
  weekend: 0
})
const statusFilter = ref(null)
const searchQuery = ref('')

const isToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return selectedDate.value === today
})

const filteredSummaries = computed(() => {
  let filtered = summaries.value

  // Durum filtresi
  if (statusFilter.value) {
    filtered = filtered.filter(s => s.status === statusFilter.value)
  }

  // Arama filtresi
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(s => {
      const fullName = `${s.employee?.firstName} ${s.employee?.lastName}`.toLowerCase()
      const empNo = (s.employee?.employeeNumber || '').toLowerCase()
      return fullName.includes(query) || empNo.includes(query)
    })
  }

  return filtered
})

function goToPreviousDay() {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() - 1)
  selectedDate.value = date.toISOString().split('T')[0]
  loadData()
}

function goToNextDay() {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() + 1)
  selectedDate.value = date.toISOString().split('T')[0]
  loadData()
}

function goToToday() {
  selectedDate.value = new Date().toISOString().split('T')[0]
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    const companyId = authStore.user?.company?._id || authStore.user?.company
    if (!companyId) {
      console.error('Company ID bulunamadi')
      return
    }

    const response = await api.get(`/attendance-summary/company/${companyId}/${selectedDate.value}`)

    summaries.value = response.data.summaries || []
    stats.value = response.data.stats || {
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      onLeave: 0,
      weekend: 0
    }
  } catch (error) {
    console.error('Veri yukleme hatasi:', error)
    summaries.value = []
    stats.value = { total: 0, present: 0, late: 0, absent: 0, onLeave: 0, weekend: 0 }
  } finally {
    loading.value = false
  }
}

function formatTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function formatMinutes(minutes) {
  if (!minutes || minutes === 0) return '-'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}s ${mins}d`
  }
  return `${mins}d`
}

function getInitials(employee) {
  if (!employee) return '?'
  const first = employee.firstName?.[0] || ''
  const last = employee.lastName?.[0] || ''
  return (first + last).toUpperCase()
}

function getStatusLabel(status) {
  const labels = {
    'PRESENT': 'Geldi',
    'LATE': 'Gec Kaldi',
    'ABSENT': 'Gelmedi',
    'ON_LEAVE': 'Izinli',
    'HALF_DAY': 'Yarim Gun',
    'WEEKEND': 'Hafta Sonu',
    'HOLIDAY': 'Tatil'
  }
  return labels[status] || status
}

function getStatusBadgeClass(status) {
  const baseClass = 'px-2 py-1 text-xs font-medium rounded-full'
  const statusClasses = {
    'PRESENT': 'bg-green-100 text-green-800',
    'LATE': 'bg-yellow-100 text-yellow-800',
    'ABSENT': 'bg-red-100 text-red-800',
    'ON_LEAVE': 'bg-purple-100 text-purple-800',
    'HALF_DAY': 'bg-blue-100 text-blue-800',
    'WEEKEND': 'bg-gray-100 text-gray-800',
    'HOLIDAY': 'bg-indigo-100 text-indigo-800'
  }
  return `${baseClass} ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`
}

function getWorkHoursClass(minutes) {
  if (!minutes || minutes === 0) return 'text-gray-400'
  if (minutes < 480) return 'text-orange-600' // 8 saatten az
  return 'text-green-600' // 8 saat ve uzeri
}

onMounted(() => {
  loadData()
})
</script>
