<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Komisyon Yonetimi</h1>
    </div>

    <!-- Ozet Kartlari -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Toplam Kazanilan</div>
        <div class="text-2xl font-bold text-blue-600">{{ formatCurrency(summary.totals?.earned || 0) }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Odeme Bekleyen</div>
        <div class="text-2xl font-bold text-yellow-600">{{ formatCurrency(summary.totals?.pending || 0) }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Odenen Toplam</div>
        <div class="text-2xl font-bold text-green-600">{{ formatCurrency(summary.totals?.paid || 0) }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Aktif Bayi Sayisi</div>
        <div class="text-2xl font-bold text-gray-800">{{ summary.dealers?.length || 0 }}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-lg shadow mb-6">
      <div class="border-b">
        <nav class="flex -mb-px">
          <button
            @click="activeTab = 'commissions'"
            :class="[
              'px-6 py-3 border-b-2 font-medium text-sm',
              activeTab === 'commissions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Komisyonlar
          </button>
          <button
            @click="activeTab = 'dealers'"
            :class="[
              'px-6 py-3 border-b-2 font-medium text-sm',
              activeTab === 'dealers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Bayi Komisyon Oranlari
          </button>
        </nav>
      </div>
    </div>

    <!-- Komisyonlar Tab -->
    <div v-show="activeTab === 'commissions'">
      <!-- Filtreler -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Bayi</label>
            <select v-model="filters.dealerId" @change="loadCommissions" class="w-full border rounded-lg px-3 py-2">
              <option value="">Tumu</option>
              <option v-for="dealer in summary.dealers" :key="dealer._id" :value="dealer._id">
                {{ dealer.name }}
              </option>
            </select>
          </div>
          <div class="flex items-end">
            <Button variant="secondary" @click="resetFilters" class="mr-2">Temizle</Button>
          </div>
          <div class="flex items-end justify-end">
            <Button
              v-if="selectedCommissions.length > 0"
              @click="showBulkPayModal = true"
              class="bg-green-600 hover:bg-green-700"
            >
              Secilenleri Ode ({{ selectedCommissions.length }})
            </Button>
          </div>
        </div>
      </div>

      <!-- Tablo -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  :checked="selectedCommissions.length === payableCommissions.length && payableCommissions.length > 0"
                  @change="toggleSelectAll"
                  class="rounded"
                />
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bayi</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Odeme Tutari</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oran</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Komisyon</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Islemler</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="commission in commissions" :key="commission._id">
              <td class="px-4 py-4">
                <input
                  v-if="commission.status === 'pending' || commission.status === 'approved'"
                  type="checkbox"
                  :value="commission._id"
                  v-model="selectedCommissions"
                  class="rounded"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDateTime(commission.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ commission.dealer?.name || '-' }}</div>
                <div class="text-xs text-gray-500">{{ commission.dealer?.contactEmail }}</div>
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
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button @click="viewDetails(commission)" class="text-blue-600 hover:text-blue-900">Detay</button>
                <button
                  v-if="commission.status === 'pending'"
                  @click="approveCommission(commission)"
                  class="text-green-600 hover:text-green-900"
                >
                  Onayla
                </button>
                <button
                  v-if="commission.status === 'pending' || commission.status === 'approved'"
                  @click="openPayModal(commission)"
                  class="text-purple-600 hover:text-purple-900"
                >
                  Ode
                </button>
                <button
                  v-if="commission.status === 'pending' || commission.status === 'approved'"
                  @click="cancelCommission(commission)"
                  class="text-red-600 hover:text-red-900"
                >
                  Iptal
                </button>
              </td>
            </tr>
            <tr v-if="commissions.length === 0">
              <td colspan="8" class="px-6 py-8 text-center text-gray-500">
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
    </div>

    <!-- Bayi Komisyon Oranlari Tab -->
    <div v-show="activeTab === 'dealers'">
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bayi</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Komisyon Orani</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam Kazanilan</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bekleyen</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Odenen</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Islemler</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="dealer in summary.dealers" :key="dealer._id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ dealer.name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-bold text-blue-600">%{{ dealer.commissionRate }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatCurrency(dealer.totalCommissionEarned) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                {{ formatCurrency(dealer.pendingCommission) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                {{ formatCurrency(dealer.paidCommission) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button @click="openRateModal(dealer)" class="text-blue-600 hover:text-blue-900">
                  Oran Duzenle
                </button>
              </td>
            </tr>
            <tr v-if="!summary.dealers || summary.dealers.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                Bayi bulunamadi
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detay Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 class="text-xl font-bold mb-4">Komisyon Detayi</h2>

        <div v-if="selectedCommission" class="space-y-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Bayi:</span>
              <div class="font-medium">{{ selectedCommission.dealer?.name }}</div>
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

          <div v-if="selectedCommission.approvedAt" class="bg-blue-50 rounded-lg p-3">
            <h4 class="font-semibold text-sm text-blue-700 mb-1">Onay Bilgileri</h4>
            <div class="text-sm text-blue-600">
              <div>Onaylayan: {{ selectedCommission.approvedBy?.email }}</div>
              <div>Tarih: {{ formatDateTime(selectedCommission.approvedAt) }}</div>
            </div>
          </div>

          <div v-if="selectedCommission.paidAt" class="bg-green-50 rounded-lg p-3">
            <h4 class="font-semibold text-sm text-green-700 mb-1">Odeme Bilgileri</h4>
            <div class="text-sm text-green-600">
              <div>Odeyen: {{ selectedCommission.paidBy?.email }}</div>
              <div>Tarih: {{ formatDateTime(selectedCommission.paidAt) }}</div>
              <div>Yontem: {{ paymentMethodText(selectedCommission.paymentMethod) }}</div>
              <div v-if="selectedCommission.paymentReference">Referans: {{ selectedCommission.paymentReference }}</div>
            </div>
          </div>

          <div v-if="selectedCommission.cancelledAt" class="bg-red-50 rounded-lg p-3">
            <h4 class="font-semibold text-sm text-red-700 mb-1">Iptal Bilgileri</h4>
            <div class="text-sm text-red-600">
              <div>Iptal Eden: {{ selectedCommission.cancelledBy?.email }}</div>
              <div>Tarih: {{ formatDateTime(selectedCommission.cancelledAt) }}</div>
              <div v-if="selectedCommission.cancellationReason">Sebep: {{ selectedCommission.cancellationReason }}</div>
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <Button variant="secondary" @click="showDetailModal = false">Kapat</Button>
        </div>
      </div>
    </div>

    <!-- Odeme Modal -->
    <div v-if="showPayModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Komisyon Ode</h2>

        <div class="space-y-4">
          <div v-if="payingCommission">
            <div class="text-sm text-gray-500">Komisyon Tutari</div>
            <div class="text-2xl font-bold text-green-600">{{ formatCurrency(payingCommission.amount) }}</div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Odeme Yontemi</label>
            <select v-model="payForm.paymentMethod" class="w-full border rounded-lg px-3 py-2">
              <option value="bank_transfer">Banka Havalesi</option>
              <option value="eft">EFT</option>
              <option value="cash">Nakit</option>
              <option value="other">Diger</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Dekont/Referans No *</label>
            <input
              v-model="payForm.paymentReference"
              type="text"
              class="w-full border rounded-lg px-3 py-2"
              placeholder="Odeme referans numarasi"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Not</label>
            <textarea
              v-model="payForm.notes"
              class="w-full border rounded-lg px-3 py-2"
              rows="2"
              placeholder="Opsiyonel not"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end space-x-2 mt-6">
          <Button variant="secondary" @click="showPayModal = false">Iptal</Button>
          <Button @click="submitPayment" :disabled="!payForm.paymentReference" class="bg-green-600 hover:bg-green-700">
            Odemeyi Onayla
          </Button>
        </div>
      </div>
    </div>

    <!-- Toplu Odeme Modal -->
    <div v-if="showBulkPayModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Toplu Komisyon Odeme</h2>

        <div class="space-y-4">
          <div class="bg-blue-50 rounded-lg p-3">
            <div class="text-sm text-blue-700">{{ selectedCommissions.length }} komisyon secildi</div>
            <div class="text-xl font-bold text-blue-600">Toplam: {{ formatCurrency(selectedTotalAmount) }}</div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Odeme Yontemi</label>
            <select v-model="bulkPayForm.paymentMethod" class="w-full border rounded-lg px-3 py-2">
              <option value="bank_transfer">Banka Havalesi</option>
              <option value="eft">EFT</option>
              <option value="cash">Nakit</option>
              <option value="other">Diger</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Dekont/Referans No *</label>
            <input
              v-model="bulkPayForm.paymentReference"
              type="text"
              class="w-full border rounded-lg px-3 py-2"
              placeholder="Odeme referans numarasi"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Not</label>
            <textarea
              v-model="bulkPayForm.notes"
              class="w-full border rounded-lg px-3 py-2"
              rows="2"
              placeholder="Opsiyonel not"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end space-x-2 mt-6">
          <Button variant="secondary" @click="showBulkPayModal = false">Iptal</Button>
          <Button
            @click="submitBulkPayment"
            :disabled="!bulkPayForm.paymentReference"
            class="bg-green-600 hover:bg-green-700"
          >
            Toplu Odeme Yap
          </Button>
        </div>
      </div>
    </div>

    <!-- Oran Duzenleme Modal -->
    <div v-if="showRateModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Komisyon Orani Duzenle</h2>

        <div v-if="editingDealer" class="space-y-4">
          <div>
            <span class="text-gray-500">Bayi:</span>
            <div class="font-medium">{{ editingDealer.name }}</div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Komisyon Orani (%)</label>
            <input
              v-model.number="rateForm.rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div class="flex justify-end space-x-2 mt-6">
          <Button variant="secondary" @click="showRateModal = false">Iptal</Button>
          <Button @click="updateRate">Kaydet</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const toast = useToastStore()
const confirmModal = useConfirmStore()
const activeTab = ref('commissions')
const commissions = ref([])
const summary = ref({ dealers: [], totals: {} })
const selectedCommissions = ref([])

const showDetailModal = ref(false)
const showPayModal = ref(false)
const showBulkPayModal = ref(false)
const showRateModal = ref(false)

const selectedCommission = ref(null)
const payingCommission = ref(null)
const editingDealer = ref(null)

const filters = ref({
  status: '',
  dealerId: ''
})

const pagination = ref({
  page: 1,
  pages: 1,
  total: 0
})

const payForm = ref({
  paymentMethod: 'bank_transfer',
  paymentReference: '',
  notes: ''
})

const bulkPayForm = ref({
  paymentMethod: 'bank_transfer',
  paymentReference: '',
  notes: ''
})

const rateForm = ref({
  rate: 10
})

const payableCommissions = computed(() => {
  return commissions.value.filter(c => c.status === 'pending' || c.status === 'approved')
})

const selectedTotalAmount = computed(() => {
  return commissions.value
    .filter(c => selectedCommissions.value.includes(c._id))
    .reduce((sum, c) => sum + c.amount, 0)
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
    approved: 'Onaylandi',
    paid: 'Odendi',
    cancelled: 'Iptal'
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
    if (filters.value.dealerId) params.append('dealerId', filters.value.dealerId)

    const response = await api.get(`/commissions?${params.toString()}`)
    commissions.value = response.data?.data || response.data || []
    if (response.data?.pagination) {
      pagination.value = response.data.pagination
    }
  } catch (error) {
    console.error('Komisyonlar yuklenirken hata:', error)
    commissions.value = []
  }
}

const loadSummary = async () => {
  try {
    const response = await api.get('/commissions/summary')
    summary.value = response.data?.data || response.data || { dealers: [], totals: {} }
  } catch (error) {
    console.error('Ozet yuklenirken hata:', error)
    summary.value = { dealers: [], totals: {} }
  }
}

const resetFilters = () => {
  filters.value = { status: '', dealerId: '' }
  pagination.value.page = 1
  loadCommissions()
}

const changePage = (page) => {
  pagination.value.page = page
  loadCommissions()
}

const toggleSelectAll = (event) => {
  if (event.target.checked) {
    selectedCommissions.value = payableCommissions.value.map(c => c._id)
  } else {
    selectedCommissions.value = []
  }
}

const viewDetails = (commission) => {
  selectedCommission.value = commission
  showDetailModal.value = true
}

const approveCommission = async (commission) => {
  const confirmed = await confirmModal.show({
    title: 'Komisyonu Onayla',
    message: 'Bu komisyonu onaylamak istediğinize emin misiniz?',
    type: 'info',
    confirmText: 'Onayla'
  })
  if (!confirmed) return

  try {
    await api.post(`/commissions/${commission._id}/approve`)
    loadCommissions()
    loadSummary()
    toast.success('Komisyon onaylandı')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Onay işlemi başarısız')
  }
}

const openPayModal = (commission) => {
  payingCommission.value = commission
  payForm.value = {
    paymentMethod: 'bank_transfer',
    paymentReference: '',
    notes: ''
  }
  showPayModal.value = true
}

const submitPayment = async () => {
  if (!payForm.value.paymentReference) {
    toast.warning('Dekont/referans numarası zorunludur')
    return
  }

  try {
    await api.post(`/commissions/${payingCommission.value._id}/pay`, payForm.value)
    showPayModal.value = false
    loadCommissions()
    loadSummary()
    toast.success('Komisyon ödendi')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Ödeme işlemi başarısız')
  }
}

const submitBulkPayment = async () => {
  if (!bulkPayForm.value.paymentReference) {
    toast.warning('Dekont/referans numarası zorunludur')
    return
  }

  try {
    const response = await api.post('/commissions/bulk-pay', {
      commissionIds: selectedCommissions.value,
      ...bulkPayForm.value
    })
    showBulkPayModal.value = false
    selectedCommissions.value = []
    loadCommissions()
    loadSummary()
    toast.success(response.data?.message || 'Toplu ödeme tamamlandı')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Toplu ödeme işlemi başarısız')
  }
}

const cancelCommission = async (commission) => {
  const reason = prompt('İptal sebebini girin:')
  if (!reason) return

  try {
    await api.post(`/commissions/${commission._id}/cancel`, { reason })
    loadCommissions()
    loadSummary()
    toast.success('Komisyon iptal edildi')
  } catch (error) {
    toast.error(error.response?.data?.message || 'İptal işlemi başarısız')
  }
}

const openRateModal = (dealer) => {
  editingDealer.value = dealer
  rateForm.value = { rate: dealer.commissionRate || 10 }
  showRateModal.value = true
}

const updateRate = async () => {
  try {
    await api.put(`/commissions/dealer/${editingDealer.value._id}/rate`, {
      rate: rateForm.value.rate
    })
    showRateModal.value = false
    loadSummary()
    toast.success('Komisyon oranı güncellendi')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Güncelleme başarısız')
  }
}

onMounted(() => {
  loadCommissions()
  loadSummary()
})
</script>
