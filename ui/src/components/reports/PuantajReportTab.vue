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
          <label class="block text-sm font-medium text-gray-700 mb-1">Ay</label>
          <select
            v-model="filters.month"
            @change="loadReport"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tüm Aylar</option>
            <option value="1">Ocak</option>
            <option value="2">Şubat</option>
            <option value="3">Mart</option>
            <option value="4">Nisan</option>
            <option value="5">Mayıs</option>
            <option value="6">Haziran</option>
            <option value="7">Temmuz</option>
            <option value="8">Ağustos</option>
            <option value="9">Eylül</option>
            <option value="10">Ekim</option>
            <option value="11">Kasım</option>
            <option value="12">Aralık</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Departman</label>
          <select
            v-model="filters.department"
            @change="loadReport"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tüm Departmanlar</option>
            <option v-for="dept in departments" :key="dept._id" :value="dept._id">
              {{ dept.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Özet Kartlar -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam Çalışan</div>
        <div class="text-2xl font-bold text-gray-800">{{ summary.totalEmployees }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam Çalışma Günü</div>
        <div class="text-2xl font-bold text-blue-600">{{ summary.totalWorkDays }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam Fazla Mesai</div>
        <div class="text-2xl font-bold text-orange-600">{{ summary.totalOvertime }} saat</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam İzin Günü</div>
        <div class="text-2xl font-bold text-green-600">{{ summary.totalLeaveDays }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam Devamsızlık</div>
        <div class="text-2xl font-bold text-red-600">{{ summary.totalAbsenceDays }}</div>
      </div>
    </div>

    <!-- Rapor Tablosu -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departman</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışma Günü</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fazla Mesai (saat)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İzin Günü</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devamsızlık</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in reportData" :key="item.employee._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ item.employee.firstName }} {{ item.employee.lastName }}
              <div class="text-xs text-gray-500">{{ item.employee.employeeNumber }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.department?.name || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.workDays }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ (item.overtime || 0).toFixed(2) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.leaveDays }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span :class="item.absenceDays > 0 ? 'text-red-600 font-medium' : ''">
                {{ item.absenceDays }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                @click="viewDetails(item)"
                class="text-blue-600 hover:text-blue-900"
              >
                Detay
              </button>
            </td>
          </tr>
          <tr v-if="reportData.length === 0">
            <td colspan="7" class="px-6 py-8 text-center text-gray-500">
              Seçilen filtrelere uygun puantaj kaydı bulunamadı.
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
  totalEmployees: 0,
  totalWorkDays: 0,
  totalOvertime: 0,
  totalLeaveDays: 0,
  totalAbsenceDays: 0
})

const filters = ref({
  company: '',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  department: ''
})

const companies = ref([])
const departments = ref([])

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
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
    companies.value = []
  }
}

const loadDepartments = async () => {
  try {
    const params = filters.value.company ? { company: filters.value.company } : {}
    const response = await api.get('/departments', { params })
    departments.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error)
    departments.value = []
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

    if (filters.value.month) {
      params.month = filters.value.month
    }

    if (filters.value.department) {
      params.department = filters.value.department
    }

    const response = await api.get('/puantaj/reports/summary', { params })

    if (response.data?.success !== false) {
      reportData.value = response.data?.data || []
      summary.value = response.data?.summary || {
        totalEmployees: 0,
        totalWorkDays: 0,
        totalOvertime: 0,
        totalLeaveDays: 0,
        totalAbsenceDays: 0
      }
    }
  } catch (error) {
    console.error('Puantaj raporu yüklenemedi:', error)
    reportData.value = []
    summary.value = {
      totalEmployees: 0,
      totalWorkDays: 0,
      totalOvertime: 0,
      totalLeaveDays: 0,
      totalAbsenceDays: 0
    }
  }
}

const exportReport = async (format) => {
  toast.info(`${format.toUpperCase()} export özelliği yakında eklenecek`)
}

const viewDetails = (item) => {
  toast.info('Detay görüntüleme özelliği yakında eklenecek')
}

onMounted(async () => {
  if (canSelectCompany.value) {
    await loadCompanies()
  }
  await loadDepartments()
  await loadReport()
})
</script>
