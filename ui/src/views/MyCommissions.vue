<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Komisyonlarim</h1>
    </div>

    <!-- Ozet Kartlari -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Komisyon Oranim</div>
        <div class="text-2xl font-bold text-blue-600">%{{ stats.commissionRate || 0 }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Bu Ay Kazanc</div>
        <div class="text-2xl font-bold text-purple-600">{{ formatCurrency(stats.thisMonth?.total || 0) }}</div>
        <div class="text-xs text-gray-500">{{ stats.thisMonth?.count || 0 }} islem</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Odeme Bekleyen</div>
        <div class="text-2xl font-bold text-yellow-600">{{ formatCurrency(stats.totalPending || 0) }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Odenen Toplam</div>
        <div class="text-2xl font-bold text-green-600">{{ formatCurrency(stats.totalPaid || 0) }}</div>
      </div>
    </div>

    <!-- Istatistik Grafigi -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Bekleyen Komisyonlar</h3>
        <div class="text-xl font-bold text-yellow-600">{{ formatCurrency(stats.pending?.total || 0) }}</div>
        <div class="text-sm text-gray-500">{{ stats.pending?.count || 0 }} adet</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Onaylanan Komisyonlar</h3>
        <div class="text-xl font-bold text-blue-600">{{ formatCurrency(stats.approved?.total || 0) }}</div>
        <div class="text-sm text-gray-500">{{ stats.approved?.count || 0 }} adet</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Odenen Komisyonlar</h3>
        <div class="text-xl font-bold text-green-600">{{ formatCurrency(stats.paid?.total || 0) }}</div>
        <div class="text-sm text-gray-500">{{ stats.paid?.count || 0 }} adet</div>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select v-model="filters.status" @change="loadCommissions" class="w-full border rounded-lg px-3 py-2">
            <option value="">Tumu</option>
            <option value="pending">Bekliyor</option>
            <option value="approved">Onaylandi</option>
            <option value="paid">Odendi</option>
            <option value="cancelled">Iptal</option>
          </select>
        </div>
        <div class="flex items-end">
          <Button variant="secondary" @click="resetFilters">Temizle</Button>
        </div>
      </div>
    </div>

    <!-- Tablo -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abonelik</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Odeme Tutari</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oran</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Komisyon</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detay</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="commission in commissions" :key="commission._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(commission.createdAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">
                {{ commission.subscription?.billingType === 'yearly' ? 'Yillik' : 'Aylik' }} Abonelik
              </div>
              <div class="text-xs text-gray-500">
                {{ formatDateRange(commission.subscription?.startDate, commission.subscription?.endDate) }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatCurrency(commission.baseAmount) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              %{{ commission.rate }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-bold text-green-600">{{ formatCurrency(commission.amount) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="{
                  'bg-yellow-100 text-yellow-800': commission.status === 'pending',
                  'bg-blue-100 text-blue-800': commission.status === 'approved',
                  'bg-green-100 text-green-800': commission.status === 'paid',
                  'bg-red-100 text-red-800': commission.status === 'cancelled'
                }"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ statusText(commission.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="viewDetails(commission)" class="text-blue-600 hover:text-blue-900">
                Detay
              </button>
            </td>
          </tr>
          <tr v-if="commissions.length === 0">
            <td colspan="7" class="px-6 py-8 text-center text-gray-500">
              Komisyon bulunamadi
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sayfalama -->
    <div v-if="pagination.pages > 1" class="flex justify-center mt-6">
      <nav class="flex items-center space-x-2">
        <button
          @click="changePage(pagination.page - 1)"
          :disabled="pagination.page === 1"
          class="px-3 py-1 rounded border disabled:opacity-50"
        >
          Onceki
        </button>
        <span class="text-sm text-gray-600">
          {{ pagination.page }} / {{ pagination.pages }}
        </span>
        <button
          @click="changePage(pagination.page + 1)"
          :disabled="pagination.page === pagination.pages"
          class="px-3 py-1 rounded border disabled:opacity-50"
        >
          Sonraki
        </button>
      </nav>
    </div>

    <!-- Detay Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 class="text-xl font-bold mb-4">Komisyon Detayi</h2>

        <div v-if="selectedCommission" class="space-y-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Abonelik Tipi:</span>
              <div class="font-medium">
                {{ selectedCommission.subscription?.billingType === 'yearly' ? 'Yillik' : 'Aylik' }}
              </div>
            </div>
            <div>
              <span class="text-gray-500">Durum:</span>
              <div class="font-medium">{{ statusText(selectedCommission.status) }}</div>
            </div>
            <div>
              <span class="text-gray-500">Odeme Tutari:</span>
              <div class="font-medium">{{ formatCurrency(selectedCommission.baseAmount) }}</div>
            </div>
            <div>
              <span class="text-gray-500">Komisyon Orani:</span>
              <div class="font-medium">%{{ selectedCommission.rate }}</div>
            </div>
            <div>
              <span class="text-gray-500">Komisyon Tutari:</span>
              <div class="font-medium text-green-600">{{ formatCurrency(selectedCommission.amount) }}</div>
            </div>
            <div>
              <span class="text-gray-500">Olusturulma:</span>
              <div class="font-medium">{{ formatDateTime(selectedCommission.createdAt) }}</div>
            </div>
          </div>

          <div v-if="selectedCommission.subscription" class="bg-gray-50 rounded-lg p-3">
            <h4 class="font-semibold text-sm text-gray-700 mb-2">Abonelik Bilgileri</h4>
            <div class="text-sm text-gray-600 space-y-1">
              <div>Durum: {{ subscriptionStatusText(selectedCommission.subscription.status) }}</div>
              <div>Baslangic: {{ formatDate(selectedCommission.subscription.startDate) }}</div>
              <div>Bitis: {{ formatDate(selectedCommission.subscription.endDate) }}</div>
            </div>
          </div>

          <div v-if="selectedCommission.paidAt" class="bg-green-50 rounded-lg p-3">
            <h4 class="font-semibold text-sm text-green-700 mb-1">Odeme Bilgileri</h4>
            <div class="text-sm text-green-600">
              <div>Odeme Tarihi: {{ formatDateTime(selectedCommission.paidAt) }}</div>
              <div>Yontem: {{ paymentMethodText(selectedCommission.paymentMethod) }}</div>
              <div v-if="selectedCommission.paymentReference">
                Referans: {{ selectedCommission.paymentReference }}
              </div>
            </div>
          </div>

          <div v-if="selectedCommission.status === 'pending'" class="bg-yellow-50 rounded-lg p-3">
            <p class="text-sm text-yellow-700">
              Bu komisyon henuz odenmemistir. Odeme onaylandiktan sonra hesabiniza aktarilacaktir.
            </p>
          </div>

          <div v-if="selectedCommission.status === 'approved'" class="bg-blue-50 rounded-lg p-3">
            <p class="text-sm text-blue-700">
              Bu komisyon onaylandi ve odeme bekleniyor. Kisa surede hesabiniza aktarilacaktir.
            </p>
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
import Button from '@/components/Button.vue'

const commissions = ref([])
const stats = ref({})
const showDetailModal = ref(false)
const selectedCommission = ref(null)

const filters = ref({
  status: ''
})

const pagination = ref({
  page: 1,
  pages: 1,
  total: 0
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0
  }).format(value || 0)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('tr-TR')
}

const formatDateRange = (start, end) => {
  if (!start || !end) return '-'
  return `${formatDate(start)} - ${formatDate(end)}`
}

const statusText = (status) => {
  const texts = {
    pending: 'Bekliyor',
    approved: 'Onaylandi',
    paid: 'Odendi',
    cancelled: 'Iptal'
  }
  return texts[status] || status
}

const subscriptionStatusText = (status) => {
  const texts = {
    active: 'Aktif',
    expired: 'Suresi Doldu',
    cancelled: 'Iptal',
    suspended: 'Askiya Alindi'
  }
  return texts[status] || status
}

const paymentMethodText = (method) => {
  const texts = {
    bank_transfer: 'Banka Havalesi',
    eft: 'EFT',
    cash: 'Nakit',
    other: 'Diger'
  }
  return texts[method] || method
}

const loadCommissions = async () => {
  try {
    const params = new URLSearchParams()
    params.append('page', pagination.value.page)
    if (filters.value.status) params.append('status', filters.value.status)

    const response = await api.get(`/commissions/my?${params.toString()}`)
    commissions.value = response.data || []
    if (response.data.pagination) {
      pagination.value = response.data.pagination
    }
  } catch (error) {
    console.error('Komisyonlar yuklenirken hata:', error)
  }
}

const loadStats = async () => {
  try {
    const response = await api.get('/commissions/stats')
    stats.value = response.data || {}
  } catch (error) {
    console.error('Istatistikler yuklenirken hata:', error)
  }
}

const resetFilters = () => {
  filters.value = { status: '' }
  pagination.value.page = 1
  loadCommissions()
}

const changePage = (page) => {
  pagination.value.page = page
  loadCommissions()
}

const viewDetails = (commission) => {
  selectedCommission.value = commission
  showDetailModal.value = true
}

onMounted(() => {
  loadCommissions()
  loadStats()
})
</script>
