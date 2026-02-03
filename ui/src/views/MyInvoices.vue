<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Faturalarım</h1>
      <p class="text-gray-600 mt-1">e-Fatura ve e-Arşiv faturalarınız</p>
    </div>

    <!-- Özet Kartlar -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Toplam Fatura</div>
        <div class="text-2xl font-bold text-gray-900">{{ pagination.total }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Kabul Edilen</div>
        <div class="text-2xl font-bold text-green-600">{{ acceptedCount }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Beklemede</div>
        <div class="text-2xl font-bold text-blue-600">{{ pendingCount }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Toplam Tutar</div>
        <div class="text-2xl font-bold text-gray-900">{{ formatCurrency(totalAmount) }}</div>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="draft">Taslak</option>
            <option value="sent">Gönderildi</option>
            <option value="accepted">Kabul Edildi</option>
            <option value="rejected">Reddedildi</option>
            <option value="cancelled">İptal</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
          <input
            v-model="filters.startDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
          <input
            v-model="filters.endDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="clearFilters"
            class="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>
    </div>

    <!-- Fatura Listesi -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="loading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">Yükleniyor...</p>
      </div>

      <div v-else-if="invoices.length === 0" class="p-8 text-center text-gray-500">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>Henüz faturanız bulunmuyor</p>
      </div>

      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fatura No</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="invoice in invoices" :key="invoice._id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="font-medium text-gray-900">{{ invoice.invoiceNumber }}</div>
              <div class="text-xs text-gray-500 font-mono">{{ invoice.uuid?.substring(0, 8) }}...</div>
            </td>
            <td class="px-6 py-4">
              <span :class="getInvoiceTypeClass(invoice.invoiceTypeCode)" class="px-2 py-1 text-xs rounded-full">
                {{ getInvoiceTypeLabel(invoice.invoiceTypeCode) }}
              </span>
              <div v-if="invoice.isEArchive" class="text-xs text-purple-600 mt-1">e-Arşiv</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
              {{ formatDate(invoice.issueDate) }}
            </td>
            <td class="px-6 py-4 text-right">
              <div class="font-medium text-gray-900">
                {{ formatCurrency(invoice.legalMonetaryTotal?.payableAmount) }}
              </div>
              <div class="text-xs text-gray-500">
                KDV: {{ formatCurrency(invoice.taxTotal?.taxAmount) }}
              </div>
            </td>
            <td class="px-6 py-4 text-center">
              <span :class="getStatusClass(invoice.gibStatus)" class="px-2 py-1 text-xs rounded-full">
                {{ getStatusLabel(invoice.gibStatus) }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end gap-2">
                <button
                  @click="viewInvoice(invoice)"
                  class="p-1 text-gray-600 hover:text-blue-600"
                  title="Detay"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  @click="downloadXml(invoice)"
                  class="p-1 text-gray-600 hover:text-purple-600"
                  title="XML İndir"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </button>
                <button
                  v-if="invoice.gibStatus !== 'draft'"
                  @click="downloadPdf(invoice)"
                  class="p-1 text-gray-600 hover:text-red-600"
                  title="PDF İndir"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="pagination.pages > 1" class="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
        <div class="text-sm text-gray-600">
          Toplam {{ pagination.total }} fatura
        </div>
        <div class="flex gap-2">
          <button
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page === 1"
            class="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
          >
            Önceki
          </button>
          <span class="px-3 py-1 text-gray-600">{{ pagination.page }} / {{ pagination.pages }}</span>
          <button
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page === pagination.pages"
            class="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>

    <!-- Fatura Detay Modal -->
    <div
      v-if="selectedInvoice"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="selectedInvoice = null"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div class="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 class="text-xl font-bold">Fatura Detayı</h2>
          <button @click="selectedInvoice = null" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-6">
          <!-- Fatura Başlık Bilgileri -->
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-bold text-gray-900">{{ selectedInvoice.invoiceNumber }}</h3>
                <p class="text-sm text-gray-500 font-mono">UUID: {{ selectedInvoice.uuid }}</p>
              </div>
              <span :class="getStatusClass(selectedInvoice.gibStatus)" class="px-3 py-1 rounded-full">
                {{ getStatusLabel(selectedInvoice.gibStatus) }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <!-- Fatura Bilgileri -->
            <div>
              <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Fatura Bilgileri
              </h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-500">Fatura Tipi:</dt>
                  <dd class="font-medium">{{ getInvoiceTypeLabel(selectedInvoice.invoiceTypeCode) }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500">Profil:</dt>
                  <dd>{{ selectedInvoice.profileId }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500">Düzenleme Tarihi:</dt>
                  <dd>{{ formatDate(selectedInvoice.issueDate) }}</dd>
                </div>
                <div v-if="selectedInvoice.gibResponse?.ettn" class="flex justify-between">
                  <dt class="text-gray-500">ETTN:</dt>
                  <dd class="font-mono text-xs">{{ selectedInvoice.gibResponse.ettn }}</dd>
                </div>
              </dl>
            </div>

            <!-- Tutar Bilgileri -->
            <div>
              <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tutar Bilgileri
              </h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-500">Mal/Hizmet Toplamı:</dt>
                  <dd>{{ formatCurrency(selectedInvoice.legalMonetaryTotal?.lineExtensionAmount) }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500">KDV Tutarı:</dt>
                  <dd>{{ formatCurrency(selectedInvoice.taxTotal?.taxAmount) }}</dd>
                </div>
                <div class="flex justify-between border-t pt-2 mt-2">
                  <dt class="font-medium text-gray-900">Genel Toplam:</dt>
                  <dd class="font-bold text-lg text-blue-600">
                    {{ formatCurrency(selectedInvoice.legalMonetaryTotal?.payableAmount) }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- Fatura Kalemleri -->
          <div class="mt-6">
            <h4 class="font-semibold text-gray-900 mb-3">Fatura Kalemleri</h4>
            <div class="border rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left font-medium text-gray-500">Ürün/Hizmet</th>
                    <th class="px-4 py-2 text-right font-medium text-gray-500">Miktar</th>
                    <th class="px-4 py-2 text-right font-medium text-gray-500">Birim Fiyat</th>
                    <th class="px-4 py-2 text-right font-medium text-gray-500">KDV</th>
                    <th class="px-4 py-2 text-right font-medium text-gray-500">Toplam</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr v-for="line in selectedInvoice.invoiceLines" :key="line.lineId">
                    <td class="px-4 py-3">
                      <div class="font-medium">{{ line.item?.name }}</div>
                      <div v-if="line.item?.description" class="text-xs text-gray-500">
                        {{ line.item.description }}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right">{{ line.quantity?.value }} {{ getUnitLabel(line.quantity?.unitCode) }}</td>
                    <td class="px-4 py-3 text-right">{{ formatCurrency(line.price?.priceAmount) }}</td>
                    <td class="px-4 py-3 text-right">{{ formatCurrency(line.taxTotal?.taxAmount) }}</td>
                    <td class="px-4 py-3 text-right font-medium">{{ formatCurrency(line.lineExtensionAmount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- İndirme Butonları -->
          <div class="mt-6 flex gap-3">
            <button
              @click="downloadXml(selectedInvoice)"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              XML İndir
            </button>
            <button
              v-if="selectedInvoice.gibStatus !== 'draft'"
              @click="downloadPdf(selectedInvoice)"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF İndir
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/services/api'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const loading = ref(false)
const invoices = ref([])
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 })
const selectedInvoice = ref(null)

const filters = ref({
  status: '',
  startDate: '',
  endDate: ''
})

// Hesaplanmış değerler
const acceptedCount = computed(() =>
  invoices.value.filter(i => i.gibStatus === 'accepted').length
)

const pendingCount = computed(() =>
  invoices.value.filter(i => ['draft', 'sent', 'pending'].includes(i.gibStatus)).length
)

const totalAmount = computed(() =>
  invoices.value.reduce((sum, i) => sum + (i.legalMonetaryTotal?.payableAmount || 0), 0)
)

const fetchInvoices = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...filters.value
    }

    // Boş filtreleri kaldır
    Object.keys(params).forEach(key => {
      if (!params[key]) delete params[key]
    })

    const response = await api.get('/invoices/my', { params })
    const data = response.data?.data || response.data
    invoices.value = data?.invoices || []
    pagination.value = data?.pagination || { page: 1, limit: 20, total: 0 }
  } catch (error) {
    console.error('Fatura listesi hatası:', error)
  } finally {
    loading.value = false
  }
}

const changePage = (page) => {
  pagination.value.page = page
  fetchInvoices()
}

const clearFilters = () => {
  filters.value = {
    status: '',
    startDate: '',
    endDate: ''
  }
}

const viewInvoice = async (invoice) => {
  try {
    const response = await api.get(`/invoices/${invoice._id}`)
    selectedInvoice.value = response.data?.data || response.data
  } catch (error) {
    console.error('Fatura detay hatası:', error)
    toast.error('Fatura detayı yüklenemedi')
  }
}

const downloadXml = async (invoice) => {
  try {
    const response = await api.get(`/invoices/${invoice._id}/xml`, {
      responseType: 'blob'
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${invoice.invoiceNumber}.xml`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('XML indirme hatası:', error)
    toast.error('XML indirilemedi')
  }
}

const downloadPdf = async (invoice) => {
  try {
    const response = await api.get(`/invoices/${invoice._id}/pdf`, {
      responseType: 'blob'
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${invoice.invoiceNumber}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('PDF indirme hatası:', error)
    toast.error('PDF indirilemedi')
  }
}

// Helpers
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount || 0)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

const getStatusClass = (status) => {
  const classes = {
    draft: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-blue-100 text-blue-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getStatusLabel = (status) => {
  const labels = {
    draft: 'Taslak',
    pending: 'Beklemede',
    sent: 'Gönderildi',
    accepted: 'Kabul Edildi',
    rejected: 'Reddedildi',
    cancelled: 'İptal'
  }
  return labels[status] || status
}

const getInvoiceTypeClass = (type) => {
  const classes = {
    SATIS: 'bg-blue-100 text-blue-800',
    IADE: 'bg-orange-100 text-orange-800',
    TEVKIFAT: 'bg-purple-100 text-purple-800',
    ISTISNA: 'bg-green-100 text-green-800'
  }
  return classes[type] || 'bg-gray-100 text-gray-800'
}

const getInvoiceTypeLabel = (type) => {
  const labels = {
    SATIS: 'Satış',
    IADE: 'İade',
    TEVKIFAT: 'Tevkifat',
    ISTISNA: 'İstisna',
    OZELMATRAH: 'Özel Matrah',
    IHRACKAYITLI: 'İhraç Kayıtlı'
  }
  return labels[type] || type
}

const getUnitLabel = (unitCode) => {
  const units = {
    'C62': 'Adet',
    'KGM': 'Kg',
    'MTR': 'Metre',
    'LTR': 'Litre',
    'PA': 'Paket',
    'BX': 'Kutu'
  }
  return units[unitCode] || unitCode
}

// Filtreleri izle
watch(filters, () => {
  pagination.value.page = 1
  fetchInvoices()
}, { deep: true })

onMounted(() => {
  fetchInvoices()
})
</script>
