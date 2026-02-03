<template>
  <div class="p-6">
    <!-- İstatistik Kartları -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam Talep</div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.total }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Bekleyen</div>
        <div class="text-2xl font-bold text-orange-600">{{ stats.pending }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Onaylanan</div>
        <div class="text-2xl font-bold text-green-600">{{ stats.approved }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-sm text-gray-500">Toplam Saat</div>
        <div class="text-2xl font-bold text-blue-600">{{ stats.totalHours }} saat</div>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-sm font-semibold text-gray-700">Filtreler</h3>
        <button
          v-if="canCreate"
          @click="showCreateModal = true"
          class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Yeni Fazla Mesai Talebi
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mesai Türü</label>
          <select
            v-model="filters.overtimeType"
            @change="loadRequests"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="DAY">Gündüz Mesaisi</option>
            <option value="NIGHT">Gece Mesaisi</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
          <input
            type="date"
            v-model="filters.startDate"
            @change="loadRequests"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
          <input
            type="date"
            v-model="filters.endDate"
            @change="loadRequests"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
              <th class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mesai Türü</th>
              <th class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talep</th>
              <th class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onaylı</th>
              <th class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(request, index) in requests" :key="request._id" :class="{ 'bg-gray-50': index % 2 === 1, 'bg-white': index % 2 === 0 }">
              <td class="px-2 py-3 text-sm text-gray-900 font-medium">
                {{ index + 1 }}
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-900">{{ formatDate(request.date) }}</div>
                <div v-if="request.startTime && request.endTime" class="text-xs text-gray-500">
                  {{ request.startTime }} - {{ request.endTime }}
                </div>
              </td>
              <td v-if="!isEmployee" class="px-2 py-3">
                <div class="text-sm text-gray-900 truncate" :title="`${request.employee?.firstName} ${request.employee?.lastName}`">
                  {{ request.employee?.firstName }} {{ request.employee?.lastName }}
                </div>
                <div class="text-xs text-gray-500 truncate">
                  {{ request.employee?.employeeNumber || request.employee?.personelNumarasi }}
                </div>
              </td>
              <td class="px-2 py-3">
                <span :class="getOvertimeTypeClass(request.overtimeType)" class="px-2 py-1 text-xs font-semibold rounded-full">
                  {{ getOvertimeTypeLabel(request.overtimeType) }}
                </span>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-900 font-semibold">{{ request.requestedHours }} saat</div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm" :class="request.approvedHours ? 'text-green-600 font-semibold' : 'text-gray-400'">
                  {{ request.approvedHours !== null ? `${request.approvedHours} saat` : '-' }}
                </div>
              </td>
              <td class="px-2 py-3">
                <span :class="getStatusClass(request.status)" class="px-1.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap">
                  {{ getStatusLabel(request.status) }}
                </span>
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
                    @click="showApproveModal(request)"
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
              <td :colspan="isEmployee ? 7 : 8" class="px-6 py-8 text-center text-gray-500">
                Fazla mesai talebi bulunamadı
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detay Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4 text-gray-800">Fazla Mesai Talebi Detayı</h2>

        <div v-if="selectedRequest" class="space-y-4">
          <!-- Temel Bilgiler -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Tarih</label>
              <div class="text-gray-900">{{ formatDate(selectedRequest.date) }}</div>
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
              <label class="text-sm font-medium text-gray-500">Mesai Türü</label>
              <div>
                <span :class="getOvertimeTypeClass(selectedRequest.overtimeType)" class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ getOvertimeTypeLabel(selectedRequest.overtimeType) }}
                </span>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Çalışan</label>
              <div class="text-gray-900">
                {{ selectedRequest.employee?.firstName }} {{ selectedRequest.employee?.lastName }}
              </div>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Talep Edilen Saat</label>
              <div class="text-gray-900 font-bold">{{ selectedRequest.requestedHours }} saat</div>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Onaylanan Saat</label>
              <div class="text-green-600 font-semibold">
                {{ selectedRequest.approvedHours !== null ? `${selectedRequest.approvedHours} saat` : '-' }}
              </div>
            </div>
            <div v-if="selectedRequest.startTime">
              <label class="text-sm font-medium text-gray-500">Başlangıç Saati</label>
              <div class="text-gray-900">{{ selectedRequest.startTime }}</div>
            </div>
            <div v-if="selectedRequest.endTime">
              <label class="text-sm font-medium text-gray-500">Bitiş Saati</label>
              <div class="text-gray-900">{{ selectedRequest.endTime }}</div>
            </div>
          </div>

          <!-- Gerekçe -->
          <div>
            <label class="text-sm font-medium text-gray-500">Gerekçe</label>
            <div class="text-gray-900 bg-gray-50 p-3 rounded">{{ selectedRequest.reason }}</div>
          </div>

          <!-- Onay Bilgileri -->
          <div v-if="selectedRequest.status === 'APPROVED'" class="bg-green-50 border border-green-200 p-3 rounded">
            <label class="text-sm font-medium text-green-800 block mb-1">Onay Bilgisi</label>
            <div class="text-green-700 text-sm">
              <div>Onaylayan: {{ selectedRequest.approvedBy?.email || '-' }}</div>
              <div>Tarih: {{ selectedRequest.approvedAt ? formatDate(selectedRequest.approvedAt) : '-' }}</div>
              <div v-if="selectedRequest.approverComment">Yorum: {{ selectedRequest.approverComment }}</div>
            </div>
          </div>

          <!-- Red Nedeni -->
          <div v-if="selectedRequest.status === 'REJECTED' && selectedRequest.rejectionReason" class="bg-red-50 border border-red-200 p-3 rounded">
            <label class="text-sm font-medium text-red-800 block mb-1">Red Nedeni</label>
            <div class="text-red-700">{{ selectedRequest.rejectionReason }}</div>
          </div>

          <!-- Puantaj Aktarım -->
          <div v-if="selectedRequest.isTransferredToPuantaj" class="bg-blue-50 border border-blue-200 p-3 rounded">
            <label class="text-sm font-medium text-blue-800 block mb-1">Puantaj Aktarımı</label>
            <div class="text-blue-700 text-sm">
              Puantaja aktarıldı: {{ selectedRequest.transferredAt ? formatDate(selectedRequest.transferredAt) : '-' }}
            </div>
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

    <!-- Yeni Talep Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4 text-gray-800">Yeni Fazla Mesai Talebi</h2>
        <form @submit.prevent="createRequest" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Çalışan <span class="text-red-500">*</span>
            </label>
            <select
              v-model="newRequest.employeeId"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seçiniz</option>
              <option v-for="emp in employees" :key="emp._id" :value="emp._id">
                {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeNumber || emp.personelNumarasi }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Tarih <span class="text-red-500">*</span>
            </label>
            <input
              type="date"
              v-model="newRequest.date"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Mesai Türü <span class="text-red-500">*</span>
            </label>
            <select
              v-model="newRequest.overtimeType"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DAY">Gündüz Mesaisi</option>
              <option value="NIGHT">Gece Mesaisi</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Başlangıç Saati</label>
              <input
                type="time"
                v-model="newRequest.startTime"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Bitiş Saati</label>
              <input
                type="time"
                v-model="newRequest.endTime"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Talep Edilen Saat <span class="text-red-500">*</span>
            </label>
            <input
              type="number"
              v-model.number="newRequest.requestedHours"
              required
              min="0.5"
              max="12"
              step="0.5"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Gerekçe <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="newRequest.reason"
              required
              rows="3"
              maxlength="500"
              placeholder="Fazla mesai gerekçesini giriniz..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            ></textarea>
          </div>
          <div class="flex gap-3 justify-end pt-4">
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              İptal
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Oluşturuluyor...' : 'Talep Oluştur' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Onay Modal -->
    <div v-if="showApproveDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4 text-gray-800">Fazla Mesai Talebini Onayla</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Talep Edilen</label>
            <div class="text-lg font-semibold text-gray-900">{{ selectedRequest?.requestedHours }} saat</div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Onaylanan Saat <span class="text-red-500">*</span>
            </label>
            <input
              type="number"
              v-model.number="approveData.approvedHours"
              min="0"
              :max="selectedRequest?.requestedHours || 12"
              step="0.5"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Yorum (Opsiyonel)</label>
            <textarea
              v-model="approveData.comment"
              rows="2"
              placeholder="Onay yorumu..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            ></textarea>
          </div>
        </div>
        <div class="flex gap-3 justify-end mt-6">
          <button
            @click="showApproveDialog = false"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            İptal
          </button>
          <button
            @click="approveRequest"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Onayla
          </button>
        </div>
      </div>
    </div>

    <!-- Red Modal -->
    <div v-if="showRejectDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4 text-gray-800">Fazla Mesai Talebini Reddet</h2>
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
const employees = ref([])
const stats = ref({
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  totalHours: 0
})

const filters = ref({
  status: '',
  overtimeType: '',
  startDate: '',
  endDate: ''
})

const showDetailModal = ref(false)
const showCreateModal = ref(false)
const showApproveDialog = ref(false)
const showRejectDialog = ref(false)
const selectedRequest = ref(null)
const rejectReason = ref('')
const isSubmitting = ref(false)

const newRequest = ref({
  employeeId: '',
  date: '',
  overtimeType: 'DAY',
  requestedHours: 2,
  startTime: '',
  endTime: '',
  reason: ''
})

const approveData = ref({
  approvedHours: 0,
  comment: ''
})

const isEmployee = computed(() => authStore.hasRole('employee'))
const canCreate = computed(() => !isEmployee.value && authStore.hasAnyRole('company_admin', 'hr_manager', 'resmi_muhasebe_ik', 'bayi_admin', 'super_admin'))

const canApprove = (request) => {
  if (request.status !== 'PENDING') return false
  if (isEmployee.value) return false
  return authStore.hasAnyRole('company_admin', 'hr_manager', 'department_manager', 'resmi_muhasebe_ik', 'bayi_admin', 'super_admin')
}

const canReject = (request) => {
  return canApprove(request)
}

const canCancel = (request) => {
  return request.status === 'PENDING' && canApprove(request)
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

const getOvertimeTypeLabel = (type) => {
  return type === 'DAY' ? 'Gündüz' : 'Gece'
}

const getOvertimeTypeClass = (type) => {
  return type === 'DAY' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'
}

const loadRequests = async () => {
  try {
    const params = {}
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.startDate) params.startDate = filters.value.startDate
    if (filters.value.endDate) params.endDate = filters.value.endDate

    const response = await api.get('/overtime-requests', { params })
    let data = response.data
    if (Array.isArray(data)) {
      requests.value = data
    } else if (data.data && Array.isArray(data.data)) {
      requests.value = data.data
    } else {
      requests.value = []
    }

    // Mesai türü filtresi (client-side)
    if (filters.value.overtimeType) {
      requests.value = requests.value.filter(r => r.overtimeType === filters.value.overtimeType)
    }

    // İstatistikleri hesapla
    calculateStats()
  } catch (error) {
    console.error('Fazla mesai talepleri yüklenemedi:', error)
    toast.error('Talepler yüklenemedi')
  }
}

const loadEmployees = async () => {
  if (isEmployee.value) return
  try {
    const response = await api.get('/employees')
    let data = response.data
    if (data.data && Array.isArray(data.data)) {
      employees.value = data.data
    } else if (Array.isArray(data)) {
      employees.value = data
    }
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
  }
}

const calculateStats = () => {
  const all = requests.value
  stats.value = {
    total: all.length,
    pending: all.filter(r => r.status === 'PENDING').length,
    approved: all.filter(r => r.status === 'APPROVED').length,
    rejected: all.filter(r => r.status === 'REJECTED').length,
    totalHours: all.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + (r.approvedHours || 0), 0)
  }
}

const viewDetails = (request) => {
  selectedRequest.value = request
  showDetailModal.value = true
}

const showApproveModal = (request) => {
  selectedRequest.value = request
  approveData.value = {
    approvedHours: request.requestedHours,
    comment: ''
  }
  showApproveDialog.value = true
}

const showRejectModal = (request) => {
  selectedRequest.value = request
  rejectReason.value = ''
  showRejectDialog.value = true
}

const createRequest = async () => {
  if (!newRequest.value.employeeId || !newRequest.value.date || !newRequest.value.reason) {
    toast.warning('Lütfen zorunlu alanları doldurunuz')
    return
  }

  isSubmitting.value = true
  try {
    const response = await api.post('/overtime-requests', newRequest.value)
    toast.success('Fazla mesai talebi oluşturuldu')
    showCreateModal.value = false
    newRequest.value = {
      employeeId: '',
      date: '',
      overtimeType: 'DAY',
      requestedHours: 2,
      startTime: '',
      endTime: '',
      reason: ''
    }
    await loadRequests()
  } catch (error) {
    console.error('Talep oluşturulamadı:', error)
    toast.error(error.response?.data?.message || 'Talep oluşturulamadı')
  } finally {
    isSubmitting.value = false
  }
}

const approveRequest = async () => {
  try {
    await api.put(`/overtime-requests/${selectedRequest.value._id}/approve`, {
      approvedHours: approveData.value.approvedHours,
      comment: approveData.value.comment
    })
    toast.success('Talep onaylandı')
    showApproveDialog.value = false
    selectedRequest.value = null
    await loadRequests()
  } catch (error) {
    console.error('Onay hatası:', error)
    toast.error(error.response?.data?.message || 'Onay işlemi başarısız')
  }
}

const rejectRequest = async () => {
  if (!rejectReason.value.trim()) {
    toast.warning('Lütfen red nedenini giriniz')
    return
  }

  try {
    await api.put(`/overtime-requests/${selectedRequest.value._id}/reject`, {
      reason: rejectReason.value
    })
    toast.success('Talep reddedildi')
    showRejectDialog.value = false
    selectedRequest.value = null
    rejectReason.value = ''
    await loadRequests()
  } catch (error) {
    console.error('Red hatası:', error)
    toast.error(error.response?.data?.message || 'Red işlemi başarısız')
  }
}

const cancelRequest = async (request) => {
  const confirmed = await confirmModal.show({
    title: 'Talebi İptal Et',
    message: 'Bu fazla mesai talebini iptal etmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'İptal Et'
  })
  if (!confirmed) return

  try {
    await api.put(`/overtime-requests/${request._id}/cancel`)
    toast.success('Talep iptal edildi')
    await loadRequests()
  } catch (error) {
    console.error('İptal hatası:', error)
    toast.error(error.response?.data?.message || 'İptal işlemi başarısız')
  }
}

onMounted(async () => {
  await loadRequests()
  await loadEmployees()
})
</script>
