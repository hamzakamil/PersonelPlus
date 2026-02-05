<template>
  <div class="max-w-7xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Bordro Listesi</h1>
      <p class="text-gray-600 mt-1">Tüm çalışanların bordrolarını görüntüleyin</p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <!-- Çalışan Arama -->
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Çalışan Ara</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Ad, soyad veya TC..."
            @input="debouncedLoad"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <!-- Yıl -->
        <div class="w-32">
          <label class="block text-xs font-medium text-gray-500 mb-1">Yıl</label>
          <select
            v-model="filters.year"
            @change="loadBordros"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tümü</option>
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        <!-- Ay -->
        <div class="w-36">
          <label class="block text-xs font-medium text-gray-500 mb-1">Ay</label>
          <select
            v-model="filters.month"
            @change="loadBordros"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tümü</option>
            <option v-for="(month, index) in months" :key="index" :value="index + 1">
              {{ month }}
            </option>
          </select>
        </div>
        <!-- Durum -->
        <div class="w-40">
          <label class="block text-xs font-medium text-gray-500 mb-1">Durum</label>
          <select
            v-model="filters.status"
            @change="loadBordros"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tümü</option>
            <option value="pending">Beklemede</option>
            <option value="company_approved">Şirket Onaylı</option>
            <option value="approved">Çalışan Onaylı</option>
            <option value="rejected">Reddedildi</option>
          </select>
        </div>
        <!-- Sıralama -->
        <div class="w-44">
          <label class="block text-xs font-medium text-gray-500 mb-1">Sıralama</label>
          <select
            v-model="filters.sortBy"
            @change="loadBordros"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="createdAt_desc">Yükleme (Yeni-Eski)</option>
            <option value="createdAt_asc">Yükleme (Eski-Yeni)</option>
            <option value="employeeName_asc">İsim (A-Z)</option>
            <option value="employeeName_desc">İsim (Z-A)</option>
            <option value="netUcret_desc">Net Ücret (Yüksek-Düşük)</option>
            <option value="netUcret_asc">Net Ücret (Düşük-Yüksek)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Toplam Net Tutar Özeti -->
    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-5 mb-6 text-white">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm text-indigo-100">Toplam Net Ödenecek (Tüm Dönem)</p>
          <p class="text-3xl font-bold">{{ formatCurrency(stats.totalNetAmount || 0) }}</p>
        </div>
        <div class="text-right">
          <p class="text-sm text-indigo-100">Bu Sayfadaki Toplam</p>
          <p class="text-2xl font-bold">{{ formatCurrency(pageNetAmount) }}</p>
        </div>
      </div>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-2xl font-bold text-gray-900">{{ stats.total }}</div>
        <div class="text-xs text-gray-500">Toplam Bordro</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
        <div class="text-2xl font-bold text-gray-600">{{ stats.pending }}</div>
        <div class="text-xs text-gray-500">Beklemede</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
        <div class="text-2xl font-bold text-blue-600">{{ stats.notified }}</div>
        <div class="text-xs text-gray-500">Bildirildi</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
        <div class="text-2xl font-bold text-green-600">{{ stats.approved }}</div>
        <div class="text-xs text-gray-500">Onaylandı</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
        <div class="text-2xl font-bold text-red-600">{{ stats.rejected }}</div>
        <div class="text-xs text-gray-500">Reddedildi</div>
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
    <div v-else-if="!isLoading && bordros.length === 0 && selectedBordros.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">Bordro bulunamadı</h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ hasActiveFilters ? 'Filtrelerinize uygun bordro yok.' : 'Henüz yüklenmiş bordro bulunmuyor.' }}
      </p>
    </div>

    <!-- Bulk Actions Bar -->
    <div v-if="selectedBordros.length > 0" class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-indigo-700">
            {{ selectedBordros.length }} bordro seçildi
          </span>
          <span class="text-sm text-indigo-600">
            ({{ formatCurrency(selectedTotalAmount) }})
          </span>
        </div>
        <div class="flex gap-2">
          <!-- Geri Al (company_approved -> pending) -->
          <button
            v-if="canRevertSelected"
            @click="bulkRevert"
            :disabled="isProcessing"
            class="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Geri Al
          </button>
          <!-- Sil (pending) -->
          <button
            v-if="canDeleteSelected"
            @click="bulkDelete"
            :disabled="isProcessing"
            class="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Sil
          </button>
          <!-- Seçimi Temizle -->
          <button
            @click="clearSelection"
            class="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-100"
          >
            Seçimi Temizle
          </button>
        </div>
      </div>
    </div>

    <!-- Bordro Table -->
    <div v-if="!isLoading && bordros.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-3 py-3 text-left">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dönem</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Ücret</th>
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Gün</th>
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="bordro in bordros" :key="bordro._id" class="hover:bg-gray-50">
            <td class="px-3 py-3">
              <input
                type="checkbox"
                :checked="selectedBordros.includes(bordro._id)"
                @change="toggleSelect(bordro._id)"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <div class="flex items-center">
                <div class="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span class="text-xs font-medium text-indigo-600">
                    {{ getInitials(bordro.employeeName) }}
                  </span>
                </div>
                <div class="ml-2">
                  <div class="text-sm font-medium text-gray-900">{{ bordro.employeeName }}</div>
                  <div class="text-xs text-gray-500">{{ bordro.tcKimlik }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <span class="text-sm font-medium text-gray-900">{{ months[bordro.month - 1] }} {{ bordro.year }}</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-right">
              <span class="text-sm font-bold text-gray-900">{{ formatCurrency(bordro.payrollData?.netOdenen) }}</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-center">
              <span class="text-sm text-gray-600">{{ bordro.payrollData?.calismaGunu || '-' }}</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-center">
              <span :class="statusClass(bordro.status)">
                {{ statusText(bordro.status) }}
              </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-center">
              <div class="flex justify-center gap-1">
                <router-link
                  :to="`/bordro/${bordro._id}`"
                  class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                  title="Detay"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </router-link>
                <!-- Geri Al (company_approved -> pending) -->
                <button
                  v-if="bordro.status === 'company_approved'"
                  @click="revertSingle(bordro)"
                  :disabled="isProcessing"
                  class="p-1.5 text-amber-600 hover:bg-amber-50 rounded disabled:opacity-50"
                  title="Geri Al (Beklemede)"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
                <!-- Sil (pending) -->
                <button
                  v-if="bordro.status === 'pending'"
                  @click="deleteSingle(bordro)"
                  :disabled="isProcessing"
                  class="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                  title="Sil"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot class="bg-gray-100 border-t-2 border-gray-300">
          <tr>
            <td colspan="3" class="px-4 py-3 text-right font-semibold text-gray-700">
              Sayfa Toplamı ({{ bordros.length }} bordro):
            </td>
            <td class="px-4 py-3 text-right font-bold text-gray-900 text-lg">
              {{ formatCurrency(pageNetAmount) }}
            </td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="bg-gray-50 px-6 py-3 flex items-center justify-between border-t">
        <div class="text-sm text-gray-500">
          Toplam {{ pagination.total }} kayıt, Sayfa {{ pagination.page }}/{{ pagination.totalPages }}
        </div>
        <div class="flex gap-2">
          <button
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Önceki
          </button>
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="changePage(page)"
            :class="[
              'px-3 py-1 border rounded text-sm',
              pagination.page === page ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-100'
            ]"
          >
            {{ page }}
          </button>
          <button
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages"
            class="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const bordros = ref([])
const isLoading = ref(false)
const isProcessing = ref(false)
const selectedBordros = ref([])
const filters = ref({
  search: '',
  year: new Date().getFullYear(),
  month: '',
  status: '',
  sortBy: 'createdAt_desc'
})
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})
const stats = ref({
  total: 0,
  pending: 0,
  notified: 0,
  viewed: 0,
  approved: 0,
  rejected: 0,
  totalNetAmount: 0
})

// Sayfadaki bordroların toplam net tutarı
const pageNetAmount = computed(() => {
  return bordros.value.reduce((sum, b) => sum + (b.payrollData?.netOdenen || 0), 0)
})

const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
})

const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.year || filters.value.month || filters.value.status
})

const visiblePages = computed(() => {
  const pages = []
  const current = pagination.value.page
  const total = pagination.value.totalPages

  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)

  if (end - start < 4) {
    if (start === 1) {
      end = Math.min(total, 5)
    } else {
      start = Math.max(1, total - 4)
    }
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return pages
})

let debounceTimer = null
const debouncedLoad = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    pagination.value.page = 1
    loadBordros()
  }, 300)
}

onMounted(() => {
  loadBordros()
})

const loadBordros = async () => {
  isLoading.value = true

  try {
    const params = new URLSearchParams()
    params.append('page', pagination.value.page)
    params.append('limit', pagination.value.limit)

    if (filters.value.search) params.append('search', filters.value.search)
    if (filters.value.year) params.append('year', filters.value.year)
    if (filters.value.month) params.append('month', filters.value.month)
    if (filters.value.status) params.append('status', filters.value.status)
    if (filters.value.sortBy) {
      const [field, order] = filters.value.sortBy.split('_')
      params.append('sortBy', field)
      params.append('sortOrder', order)
    }

    const response = await api.get(`/bordro/company-list?${params.toString()}`)
    const data = response.data

    bordros.value = data.data || []
    pagination.value.total = data.meta?.total || 0
    pagination.value.totalPages = data.meta?.totalPages || 1
    stats.value = data.meta?.stats || stats.value
  } catch (error) {
    console.error('Bordrolar yüklenemedi:', error)
    bordros.value = []
  } finally {
    isLoading.value = false
  }
}

const changePage = (page) => {
  if (page < 1 || page > pagination.value.totalPages) return
  pagination.value.page = page
  loadBordros()
}

const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

const statusClass = (status) => {
  const classes = {
    pending: 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700',
    company_approved: 'px-2 py-1 text-xs rounded-full bg-teal-100 text-teal-700',
    approved: 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-700',
    rejected: 'px-2 py-1 text-xs rounded-full bg-red-100 text-red-700'
  }
  return classes[status] || classes.pending
}

const statusText = (status) => {
  const texts = {
    pending: 'Beklemede',
    company_approved: 'Şirket Onaylı',
    approved: 'Çalışan Onaylı',
    rejected: 'Reddedildi'
  }
  return texts[status] || status
}

// Selection computed properties
const isAllSelected = computed(() => {
  return bordros.value.length > 0 && selectedBordros.value.length === bordros.value.length
})

const selectedTotalAmount = computed(() => {
  return bordros.value
    .filter(b => selectedBordros.value.includes(b._id))
    .reduce((sum, b) => sum + (b.payrollData?.netOdenen || 0), 0)
})

const canRevertSelected = computed(() => {
  // Seçili bordrolardan en az biri company_approved veya approved ise geri alınabilir
  return bordros.value.some(b =>
    selectedBordros.value.includes(b._id) &&
    (b.status === 'company_approved' || b.status === 'approved')
  )
})

const canDeleteSelected = computed(() => {
  // Seçili bordrolardan en az biri pending ise silinebilir
  return bordros.value.some(b =>
    selectedBordros.value.includes(b._id) &&
    b.status === 'pending'
  )
})

// Selection functions
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedBordros.value = []
  } else {
    selectedBordros.value = bordros.value.map(b => b._id)
  }
}

const toggleSelect = (id) => {
  const index = selectedBordros.value.indexOf(id)
  if (index > -1) {
    selectedBordros.value.splice(index, 1)
  } else {
    selectedBordros.value.push(id)
  }
}

const clearSelection = () => {
  selectedBordros.value = []
}

// Single actions
const revertSingle = async (bordro) => {
  // Çalışan onaylı ise uyarı ver
  if (bordro.status === 'approved') {
    const confirm = window.confirm(
      `⚠️ DİKKAT: Bu bordro çalışan tarafından onaylanmış!\n\n` +
      `${bordro.employeeName} - ${months[bordro.month - 1]} ${bordro.year}\n\n` +
      `Çalışan onaylı bordroyu geri almak istediğinizden emin misiniz?`
    )
    if (!confirm) return
  } else if (bordro.status === 'company_approved') {
    const confirm = window.confirm(
      `${bordro.employeeName} bordrosunu "Beklemede" durumuna geri almak istediğinizden emin misiniz?`
    )
    if (!confirm) return
  }

  isProcessing.value = true
  try {
    await api.post(`/bordro/${bordro._id}/revert-to-pending`)
    alert('Bordro başarıyla geri alındı')
    await loadBordros()
  } catch (error) {
    alert(error.response?.data?.message || 'İşlem başarısız')
  } finally {
    isProcessing.value = false
  }
}

const deleteSingle = async (bordro) => {
  const confirm = window.confirm(
    `${bordro.employeeName} - ${months[bordro.month - 1]} ${bordro.year} bordrosunu silmek istediğinizden emin misiniz?\n\n` +
    `Bu işlem geri alınamaz!`
  )
  if (!confirm) return

  isProcessing.value = true
  try {
    await api.delete(`/bordro/${bordro._id}`)
    alert('Bordro başarıyla silindi')
    await loadBordros()
  } catch (error) {
    alert(error.response?.data?.message || 'Silme işlemi başarısız')
  } finally {
    isProcessing.value = false
  }
}

// Bulk actions
const bulkRevert = async () => {
  const selectedItems = bordros.value.filter(b => selectedBordros.value.includes(b._id))
  const approvedCount = selectedItems.filter(b => b.status === 'approved').length
  const companyApprovedCount = selectedItems.filter(b => b.status === 'company_approved').length

  let message = `${selectedBordros.value.length} bordroyu "Beklemede" durumuna geri almak istediğinizden emin misiniz?`

  if (approvedCount > 0) {
    message = `⚠️ DİKKAT: Seçilen bordrolardan ${approvedCount} tanesi çalışan tarafından onaylanmış!\n\n${message}`
  }

  if (!window.confirm(message)) return

  isProcessing.value = true
  try {
    const ids = selectedItems
      .filter(b => b.status === 'company_approved' || b.status === 'approved')
      .map(b => b._id)

    const response = await api.post('/bordro/bulk-revert', { bordroIds: ids })
    alert(response.data.message || `${ids.length} bordro geri alındı`)
    selectedBordros.value = []
    await loadBordros()
  } catch (error) {
    alert(error.response?.data?.message || 'Toplu geri alma başarısız')
  } finally {
    isProcessing.value = false
  }
}

const bulkDelete = async () => {
  const selectedItems = bordros.value.filter(b =>
    selectedBordros.value.includes(b._id) && b.status === 'pending'
  )

  if (selectedItems.length === 0) {
    alert('Silinebilecek (Beklemede) bordro yok')
    return
  }

  const confirm = window.confirm(
    `${selectedItems.length} adet beklemedeki bordroyu silmek istediğinizden emin misiniz?\n\n` +
    `Bu işlem geri alınamaz!`
  )
  if (!confirm) return

  isProcessing.value = true
  try {
    const ids = selectedItems.map(b => b._id)
    const response = await api.post('/bordro/bulk-delete', { bordroIds: ids })
    alert(response.data.message || `${ids.length} bordro silindi`)
    selectedBordros.value = []
    await loadBordros()
  } catch (error) {
    alert(error.response?.data?.message || 'Toplu silme başarısız')
  } finally {
    isProcessing.value = false
  }
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(value || 0)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
</script>
