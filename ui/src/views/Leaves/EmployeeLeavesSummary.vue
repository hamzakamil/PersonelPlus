<template>
  <div>

    <!-- Şirket Seçimi (Bayi Admin için) -->
    <div v-if="isBayiAdmin || isSuperAdmin" class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Şirket Seçiniz</label>
      <select
        v-model="selectedCompanyId"
        @change="loadSummary"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-md"
      >
        <option value="">Şirket Seçiniz</option>
        <option v-for="comp in companies" :key="comp._id" :value="comp._id">
          {{ comp.name }}
        </option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Yükleniyor...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Data Table -->
    <div v-if="!loading && summary.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <table class="w-full border-collapse">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Personel
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              İşe Giriş
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Hak Ettiği Gün
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Kullandı
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Kalan
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Sonraki Hakediş
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="e in summary" :key="e.employeeId" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-b">
              {{ e.name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b">
              {{ format(e.hireDate) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b">
              <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                {{ e.accrualDays }} gün
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b">
              <span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                {{ e.usedDays }} gün
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b">
              <span
                :class="{
                  'bg-green-100 text-green-800': e.remainingDays > 0,
                  'bg-red-100 text-red-800': e.remainingDays <= 0
                }"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ e.remainingDays }} gün
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b">
              {{ e.nextAccrualDate }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && summary.length === 0" class="bg-white rounded-lg shadow p-8 text-center">
      <p class="text-gray-500">Henüz çalışan bulunmuyor.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const authStore = useAuthStore()
const summary = ref([])
const companies = ref([])
const selectedCompanyId = ref('')
const loading = ref(false)
const error = ref(null)

const isBayiAdmin = computed(() => authStore.isBayiAdmin)
const isSuperAdmin = computed(() => authStore.isSuperAdmin)

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data?.data || response.data || []

    // Bayi'nin kendi şirketi varsa onu seç, yoksa ilk şirketi seç
    if (companies.value.length > 0) {
      if (authStore.companyId) {
        const userCompany = companies.value.find(c => c._id === authStore.companyId)
        if (userCompany) {
          selectedCompanyId.value = userCompany._id
        } else {
          selectedCompanyId.value = companies.value[0]._id
        }
      } else {
        selectedCompanyId.value = companies.value[0]._id
      }
      // Şirket seçildiğinde özeti yükle
      await loadSummary()
    }
  } catch (err) {
    console.error('Şirketler yüklenemedi:', err)
  }
}

const loadSummary = async () => {
  loading.value = true
  error.value = null

  try {
    let companyId = selectedCompanyId.value

    // Şirket admini için otomatik şirket seçimi
    if (!companyId && !isBayiAdmin.value && !isSuperAdmin.value && authStore.companyId) {
      companyId = authStore.companyId
    }

    // localStorage'dan da kontrol et (eğer varsa)
    if (!companyId) {
      const storedCompany = localStorage.getItem('selectedCompany')
      if (storedCompany) {
        companyId = storedCompany
        selectedCompanyId.value = storedCompany
      }
    }

    if (!companyId && (isBayiAdmin.value || isSuperAdmin.value)) {
      error.value = 'Lütfen bir şirket seçiniz'
      loading.value = false
      return
    }

    if (!companyId) {
      error.value = 'Şirket bilgisi bulunamadı'
      loading.value = false
      return
    }

    const response = await api.get('/leave/summary', {
      params: { companyId }
    })

    if (response.data.success) {
      summary.value = response.data.data || []
    } else {
      error.value = response.data.error || 'Özet yüklenemedi'
      summary.value = []
    }
  } catch (err) {
    console.error('Özet yükleme hatası:', err)
    error.value = err.response?.data?.error || 'Özet yüklenirken bir hata oluştu'
    summary.value = []
  } finally {
    loading.value = false
  }
}

const format = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('tr-TR')
}

onMounted(async () => {
  if (isBayiAdmin.value || isSuperAdmin.value) {
    await loadCompanies()
  } else {
    // Şirket admini için otomatik yükle
    await loadSummary()
  }
})
</script>

<style scoped>
</style>

