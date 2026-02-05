<template>
  <div class="max-w-6xl mx-auto">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Bordro Yükleme Geçmişi</h1>
        <p class="text-gray-600 mt-1">Yüklenen bordro dosyalarını görüntüleyin</p>
      </div>
      <router-link
        to="/bordro-upload"
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Yeni Yükleme
      </router-link>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Şirket</label>
          <select
            v-model="filters.company"
            @change="loadUploads"
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
            @change="loadUploads"
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
            @change="loadUploads"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tümü</option>
            <option v-for="(month, index) in months" :key="index" :value="index + 1">
              {{ month }}
            </option>
          </select>
        </div>
        <div class="flex-1 min-w-[120px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Durum</label>
          <select
            v-model="filters.status"
            @change="loadUploads"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tümü</option>
            <option value="completed">Tamamlandı</option>
            <option value="partial">Kısmi</option>
            <option value="failed">Başarısız</option>
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
    <div v-else-if="uploads.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">Yükleme bulunamadı</h3>
      <p class="mt-1 text-sm text-gray-500">Henüz bordro yüklemesi yapılmamış.</p>
      <router-link
        to="/bordro-upload"
        class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        İlk Yüklemeyi Yap
      </router-link>
    </div>

    <!-- Uploads Table -->
    <div v-else class="bg-white rounded-lg shadow">
      <table class="w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dönem</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Şirket</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Dosya</th>
            <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">OK</th>
            <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Hata</th>
            <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Tarih</th>
            <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase w-12">Sil</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="upload in uploads" :key="upload._id" class="hover:bg-gray-50">
            <td class="px-3 py-2 whitespace-nowrap">
              <span class="font-medium text-gray-900 text-sm">{{ months[upload.month - 1].substring(0, 3) }} {{ upload.year }}</span>
            </td>
            <td class="px-3 py-2 text-sm text-gray-600 max-w-[180px]">
              <span class="truncate block" :title="upload.company?.name">{{ upload.company?.name || '-' }}</span>
            </td>
            <td class="px-3 py-2 text-xs text-gray-500 hidden lg:table-cell max-w-[150px]">
              <span class="truncate block" :title="upload.originalFileName">{{ upload.originalFileName }}</span>
            </td>
            <td class="px-2 py-2 text-center">
              <span class="text-green-600 font-semibold text-sm">{{ upload.stats?.successCount || 0 }}</span>
            </td>
            <td class="px-2 py-2 text-center">
              <span :class="upload.stats?.errorCount > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'" class="text-sm">
                {{ upload.stats?.errorCount || 0 }}
              </span>
            </td>
            <td class="px-3 py-2 text-center">
              <span :class="statusClass(upload.status)" class="text-xs">
                {{ statusText(upload.status) }}
              </span>
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden md:table-cell">
              {{ formatDateShort(upload.createdAt) }}
            </td>
            <td class="px-2 py-2 text-center">
              <button
                @click="confirmDelete(upload)"
                :disabled="isDeleting"
                class="text-red-500 hover:text-red-700 disabled:opacity-50 p-1"
                title="Yüklemeyi Sil"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showDeleteModal = false"></div>

        <div class="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Yüklemeyi Sil</h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    <strong>{{ uploadToDelete?.company?.name }}</strong> şirketinin
                    <strong>{{ months[(uploadToDelete?.month || 1) - 1] }} {{ uploadToDelete?.year }}</strong> dönemi bordro yüklemesini silmek istediğinize emin misiniz?
                  </p>
                  <p class="text-sm text-gray-500 mt-2">
                    Bu işlem geri alınamaz ve <strong>{{ uploadToDelete?.stats?.successCount || 0 }}</strong> adet bordro kaydı silinecektir.
                  </p>
                  <p class="text-sm text-red-600 mt-2 font-medium">
                    Not: Onaylanmış bordrolar silinemez.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            <button
              type="button"
              @click="deleteUpload"
              :disabled="isDeleting"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {{ isDeleting ? 'Siliniyor...' : 'Sil' }}
            </button>
            <button
              type="button"
              @click="showDeleteModal = false"
              :disabled="isDeleting"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const uploads = ref([])
const companies = ref([])
const isLoading = ref(false)
const isDeleting = ref(false)
const showDeleteModal = ref(false)
const uploadToDelete = ref(null)
const filters = ref({
  company: '',
  year: '',
  month: '',
  status: ''
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
  await loadUploads()
})

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data.data || response.data || []
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  }
}

const loadUploads = async () => {
  isLoading.value = true

  try {
    const params = new URLSearchParams()
    if (filters.value.company) params.append('company', filters.value.company)
    if (filters.value.year) params.append('year', filters.value.year)
    if (filters.value.month) params.append('month', filters.value.month)
    if (filters.value.status) params.append('status', filters.value.status)

    const response = await api.get(`/bordro/uploads?${params.toString()}`)
    uploads.value = response.data.data || response.data || []
  } catch (error) {
    console.error('Yüklemeler alınamadı:', error)
    uploads.value = []
  } finally {
    isLoading.value = false
  }
}

const statusClass = (status) => {
  const classes = {
    pending: 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700',
    processing: 'px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700',
    completed: 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-700',
    partial: 'px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700',
    failed: 'px-2 py-1 text-xs rounded-full bg-red-100 text-red-700'
  }
  return classes[status] || classes.pending
}

const statusText = (status) => {
  const texts = {
    pending: 'Beklemede',
    processing: 'İşleniyor',
    completed: 'Tamamlandı',
    partial: 'Kısmi',
    failed: 'Başarısız'
  }
  return texts[status] || status
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateShort = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
}

const confirmDelete = (upload) => {
  uploadToDelete.value = upload
  showDeleteModal.value = true
}

const deleteUpload = async () => {
  if (!uploadToDelete.value) return

  isDeleting.value = true

  try {
    const response = await api.delete(`/bordro/uploads/${uploadToDelete.value._id}`)
    alert(response.data.message || 'Yükleme başarıyla silindi')
    showDeleteModal.value = false
    uploadToDelete.value = null
    await loadUploads()
  } catch (error) {
    alert(error.response?.data?.message || 'Silme işlemi başarısız oldu')
  } finally {
    isDeleting.value = false
  }
}
</script>
