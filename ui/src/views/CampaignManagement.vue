<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Kampanya Yonetimi</h1>
      <Button @click="openCreateModal">Yeni Kampanya</Button>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select v-model="filters.status" @change="loadCampaigns" class="w-full border rounded-lg px-3 py-2">
            <option value="">Tumu</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
            <option value="expired">Suresi Dolmus</option>
            <option value="upcoming">Yakinda Baslayacak</option>
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
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kampanya</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kod</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indirim</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gecerlilik</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanim</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Islemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="campaign in campaigns" :key="campaign._id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ campaign.name }}</div>
              <div class="text-xs text-gray-500">{{ campaign.description }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 bg-gray-100 text-gray-800 font-mono text-sm rounded">
                {{ campaign.code }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ typeText(campaign.type) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
              {{ discountText(campaign) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <div>{{ formatDate(campaign.startDate) }}</div>
              <div>{{ formatDate(campaign.endDate) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ campaign.usedCount }} / {{ campaign.maxUses || '∞' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="{
                  'bg-green-100 text-green-800': isActive(campaign),
                  'bg-gray-100 text-gray-800': !campaign.isActive,
                  'bg-red-100 text-red-800': isExpired(campaign),
                  'bg-yellow-100 text-yellow-800': isUpcoming(campaign)
                }"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ statusText(campaign) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <button @click="viewStats(campaign)" class="text-blue-600 hover:text-blue-900">Detay</button>
              <button @click="openEditModal(campaign)" class="text-green-600 hover:text-green-900">Duzenle</button>
              <button @click="toggleCampaign(campaign)" class="text-yellow-600 hover:text-yellow-900">
                {{ campaign.isActive ? 'Pasif' : 'Aktif' }}
              </button>
              <button
                v-if="campaign.usedCount === 0"
                @click="deleteCampaign(campaign)"
                class="text-red-600 hover:text-red-900"
              >
                Sil
              </button>
            </td>
          </tr>
          <tr v-if="campaigns.length === 0">
            <td colspan="8" class="px-6 py-8 text-center text-gray-500">
              Kampanya bulunamadi
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

    <!-- Olusturma/Duzenleme Modal -->
    <div v-if="showFormModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">
          {{ editingCampaign ? 'Kampanya Duzenle' : 'Yeni Kampanya' }}
        </h2>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kampanya Adi *</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full border rounded-lg px-3 py-2"
                placeholder="Ornek: Yilbasi Indirimi"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kampanya Kodu</label>
              <div class="flex gap-2">
                <input
                  v-model="form.code"
                  type="text"
                  class="flex-1 border rounded-lg px-3 py-2 uppercase"
                  placeholder="YILBASI2026"
                  :disabled="editingCampaign"
                />
                <Button v-if="!editingCampaign" variant="secondary" @click="generateCode" size="sm">
                  Olustur
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Aciklama</label>
            <textarea
              v-model="form.description"
              class="w-full border rounded-lg px-3 py-2"
              rows="2"
              placeholder="Kampanya aciklamasi"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kampanya Tipi *</label>
              <select v-model="form.type" class="w-full border rounded-lg px-3 py-2">
                <option value="percentage">Yuzdelik Indirim (%)</option>
                <option value="fixed">Sabit Tutar Indirimi (TL)</option>
                <option value="trial">Ucretsiz Deneme</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ form.type === 'percentage' ? 'Indirim Orani (%)' : form.type === 'fixed' ? 'Indirim Tutari (TL)' : 'Deneme Suresi (Gun)' }}
              </label>
              <input
                v-if="form.type === 'percentage'"
                v-model.number="form.discountPercent"
                type="number"
                min="0"
                max="100"
                class="w-full border rounded-lg px-3 py-2"
              />
              <input
                v-else-if="form.type === 'fixed'"
                v-model.number="form.discountAmount"
                type="number"
                min="0"
                class="w-full border rounded-lg px-3 py-2"
              />
              <input
                v-else
                v-model.number="form.trialDays"
                type="number"
                min="1"
                class="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Baslangic Tarihi *</label>
              <input
                v-model="form.startDate"
                type="date"
                class="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Bitis Tarihi *</label>
              <input
                v-model="form.endDate"
                type="date"
                class="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Maksimum Kullanim</label>
              <input
                v-model.number="form.maxUses"
                type="number"
                min="0"
                class="w-full border rounded-lg px-3 py-2"
                placeholder="Bos = Sinirsiz"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Bayi Basina Kullanim</label>
              <input
                v-model.number="form.maxUsesPerDealer"
                type="number"
                min="1"
                class="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Gecerli Fatura Tipleri</label>
              <div class="flex gap-4 mt-2">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    value="monthly"
                    v-model="form.applicableBillingTypes"
                    class="rounded mr-2"
                  />
                  Aylik
                </label>
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    value="yearly"
                    v-model="form.applicableBillingTypes"
                    class="rounded mr-2"
                  />
                  Yillik
                </label>
              </div>
              <p class="text-xs text-gray-500 mt-1">Bos = Tum tipler</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Minimum Siparis Tutari (TL)</label>
              <input
                v-model.number="form.minOrderAmount"
                type="number"
                min="0"
                class="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Gecerli Paketler</label>
            <div class="flex flex-wrap gap-2 mt-2">
              <label
                v-for="pkg in packages"
                :key="pkg._id"
                class="flex items-center bg-gray-100 rounded px-2 py-1"
              >
                <input
                  type="checkbox"
                  :value="pkg._id"
                  v-model="form.applicablePackages"
                  class="rounded mr-2"
                />
                {{ pkg.name }}
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1">Bos = Tum paketler</p>
          </div>
        </div>

        <div class="flex justify-end space-x-2 mt-6">
          <Button variant="secondary" @click="closeFormModal">Iptal</Button>
          <Button @click="submitForm">{{ editingCampaign ? 'Guncelle' : 'Olustur' }}</Button>
        </div>
      </div>
    </div>

    <!-- Detay/Istatistik Modal -->
    <div v-if="showStatsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">Kampanya Detayi</h2>

        <div v-if="selectedStats" class="space-y-6">
          <!-- Ozet -->
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-blue-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-blue-600">{{ selectedStats.stats.usedCount }}</div>
              <div class="text-sm text-blue-700">Toplam Kullanim</div>
            </div>
            <div class="bg-green-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-green-600">{{ formatCurrency(selectedStats.stats.totalDiscountGiven) }}</div>
              <div class="text-sm text-green-700">Toplam Indirim</div>
            </div>
            <div class="bg-purple-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-purple-600">{{ selectedStats.stats.uniqueDealers }}</div>
              <div class="text-sm text-purple-700">Benzersiz Bayi</div>
            </div>
          </div>

          <!-- Kampanya Bilgileri -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold mb-2">Kampanya Bilgileri</h3>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><span class="text-gray-500">Ad:</span> {{ selectedStats.campaign.name }}</div>
              <div><span class="text-gray-500">Kod:</span> {{ selectedStats.campaign.code }}</div>
              <div><span class="text-gray-500">Tip:</span> {{ typeText(selectedStats.campaign.type) }}</div>
              <div><span class="text-gray-500">Durum:</span> {{ selectedStats.campaign.isActive ? 'Aktif' : 'Pasif' }}</div>
              <div><span class="text-gray-500">Baslangic:</span> {{ formatDate(selectedStats.campaign.startDate) }}</div>
              <div><span class="text-gray-500">Bitis:</span> {{ formatDate(selectedStats.campaign.endDate) }}</div>
            </div>
          </div>

          <!-- Son Kullanimlar -->
          <div>
            <h3 class="font-semibold mb-2">Son Kullanimlar</h3>
            <div class="bg-white border rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Bayi</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Indirim</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Tarih</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr v-for="(usage, index) in selectedStats.recentUsage" :key="index">
                    <td class="px-4 py-2 text-sm">{{ usage.dealer?.name || '-' }}</td>
                    <td class="px-4 py-2 text-sm text-green-600">{{ formatCurrency(usage.discountApplied) }}</td>
                    <td class="px-4 py-2 text-sm text-gray-500">{{ formatDateTime(usage.usedAt) }}</td>
                  </tr>
                  <tr v-if="selectedStats.recentUsage.length === 0">
                    <td colspan="3" class="px-4 py-4 text-center text-gray-500">
                      Henuz kullanim yok
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <Button variant="secondary" @click="showStatsModal = false">Kapat</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const toast = useToastStore()
const confirmModal = useConfirmStore()
const campaigns = ref([])
const packages = ref([])
const showFormModal = ref(false)
const showStatsModal = ref(false)
const editingCampaign = ref(null)
const selectedStats = ref(null)

const filters = ref({
  status: ''
})

const pagination = ref({
  page: 1,
  pages: 1,
  total: 0
})

const defaultForm = {
  name: '',
  description: '',
  code: '',
  type: 'percentage',
  discountPercent: 10,
  discountAmount: 0,
  trialDays: 14,
  startDate: '',
  endDate: '',
  maxUses: null,
  maxUsesPerDealer: 1,
  applicablePackages: [],
  applicableBillingTypes: [],
  minOrderAmount: 0
}

const form = ref({ ...defaultForm })

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

const typeText = (type) => {
  const texts = {
    percentage: 'Yuzdelik',
    fixed: 'Sabit Tutar',
    trial: 'Deneme'
  }
  return texts[type] || type
}

const discountText = (campaign) => {
  if (campaign.type === 'percentage') {
    return `%${campaign.discountPercent}`
  } else if (campaign.type === 'fixed') {
    return `${campaign.discountAmount} TL`
  } else if (campaign.type === 'trial') {
    return `${campaign.trialDays} gun`
  }
  return '-'
}

const isActive = (campaign) => {
  const now = new Date()
  return campaign.isActive &&
    new Date(campaign.startDate) <= now &&
    new Date(campaign.endDate) >= now
}

const isExpired = (campaign) => {
  return new Date(campaign.endDate) < new Date()
}

const isUpcoming = (campaign) => {
  return new Date(campaign.startDate) > new Date()
}

const statusText = (campaign) => {
  if (!campaign.isActive) return 'Pasif'
  if (isExpired(campaign)) return 'Suresi Dolmus'
  if (isUpcoming(campaign)) return 'Yakinda'
  return 'Aktif'
}

const loadCampaigns = async () => {
  try {
    const params = new URLSearchParams()
    params.append('page', pagination.value.page)
    if (filters.value.status) params.append('status', filters.value.status)

    const response = await api.get(`/campaigns?${params.toString()}`)
    campaigns.value = response.data || []
    if (response.data.pagination) {
      pagination.value = response.data.pagination
    }
  } catch (error) {
    console.error('Kampanyalar yuklenirken hata:', error)
  }
}

const loadPackages = async () => {
  try {
    const response = await api.get('/packages?isActive=true')
    packages.value = response.data || []
  } catch (error) {
    console.error('Paketler yuklenirken hata:', error)
  }
}

const resetFilters = () => {
  filters.value = { status: '' }
  pagination.value.page = 1
  loadCampaigns()
}

const changePage = (page) => {
  pagination.value.page = page
  loadCampaigns()
}

const openCreateModal = () => {
  editingCampaign.value = null
  form.value = { ...defaultForm }
  // Varsayilan tarihler
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
  form.value.startDate = today.toISOString().split('T')[0]
  form.value.endDate = nextMonth.toISOString().split('T')[0]
  showFormModal.value = true
}

const openEditModal = (campaign) => {
  editingCampaign.value = campaign
  form.value = {
    name: campaign.name,
    description: campaign.description || '',
    code: campaign.code,
    type: campaign.type,
    discountPercent: campaign.discountPercent || 0,
    discountAmount: campaign.discountAmount || 0,
    trialDays: campaign.trialDays || 0,
    startDate: new Date(campaign.startDate).toISOString().split('T')[0],
    endDate: new Date(campaign.endDate).toISOString().split('T')[0],
    maxUses: campaign.maxUses,
    maxUsesPerDealer: campaign.maxUsesPerDealer || 1,
    applicablePackages: campaign.applicablePackages?.map(p => p._id || p) || [],
    applicableBillingTypes: campaign.applicableBillingTypes || [],
    minOrderAmount: campaign.minOrderAmount || 0
  }
  showFormModal.value = true
}

const closeFormModal = () => {
  showFormModal.value = false
  editingCampaign.value = null
}

const generateCode = async () => {
  try {
    const response = await api.post('/campaigns/generate-code')
    form.value.code = response.data.code
  } catch (error) {
    toast.error('Kod oluşturulamadı')
  }
}

const submitForm = async () => {
  if (!form.value.name || !form.value.type || !form.value.startDate || !form.value.endDate) {
    toast.warning('Ad, tip, başlangıç ve bitiş tarihi zorunludur')
    return
  }

  try {
    if (editingCampaign.value) {
      await api.put(`/campaigns/${editingCampaign.value._id}`, form.value)
      toast.success('Kampanya güncellendi')
    } else {
      await api.post('/campaigns', form.value)
      toast.success('Kampanya oluşturuldu')
    }
    closeFormModal()
    loadCampaigns()
  } catch (error) {
    toast.error(error.response?.data?.message || 'İşlem başarısız')
  }
}

const viewStats = async (campaign) => {
  try {
    const response = await api.get(`/campaigns/${campaign._id}/stats`)
    selectedStats.value = response.data
    showStatsModal.value = true
  } catch (error) {
    toast.error('İstatistikler yüklenemedi')
  }
}

const toggleCampaign = async (campaign) => {
  try {
    await api.post(`/campaigns/${campaign._id}/toggle`)
    loadCampaigns()
  } catch (error) {
    toast.error(error.response?.data?.message || 'İşlem başarısız')
  }
}

const deleteCampaign = async (campaign) => {
  const confirmed = await confirmModal.show({
    title: 'Kampanyayı Sil',
    message: `"${campaign.name}" kampanyasını silmek istediğinize emin misiniz?`,
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    await api.delete(`/campaigns/${campaign._id}`)
    loadCampaigns()
    toast.success('Kampanya silindi')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Silme başarısız')
  }
}

onMounted(() => {
  loadCampaigns()
  loadPackages()
})
</script>
