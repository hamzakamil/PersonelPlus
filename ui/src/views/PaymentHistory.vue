<template>
  <div>
    <div class="flex justify-end items-center mb-6">
      <Button @click="exportPayments">Disari Aktar (Excel)</Button>
    </div>

    <!-- Ozet Kartlari -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Toplam Odeme</div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.totalPayments }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Tamamlanan</div>
        <div class="text-2xl font-bold text-green-600">{{ formatCurrency(stats.completedAmount) }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Bekleyen</div>
        <div class="text-2xl font-bold text-yellow-600">{{ formatCurrency(stats.pendingAmount) }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Iade Edilen</div>
        <div class="text-2xl font-bold text-red-600">{{ formatCurrency(stats.refundedAmount) }}</div>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select v-model="filters.status" class="w-full border rounded-lg px-3 py-2">
            <option value="">Tumu</option>
            <option value="pending">Bekliyor</option>
            <option value="completed">Tamamlandi</option>
            <option value="failed">Basarisiz</option>
            <option value="refunded">Iade Edildi</option>
            <option value="cancelled">Iptal</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Odeme Yontemi</label>
          <select v-model="filters.paymentMethod" class="w-full border rounded-lg px-3 py-2">
            <option value="">Tumu</option>
            <option value="credit_card">Kredi Karti</option>
            <option value="bank_transfer">Banka Havale</option>
            <option value="manual">Manuel</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Baslangic Tarihi</label>
          <input v-model="filters.startDate" type="date" class="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bitis Tarihi</label>
          <input v-model="filters.endDate" type="date" class="w-full border rounded-lg px-3 py-2" />
        </div>
        <div class="flex items-end">
          <Button variant="secondary" @click="resetFilters" class="mr-2">Temizle</Button>
          <Button @click="loadPayments">Filtrele</Button>
        </div>
      </div>
    </div>

    <!-- Tablo -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bayi</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paket</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yontem</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Islemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="payment in payments" :key="payment._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDateTime(payment.createdAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ payment.dealer?.name || '-' }}</div>
              <div class="text-xs text-gray-500">{{ payment.dealer?.contactEmail }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ payment.package?.name || '-' }}
              <div class="text-xs text-gray-500">{{ payment.billingType === 'yearly' ? 'Yillik' : 'Aylik' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ formatCurrency(payment.amount) }}</div>
              <div v-if="payment.cardLastFour" class="text-xs text-gray-500">**** {{ payment.cardLastFour }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ paymentMethodText(payment.paymentMethod) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="{
                  'bg-yellow-100 text-yellow-800': payment.status === 'pending',
                  'bg-green-100 text-green-800': payment.status === 'completed',
                  'bg-red-100 text-red-800': payment.status === 'failed',
                  'bg-purple-100 text-purple-800': payment.status === 'refunded',
                  'bg-gray-100 text-gray-800': payment.status === 'cancelled'
                }"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ statusText(payment.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <button @click="viewDetails(payment)" class="text-blue-600 hover:text-blue-900">Detay</button>
              <button
                v-if="payment.status === 'completed' && payment.paymentMethod === 'credit_card'"
                @click="refundPayment(payment)"
                class="text-red-600 hover:text-red-900"
              >
                Iade
              </button>
            </td>
          </tr>
          <tr v-if="payments.length === 0">
            <td colspan="7" class="px-6 py-8 text-center text-gray-500">
              Odeme bulunamadi
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sayfalama -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center mt-6">
      <nav class="flex items-center space-x-2">
        <button
          @click="changePage(pagination.currentPage - 1)"
          :disabled="pagination.currentPage === 1"
          class="px-3 py-1 rounded border disabled:opacity-50"
        >
          Onceki
        </button>
        <span class="text-sm text-gray-600">
          {{ pagination.currentPage }} / {{ pagination.totalPages }}
        </span>
        <button
          @click="changePage(pagination.currentPage + 1)"
          :disabled="pagination.currentPage === pagination.totalPages"
          class="px-3 py-1 rounded border disabled:opacity-50"
        >
          Sonraki
        </button>
      </nav>
    </div>

    <!-- Detay Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 class="text-xl font-bold mb-4">Odeme Detayi</h2>

        <div v-if="selectedPayment" class="space-y-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Bayi:</span>
              <div class="font-medium">{{ selectedPayment.dealer?.name }}</div>
            </div>
            <div>
              <span class="text-gray-500">Paket:</span>
              <div class="font-medium">{{ selectedPayment.package?.name }}</div>
            </div>
            <div>
              <span class="text-gray-500">Tutar:</span>
              <div class="font-medium text-green-600">{{ formatCurrency(selectedPayment.amount) }}</div>
            </div>
            <div>
              <span class="text-gray-500">Fatura Tipi:</span>
              <div class="font-medium">{{ selectedPayment.billingType === 'yearly' ? 'Yillik' : 'Aylik' }}</div>
            </div>
            <div>
              <span class="text-gray-500">Odeme Yontemi:</span>
              <div class="font-medium">{{ paymentMethodText(selectedPayment.paymentMethod) }}</div>
            </div>
            <div>
              <span class="text-gray-500">Durum:</span>
              <div class="font-medium">{{ statusText(selectedPayment.status) }}</div>
            </div>
            <div v-if="selectedPayment.cardLastFour">
              <span class="text-gray-500">Kart:</span>
              <div class="font-medium">**** {{ selectedPayment.cardLastFour }} ({{ selectedPayment.cardType }})</div>
            </div>
            <div v-if="selectedPayment.invoiceNumber">
              <span class="text-gray-500">Fatura No:</span>
              <div class="font-medium">{{ selectedPayment.invoiceNumber }}</div>
            </div>
            <div>
              <span class="text-gray-500">Olusturulma:</span>
              <div class="font-medium">{{ formatDateTime(selectedPayment.createdAt) }}</div>
            </div>
            <div v-if="selectedPayment.paidAt">
              <span class="text-gray-500">Odeme Tarihi:</span>
              <div class="font-medium">{{ formatDateTime(selectedPayment.paidAt) }}</div>
            </div>
          </div>

          <div v-if="selectedPayment.iyzicoPaymentId" class="bg-gray-50 rounded-lg p-3">
            <h4 class="font-semibold text-sm text-gray-700 mb-2">iyzico Bilgileri</h4>
            <div class="text-xs text-gray-600 space-y-1">
              <div>Payment ID: {{ selectedPayment.iyzicoPaymentId }}</div>
              <div>Conversation ID: {{ selectedPayment.iyzicoConversationId }}</div>
            </div>
          </div>

          <div v-if="selectedPayment.errorMessage" class="bg-red-50 rounded-lg p-3">
            <h4 class="font-semibold text-sm text-red-700 mb-1">Hata Mesaji</h4>
            <div class="text-sm text-red-600">{{ selectedPayment.errorMessage }}</div>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <Button variant="secondary" @click="showDetailModal = false">Kapat</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import Button from '@/components/Button.vue'

const toast = useToastStore()
const confirmModal = useConfirmStore()
const payments = ref([])
const showDetailModal = ref(false)
const selectedPayment = ref(null)

const stats = ref({
  totalPayments: 0,
  completedAmount: 0,
  pendingAmount: 0,
  refundedAmount: 0
})

const filters = ref({
  status: '',
  paymentMethod: '',
  startDate: '',
  endDate: ''
})

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  total: 0
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0
  }).format(value || 0)
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('tr-TR')
}

const statusText = (status) => {
  const texts = {
    pending: 'Bekliyor',
    completed: 'Tamamlandi',
    failed: 'Basarisiz',
    refunded: 'Iade Edildi',
    cancelled: 'Iptal'
  }
  return texts[status] || status
}

const paymentMethodText = (method) => {
  const texts = {
    credit_card: 'Kredi Karti',
    bank_transfer: 'Banka Havale',
    manual: 'Manuel'
  }
  return texts[method] || method
}

const loadPayments = async () => {
  try {
    const params = new URLSearchParams()
    params.append('page', pagination.value.currentPage)
    if (filters.value.status) params.append('status', filters.value.status)
    if (filters.value.paymentMethod) params.append('paymentMethod', filters.value.paymentMethod)
    if (filters.value.startDate) params.append('startDate', filters.value.startDate)
    if (filters.value.endDate) params.append('endDate', filters.value.endDate)

    const response = await api.get(`/payments?${params.toString()}`)
    const data = response.data.data || response.data

    payments.value = data.payments || data
    if (data.pagination) {
      pagination.value = data.pagination
    }
  } catch (error) {
    console.error('Odemeler yuklenirken hata:', error)
  }
}

const loadStats = async () => {
  try {
    const response = await api.get('/payments/stats/revenue')
    const data = response.data.data || response.data

    stats.value = {
      totalPayments: data.totalPayments || 0,
      completedAmount: data.totalRevenue || data.completedAmount || 0,
      pendingAmount: data.pendingAmount || 0,
      refundedAmount: data.refundedAmount || 0
    }
  } catch (error) {
    console.error('Istatistikler yuklenirken hata:', error)
  }
}

const resetFilters = () => {
  filters.value = {
    status: '',
    paymentMethod: '',
    startDate: '',
    endDate: ''
  }
  pagination.value.currentPage = 1
  loadPayments()
}

const changePage = (page) => {
  pagination.value.currentPage = page
  loadPayments()
}

const viewDetails = (payment) => {
  selectedPayment.value = payment
  showDetailModal.value = true
}

const refundPayment = async (payment) => {
  const confirmed = await confirmModal.show({
    title: 'Ödeme İadesi',
    message: `${formatCurrency(payment.amount)} tutarindaki odemeyi iade etmek istediginize emin misiniz?`,
    type: 'warning',
    confirmText: 'İade Et'
  })
  if (!confirmed) return

  try {
    await api.post(`/payments/${payment._id}/refund`)
    loadPayments()
    loadStats()
    toast.success('İade işlemi başarıyla tamamlandı')
  } catch (error) {
    toast.error(error.response?.data?.message || 'İade işlemi başarısız')
  }
}

const exportPayments = async () => {
  try {
    const params = new URLSearchParams()
    if (filters.value.status) params.append('status', filters.value.status)
    if (filters.value.paymentMethod) params.append('paymentMethod', filters.value.paymentMethod)
    if (filters.value.startDate) params.append('startDate', filters.value.startDate)
    if (filters.value.endDate) params.append('endDate', filters.value.endDate)
    params.append('export', 'true')

    // Excel export icin yeni pencere ac
    window.open(`${api.defaults.baseURL}/payments/export?${params.toString()}`, '_blank')
  } catch (error) {
    toast.error('Dışarı aktarma başarısız')
  }
}

onMounted(() => {
  loadPayments()
  loadStats()
})
</script>
