<template>
  <div>

    <!-- Çalışan Seçimi -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Çalışan Seçin <span class="text-red-500">*</span>
      </label>
      <select
        v-model="selectedEmployeeId"
        @change="loadCalculation"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        :disabled="loading"
      >
        <option value="">Seçiniz</option>
        <option
          v-for="emp in employees"
          :key="emp._id"
          :value="emp._id"
        >
          {{ emp.firstName }} {{ emp.lastName }} {{ emp.employeeNumber ? `(${emp.employeeNumber})` : '' }}
        </option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Hesaplanıyor...</p>
    </div>

    <!-- Hesaplama Sonuçları -->
    <div v-if="calculationResult && !loading" class="space-y-6">
      <!-- Hakediş Bilgileri -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">İzin Hakediş Bilgileri</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-blue-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">Kıdem Yılı</p>
            <p class="text-2xl font-bold text-blue-700">{{ calculationResult.seniorityYears }} yıl</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">Yaş</p>
            <p class="text-2xl font-bold text-green-700">{{ calculationResult.age || 'Belirtilmemiş' }}</p>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg col-span-2">
            <p class="text-sm text-gray-600 mb-1">Hakediş İzin Günü</p>
            <p class="text-3xl font-bold text-purple-700">{{ calculationResult.leaveDays }} gün</p>
          </div>
        </div>
      </div>

      <!-- Şirket Politikası -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Şirket İzin Politikası</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span class="text-gray-700">Parçalı Kullanım İzni</span>
            <span
              :class="calculationResult.policy?.allowSplitLeave ? 'text-green-600' : 'text-red-600'"
              class="font-semibold"
            >
              {{ calculationResult.policy?.allowSplitLeave ? 'Evet' : 'Hayır' }}
            </span>
          </div>
          <div v-if="calculationResult.policy?.allowSplitLeave" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span class="text-gray-700">İlk Blok Minimum Gün</span>
            <span class="font-semibold text-gray-800">
              {{ calculationResult.policy?.minFirstBlockDays || 10 }} gün
            </span>
          </div>
        </div>
        <p class="text-sm text-gray-500 mt-4">
          <strong>Not:</strong> Şirket ayarları ekranından bu politikaları düzenleyebilirsiniz.
        </p>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const authStore = useAuthStore()
const employees = ref([])
const selectedEmployeeId = ref('')
const calculationResult = ref(null)
const loading = ref(false)
const error = ref(null)

const loadEmployees = async () => {
  try {
    let response
    if (authStore.hasRole('employee')) {
      const empResponse = await api.get('/employees')
      const empData = empResponse.data?.data || empResponse.data || []
      const emp = empData.find(e => e.email === authStore.user.email)
      if (emp) {
        employees.value = [emp]
        selectedEmployeeId.value = emp._id
        await loadCalculation()
      }
    } else if (authStore.hasAnyRole('company_admin', 'resmi_muhasebe_ik')) {
      response = await api.get('/employees', {
        params: { company: authStore.companyId }
      })
      employees.value = response.data?.data || response.data || []
    } else if (authStore.isBayiAdmin) {
      response = await api.get('/employees')
      employees.value = response.data?.data || response.data || []
    }
  } catch (err) {
    console.error('Çalışanlar yüklenemedi:', err)
    error.value = 'Çalışanlar yüklenemedi'
  }
}

const loadCalculation = async () => {
  if (!selectedEmployeeId.value) {
    calculationResult.value = null
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await api.get(`/leave/calculate/${selectedEmployeeId.value}`)
    if (response.data.success) {
      calculationResult.value = response.data.data
    } else {
      error.value = response.data.error || 'Hesaplama yapılamadı'
    }
  } catch (err) {
    console.error('Hesaplama hatası:', err)
    error.value = err.response?.data?.error || 'Hesaplama yapılırken bir hata oluştu'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadEmployees()
})
</script>

<style scoped>
</style>

