<template>
  <div class="p-6">
    <div class="flex justify-end items-center mb-6">
      <div v-if="(isBayiAdmin || isSuperAdmin) && !isEmployee" class="flex gap-2">
        <select
          v-model="selectedCompanyId"
          @change="loadSummary"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Şirket Seçiniz</option>
          <option v-for="comp in companies" :key="comp._id" :value="comp._id">
            {{ comp.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Yükleniyor...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Summary Table -->
    <div v-if="!loading && summary.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Çalışan Adı
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              İşe Giriş Tarihi
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hakediş Günü
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kullanılan Gün
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kalan Gün
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sonraki Hakediş Tarihi
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in summary" :key="item.employeeId" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              <button
                @click="openEmployeeLedger(item)"
                class="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                {{ item.name }}
              </button>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(item.hireDate) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                {{ item.accrualDays }} gün
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                {{ item.usedDays }} gün
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span
                :class="{
                  'bg-green-100 text-green-800': item.remainingDays > 0,
                  'bg-red-100 text-red-800': item.remainingDays <= 0
                }"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ item.remainingDays }} gün
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.nextAccrualDate }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && summary.length === 0" class="bg-white rounded-lg shadow p-8 text-center">
      <p class="text-gray-500">Henüz çalışan bulunmuyor.</p>
    </div>

    <!-- İzin Cetveli Modal -->
    <div v-if="showLedgerModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <!-- Modal Header -->
        <div class="flex justify-between items-center p-6 border-b">
          <div>
            <h3 class="text-xl font-bold text-gray-800">{{ selectedEmployeeName }} - İzin Cetveli</h3>
            <p class="text-sm text-gray-500 mt-1">{{ selectedYear }} Yılı</p>
          </div>
          <div class="flex items-center gap-4">
            <!-- Yıl Seçimi -->
            <select v-model="selectedYear" @change="loadEmployeeLedger" class="px-3 py-2 border rounded-lg text-sm">
              <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
            </select>
            <button
              @click="closeLedgerModal"
              class="text-gray-500 hover:text-gray-700 p-2"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="flex-1 overflow-y-auto p-6">
          <!-- Loading -->
          <div v-if="ledgerLoading" class="text-center py-8">
            <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p class="text-gray-600">Yükleniyor...</p>
          </div>

          <!-- Ledger Table -->
          <div v-else-if="ledgerEntries.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">No</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">Alacak (Hak)</th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-50">Borç (Kullanılan)</th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">Bakiye</th>
                  <th v-if="canDelete" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="(entry, index) in ledgerEntries"
                  :key="entry._id"
                  :class="{ 'hover:bg-blue-50 cursor-pointer': entry.leaveRequest }"
                  @click="entry.leaveRequest ? showLeaveDetail(entry.leaveRequest) : null"
                >
                  <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ index + 1 }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatDate(entry.date) }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="flex items-center gap-2">
                      <span :class="getTypeBadgeClass(entry.type)" class="px-2 py-1 rounded text-xs font-medium">
                        {{ getTypeLabel(entry.type) }}
                      </span>
                      <span :class="{ 'text-blue-600': entry.leaveRequest }">
                        {{ entry.description }}
                      </span>
                      <svg v-if="entry.leaveRequest" class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </div>
                    <div v-if="entry.note" class="text-xs text-gray-500 mt-1">Not: {{ entry.note }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center font-medium bg-green-50">
                    <span v-if="entry.credit > 0" class="text-green-600">{{ entry.credit }}</span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center font-medium bg-red-50">
                    <span v-if="entry.debit > 0" class="text-red-600">{{ entry.debit }}</span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center font-bold bg-blue-50">
                    <span :class="entry.balance >= 0 ? 'text-blue-600' : 'text-red-600'">
                      {{ entry.balance }}
                    </span>
                  </td>
                  <td v-if="canDelete" class="px-4 py-4 whitespace-nowrap text-sm text-center">
                    <button
                      @click.stop="confirmDeleteEntry(entry)"
                      class="text-red-600 hover:text-red-800 p-1"
                      title="Sil"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
                <!-- Toplam Satırı -->
                <tr v-if="ledgerEntries.length > 0" class="bg-gray-100 font-bold">
                  <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">TOPLAM</td>
                  <td class="px-6 py-4 text-sm text-gray-900"></td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-green-700 bg-green-100">
                    {{ ledgerTotals?.totalCredit || 0 }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-red-700 bg-red-100">
                    {{ ledgerTotals?.totalDebit || 0 }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-blue-700 bg-blue-100">
                    {{ ledgerTotals?.balance || 0 }}
                  </td>
                  <td v-if="canDelete" class="px-4 py-4"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div v-else class="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Bu yıl için kayıt bulunamadı
          </div>
        </div>
      </div>
    </div>
    <!-- İzin Detay Modal -->
    <div v-if="showLeaveDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-gray-800">İzin Talebi Detayı</h3>
          <button @click="closeLeaveDetailModal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="leaveDetailLoading" class="text-center py-8">
          <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p class="text-gray-500 mt-2">Yükleniyor...</p>
        </div>

        <div v-else-if="selectedLeaveRequest" class="space-y-4">
          <!-- Durum Badge -->
          <div class="flex items-center gap-3">
            <span :class="getLeaveStatusClass(selectedLeaveRequest.status)" class="px-3 py-1 rounded-full text-sm font-semibold">
              {{ getLeaveStatusLabel(selectedLeaveRequest.status) }}
            </span>
            <span class="text-gray-500 text-sm">{{ formatDate(selectedLeaveRequest.createdAt) }} tarihinde oluşturuldu</span>
          </div>

          <!-- Temel Bilgiler -->
          <div class="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p class="text-xs text-gray-500 mb-1">İzin Türü</p>
              <p class="font-semibold text-gray-800">{{ selectedLeaveRequest.leaveSubType?.name || selectedLeaveRequest.companyLeaveType?.name || selectedLeaveRequest.type || '-' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Toplam Gün</p>
              <p class="font-semibold text-gray-800">{{ selectedLeaveRequest.totalDays || '-' }} gün</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Başlangıç Tarihi</p>
              <p class="font-semibold text-gray-800">{{ formatDate(selectedLeaveRequest.startDate) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Bitiş Tarihi</p>
              <p class="font-semibold text-gray-800">{{ formatDate(selectedLeaveRequest.endDate) }}</p>
            </div>
          </div>

          <!-- Açıklama -->
          <div v-if="selectedLeaveRequest.description">
            <p class="text-xs text-gray-500 mb-1">Açıklama</p>
            <p class="text-gray-700 bg-gray-50 p-3 rounded-lg">{{ selectedLeaveRequest.description }}</p>
          </div>

          <!-- Onay Geçmişi -->
          <div v-if="selectedLeaveRequest.history && selectedLeaveRequest.history.length > 0" class="border-t pt-4">
            <p class="text-xs text-gray-500 mb-2">Onay Geçmişi</p>
            <div class="space-y-2">
              <div
                v-for="(item, idx) in selectedLeaveRequest.history"
                :key="idx"
                class="flex items-center gap-2 text-sm"
              >
                <span :class="item.status === 'APPROVED' ? 'text-green-600' : item.status === 'REJECTED' ? 'text-red-600' : 'text-yellow-600'">
                  {{ item.approver?.firstName }} {{ item.approver?.lastName || 'Yetkili' }}
                </span>
                <span class="text-gray-400">•</span>
                <span>{{ getLeaveStatusLabel(item.status) }}</span>
                <span class="text-gray-400">•</span>
                <span class="text-gray-500">{{ formatDate(item.date) }}</span>
              </div>
            </div>
          </div>

          <!-- Red Nedeni -->
          <div v-if="selectedLeaveRequest.rejectReason" class="bg-red-50 border border-red-200 p-3 rounded-lg">
            <p class="text-xs text-red-600 mb-1">Red Nedeni</p>
            <p class="text-red-700">{{ selectedLeaveRequest.rejectReason }}</p>
          </div>

          <!-- Dosya Eki -->
          <div v-if="selectedLeaveRequest.document" class="border-t pt-4">
            <p class="text-xs text-gray-500 mb-2">Ek Dosya</p>
            <a
              :href="selectedLeaveRequest.document"
              target="_blank"
              class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Dosyayı Görüntüle
            </a>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button @click="closeLeaveDetailModal" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Kapat
          </button>
        </div>
      </div>
    </div>

    <!-- Silme Onay Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-gray-800">Kaydı Sil</h3>
        </div>

        <div class="mb-4">
          <p class="text-gray-600 mb-2">Bu cetvel kaydını silmek istediğinizden emin misiniz?</p>
          <div class="bg-gray-50 p-3 rounded-lg text-sm">
            <p><strong>Tarih:</strong> {{ formatDate(entryToDelete?.date) }}</p>
            <p><strong>Açıklama:</strong> {{ entryToDelete?.description }}</p>
            <p v-if="entryToDelete?.leaveRequest" class="text-orange-600 mt-2">
              Bu kayda bağlı izin talebi de silinecektir.
            </p>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Silme Nedeni (opsiyonel)</label>
          <input
            v-model="deleteReason"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Silme nedenini giriniz..."
          />
        </div>

        <div class="flex justify-end gap-3">
          <button
            @click="cancelDelete"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            İptal
          </button>
          <button
            @click="executeDelete"
            :disabled="deleteLoading"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <span v-if="deleteLoading">Siliniyor...</span>
            <span v-else>Sil</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const authStore = useAuthStore()
const toast = useToastStore()
const summary = ref([])
const companies = ref([])
const selectedCompanyId = ref('')
const loading = ref(false)
const error = ref(null)

// İzin Cetveli Modal
const showLedgerModal = ref(false)
const selectedEmployeeId = ref('')
const selectedEmployeeName = ref('')
const selectedYear = ref(new Date().getFullYear())
const ledgerEntries = ref([])
const ledgerTotals = ref({ totalCredit: 0, totalDebit: 0, balance: 0 })
const ledgerLoading = ref(false)

// İzin Detay Modal
const showLeaveDetailModal = ref(false)
const selectedLeaveRequest = ref(null)
const leaveDetailLoading = ref(false)

// Silme Modal
const showDeleteModal = ref(false)
const entryToDelete = ref(null)
const deleteReason = ref('')
const deleteLoading = ref(false)

const isBayiAdmin = computed(() => authStore.isBayiAdmin)
const isSuperAdmin = computed(() => authStore.isSuperAdmin)
const isEmployee = computed(() => authStore.hasRole('employee'))
const canDelete = computed(() => {
  return isSuperAdmin.value || isBayiAdmin.value || authStore.hasRole('company_admin') || authStore.hasRole('resmi_muhasebe_ik')
})

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
    companies.value = []
  }
}

const loadSummary = async () => {
  loading.value = true
  error.value = null

  try {
    let companyId = selectedCompanyId.value
    
    // Employee için companyId göndermeye gerek yok (backend kendi buluyor)
    if (isEmployee.value) {
      companyId = null
    } else if (!companyId && authStore.companyId) {
      companyId = authStore.companyId
    }

    if (!companyId && (isBayiAdmin.value || isSuperAdmin.value)) {
      error.value = 'Lütfen bir şirket seçiniz'
      loading.value = false
      return
    }

    if (!companyId && !isEmployee.value) {
      error.value = 'Şirket bilgisi bulunamadı'
      loading.value = false
      return
    }

    const params = companyId ? { companyId } : {}
    const response = await api.get('/leave/summary', { params })

    if (response.data.success) {
      summary.value = response.data.data || []
    } else {
      error.value = response.data.error || 'Özet yüklenemedi'
    }
  } catch (err) {
    console.error('Özet yükleme hatası:', err)
    error.value = err.response?.data?.error || 'Özet yüklenirken bir hata oluştu'
  } finally {
    loading.value = false
  }
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR')
}

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
})

const getTypeLabel = (type) => {
  const labels = {
    CARRYOVER: 'Devir',
    ENTITLEMENT: 'Hak Edilen',
    USED: 'Kullanılan',
    REVERSAL: 'İade',
    ADJUSTMENT: 'Düzeltme'
  }
  return labels[type] || type
}

const getTypeBadgeClass = (type) => {
  const classes = {
    CARRYOVER: 'bg-purple-100 text-purple-800',
    ENTITLEMENT: 'bg-green-100 text-green-800',
    USED: 'bg-red-100 text-red-800',
    REVERSAL: 'bg-blue-100 text-blue-800',
    ADJUSTMENT: 'bg-orange-100 text-orange-800'
  }
  return classes[type] || 'bg-gray-100 text-gray-800'
}

// İzin Detay fonksiyonları
const getLeaveStatusLabel = (status) => {
  const labels = {
    PENDING: 'Bekliyor',
    IN_PROGRESS: 'İşlemde',
    APPROVED: 'Onaylandı',
    REJECTED: 'Reddedildi',
    CANCELLED: 'İptal Edildi',
    CANCELLATION_REQUESTED: 'İptal Talebi'
  }
  return labels[status] || status
}

const getLeaveStatusClass = (status) => {
  const classes = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    CANCELLATION_REQUESTED: 'bg-orange-100 text-orange-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const showLeaveDetail = async (leaveRequest) => {
  showLeaveDetailModal.value = true
  leaveDetailLoading.value = true

  try {
    const requestId = typeof leaveRequest === 'object' ? leaveRequest._id : leaveRequest

    if (typeof leaveRequest === 'object' && leaveRequest.startDate) {
      selectedLeaveRequest.value = leaveRequest
    } else {
      const response = await api.get(`/leave-requests/${requestId}`)
      selectedLeaveRequest.value = response.data?.data || response.data
    }
  } catch (err) {
    console.error('İzin detayı yüklenemedi:', err)
    toast.error('İzin detayı yüklenemedi')
    showLeaveDetailModal.value = false
  } finally {
    leaveDetailLoading.value = false
  }
}

const closeLeaveDetailModal = () => {
  showLeaveDetailModal.value = false
  selectedLeaveRequest.value = null
}

const openEmployeeLedger = (item) => {
  selectedEmployeeId.value = item.employeeId
  selectedEmployeeName.value = item.name
  selectedYear.value = new Date().getFullYear()
  showLedgerModal.value = true
  loadEmployeeLedger()
}

const closeLedgerModal = () => {
  showLedgerModal.value = false
  selectedEmployeeId.value = ''
  selectedEmployeeName.value = ''
  ledgerEntries.value = []
  ledgerTotals.value = { totalCredit: 0, totalDebit: 0, balance: 0 }
}

const loadEmployeeLedger = async () => {
  if (!selectedEmployeeId.value) return

  ledgerLoading.value = true
  try {
    const response = await api.get(`/leave-ledger/employee/${selectedEmployeeId.value}/${selectedYear.value}`)
    ledgerEntries.value = response.data.entries || []
    ledgerTotals.value = response.data.totals || { totalCredit: 0, totalDebit: 0, balance: 0 }
  } catch (error) {
    console.error('İzin cetveli yüklenemedi:', error)
    toast.error(error.response?.data?.message || 'İzin cetveli yüklenemedi')
    ledgerEntries.value = []
    ledgerTotals.value = { totalCredit: 0, totalDebit: 0, balance: 0 }
  } finally {
    ledgerLoading.value = false
  }
}

// Silme fonksiyonları
const confirmDeleteEntry = (entry) => {
  entryToDelete.value = entry
  deleteReason.value = ''
  showDeleteModal.value = true
}

const cancelDelete = () => {
  showDeleteModal.value = false
  entryToDelete.value = null
  deleteReason.value = ''
}

const executeDelete = async () => {
  if (!entryToDelete.value) return

  deleteLoading.value = true
  try {
    await api.delete(`/leave-ledger/${entryToDelete.value._id}`, {
      data: { reason: deleteReason.value }
    })

    const hasLeaveRequest = !!entryToDelete.value.leaveRequest
    toast.success(hasLeaveRequest ? 'Kayıt ve ilgili izin talebi silindi' : 'Kayıt silindi')

    // Listeyi yenile
    await loadEmployeeLedger()
    cancelDelete()
  } catch (error) {
    console.error('Silme hatası:', error)
    toast.error(error.response?.data?.message || 'Silme işlemi başarısız')
  } finally {
    deleteLoading.value = false
  }
}

onMounted(async () => {
  if (isBayiAdmin.value || isSuperAdmin.value) {
    await loadCompanies()
  } else {
    // Employee ve company_admin için otomatik yükle
    await loadSummary()
  }
})
</script>

<style scoped>
</style>

