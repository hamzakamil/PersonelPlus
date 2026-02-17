<template>
  <div>
    <div class="flex justify-end items-center mb-6">
      <Button @click="showModal = true">Manuel Abonelik Ekle</Button>
    </div>

    <!-- Istatistikler -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Toplam Abonelik</div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.total }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Aktif</div>
        <div class="text-2xl font-bold text-green-600">{{ stats.active }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Suresi Dolmus</div>
        <div class="text-2xl font-bold text-red-600">{{ stats.expired }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Askida</div>
        <div class="text-2xl font-bold text-yellow-600">{{ stats.suspended }}</div>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select v-model="filters.status" class="w-full border rounded-lg px-3 py-2">
            <option value="">Tumu</option>
            <option value="active">Aktif</option>
            <option value="expired">Suresi Dolmus</option>
            <option value="suspended">Askida</option>
            <option value="cancelled">Iptal</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Paket</label>
          <select v-model="filters.package" class="w-full border rounded-lg px-3 py-2">
            <option value="">Tumu</option>
            <option v-for="pkg in packages" :key="pkg._id" :value="pkg._id">{{ pkg.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Arama</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Bayi adi ara..."
            class="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div class="flex items-end">
          <Button variant="secondary" @click="resetFilters" class="mr-2">Temizle</Button>
          <Button @click="loadSubscriptions">Filtrele</Button>
        </div>
      </div>
    </div>

    <!-- Tablo -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bayi</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paket</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kota</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fatura</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Baslangic</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bitis</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Islemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="sub in subscriptions" :key="sub._id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900 dealer-name">{{ sub.dealer?.name || '-' }}</div>
              <div class="text-xs text-gray-500 email-text">{{ sub.dealer?.contactEmail }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 package-name">
              {{ sub.package?.name || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm">
                <span class="font-medium">{{ sub.usedQuota }}</span>
                <span class="text-gray-500"> / {{ sub.employeeQuota }}</span>
              </div>
              <div class="w-24 bg-gray-200 rounded-full h-2 mt-1">
                <div
                  class="h-2 rounded-full"
                  :class="{
                    'bg-green-500': (sub.usedQuota / sub.employeeQuota) * 100 < 70,
                    'bg-yellow-500': (sub.usedQuota / sub.employeeQuota) * 100 >= 70 && (sub.usedQuota / sub.employeeQuota) * 100 < 90,
                    'bg-red-500': (sub.usedQuota / sub.employeeQuota) * 100 >= 90
                  }"
                  :style="{ width: Math.min((sub.usedQuota / sub.employeeQuota) * 100, 100) + '%' }"
                ></div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span class="no-uppercase">{{ sub.billingType === 'yearly' ? 'Yıllık' : 'Aylık' }}</span>
              <div class="text-xs preserve-case">{{ formatCurrency(sub.price) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(sub.startDate) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span :class="isExpiringSoon(sub.endDate) ? 'text-red-600 font-medium' : 'text-gray-500'">
                {{ formatDate(sub.endDate) }}
              </span>
              <div v-if="isExpiringSoon(sub.endDate)" class="text-xs text-red-500">
                {{ getDaysRemaining(sub.endDate) }} gun kaldi
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="{
                  'bg-green-100 text-green-800': sub.status === 'active',
                  'bg-red-100 text-red-800': sub.status === 'expired',
                  'bg-yellow-100 text-yellow-800': sub.status === 'suspended',
                  'bg-gray-100 text-gray-800': sub.status === 'cancelled'
                }"
                class="px-2 py-1 text-xs font-semibold rounded-full status-badge"
              >
                {{ statusText(sub.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <button @click="viewDetails(sub)" class="text-blue-600 hover:text-blue-900">Detay</button>
              <button
                v-if="sub.status === 'active'"
                @click="suspendSubscription(sub)"
                class="text-yellow-600 hover:text-yellow-900"
              >
                Askiya Al
              </button>
              <button
                v-if="sub.status === 'suspended'"
                @click="activateSubscription(sub)"
                class="text-green-600 hover:text-green-900"
              >
                Aktifle
              </button>
              <button
                v-if="sub.status === 'active' || sub.status === 'suspended'"
                @click="cancelSubscription(sub)"
                class="text-red-600 hover:text-red-900"
              >
                Iptal
              </button>
            </td>
          </tr>
          <tr v-if="subscriptions.length === 0">
            <td colspan="8" class="px-6 py-8 text-center text-gray-500">
              Abonelik bulunamadi
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
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-content">
        <h2 class="text-xl font-bold mb-4 no-uppercase">Abonelik Detayı</h2>

        <div v-if="selectedSubscription" class="space-y-4">
          <!-- Bayi Bilgileri -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-700 mb-2 no-uppercase">Bayi Bilgileri</h3>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><span class="text-gray-500 no-uppercase">Ad:</span> <span class="dealer-name">{{ selectedSubscription.dealer?.name }}</span></div>
              <div><span class="text-gray-500 no-uppercase">Email:</span> <span class="email-text">{{ selectedSubscription.dealer?.contactEmail }}</span></div>
            </div>
          </div>

          <!-- Abonelik Bilgileri -->
          <div class="bg-blue-50 rounded-lg p-4">
            <h3 class="font-semibold text-blue-700 mb-2 no-uppercase">Abonelik Bilgileri</h3>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><span class="text-blue-500 no-uppercase">Paket:</span> <span class="package-name">{{ selectedSubscription.package?.name }}</span></div>
              <div><span class="text-blue-500 no-uppercase">Fatura:</span> <span class="no-uppercase">{{ selectedSubscription.billingType === 'yearly' ? 'Yıllık' : 'Aylık' }}</span></div>
              <div><span class="text-blue-500 no-uppercase">Fiyat:</span> <span class="preserve-case">{{ formatCurrency(selectedSubscription.price) }}</span></div>
              <div><span class="text-blue-500 no-uppercase">Kota:</span> <span class="preserve-case">{{ selectedSubscription.usedQuota }} / {{ selectedSubscription.employeeQuota }}</span></div>
              <div><span class="text-blue-500 no-uppercase">Başlangıç:</span> <span class="preserve-case">{{ formatDate(selectedSubscription.startDate) }}</span></div>
              <div><span class="text-blue-500 no-uppercase">Bitiş:</span> <span class="preserve-case">{{ formatDate(selectedSubscription.endDate) }}</span></div>
              <div><span class="text-blue-500 no-uppercase">Otomatik Yenileme:</span> <span class="no-uppercase">{{ selectedSubscription.autoRenew ? 'Evet' : 'Hayır' }}</span></div>
              <div><span class="text-blue-500 no-uppercase">Ödendi:</span> <span class="no-uppercase">{{ selectedSubscription.isPaid ? 'Evet' : 'Hayır' }}</span></div>
            </div>
          </div>

          <!-- Gecmis -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-700 mb-2 no-uppercase">İşlem Geçmişi</h3>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <div
                v-for="(item, index) in selectedSubscription.history"
                :key="index"
                class="flex items-center text-sm border-b pb-2"
              >
                <span
                  :class="{
                    'bg-green-100 text-green-800': item.action === 'created' || item.action === 'activated',
                    'bg-blue-100 text-blue-800': item.action === 'renewed' || item.action === 'upgraded',
                    'bg-yellow-100 text-yellow-800': item.action === 'suspended',
                    'bg-red-100 text-red-800': item.action === 'cancelled' || item.action === 'expired'
                  }"
                  class="px-2 py-1 text-xs rounded mr-3 status-badge"
                >
                  {{ actionText(item.action) }}
                </span>
                <span class="text-gray-500">{{ formatDateTime(item.date) }}</span>
                <span v-if="item.note" class="ml-2 text-gray-600">- {{ item.note }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <Button variant="secondary" @click="showDetailModal = false">Kapat</Button>
        </div>
      </div>
    </div>

    <!-- Manuel Abonelik Ekleme Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Manuel Abonelik Ekle</h2>
        <form @submit.prevent="createManualSubscription">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Bayi</label>
              <select v-model="form.dealerId" required class="w-full border rounded-lg px-3 py-2">
                <option value="">Bayi Secin</option>
                <option v-for="dealer in dealers" :key="dealer._id" :value="dealer._id">
                  {{ dealer.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Paket</label>
              <select v-model="form.packageId" required class="w-full border rounded-lg px-3 py-2">
                <option value="">Paket Secin</option>
                <option v-for="pkg in packages" :key="pkg._id" :value="pkg._id">
                  {{ pkg.name }} - {{ pkg.employeeLimit }} Calisan
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fatura Tipi</label>
              <select v-model="form.billingType" required class="w-full border rounded-lg px-3 py-2">
                <option value="monthly">Aylik</option>
                <option value="yearly">Yillik</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Odeme Yontemi</label>
              <select v-model="form.paymentMethod" required class="w-full border rounded-lg px-3 py-2">
                <option value="manual">Manuel / Nakit</option>
                <option value="bank_transfer">Banka Havale/EFT</option>
              </select>
            </div>

            <div class="flex items-center">
              <input v-model="form.isPaid" type="checkbox" id="isPaid" class="mr-2" />
              <label for="isPaid" class="text-sm text-gray-700">Odeme Alindi</label>
            </div>

            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeModal">Iptal</Button>
              <Button type="submit" :disabled="creating">
                {{ creating ? 'Olusturuluyor...' : 'Olustur' }}
              </Button>
            </div>
          </div>
        </form>
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
const subscriptions = ref([])
const packages = ref([])
const dealers = ref([])
const showModal = ref(false)
const showDetailModal = ref(false)
const selectedSubscription = ref(null)
const creating = ref(false)

const stats = ref({
  total: 0,
  active: 0,
  expired: 0,
  suspended: 0
})

const filters = ref({
  status: '',
  package: '',
  search: ''
})

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  total: 0
})

const form = ref({
  dealerId: '',
  packageId: '',
  billingType: 'monthly',
  paymentMethod: 'manual',
  isPaid: true
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

const statusText = (status) => {
  const texts = {
    active: 'Aktif',
    expired: 'Süresi Dolmuş',
    suspended: 'Askıda',
    cancelled: 'İptal'
  }
  return texts[status] || status
}

const actionText = (action) => {
  const texts = {
    created: 'Oluşturuldu',
    renewed: 'Yenilendi',
    upgraded: 'Yükseltildi',
    expired: 'Süresi Doldu',
    cancelled: 'İptal Edildi',
    suspended: 'Askıya Alındı',
    activated: 'Aktifleştirildi'
  }
  return texts[action] || action
}

const isExpiringSoon = (endDate) => {
  if (!endDate) return false
  const end = new Date(endDate)
  const now = new Date()
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return diffDays <= 30 && diffDays > 0
}

const getDaysRemaining = (endDate) => {
  if (!endDate) return 0
  const end = new Date(endDate)
  const now = new Date()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
}

const loadSubscriptions = async () => {
  try {
    const params = new URLSearchParams()
    params.append('page', pagination.value.currentPage)
    if (filters.value.status) params.append('status', filters.value.status)
    if (filters.value.package) params.append('package', filters.value.package)
    if (filters.value.search) params.append('search', filters.value.search)

    const response = await api.get(`/subscriptions?${params.toString()}`)
    const data = response.data.data || response.data

    subscriptions.value = data.subscriptions || data
    if (data.pagination) {
      pagination.value = data.pagination
    }
  } catch (error) {
    console.error('Abonelikler yuklenirken hata:', error)
  }
}

const loadStats = async () => {
  try {
    const response = await api.get('/subscriptions/stats/overview')
    const data = response.data.data || response.data
    stats.value = data
  } catch (error) {
    console.error('Istatistikler yuklenirken hata:', error)
  }
}

const loadPackages = async () => {
  try {
    const response = await api.get('/packages')
    packages.value = response.data.data || response.data
  } catch (error) {
    console.error('Paketler yuklenirken hata:', error)
  }
}

const loadDealers = async () => {
  try {
    const response = await api.get('/dealers')
    dealers.value = response.data.data || response.data
  } catch (error) {
    console.error('Bayiler yuklenirken hata:', error)
  }
}

const resetFilters = () => {
  filters.value = {
    status: '',
    package: '',
    search: ''
  }
  pagination.value.currentPage = 1
  loadSubscriptions()
}

const changePage = (page) => {
  pagination.value.currentPage = page
  loadSubscriptions()
}

const viewDetails = (sub) => {
  selectedSubscription.value = sub
  showDetailModal.value = true
}

const suspendSubscription = async (sub) => {
  const confirmed = await confirmModal.show({
    title: 'Aboneliği Askıya Al',
    message: `${sub.dealer?.name} aboneligini askiya almak istediginize emin misiniz?`,
    type: 'warning',
    confirmText: 'Askıya Al'
  })
  if (!confirmed) return

  try {
    await api.post(`/subscriptions/${sub._id}/suspend`)
    loadSubscriptions()
    loadStats()
  } catch (error) {
    toast.error(error.response?.data?.message || 'İşlem başarısız')
  }
}

const activateSubscription = async (sub) => {
  const confirmed = await confirmModal.show({
    title: 'Aboneliği Aktifleştir',
    message: `${sub.dealer?.name} aboneligini aktif hale getirmek istediginize emin misiniz?`,
    type: 'info',
    confirmText: 'Aktifleştir'
  })
  if (!confirmed) return

  try {
    await api.post(`/subscriptions/${sub._id}/activate`)
    loadSubscriptions()
    loadStats()
  } catch (error) {
    toast.error(error.response?.data?.message || 'İşlem başarısız')
  }
}

const cancelSubscription = async (sub) => {
  const confirmed = await confirmModal.show({
    title: 'Aboneliği İptal Et',
    message: `${sub.dealer?.name} aboneligini iptal etmek istediginize emin misiniz? Bu islem geri alinamaz.`,
    type: 'danger',
    confirmText: 'İptal Et'
  })
  if (!confirmed) return

  try {
    await api.post(`/subscriptions/${sub._id}/cancel`)
    loadSubscriptions()
    loadStats()
  } catch (error) {
    toast.error(error.response?.data?.message || 'İşlem başarısız')
  }
}

const createManualSubscription = async () => {
  creating.value = true
  try {
    await api.post('/subscriptions', form.value)
    closeModal()
    loadSubscriptions()
    loadStats()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Abonelik oluşturulamadı')
  } finally {
    creating.value = false
  }
}

const closeModal = () => {
  showModal.value = false
  form.value = {
    dealerId: '',
    packageId: '',
    billingType: 'monthly',
    paymentMethod: 'manual',
    isPaid: true
  }
}

onMounted(() => {
  loadSubscriptions()
  loadStats()
  loadPackages()
  loadDealers()
})
</script>
