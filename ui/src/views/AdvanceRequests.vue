<template>
  <div class="p-6">
    <!-- İstatistik Kartları -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam Talep</div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.totalRequests }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Bekleyen</div>
        <div class="text-2xl font-bold text-orange-600">{{ stats.pendingRequests }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Onaylanan</div>
        <div class="text-2xl font-bold text-green-600">{{ stats.approvedRequests }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Kalan Borç</div>
        <div class="text-2xl font-bold text-red-600">{{ formatCurrency(stats.remainingAmount) }}</div>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-sm font-semibold text-gray-700">Filtreler</h3>
        <button
          v-if="canCreate"
          @click="$router.push('/advance-requests/create')"
          class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Yeni Avans Talebi
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select
            v-model="filters.status"
            @change="loadRequests"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="PENDING">Bekleyen</option>
            <option value="APPROVED">Onaylanan</option>
            <option value="REJECTED">Reddedilen</option>
            <option value="CANCELLED">İptal</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tablo -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 table-fixed">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-16 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
              <th class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
              <th v-if="!isEmployee" class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan</th>
              <th class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
              <th class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taksit</th>
              <th class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
              <th class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onaylayıcı</th>
              <th class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(request, index) in requests" :key="request._id" :class="{ 'bg-gray-50': index % 2 === 1, 'bg-white': index % 2 === 0 }">
              <td class="px-2 py-3 text-sm text-gray-900 font-medium">
                {{ index + 1 }}
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-900">{{ formatDate(request.requestDate) }}</div>
              </td>
              <td v-if="!isEmployee" class="px-2 py-3">
                <div class="text-sm text-gray-900 truncate" :title="`${request.employee?.firstName} ${request.employee?.lastName}`">
                  {{ request.employee?.firstName }} {{ request.employee?.lastName }}
                </div>
                <div class="text-sm text-gray-500 truncate" :title="request.employee?.employeeNumber">
                  {{ request.employee?.employeeNumber }}
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-900 font-semibold">{{ formatCurrency(request.amount) }}</div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600">{{ request.installments }} ay</div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm" :class="request.remainingAmount > 0 ? 'text-red-600 font-semibold' : 'text-green-600'">
                  {{ formatCurrency(request.remainingAmount) }}
                </div>
              </td>
              <td class="px-2 py-3">
                <span :class="getStatusClass(request.status)" class="px-1.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap">
                  {{ getStatusLabel(request.status) }}
                </span>
              </td>
              <td class="px-2 py-3 text-sm text-gray-500">
                <span v-if="request.currentApprover && request.status === 'PENDING'">
                  {{ request.currentApprover.firstName }} {{ request.currentApprover.lastName }}
                </span>
                <span v-else-if="request.status === 'APPROVED'" class="text-green-600">-</span>
                <span v-else-if="request.status === 'REJECTED'" class="text-red-600">-</span>
                <span v-else-if="request.status === 'PENDING'" class="text-blue-600">Şirket Admin</span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-2 py-3">
                <div class="flex gap-1">
                  <button
                    @click="viewDetails(request)"
                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="Detay"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                  <button
                    v-if="canApprove(request)"
                    @click="approveRequest(request)"
                    class="p-1.5 text-green-600 hover:bg-green-50 rounded"
                    title="Onayla"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </button>
                  <button
                    v-if="canReject(request)"
                    @click="showRejectModal(request)"
                    class="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Reddet"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                  <button
                    v-if="canCancel(request)"
                    @click="cancelRequest(request)"
                    class="p-1.5 text-gray-600 hover:bg-gray-50 rounded"
                    title="İptal"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="requests.length === 0">
              <td :colspan="isEmployee ? 8 : 9" class="px-6 py-8 text-center text-gray-500">
                Avans talebi bulunamadı
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detay Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4 text-gray-800">Avans Talebi Detayı</h2>

        <div v-if="selectedRequest" class="space-y-4">
          <!-- Temel Bilgiler -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Talep Tarihi</label>
              <div class="text-gray-900">{{ formatDate(selectedRequest.requestDate) }}</div>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Durum</label>
              <div>
                <span :class="getStatusClass(selectedRequest.status)" class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ getStatusLabel(selectedRequest.status) }}
                </span>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Tutar</label>
              <div class="text-gray-900 font-bold">{{ formatCurrency(selectedRequest.amount) }}</div>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Taksit</label>
              <div class="text-gray-900">{{ selectedRequest.installments }} ay</div>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Kalan Borç</label>
              <div class="text-red-600 font-semibold">{{ formatCurrency(selectedRequest.remainingAmount) }}</div>
            </div>
          </div>

          <!-- Gerekçe -->
          <div>
            <label class="text-sm font-medium text-gray-500">Gerekçe</label>
            <div class="text-gray-900 bg-gray-50 p-3 rounded">{{ selectedRequest.reason }}</div>
          </div>

          <!-- Onaylayıcı -->
          <div v-if="selectedRequest.currentApprover && selectedRequest.status === 'PENDING'">
            <label class="text-sm font-medium text-gray-500">Onay Bekleniyor</label>
            <div class="text-blue-700 font-medium">
              {{ selectedRequest.currentApprover.firstName }} {{ selectedRequest.currentApprover.lastName }}
            </div>
          </div>

          <!-- Ödeme Planı -->
          <div v-if="selectedRequest.paymentSchedule && selectedRequest.paymentSchedule.length > 0">
            <label class="text-sm font-medium text-gray-500 mb-2 block">Ödeme Planı</label>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-4 py-2 text-left">Ay</th>
                    <th class="px-4 py-2 text-left">Tutar</th>
                    <th class="px-4 py-2 text-left">Durum</th>
                    <th class="px-4 py-2 text-left">Ödeme Tarihi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr v-for="(payment, index) in selectedRequest.paymentSchedule" :key="index">
                    <td class="px-4 py-2">{{ payment.month }}</td>
                    <td class="px-4 py-2 font-semibold">{{ formatCurrency(payment.amount) }}</td>
                    <td class="px-4 py-2">
                      <span :class="payment.paid ? 'text-green-600' : 'text-orange-600'">
                        {{ payment.paid ? '✓ Ödendi' : '⏳ Bekliyor' }}
                      </span>
                    </td>
                    <td class="px-4 py-2">
                      {{ payment.paidDate ? formatDate(payment.paidDate) : '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Onay Zinciri -->
          <div v-if="selectedRequest.approvalChain && selectedRequest.approvalChain.length > 0">
            <label class="text-sm font-medium text-gray-500 mb-2 block">Onay Durumu</label>
            <div class="space-y-2">
              <div v-for="(approval, index) in selectedRequest.approvalChain" :key="index"
                   class="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div class="font-medium text-gray-900">{{ approval.approver?.fullName || 'Onayıcı' }}</div>
                  <div class="text-xs text-gray-500">{{ getRoleLabel(approval.role) }}</div>
                </div>
                <span :class="getApprovalStatusClass(approval.status)" class="px-2 py-1 text-xs font-semibold rounded">
                  {{ getApprovalStatusLabel(approval.status) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Red Nedeni -->
          <div v-if="selectedRequest.status === 'REJECTED' && selectedRequest.rejectionReason" class="bg-red-50 border border-red-200 p-3 rounded">
            <label class="text-sm font-medium text-red-800 block mb-1">Red Nedeni</label>
            <div class="text-red-700">{{ selectedRequest.rejectionReason }}</div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            @click="showDetailModal = false"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>

    <!-- Red Modal -->
    <div v-if="showRejectDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4 text-gray-800">Avans Talebini Reddet</h2>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Red Nedeni <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="rejectReason"
            rows="4"
            placeholder="Reddetme nedenini giriniz..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          ></textarea>
        </div>
        <div class="flex gap-3 justify-end">
          <button
            @click="showRejectDialog = false"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            İptal
          </button>
          <button
            @click="rejectRequest"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            :disabled="!rejectReason.trim()"
          >
            Reddet
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import api from '@/services/api'

const authStore = useAuthStore()
const toast = useToastStore()
const confirmModal = useConfirmStore()

const requests = ref([])
const stats = ref({
  totalRequests: 0,
  pendingRequests: 0,
  approvedRequests: 0,
  rejectedRequests: 0,
  totalAmount: 0,
  remainingAmount: 0,
  paidAmount: 0
})

const filters = ref({
  status: ''
})

const showDetailModal = ref(false)
const selectedRequest = ref(null)
const showRejectDialog = ref(false)
const rejectReason = ref('')

const isEmployee = computed(() => authStore.hasRole('employee'))
const canCreate = computed(() => isEmployee.value)

const canApprove = (request) => {
  if (request.status !== 'PENDING') return false
  if (isEmployee.value) return false

  return authStore.hasAnyRole('company_admin', 'hr_manager', 'department_manager')
}

const canReject = (request) => {
  return canApprove(request)
}

const canCancel = (request) => {
  if (!isEmployee.value) return false
  return request.status === 'PENDING'
}

const formatCurrency = (amount) => {
  if (!amount) return '0.00 TL'
  return `${amount.toFixed(2)} TL`
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR')
}

const getStatusLabel = (status) => {
  const labels = {
    'PENDING': 'Bekliyor',
    'APPROVED': 'Onaylandı',
    'REJECTED': 'Reddedildi',
    'CANCELLED': 'İptal'
  }
  return labels[status] || status
}

const getStatusClass = (status) => {
  const classes = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'APPROVED': 'bg-green-100 text-green-800',
    'REJECTED': 'bg-red-100 text-red-800',
    'CANCELLED': 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getApprovalStatusLabel = (status) => {
  const labels = {
    'PENDING': 'Bekliyor',
    'APPROVED': 'Onaylandı',
    'REJECTED': 'Reddedildi'
  }
  return labels[status] || status
}

const getApprovalStatusClass = (status) => {
  const classes = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'APPROVED': 'bg-green-100 text-green-800',
    'REJECTED': 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getRoleLabel = (role) => {
  const labels = {
    'department_manager': 'Departman Yöneticisi',
    'hr_manager': 'İK Yöneticisi',
    'company_admin': 'Şirket Yöneticisi'
  }
  return labels[role] || role
}

const loadRequests = async () => {
  try {
    const params = {}
    if (filters.value.status) {
      params.status = filters.value.status
    }

    const response = await api.get('/advance-requests', { params })
    if (response.data.success) {
      requests.value = response.data.data
    }
  } catch (error) {
    console.error('Avans talepleri yüklenemedi:', error)
    toast.error('Avans talepleri yüklenemedi')
  }
}

const loadStats = async () => {
  try {
    const response = await api.get('/advance-requests/stats/summary')
    if (response.data.success) {
      stats.value = response.data.data
    }
  } catch (error) {
    console.error('İstatistikler yüklenemedi:', error)
  }
}

const viewDetails = (request) => {
  selectedRequest.value = request
  showDetailModal.value = true
}

const approveRequest = async (request) => {
  const confirmed = await confirmModal.show({
    title: 'Avans Talebini Onayla',
    message: 'Bu avans talebini onaylamak istediğinize emin misiniz?',
    type: 'info',
    confirmText: 'Onayla'
  })
  if (!confirmed) return

  try {
    const response = await api.post(`/advance-requests/${request._id}/approve`, {
      comment: ''
    })

    if (response.data.success) {
      toast.success(response.data.message)
      await loadRequests()
      await loadStats()
    }
  } catch (error) {
    console.error('Onay hatası:', error)
    toast.error(error.response?.data?.message || 'Onay işlemi başarısız oldu')
  }
}

const showRejectModal = (request) => {
  selectedRequest.value = request
  rejectReason.value = ''
  showRejectDialog.value = true
}

const rejectRequest = async () => {
  if (!rejectReason.value.trim()) {
    toast.warning('Lütfen red nedenini giriniz')
    return
  }

  try {
    const response = await api.post(`/advance-requests/${selectedRequest.value._id}/reject`, {
      reason: rejectReason.value
    })

    if (response.data.success) {
      toast.success(response.data.message)
      showRejectDialog.value = false
      selectedRequest.value = null
      rejectReason.value = ''
      await loadRequests()
      await loadStats()
    }
  } catch (error) {
    console.error('Red hatası:', error)
    toast.error(error.response?.data?.message || 'Red işlemi başarısız oldu')
  }
}

const cancelRequest = async (request) => {
  const confirmed = await confirmModal.show({
    title: 'Avans Talebini İptal Et',
    message: 'Bu avans talebini iptal etmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'İptal Et'
  })
  if (!confirmed) return

  try {
    const response = await api.post(`/advance-requests/${request._id}/cancel`, {
      reason: 'Çalışan tarafından iptal edildi'
    })

    if (response.data.success) {
      toast.success(response.data.message)
      await loadRequests()
      await loadStats()
    }
  } catch (error) {
    console.error('İptal hatası:', error)
    toast.error(error.response?.data?.message || 'İptal işlemi başarısız oldu')
  }
}

onMounted(async () => {
  await loadRequests()
  await loadStats()
})
</script>
