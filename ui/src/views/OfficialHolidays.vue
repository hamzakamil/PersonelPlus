<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Yükleniyor...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      <p class="font-medium">Hata:</p>
      <p>{{ error }}</p>
    </div>

    <!-- Holidays Table -->
    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              #
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tarih
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tatil Adı
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="(holiday, index) in holidays" :key="holiday.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ index + 1 }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatDate(holiday.date) }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
              {{ holiday.name }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="holidays.length === 0" class="text-center py-8">
        <p class="text-gray-500">Resmi tatil bulunamadı.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(true)
const error = ref(null)
const holidays = ref([])

const formatDate = (dateString) => {
  if (!dateString) return ''
  
  // Google Calendar API returns date in YYYY-MM-DD format
  const date = new Date(dateString + 'T00:00:00')
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  
  return `${day}.${month}.${year}`
}

const loadHolidays = async () => {
  try {
    loading.value = true
    error.value = null

    // Backend API'den tüm resmi tatilleri çek (mevcut yıl)
    const currentYear = new Date().getFullYear()

    const response = await axios.get(`/api/official-holidays/${currentYear}`)

    if (response.data && response.data.data) {
      // Backend'den gelen veri formatı
      const holidayList = response.data.data
        .map(item => {
          const dateStr = item.date.split('T')[0] // YYYY-MM-DD formatına çevir
          return {
            id: item._id,
            name: item.name,
            date: dateStr
          }
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      holidays.value = holidayList
    } else {
      error.value = 'Tatil verileri bulunamadı'
    }
  } catch (err) {
    console.error('Resmi tatiller yüklenirken hata:', err)

    if (err.response?.status === 404) {
      error.value = 'Resmi tatil verisi bulunamadı.'
    } else {
      error.value = 'Resmi tatiller yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadHolidays()
})
</script>

<style scoped>
</style>

