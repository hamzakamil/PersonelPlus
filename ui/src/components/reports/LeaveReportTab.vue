<template>
  <div>
    <div class="flex justify-end items-center mb-6">
      <div class="flex gap-2">
        <button
          @click="exportReport('csv')"
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          CSV İndir
        </button>
        <button
          @click="exportReport('json')"
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          JSON İndir
        </button>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="mb-4 bg-white p-4 rounded-lg shadow">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div v-if="canSelectCompany">
          <label class="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
          <select
            v-model="filters.company"
            @change="loadReport"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tüm Şirketler</option>
            <option v-for="comp in companies" :key="comp._id" :value="comp._id">
              {{ comp.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Yıl</label>
          <input
            v-model="filters.year"
            type="number"
            @change="loadReport"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
          <input
            v-model="filters.startDate"
            type="date"
            @change="loadReport"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
          <input
            v-model="filters.endDate"
            type="date"
            @change="loadReport"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Özet Kartlar -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam Çalışan</div>
        <div class="text-2xl font-bold text-gray-800">{{ summary.totalEmployees }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Yıllık İzin - Hak Edilen</div>
        <div class="text-2xl font-bold text-blue-600">{{ summary.totalEntitledDays }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Yıllık İzin - Kullanılan</div>
        <div class="text-2xl font-bold text-orange-600">{{ summary.totalUsedDays }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Yıllık İzin - Kalan</div>
        <div class="text-2xl font-bold text-green-600">{{ summary.totalRemainingDays }}</div>
      </div>
    </div>

    <!-- İzin Türü Bazlı Özet -->
    <div v-if="summary.leaveTypes && summary.leaveTypes.length > 0" class="bg-white rounded-lg shadow p-4 mb-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">İzin Türü Bazlı Özet</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div
          v-for="lt in summary.leaveTypes"
          :key="lt.type"
          class="p-3 rounded-lg"
          :class="lt.isAnnualLeave ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'"
        >
          <div class="text-xs text-gray-500 truncate" :title="lt.type">{{ lt.type }}</div>
          <div v-if="lt.isAnnualLeave" class="text-sm">
            <span class="text-blue-600 font-semibold">{{ lt.totalEntitled }}</span>
            <span class="text-gray-400 mx-1">/</span>
            <span class="text-orange-600">{{ lt.totalUsedDays.toFixed(1) }}</span>
            <span class="text-gray-400 mx-1">/</span>
            <span class="text-green-600 font-semibold">{{ lt.totalRemaining }}</span>
          </div>
          <div v-else class="text-lg font-bold text-gray-800">
            {{ lt.totalUsedDays.toFixed(1) }} <span class="text-xs font-normal text-gray-500">gün</span>
          </div>
        </div>
      </div>
      <div class="text-xs text-gray-400 mt-2">* Yıllık izin: Hak Edilen / Kullanılan / Kalan</div>
    </div>

    <!-- Rapor Tablosu -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th rowspan="2" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Çalışan</th>
              <th colspan="3" class="px-4 py-2 text-center text-xs font-medium text-blue-600 uppercase tracking-wider bg-blue-50 border-b border-r">Yıllık İzin</th>
              <th v-for="lt in otherLeaveTypes" :key="lt" class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100 border-b border-r">
                {{ lt }}
              </th>
              <th rowspan="2" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-50 border-r">Toplam Kullanım</th>
              <th rowspan="2" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
            </tr>
            <tr>
              <th class="px-3 py-2 text-center text-xs font-medium text-blue-500 bg-blue-50 border-r">Hak</th>
              <th class="px-3 py-2 text-center text-xs font-medium text-orange-500 bg-blue-50 border-r">Kullanılan</th>
              <th class="px-3 py-2 text-center text-xs font-medium text-green-500 bg-blue-50 border-r">Kalan</th>
              <th v-for="lt in otherLeaveTypes" :key="'sub-' + lt" class="px-3 py-2 text-center text-xs font-medium text-gray-400 bg-gray-100 border-r">Kullanılan</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in reportData" :key="item.employee._id" class="hover:bg-gray-50">
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r">
                <div class="font-medium">{{ item.employee.firstName }} {{ item.employee.lastName }}</div>
                <div class="text-xs text-gray-500">{{ item.employee.email }}</div>
              </td>
              <!-- Yıllık İzin -->
              <td class="px-3 py-3 whitespace-nowrap text-sm text-center text-blue-600 font-semibold bg-blue-50/30 border-r">
                {{ item.entitledDays }}
              </td>
              <td class="px-3 py-3 whitespace-nowrap text-sm text-center text-orange-600 bg-blue-50/30 border-r">
                {{ item.usedDays }}
              </td>
              <td class="px-3 py-3 whitespace-nowrap text-sm text-center font-semibold bg-blue-50/30 border-r"
                  :class="item.remainingDays < 0 ? 'text-red-600' : 'text-green-600'">
                {{ item.remainingDays }}
              </td>
              <!-- Diğer İzin Türleri -->
              <td v-for="lt in otherLeaveTypes" :key="'val-' + lt + '-' + item.employee._id"
                  class="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-600 border-r">
                {{ getLeaveTypeUsage(item, lt) }}
              </td>
              <!-- Toplam Kullanım -->
              <td class="px-3 py-3 whitespace-nowrap text-sm text-center font-semibold text-orange-700 bg-orange-50/30 border-r">
                {{ item.totalUsedDays.toFixed(1) }} gün
                <span v-if="item.totalUsedHours > 0" class="text-xs text-gray-500 block">+ {{ item.totalUsedHours.toFixed(1) }} saat</span>
              </td>
              <td class="px-3 py-3 whitespace-nowrap text-sm text-center">
                <button
                  @click="viewEmployeeDetails(item)"
                  class="text-blue-600 hover:text-blue-900 font-medium"
                >
                  Detay
                </button>
              </td>
            </tr>
            <!-- Toplam Satırı -->
            <tr v-if="reportData.length > 0" class="bg-gray-100 font-bold">
              <td class="px-4 py-3 text-sm text-gray-700 border-r">TOPLAM</td>
              <td class="px-3 py-3 text-sm text-center text-blue-700 bg-blue-100 border-r">{{ summary.totalEntitledDays }}</td>
              <td class="px-3 py-3 text-sm text-center text-orange-700 bg-blue-100 border-r">{{ summary.totalUsedDays }}</td>
              <td class="px-3 py-3 text-sm text-center text-green-700 bg-blue-100 border-r">{{ summary.totalRemainingDays }}</td>
              <td v-for="lt in otherLeaveTypes" :key="'total-' + lt" class="px-3 py-3 text-sm text-center text-gray-700 border-r">
                {{ getLeaveTypeTotalUsage(lt) }}
              </td>
              <td class="px-3 py-3 text-sm text-center text-orange-800 bg-orange-100 border-r">
                {{ totalAllUsedDays.toFixed(1) }} gün
              </td>
              <td class="px-3 py-3"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Çalışan Detay Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">
          {{ selectedEmployee?.employee?.firstName }} {{ selectedEmployee?.employee?.lastName }} - İzin Detayları
        </h2>

        <div v-if="selectedEmployee" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <strong>Hak Edilen Gün:</strong> {{ selectedEmployee.entitledDays }} gün
            </div>
            <div>
              <strong>Kullanılan Gün:</strong> {{ selectedEmployee.usedDays }} gün
            </div>
            <div>
              <strong>Kalan Gün:</strong>
              <span :class="selectedEmployee.remainingDays < 0 ? 'text-red-600 font-bold' : 'text-green-600'">
                {{ selectedEmployee.remainingDays }} gün
              </span>
            </div>
            <div>
              <strong>Toplam Kullanılan Saat:</strong> {{ selectedEmployee.totalUsedHours.toFixed(2) }} saat
            </div>
          </div>

          <div v-if="selectedEmployee.leaveTypeBreakdown && selectedEmployee.leaveTypeBreakdown.length > 0">
            <h3 class="font-bold mb-2">İzin Türü Bazlı Kullanım:</h3>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">İzin Türü</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Hak Edilen</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Kullanılan</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Kalan</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Sayı</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="(usage, index) in selectedEmployee.leaveTypeBreakdown" :key="index"
                    :class="usage.isAnnualLeave ? 'bg-blue-50' : ''">
                  <td class="px-4 py-2 text-sm text-gray-900 font-medium">{{ usage.type }}</td>
                  <td class="px-4 py-2 text-sm text-center"
                      :class="usage.entitledDays !== null ? 'text-blue-600 font-semibold' : 'text-gray-400'">
                    {{ usage.entitledDays !== null ? usage.entitledDays + ' gün' : '-' }}
                  </td>
                  <td class="px-4 py-2 text-sm text-center text-orange-600">
                    {{ usage.usedDays.toFixed(1) }} gün
                    <span v-if="usage.usedHours > 0" class="text-xs text-gray-500">(+ {{ usage.usedHours.toFixed(1) }} saat)</span>
                  </td>
                  <td class="px-4 py-2 text-sm text-center"
                      :class="usage.remainingDays !== null ? (usage.remainingDays < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-semibold') : 'text-gray-400'">
                    {{ usage.remainingDays !== null ? usage.remainingDays + ' gün' : '-' }}
                  </td>
                  <td class="px-4 py-2 text-sm text-center text-gray-500">{{ usage.count }} adet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            @click="showDetailModal = false"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const authStore = useAuthStore()
const toast = useToastStore()
const reportData = ref([])
const summary = ref({
  totalEmployees: 0,
  totalEntitledDays: 0,
  totalUsedDays: 0,
  totalRemainingDays: 0,
  totalUsedHours: 0,
  leaveTypes: [],
  allLeaveTypes: []
})

const filters = ref({
  company: '',
  year: new Date().getFullYear(),
  startDate: '',
  endDate: ''
})

const companies = ref([])
const showDetailModal = ref(false)
const selectedEmployee = ref(null)

const canSelectCompany = computed(() => {
  return authStore.hasAnyRole('super_admin', 'bayi_admin')
})

// Yıllık izin dışındaki izin türleri
const otherLeaveTypes = computed(() => {
  if (!summary.value.leaveTypes) return []
  return summary.value.leaveTypes
    .filter(lt => !lt.isAnnualLeave)
    .map(lt => lt.type)
})

// Toplam tüm izin kullanımı
const totalAllUsedDays = computed(() => {
  return reportData.value.reduce((sum, r) => sum + r.totalUsedDays, 0)
})

// Çalışanın belirli izin türü kullanımını getir
const getLeaveTypeUsage = (item, leaveType) => {
  if (!item.leaveTypeBreakdown) return '-'
  const usage = item.leaveTypeBreakdown.find(lt => lt.type === leaveType)
  if (!usage || usage.usedDays === 0) return '-'
  return usage.usedDays.toFixed(1)
}

// İzin türünün toplam kullanımını getir
const getLeaveTypeTotalUsage = (leaveType) => {
  if (!summary.value.leaveTypes) return '-'
  const lt = summary.value.leaveTypes.find(t => t.type === leaveType)
  if (!lt || lt.totalUsedDays === 0) return '-'
  return lt.totalUsedDays.toFixed(1)
}

const loadCompanies = async () => {
  try {
    if (authStore.isBayiAdmin) {
      const response = await api.get('/companies', {
        params: { dealer: authStore.dealerId }
      })
      companies.value = response.data?.data || response.data || []
    } else if (authStore.isSuperAdmin) {
      const response = await api.get('/companies')
      companies.value = response.data?.data || response.data || []
    }
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
    companies.value = []
  }
}

const loadReport = async () => {
  try {
    const params = {}

    if (filters.value.company) {
      params.company = filters.value.company
    }

    if (filters.value.year) {
      params.year = filters.value.year
    }

    if (filters.value.startDate) {
      params.startDate = filters.value.startDate
    }

    if (filters.value.endDate) {
      params.endDate = filters.value.endDate
    }

    const response = await api.get('/leave-requests/reports/summary', { params })

    if (response.data?.success !== false) {
      reportData.value = response.data?.data || []
      summary.value = response.data?.summary || {
        totalEmployees: 0,
        totalEntitledDays: 0,
        totalUsedDays: 0,
        totalRemainingDays: 0,
        totalUsedHours: 0,
        leaveTypes: [],
        allLeaveTypes: []
      }
    }
  } catch (error) {
    console.error('Rapor yüklenemedi:', error)
    reportData.value = []
    summary.value = {
      totalEmployees: 0,
      totalEntitledDays: 0,
      totalUsedDays: 0,
      totalRemainingDays: 0,
      totalUsedHours: 0,
      leaveTypes: [],
      allLeaveTypes: []
    }
  }
}

const exportReport = async (format) => {
  try {
    const params = new URLSearchParams()

    if (filters.value.company) {
      params.append('company', filters.value.company)
    }

    if (filters.value.year) {
      params.append('year', filters.value.year)
    }

    if (filters.value.startDate) {
      params.append('startDate', filters.value.startDate)
    }

    if (filters.value.endDate) {
      params.append('endDate', filters.value.endDate)
    }

    params.append('format', format)

    const response = await api.get(`/leave-requests/reports/export?${params.toString()}`, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `izin-raporu-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'json'}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.success('Rapor başarıyla indirildi')
  } catch (error) {
    console.error('Rapor indirilemedi:', error)
    toast.error(error.response?.data?.message || 'Rapor indirilirken hata oluştu')
  }
}

const viewEmployeeDetails = (item) => {
  selectedEmployee.value = item
  showDetailModal.value = true
}

onMounted(async () => {
  if (canSelectCompany.value) {
    await loadCompanies()
  }
  await loadReport()
})
</script>
