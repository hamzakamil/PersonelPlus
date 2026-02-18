<template>
  <div>
    <!-- Çalışan için Bakiye Özeti -->
    <div v-if="isEmployee && ledgerData" class="mb-6 bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold mb-4">İzin Bakiyem</h2>
      <div class="grid grid-cols-3 gap-4">
        <div class="text-center p-4 bg-green-50 rounded-lg">
          <div class="text-2xl font-bold text-green-600">{{ ledgerData?.totals?.totalCredit || 0 }}</div>
          <div class="text-sm text-gray-600 mt-1">Toplam Hak Edilen</div>
        </div>
        <div class="text-center p-4 bg-red-50 rounded-lg">
          <div class="text-2xl font-bold text-red-600">{{ ledgerData?.totals?.totalDebit || 0 }}</div>
          <div class="text-sm text-gray-600 mt-1">Kullanılan</div>
        </div>
        <div class="text-center p-4 bg-blue-50 rounded-lg">
          <div class="text-2xl font-bold text-blue-600">{{ ledgerData?.totals?.balance || 0 }}</div>
          <div class="text-sm text-gray-600 mt-1">Kalan İzin</div>
        </div>
      </div>
    </div>

    <!-- Bayi Admin için Şirket Seçimi -->
    <div v-if="isBayiAdmin && !isEmployee" class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        İşlem Yapmak İstediğiniz Şirketi Seçiniz <span class="text-red-500">*</span>
      </label>
      <select
        v-model="selectedCompanyId"
        @change="loadEmployees"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      >
        <option value="">Şirket Seçiniz</option>
        <option v-for="comp in companies" :key="comp._id" :value="comp._id">
          {{ comp.name }}
        </option>
      </select>
      <p v-if="!selectedCompanyId" class="mt-2 text-sm text-yellow-600">
        Lütfen işlem yapmak istediğiniz şirketi seçiniz.
      </p>
    </div>

    <div class="flex justify-end items-center mb-6">
      <div class="flex items-center gap-4">
        <!-- Çalışan Seçimi (sadece admin için) -->
        <select
          v-if="!isEmployee"
          v-model="selectedEmployee"
          :disabled="isBayiAdmin && !selectedCompanyId"
          class="px-3 py-2 border rounded-lg min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Çalışan Seçin</option>
          <option v-for="emp in employees" :key="emp._id" :value="emp._id">
            {{ emp.firstName }} {{ emp.lastName }}
          </option>
        </select>

        <!-- Yıl Seçimi -->
        <select v-model="selectedYear" @change="loadLedger" class="px-3 py-2 border rounded-lg">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>

        <!-- Butonlar (sadece admin için) -->
        <template v-if="!isEmployee">
          <button
            @click="showCarryoverModal = true"
            :disabled="!selectedEmployee"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            + Devir Ekle
          </button>
          <button
            @click="showAdjustmentModal = true"
            :disabled="!selectedEmployee"
            class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            + Düzeltme
          </button>
        </template>
      </div>
    </div>

    <!-- Sonraki Hak Edileceği Tarih Bilgi Kutusu -->
    <div v-if="ledgerData && ledgerData.nextEntitlement" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div class="flex items-center gap-6">
        <div>
          <span class="text-sm text-gray-600">Sonraki Hak Edileceği Tarih:</span>
          <span class="font-bold text-blue-700 ml-2">
            {{ formatDate(ledgerData.nextEntitlement.date) }}
          </span>
          <span class="text-green-600 ml-2">({{ ledgerData.nextEntitlement.days }} gün eklenecek)</span>
        </div>
        <div class="border-l pl-6">
          <span class="text-sm text-gray-600">İşe Giriş:</span>
          <span class="font-medium ml-2">{{ formatDate(ledgerData.employee?.hireDate) }}</span>
        </div>
        <div class="border-l pl-6">
          <span class="text-sm text-gray-600">Kıdem:</span>
          <span class="font-medium ml-2">{{ ledgerData.employee?.seniority }} yıl</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-lg shadow p-8 text-center">
      <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p class="text-gray-600">Yükleniyor...</p>
    </div>

    <!-- Çalışan Seçilmedi (sadece admin için) -->
    <div v-else-if="!isEmployee && !selectedEmployee" class="bg-white rounded-lg shadow p-8 text-center text-gray-500">
      Lütfen bir çalışan seçin
    </div>

    <!-- Cetvel Tablosu -->
    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">No</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">Alacak (Hak)</th>
            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-50">Borç (Kullanılan)</th>
            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">Bakiye</th>
            <th v-if="!isEmployee" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="entries.length === 0">
            <td :colspan="isEmployee ? 6 : 7" class="px-6 py-8 text-center text-gray-500">
              Bu yıl için kayıt bulunamadı
            </td>
          </tr>
          <tr v-for="(entry, index) in entries" :key="entry._id" :class="getRowClass(entry.type)">
            <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ index + 1 }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatDate(entry.date) }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
              <div class="flex items-center gap-2">
                <span :class="getTypeBadgeClass(entry.type)" class="px-2 py-1 rounded text-xs font-medium">
                  {{ getTypeLabel(entry.type) }}
                </span>
                <span
                  v-if="entry.leaveRequest && (entry.type === 'USED' || entry.type === 'REVERSAL')"
                  @click="showLeaveDetail(entry.leaveRequest)"
                  class="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  title="Detayı görüntüle"
                >
                  {{ entry.description }}
                </span>
                <span v-else>{{ entry.description }}</span>
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
            <td v-if="!isEmployee" class="px-6 py-4 whitespace-nowrap text-sm text-center">
              <button
                v-if="!entry.isSystemGenerated || entry.type === 'CARRYOVER'"
                @click="editEntry(entry)"
                class="text-blue-600 hover:text-blue-800 mr-2"
                title="Düzenle"
              >
                <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                v-if="!entry.isSystemGenerated || isAdmin"
                @click="deleteEntry(entry)"
                class="text-red-600 hover:text-red-800"
                :title="entry.isSystemGenerated ? 'Sistem kaydını sil (Admin)' : 'Sil'"
              >
                <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <span v-if="entry.isSystemGenerated" class="text-gray-400 text-xs ml-1">
                (Sistem)
              </span>
            </td>
          </tr>
          <!-- Toplam Satırı -->
          <tr v-if="entries.length > 0" class="bg-gray-100 font-bold">
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900"></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">TOPLAM</td>
            <td class="px-6 py-4 text-sm text-gray-900"></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-green-700 bg-green-100">
              {{ ledgerData?.totals?.totalCredit || 0 }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-red-700 bg-red-100">
              {{ ledgerData?.totals?.totalDebit || 0 }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-blue-700 bg-blue-100">
              {{ ledgerData?.totals?.balance || 0 }}
            </td>
            <td v-if="!isEmployee" class="px-6 py-4"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Devir Modal -->
    <div v-if="showCarryoverModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-bold mb-4">Devir Girişi</h3>
        <p class="text-sm text-gray-600 mb-4">Önceki yıldan devreden izin bakiyesini girin</p>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Gün Sayısı</label>
          <input
            v-model.number="carryoverDays"
            type="number"
            min="0"
            step="0.5"
            class="w-full px-3 py-2 border rounded-lg"
            placeholder="Örn: 5"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Not (Opsiyonel)</label>
          <input
            v-model="carryoverNote"
            type="text"
            class="w-full px-3 py-2 border rounded-lg"
            placeholder="Açıklama..."
          />
        </div>

        <div class="flex justify-end gap-2">
          <button @click="closeCarryoverModal" class="px-4 py-2 border rounded-lg hover:bg-gray-50">
            İptal
          </button>
          <button @click="saveCarryover" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Kaydet
          </button>
        </div>
      </div>
    </div>

    <!-- Düzeltme Modal -->
    <div v-if="showAdjustmentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-bold mb-4">{{ editingEntry ? 'Kayıt Düzenle' : 'Düzeltme Girişi' }}</h3>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
          <input
            v-model="adjustmentDate"
            type="date"
            class="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
          <input
            v-model="adjustmentDescription"
            type="text"
            class="w-full px-3 py-2 border rounded-lg"
            placeholder="Örn: Manuel düzeltme"
          />
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Alacak (Ekleme)</label>
            <input
              v-model.number="adjustmentCredit"
              type="number"
              min="0"
              step="0.5"
              class="w-full px-3 py-2 border rounded-lg"
              placeholder="0"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Borç (Düşme)</label>
            <input
              v-model.number="adjustmentDebit"
              type="number"
              min="0"
              step="0.5"
              class="w-full px-3 py-2 border rounded-lg"
              placeholder="0"
            />
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Not (Opsiyonel)</label>
          <input
            v-model="adjustmentNote"
            type="text"
            class="w-full px-3 py-2 border rounded-lg"
            placeholder="Açıklama..."
          />
        </div>

        <div class="flex justify-end gap-2">
          <button @click="closeAdjustmentModal" class="px-4 py-2 border rounded-lg hover:bg-gray-50">
            İptal
          </button>
          <button @click="saveAdjustment" class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Kaydet
          </button>
        </div>
      </div>
    </div>

    <!-- İzin Detay Modal -->
    <div v-if="showLeaveDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
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
              <p class="font-semibold text-gray-800">{{ selectedLeaveRequest.type || selectedLeaveRequest.leaveType?.name || '-' }}</p>
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
          <div v-if="selectedLeaveRequest.description || selectedLeaveRequest.reason">
            <p class="text-xs text-gray-500 mb-1">Açıklama</p>
            <p class="text-gray-700 bg-gray-50 p-3 rounded-lg">{{ selectedLeaveRequest.description || selectedLeaveRequest.reason }}</p>
          </div>

          <!-- Onay Bilgileri -->
          <div v-if="selectedLeaveRequest.approvedBy || selectedLeaveRequest.rejectedBy" class="border-t pt-4">
            <p class="text-xs text-gray-500 mb-2">Onay Bilgileri</p>
            <div v-if="selectedLeaveRequest.approvedBy" class="flex items-center gap-2 text-green-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ selectedLeaveRequest.approvedBy?.firstName || selectedLeaveRequest.approvedBy?.email || 'Yetkili' }} tarafından onaylandı</span>
              <span v-if="selectedLeaveRequest.approvedAt" class="text-gray-500 text-sm">({{ formatDate(selectedLeaveRequest.approvedAt) }})</span>
            </div>
            <div v-if="selectedLeaveRequest.rejectedBy" class="flex items-center gap-2 text-red-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{{ selectedLeaveRequest.rejectedBy?.firstName || selectedLeaveRequest.rejectedBy?.email || 'Yetkili' }} tarafından reddedildi</span>
            </div>
            <div v-if="selectedLeaveRequest.rejectionReason" class="mt-2 bg-red-50 border border-red-200 p-3 rounded-lg">
              <p class="text-xs text-red-600 mb-1">Red Nedeni</p>
              <p class="text-red-700">{{ selectedLeaveRequest.rejectionReason }}</p>
            </div>
          </div>

          <!-- Dosya Eki -->
          <div v-if="selectedLeaveRequest.attachment" class="border-t pt-4">
            <p class="text-xs text-gray-500 mb-2">Ek Dosya</p>
            <a
              :href="getAttachmentUrl(selectedLeaveRequest.attachment)"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import api from '@/services/api'

const authStore = useAuthStore()
const toast = useToastStore()
const confirmModal = useConfirmStore()

const loading = ref(false)
const employees = ref([])
const selectedEmployee = ref('')
const selectedYear = ref(new Date().getFullYear())
const ledgerData = ref(null)
const entries = ref([])
const companies = ref([])
const selectedCompanyId = ref('')
const isBayiAdmin = computed(() => authStore.isBayiAdmin)
const isEmployee = computed(() => authStore.hasRole('employee'))

// Modal states
const showCarryoverModal = ref(false)
const showAdjustmentModal = ref(false)
const editingEntry = ref(null)
const showLeaveDetailModal = ref(false)
const selectedLeaveRequest = ref(null)
const leaveDetailLoading = ref(false)

// Carryover form
const carryoverDays = ref(0)
const carryoverNote = ref('')

// Adjustment form
const adjustmentDate = ref('')
const adjustmentDescription = ref('')
const adjustmentCredit = ref(0)
const adjustmentDebit = ref(0)
const adjustmentNote = ref('')

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
})

const isAdmin = computed(() => {
  return authStore.hasAnyRole('super_admin', 'bayi_admin', 'company_admin')
})

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

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

const getRowClass = (type) => {
  const classes = {
    CARRYOVER: 'bg-purple-50',
    ENTITLEMENT: 'bg-green-50',
    REVERSAL: 'bg-blue-50'
  }
  return classes[type] || ''
}

// İzin detay helper fonksiyonları
const getLeaveStatusLabel = (status) => {
  const labels = {
    PENDING: 'Bekliyor',
    APPROVED: 'Onaylandı',
    REJECTED: 'Reddedildi',
    CANCELLED: 'İptal Edildi'
  }
  return labels[status] || status
}

const getLeaveStatusClass = (status) => {
  const classes = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getAttachmentUrl = (attachment) => {
  if (!attachment) return ''
  if (attachment.startsWith('http')) return attachment
  return `http://localhost:3333${attachment}`
}

const showLeaveDetail = async (leaveRequest) => {
  showLeaveDetailModal.value = true
  leaveDetailLoading.value = true

  try {
    // leaveRequest bir obje veya ID olabilir
    const requestId = typeof leaveRequest === 'object' ? leaveRequest._id : leaveRequest

    if (typeof leaveRequest === 'object' && leaveRequest.startDate) {
      // Zaten populate edilmiş, direkt kullan
      selectedLeaveRequest.value = leaveRequest
    } else {
      // API'den detayı çek
      const response = await api.get(`/leave-requests/${requestId}`)
      selectedLeaveRequest.value = response.data?.data || response.data
    }
  } catch (error) {
    console.error('İzin detayı yüklenemedi:', error)
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

const loadCompanies = async () => {
  if (isBayiAdmin.value) {
    try {
      const response = await api.get('/companies')
      companies.value = response.data?.data || response.data || []

      // Bayi'nin kendi şirketi varsa onu seç, yoksa ilk şirketi seç
      if (companies.value.length > 0) {
        if (authStore.companyId) {
          // Kullanıcının kendi şirketini bul ve seç
          const userCompany = companies.value.find(c => c._id === authStore.companyId)
          if (userCompany) {
            selectedCompanyId.value = userCompany._id
          } else {
            selectedCompanyId.value = companies.value[0]._id
          }
        } else {
          // Kendi şirketi yoksa ilk şirketi seç
          selectedCompanyId.value = companies.value[0]._id
        }
        // Şirket seçildiğinde çalışanları yükle
        await loadEmployees()
      }
    } catch (error) {
      console.error('Şirketler yüklenemedi:', error)
    }
  }
}

const loadEmployees = async () => {
  try {
    let companyId = null
    
    // Bayi admin için seçilen şirketi kullan
    if (isBayiAdmin.value) {
      if (!selectedCompanyId.value) {
        employees.value = []
        return
      }
      companyId = selectedCompanyId.value
    } else {
      // Diğer roller için kullanıcının şirketini kullan
      companyId = authStore.companyId
    }
    
    if (!companyId) {
      employees.value = []
      return
    }

    const response = await api.get(`/employees?company=${companyId}&status=active`)
    employees.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
    employees.value = []
  }
}

const loadLedger = async () => {
  // Çalışan için kendi cetvelini otomatik yükle
  if (isEmployee.value) {
    loading.value = true
    try {
      const response = await api.get(`/leave-ledger/me/${selectedYear.value}`)
      const data = response.data?.data || response.data
      ledgerData.value = data
      entries.value = data?.entries || []
    } catch (error) {
      console.error('Cetvel yüklenemedi:', error)
      entries.value = []
      ledgerData.value = null
    } finally {
      loading.value = false
    }
    return
  }

  // Admin/Yönetici için seçilen çalışanın cetveli
  if (!selectedEmployee.value) {
    entries.value = []
    ledgerData.value = null
    return
  }

  loading.value = true
  try {
    const response = await api.get(`/leave-ledger/employee/${selectedEmployee.value}/${selectedYear.value}`)
    const data = response.data?.data || response.data
    ledgerData.value = data
    entries.value = data?.entries || []
  } catch (error) {
    console.error('Cetvel yüklenemedi:', error)
    entries.value = []
    ledgerData.value = null
  } finally {
    loading.value = false
  }
}

const closeCarryoverModal = () => {
  showCarryoverModal.value = false
  carryoverDays.value = 0
  carryoverNote.value = ''
}

const saveCarryover = async () => {
  try {
    await api.post('/leave-ledger/carryover', {
      employeeId: selectedEmployee.value,
      year: selectedYear.value,
      days: carryoverDays.value,
      note: carryoverNote.value
    })
    closeCarryoverModal()
    loadLedger()
    toast.success('Devir işlemi kaydedildi')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const closeAdjustmentModal = () => {
  showAdjustmentModal.value = false
  editingEntry.value = null
  adjustmentDate.value = ''
  adjustmentDescription.value = ''
  adjustmentCredit.value = 0
  adjustmentDebit.value = 0
  adjustmentNote.value = ''
}

const saveAdjustment = async () => {
  try {
    if (editingEntry.value) {
      // Güncelleme
      await api.put(`/leave-ledger/${editingEntry.value._id}`, {
        date: adjustmentDate.value,
        description: adjustmentDescription.value,
        credit: adjustmentCredit.value,
        debit: adjustmentDebit.value,
        note: adjustmentNote.value
      })
    } else {
      // Yeni kayıt
      await api.post('/leave-ledger/adjustment', {
        employeeId: selectedEmployee.value,
        year: selectedYear.value,
        date: adjustmentDate.value,
        description: adjustmentDescription.value,
        credit: adjustmentCredit.value,
        debit: adjustmentDebit.value,
        note: adjustmentNote.value
      })
    }
    closeAdjustmentModal()
    loadLedger()
    toast.success('Düzeltme kaydedildi')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const editEntry = (entry) => {
  editingEntry.value = entry
  adjustmentDate.value = entry.date?.split('T')[0] || new Date().toISOString().split('T')[0]
  adjustmentDescription.value = entry.description
  adjustmentCredit.value = entry.credit || 0
  adjustmentDebit.value = entry.debit || 0
  adjustmentNote.value = entry.note || ''
  showAdjustmentModal.value = true
}

const deleteEntry = async (entry) => {
  const message = entry.isSystemGenerated
    ? 'Bu bir SİSTEM KAYDIDIR. Silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!'
    : 'Bu kaydı silmek istediğinizden emin misiniz?'

  const confirmed = await confirmModal.show({
    title: 'Kaydı Sil',
    message: message,
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    await api.delete(`/leave-ledger/${entry._id}`)
    loadLedger()
    toast.success('Kayıt silindi')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Silme hatası')
  }
}

// Watch for changes
watch([selectedEmployee, selectedYear], () => {
  loadLedger()
})

watch(selectedCompanyId, () => {
  selectedEmployee.value = '' // Şirket değiştiğinde çalışan seçimini temizle
  loadEmployees()
})

onMounted(async () => {
  if (isEmployee.value) {
    // Çalışan için direkt kendi cetvelini yükle
    loadLedger()
  } else {
    await loadCompanies()
    loadEmployees()
  }
})
</script>
