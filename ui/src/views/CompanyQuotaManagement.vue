<template>
  <div>
    <div class="flex justify-end items-center mb-6">
      <button
        @click="syncQuotas"
        :disabled="syncing"
        class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
      >
        {{ syncing ? 'Senkronize ediliyor...' : 'Kotalari Senkronize Et' }}
      </button>
    </div>

    <!-- Bayi Kota Ozeti -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Toplam Kota Durumu</h2>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="text-3xl font-bold text-blue-600">{{ dealerQuota.total }}</div>
          <div class="text-sm text-blue-600">Toplam Kota</div>
        </div>
        <div class="bg-green-50 rounded-lg p-4">
          <div class="text-3xl font-bold text-green-600">{{ dealerQuota.used }}</div>
          <div class="text-sm text-green-600">Kullanilan</div>
        </div>
        <div class="bg-yellow-50 rounded-lg p-4">
          <div class="text-3xl font-bold text-yellow-600">{{ dealerQuota.allocated }}</div>
          <div class="text-sm text-yellow-600">Dagitilan</div>
        </div>
        <div class="bg-purple-50 rounded-lg p-4">
          <div class="text-3xl font-bold text-purple-600">{{ dealerQuota.unallocated }}</div>
          <div class="text-sm text-purple-600">Dagitilmamis</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="mt-4">
        <div class="flex justify-between text-sm mb-1">
          <span>Kullanim Orani</span>
          <span>{{ dealerQuota.percentage }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-4">
          <div
            class="h-4 rounded-full transition-all"
            :class="{
              'bg-green-500': dealerQuota.percentage < 70,
              'bg-yellow-500': dealerQuota.percentage >= 70 && dealerQuota.percentage < 90,
              'bg-red-500': dealerQuota.percentage >= 90
            }"
            :style="{ width: dealerQuota.percentage + '%' }"
          ></div>
        </div>
      </div>

      <!-- Abonelik Bilgisi -->
      <div v-if="subscription" class="mt-4 pt-4 border-t">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">
            Paket: <strong>{{ subscription.packageName }}</strong>
          </span>
          <span class="text-gray-600">
            Bitis: <strong>{{ formatDate(subscription.endDate) }}</strong>
            <span v-if="subscription.daysRemaining <= 30" class="text-red-600 ml-1">
              ({{ subscription.daysRemaining }} gun kaldi)
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- Sirket Kota Listesi -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sirket</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atanan Kota</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanilan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanim</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Islemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="company in companies" :key="company._id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ company.name }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span v-if="company.isUnlimited" class="text-blue-600 font-medium">Sinirsiz</span>
              <span v-else class="text-gray-900">{{ company.allocated }}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ company.used }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="w-24">
                <div class="flex justify-between text-xs mb-1">
                  <span>{{ company.percentage }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all"
                    :class="{
                      'bg-green-500': company.percentage < 70,
                      'bg-yellow-500': company.percentage >= 70 && company.percentage < 90,
                      'bg-red-500': company.percentage >= 90
                    }"
                    :style="{ width: Math.min(company.percentage, 100) + '%' }"
                  ></div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="{
                  'bg-green-100 text-green-800': company.percentage < 90,
                  'bg-yellow-100 text-yellow-800': company.percentage >= 90 && company.percentage < 100,
                  'bg-red-100 text-red-800': company.percentage >= 100
                }"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ company.percentage >= 100 ? 'Dolu' : company.percentage >= 90 ? 'Kritik' : 'Normal' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="openEditModal(company)" class="text-indigo-600 hover:text-indigo-900 mr-3">
                Kota Duzenle
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Kota Duzenleme Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Kota Duzenle</h2>
        <p class="text-gray-600 mb-4">{{ editingCompany?.name }}</p>

        <form @submit.prevent="saveQuota">
          <div class="space-y-4">
            <div>
              <label class="flex items-center mb-3">
                <input
                  v-model="quotaForm.isUnlimited"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span class="ml-2 text-sm text-gray-700">Sinirsiz Kota</span>
              </label>
            </div>

            <div v-if="!quotaForm.isUnlimited">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Kota Miktari
              </label>
              <input
                v-model.number="quotaForm.quota"
                type="number"
                min="0"
                :max="dealerQuota.unallocated + (editingCompany?.allocated || 0)"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-sm text-gray-500 mt-1">
                Maksimum: {{ dealerQuota.unallocated + (editingCompany?.allocated || 0) }}
              </p>
            </div>

            <div class="bg-gray-50 rounded-lg p-3 text-sm">
              <div class="flex justify-between">
                <span>Mevcut kullanim:</span>
                <span class="font-medium">{{ editingCompany?.used || 0 }}</span>
              </div>
              <div class="flex justify-between mt-1">
                <span>Dagitilmamis kota:</span>
                <span class="font-medium">{{ dealerQuota.unallocated }}</span>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Iptal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const authStore = useAuthStore()
const toast = useToastStore()

const companies = ref([])
const dealerQuota = ref({
  total: 0,
  used: 0,
  allocated: 0,
  unallocated: 0,
  percentage: 0
})
const subscription = ref(null)
const showModal = ref(false)
const editingCompany = ref(null)
const saving = ref(false)
const syncing = ref(false)

const quotaForm = ref({
  quota: 0,
  isUnlimited: false
})

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

const fetchData = async () => {
  try {
    const dealerId = authStore.user?.dealer

    if (!dealerId) {
      console.error('Bayi ID bulunamadi')
      return
    }

    // Kota ozeti ve sirket listesi
    const [quotaResponse, companiesResponse] = await Promise.all([
      api.get(`/dealers/${dealerId}/quota`),
      api.get(`/dealers/${dealerId}/companies/quotas`)
    ])

    const quotaData = quotaResponse.data.data || quotaResponse.data
    dealerQuota.value = quotaData.quota || {
      total: 0,
      used: 0,
      allocated: 0,
      unallocated: 0,
      percentage: 0
    }
    subscription.value = quotaData.subscription

    companies.value = companiesResponse.data.data || companiesResponse.data || []
  } catch (error) {
    console.error('Veri yuklenirken hata:', error)
  }
}

const syncQuotas = async () => {
  syncing.value = true
  try {
    const dealerId = authStore.user?.dealer
    await api.post(`/dealers/${dealerId}/quota/sync`)
    await fetchData()
    toast.success('Kotalar senkronize edildi')
  } catch (error) {
    console.error('Senkronizasyon hatasi:', error)
    toast.error('Senkronizasyon sırasında bir hata oluştu')
  } finally {
    syncing.value = false
  }
}

const openEditModal = (company) => {
  editingCompany.value = company
  quotaForm.value = {
    quota: company.allocated || 0,
    isUnlimited: company.isUnlimited || false
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingCompany.value = null
}

const saveQuota = async () => {
  saving.value = true
  try {
    const dealerId = authStore.user?.dealer

    await api.post(`/dealers/${dealerId}/companies/${editingCompany.value._id}/quota`, {
      quota: quotaForm.value.quota,
      isUnlimited: quotaForm.value.isUnlimited
    })

    closeModal()
    await fetchData()
    toast.success('Kota güncellendi')
  } catch (error) {
    console.error('Kota kaydetme hatasi:', error)
    toast.error(error.response?.data?.message || 'Kota kaydedilirken bir hata oluştu')
  } finally {
    saving.value = false
  }
}

onMounted(fetchData)
</script>
