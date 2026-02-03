<template>
  <div>
    <div class="flex justify-end items-center mb-6">
      <div class="flex gap-2">
        <button
          @click="exportReport('excel')"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          Excel İndir
        </button>
        <button
          @click="exportReport('pdf')"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          PDF İndir
        </button>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="mb-4 bg-white p-4 rounded-lg shadow">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          <label class="block text-sm font-medium text-gray-700 mb-1">İşlem Türü</label>
          <select
            v-model="filters.processType"
            @change="loadReport"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="hire">İşe Giriş</option>
            <option value="termination">İşten Çıkış</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select
            v-model="filters.status"
            @change="loadReport"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="PENDING">Bekliyor</option>
            <option value="APPROVED">Onaylandı</option>
            <option value="CANCELLED">İptal</option>
            <option value="REVISION_REQUESTED">Düzeltme Bekleniyor</option>
          </select>
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
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam İşlem</div>
        <div class="text-2xl font-bold text-gray-800">{{ summary.total }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">İşe Giriş</div>
        <div class="text-2xl font-bold text-green-600">{{ summary.hireCount }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">İşten Çıkış</div>
        <div class="text-2xl font-bold text-red-600">{{ summary.terminationCount }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Onaylanan</div>
        <div class="text-2xl font-bold text-blue-600">{{ summary.approvedCount }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Bekleyen</div>
        <div class="text-2xl font-bold text-orange-600">{{ summary.pendingCount }}</div>
      </div>
    </div>

    <!-- Rapor Tablosu -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TCKN</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şirket</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem Türü</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talep Tarihi</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onay Tarihi</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in reportData" :key="item._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatDate(item.processType === 'hire' ? item.hireDate : item.terminationDate) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ getEmployeeName(item) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
              {{ getTCKN(item) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.companyId?.name || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span :class="item.processType === 'hire' ? 'text-green-600' : 'text-red-600'">
                {{ item.processType === 'hire' ? '📥 İşe Giriş' : '📤 İşten Çıkış' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getStatusClass(item.status)" class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full">
                {{ getStatusLabel(item.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDateTime(item.createdAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.approvedAt ? formatDateTime(item.approvedAt) : '-' }}
            </td>
          </tr>
          <tr v-if="reportData.length === 0">
            <td colspan="8" class="px-6 py-8 text-center text-gray-500">
              Seçilen filtrelere uygun kayıt bulunamadı.
            </td>
          </tr>
        </tbody>
      </table>
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
  total: 0,
  hireCount: 0,
  terminationCount: 0,
  approvedCount: 0,
  pendingCount: 0
})

const filters = ref({
  company: '',
  processType: '',
  status: '',
  startDate: '',
  endDate: ''
})

const companies = ref([])

const canSelectCompany = computed(() => {
  const role = authStore.user?.role?.name || authStore.user?.role
  return ['super_admin', 'bayi_admin'].includes(role)
})

const loadCompanies = async () => {
  try {
    const role = authStore.user?.role?.name || authStore.user?.role
    const dealerId = authStore.user?.dealer?._id || authStore.user?.dealer

    if (role === 'bayi_admin') {
      const response = await api.get('/companies', {
        params: { dealer: dealerId }
      })
      companies.value = response.data?.data || response.data || []
    } else if (role === 'super_admin') {
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

    if (filters.value.processType) {
      params.processType = filters.value.processType
    }

    if (filters.value.status) {
      params.status = filters.value.status
    }

    if (filters.value.startDate) {
      params.startDate = filters.value.startDate
    }

    if (filters.value.endDate) {
      params.endDate = filters.value.endDate
    }

    const response = await api.get('/employment/reports/summary', { params })
    const responseData = response.data?.data !== undefined ? response.data : response.data

    if (response.data?.success !== false) {
      reportData.value = response.data?.data || []
      summary.value = response.data?.summary || {
        total: 0,
        hireCount: 0,
        terminationCount: 0,
        approvedCount: 0,
        pendingCount: 0
      }
    }
  } catch (error) {
    console.error('İşe giriş/çıkış raporu yüklenemedi:', error)
    reportData.value = []
    summary.value = {
      total: 0,
      hireCount: 0,
      terminationCount: 0,
      approvedCount: 0,
      pendingCount: 0
    }
  }
}

const getEmployeeName = (record) => {
  if (record.processType === 'hire') {
    return record.candidateFullName || '-'
  } else {
    const emp = record.employeeId
    return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '-'
  }
}

const getTCKN = (record) => {
  if (record.processType === 'hire') {
    return record.tcKimlikNo || '-'
  } else {
    return record.employeeId?.tcKimlik || '-'
  }
}

const getStatusLabel = (status) => {
  const labels = {
    'PENDING': 'Bekliyor',
    'APPROVED': 'Onaylandı',
    'CANCELLED': 'İptal',
    'REVISION_REQUESTED': 'Düzeltme'
  }
  return labels[status] || status
}

const getStatusClass = (status) => {
  const classes = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'APPROVED': 'bg-green-100 text-green-800',
    'CANCELLED': 'bg-red-100 text-red-800',
    'REVISION_REQUESTED': 'bg-orange-100 text-orange-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('tr-TR')
}

const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('tr-TR')
}

const exportReport = async (format) => {
  toast.info(`${format.toUpperCase()} export özelliği yakında eklenecek`)
}

onMounted(async () => {
  if (canSelectCompany.value) {
    await loadCompanies()
  }
  await loadReport()
})
</script>
