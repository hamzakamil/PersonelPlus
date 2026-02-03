<template>
  <div class="p-6">
    <div class="flex justify-end items-center mb-6">
      <div class="flex gap-2">
        <Button variant="secondary" @click="exportReport('csv')">CSV İndir</Button>
        <Button variant="secondary" @click="exportReport('json')">JSON İndir</Button>
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
        <div class="text-sm text-gray-500">Toplam Hak Edilen Gün</div>
        <div class="text-2xl font-bold text-blue-600">{{ summary.totalEntitledDays }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam Kullanılan Gün</div>
        <div class="text-2xl font-bold text-orange-600">{{ summary.totalUsedDays }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam Kalan Gün</div>
        <div class="text-2xl font-bold text-green-600">{{ summary.totalRemainingDays }}</div>
      </div>
    </div>

    <!-- Rapor Tablosu -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hak Edilen</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanılan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Kullanılan Gün</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Kullanılan Saat</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İzin Sayısı</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in reportData" :key="item.employee._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ item.employee.firstName }} {{ item.employee.lastName }}
              <div class="text-xs text-gray-500 no-uppercase">{{ item.employee.email }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.entitledDays }} gün
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.usedDays }} gün
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span :class="item.remainingDays < 0 ? 'text-red-600 font-bold' : 'text-green-600'">
                {{ item.remainingDays }} gün
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.totalUsedDays.toFixed(2) }} gün
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.totalUsedHours.toFixed(2) }} saat
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.leaveCount }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                @click="viewEmployeeDetails(item)"
                class="text-blue-600 hover:text-blue-900"
              >
                Detay
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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

          <div v-if="selectedEmployee.typeUsage && selectedEmployee.typeUsage.length > 0">
            <h3 class="font-bold mb-2">İzin Türü Bazlı Kullanım:</h3>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">İzin Türü</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gün</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Saat</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sayı</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="(usage, index) in selectedEmployee.typeUsage" :key="index">
                  <td class="px-4 py-2 text-sm text-gray-900">{{ usage.type }}</td>
                  <td class="px-4 py-2 text-sm text-gray-500">{{ usage.days.toFixed(2) }} gün</td>
                  <td class="px-4 py-2 text-sm text-gray-500">{{ usage.hours.toFixed(2) }} saat</td>
                  <td class="px-4 py-2 text-sm text-gray-500">{{ usage.count }} adet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <Button variant="secondary" @click="showDetailModal = false">Kapat</Button>
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
import Button from '@/components/Button.vue'

const authStore = useAuthStore()
const toast = useToastStore()
const reportData = ref([])
const summary = ref({
  totalEmployees: 0,
  totalEntitledDays: 0,
  totalUsedDays: 0,
  totalRemainingDays: 0,
  totalUsedHours: 0
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

    // Bayi'nin kendi şirketi varsa onu seç, yoksa ilk şirketi seç
    if (companies.value.length > 0) {
      if (authStore.companyId) {
        const userCompany = companies.value.find(c => c._id === authStore.companyId)
        if (userCompany) {
          filters.value.company = userCompany._id
        } else {
          filters.value.company = companies.value[0]._id
        }
      } else {
        filters.value.company = companies.value[0]._id
      }
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
        totalUsedHours: 0
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
      totalUsedHours: 0
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

<style scoped>
</style>

