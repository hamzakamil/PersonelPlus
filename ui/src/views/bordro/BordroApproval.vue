<template>
  <div class="p-6">
    <div class="flex flex-wrap justify-between items-center gap-4 mb-6">
      <h1 class="text-2xl font-semibold text-gray-800">Bordro Onayı</h1>
      <div class="flex items-center gap-4">
        <!-- Toplam Net Tutar -->
        <div class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg">
          <span class="text-xs opacity-80">Toplam:</span>
          <span class="ml-2 font-bold">{{ formatCurrency(totalNetAmount) }}</span>
        </div>
        <!-- İstatistikler -->
        <div class="flex gap-2 text-sm">
          <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
            Bekleyen: {{ stats.pending }}
          </span>
          <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full">
            Onaylanan: {{ stats.approved }}
          </span>
          <span class="px-3 py-1 bg-red-100 text-red-800 rounded-full">
            Reddedilen: {{ stats.rejected }}
          </span>
        </div>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Yıl</label>
          <select v-model="filters.year" @change="loadBordros" class="w-full px-3 py-2 border rounded-lg">
            <option value="">Tümü</option>
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ay</label>
          <select v-model="filters.month" @change="loadBordros" class="w-full px-3 py-2 border rounded-lg">
            <option value="">Tümü</option>
            <option v-for="(month, index) in months" :key="index" :value="index + 1">{{ month }}</option>
          </select>
        </div>
        <div class="md:col-span-2 flex items-end gap-2">
          <button
            v-if="selectedBordros.length > 0"
            @click="bulkApprove"
            :disabled="isApproving"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {{ isApproving ? 'Onaylanıyor...' : `Seçilenleri Onayla (${selectedBordros.length})` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <!-- Boş durum -->
    <div v-else-if="bordros.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">Onay bekleyen bordro yok</h3>
      <p class="mt-1 text-sm text-gray-500">Tüm bordrolar onaylanmış veya henüz yüklenmemiş.</p>
    </div>

    <!-- Bordro Listesi -->
    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Çalışan</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TC Kimlik</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dönem</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Ücret</th>
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="bordro in bordros" :key="bordro._id" class="hover:bg-gray-50">
            <td class="px-4 py-3">
              <input
                type="checkbox"
                :checked="selectedBordros.includes(bordro._id)"
                @change="toggleSelect(bordro._id)"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </td>
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">{{ bordro.employeeName }}</div>
              <div class="text-sm text-gray-500">{{ bordro.employee?.email }}</div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ bordro.tcKimlik }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">
              {{ months[bordro.month - 1] }} {{ bordro.year }}
            </td>
            <td class="px-4 py-3 text-right font-medium text-gray-900">
              {{ formatCurrency(bordro.payrollData?.netOdenen) }}
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex justify-center gap-2">
                <button
                  @click="viewDetail(bordro)"
                  class="text-indigo-600 hover:text-indigo-900 text-sm"
                >
                  Detay
                </button>
                <button
                  @click="approveSingle(bordro)"
                  :disabled="isApproving"
                  class="text-green-600 hover:text-green-900 text-sm"
                >
                  Onayla
                </button>
                <button
                  @click="openRejectModal(bordro)"
                  class="text-red-600 hover:text-red-900 text-sm"
                >
                  Reddet
                </button>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot class="bg-gray-100 border-t-2 border-gray-300">
          <tr>
            <td colspan="4" class="px-4 py-3 text-right font-semibold text-gray-700">
              Toplam ({{ bordros.length }} bordro):
            </td>
            <td class="px-4 py-3 text-right font-bold text-gray-900 text-lg">
              {{ formatCurrency(totalNetAmount) }}
            </td>
            <td></td>
          </tr>
          <tr v-if="selectedBordros.length > 0" class="bg-indigo-50">
            <td colspan="4" class="px-4 py-2 text-right font-medium text-indigo-700">
              Seçilen ({{ selectedBordros.length }} bordro):
            </td>
            <td class="px-4 py-2 text-right font-bold text-indigo-900">
              {{ formatCurrency(selectedTotalNetAmount) }}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Detay Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75" @click="showDetailModal = false"></div>
        <div class="relative bg-white rounded-lg text-left shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div class="bg-white px-6 py-4 border-b">
            <h3 class="text-lg font-medium text-gray-900">
              {{ selectedBordro?.employeeName }} - {{ months[(selectedBordro?.month || 1) - 1] }} {{ selectedBordro?.year }}
            </h3>
          </div>
          <div class="px-6 py-4">
            <div class="grid grid-cols-2 gap-4" v-if="selectedBordro?.payrollData">
              <div v-for="(value, key) in filteredPayrollData" :key="key" class="flex justify-between border-b py-2">
                <span class="text-gray-600">{{ formatLabel(key) }}</span>
                <span class="font-medium">{{ formatValue(key, value) }}</span>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-6 py-4 flex justify-end gap-2">
            <button @click="showDetailModal = false" class="px-4 py-2 border rounded-lg">Kapat</button>
            <button @click="approveSingle(selectedBordro); showDetailModal = false" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Onayla
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Red Modal -->
    <div v-if="showRejectModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75" @click="showRejectModal = false"></div>
        <div class="relative bg-white rounded-lg text-left shadow-xl max-w-md w-full">
          <div class="bg-white px-6 py-4 border-b">
            <h3 class="text-lg font-medium text-gray-900">Bordro Reddi</h3>
          </div>
          <div class="px-6 py-4">
            <p class="text-sm text-gray-600 mb-4">
              <strong>{{ bordroToReject?.employeeName }}</strong> için bordroyu reddetmek üzeresiniz.
            </p>
            <label class="block text-sm font-medium text-gray-700 mb-1">Red Sebebi *</label>
            <textarea
              v-model="rejectReason"
              rows="3"
              class="w-full px-3 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Red sebebini yazınız (en az 10 karakter)"
            ></textarea>
          </div>
          <div class="bg-gray-50 px-6 py-4 flex justify-end gap-2">
            <button @click="showRejectModal = false" class="px-4 py-2 border rounded-lg">İptal</button>
            <button
              @click="rejectBordro"
              :disabled="rejectReason.length < 10 || isRejecting"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {{ isRejecting ? 'İşleniyor...' : 'Reddet' }}
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

const bordros = ref([])
const isLoading = ref(false)
const isApproving = ref(false)
const isRejecting = ref(false)
const selectedBordros = ref([])
const showDetailModal = ref(false)
const showRejectModal = ref(false)
const selectedBordro = ref(null)
const bordroToReject = ref(null)
const rejectReason = ref('')
const stats = ref({ pending: 0, approved: 0, rejected: 0 })

const filters = ref({
  year: new Date().getFullYear(),
  month: ''
})

const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear, currentYear - 1, currentYear - 2]
})

const isAllSelected = computed(() => {
  return bordros.value.length > 0 && selectedBordros.value.length === bordros.value.length
})

const filteredPayrollData = computed(() => {
  if (!selectedBordro.value?.payrollData) return {}
  const { rawData, ...rest } = selectedBordro.value.payrollData
  return rest
})

// Toplam net ödenecek tutarlar
const totalNetAmount = computed(() => {
  return bordros.value.reduce((sum, b) => sum + (b.payrollData?.netOdenen || 0), 0)
})

const selectedTotalNetAmount = computed(() => {
  return bordros.value
    .filter(b => selectedBordros.value.includes(b._id))
    .reduce((sum, b) => sum + (b.payrollData?.netOdenen || 0), 0)
})

onMounted(() => {
  loadBordros()
})

const loadBordros = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.value.year) params.append('year', filters.value.year)
    if (filters.value.month) params.append('month', filters.value.month)

    const response = await api.get(`/bordro/pending-approval?${params}`)
    bordros.value = response.data.data || []
    stats.value = response.data.meta?.stats || { pending: 0, approved: 0, rejected: 0 }
  } catch (error) {
    console.error('Bordrolar yüklenemedi:', error)
  } finally {
    isLoading.value = false
  }
}

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

const viewDetail = (bordro) => {
  selectedBordro.value = bordro
  showDetailModal.value = true
}

const approveSingle = async (bordro) => {
  isApproving.value = true
  try {
    await api.post(`/bordro/${bordro._id}/company-approve`)
    alert('Bordro onaylandı')
    await loadBordros()
  } catch (error) {
    alert(error.response?.data?.message || 'Onay işlemi başarısız')
  } finally {
    isApproving.value = false
  }
}

const bulkApprove = async () => {
  if (selectedBordros.value.length === 0) return

  isApproving.value = true
  try {
    const response = await api.post('/bordro/bulk-approve', {
      bordroIds: selectedBordros.value
    })
    alert(response.data.message || 'Bordrolar onaylandı')
    selectedBordros.value = []
    await loadBordros()
  } catch (error) {
    alert(error.response?.data?.message || 'Toplu onay başarısız')
  } finally {
    isApproving.value = false
  }
}

const openRejectModal = (bordro) => {
  bordroToReject.value = bordro
  rejectReason.value = ''
  showRejectModal.value = true
}

const rejectBordro = async () => {
  if (!bordroToReject.value || rejectReason.value.length < 10) return

  isRejecting.value = true
  try {
    await api.post(`/bordro/${bordroToReject.value._id}/company-reject`, {
      reason: rejectReason.value
    })
    alert('Bordro reddedildi')
    showRejectModal.value = false
    bordroToReject.value = null
    rejectReason.value = ''
    await loadBordros()
  } catch (error) {
    alert(error.response?.data?.message || 'Red işlemi başarısız')
  } finally {
    isRejecting.value = false
  }
}

const formatCurrency = (value) => {
  if (!value) return '0 TL'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value)
}

const formatLabel = (key) => {
  const labels = {
    sskSicilNo: 'SSK Sicil No',
    girisTarihi: 'Giriş Tarihi',
    cikisTarihi: 'Çıkış Tarihi',
    eksikGun: 'Eksik Gün',
    calismaGunu: 'Çalışma Günü',
    normalGun: 'Normal Gün',
    izinGunu: 'İzin Günü',
    kanun: 'Kanun',
    ucretGunSaat: 'Ücret G/S',
    normalKazanc: 'Normal Kazanç',
    brutUcret: 'Brüt Ücret',
    digerKazanc: 'Diğer Kazanç',
    sskMatrah: 'SSK Matrah',
    sgkKesinti: 'SGK Kesinti',
    issizlikKesinti: 'İşsizlik Kesinti',
    agi: 'AGİ',
    gvMatrah: 'GV Matrah',
    toplamGvMatrah: 'Toplam GV Matrah',
    gelirVergisi: 'Gelir Vergisi',
    kalanGelirVergisi: 'Kalan GV',
    damgaVergisi: 'Damga Vergisi',
    ozelKesinti: 'Özel Kesinti',
    digerKesintiler: 'Diğer Kesintiler',
    avansKesintisi: 'Avans Kesintisi',
    netOdenen: 'Net Ödenen',
    netUcret: 'Net Ücret',
    fazlaMesai: 'Fazla Mesai',
    geceMesaisi: 'Gece Mesaisi',
    ikramiye: 'İkramiye',
    yemekYardimi: 'Yemek Yardımı',
    yolYardimi: 'Yol Yardımı'
  }
  return labels[key] || key
}

const formatValue = (key, value) => {
  if (value === 0 || value === '' || value === null || value === undefined) return '-'
  const currencyFields = ['normalKazanc', 'brutUcret', 'digerKazanc', 'sskMatrah', 'sgkKesinti',
    'issizlikKesinti', 'agi', 'gvMatrah', 'toplamGvMatrah', 'gelirVergisi', 'kalanGelirVergisi',
    'damgaVergisi', 'ozelKesinti', 'digerKesintiler', 'avansKesintisi', 'netOdenen', 'netUcret',
    'fazlaMesai', 'geceMesaisi', 'ikramiye', 'yemekYardimi', 'yolYardimi']

  if (currencyFields.includes(key)) {
    return formatCurrency(value)
  }
  return value
}
</script>
