<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Global Ayarlar</h1>

    <!-- Yıllık Asgari Ücret Yönetimi -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Yıllık Asgari Ücret Yönetimi</h2>
      
      <!-- Mevcut Asgari Ücretler Listesi -->
      <div class="mb-6">
        <h3 class="text-md font-medium text-gray-700 mb-3">Mevcut Asgari Ücretler</h3>
        <div v-if="loading" class="text-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <div v-else-if="minimumWages.length === 0" class="text-gray-500 text-center py-4">
          Henüz asgari ücret kaydı yok
        </div>
        <table v-else class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yıl</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Asgari Ücret</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brüt Asgari Ücret</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yürürlük Tarihi</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="wage in minimumWages" :key="wage.year" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ wage.year }}</td>
              <td class="px-4 py-3 text-sm text-gray-900">{{ formatCurrency(wage.net) }}</td>
              <td class="px-4 py-3 text-sm text-gray-900">{{ formatCurrency(wage.brut) }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ formatDate(wage.effectiveDate) }}</td>
              <td class="px-4 py-3 text-sm">
                <button
                  @click="editWage(wage)"
                  class="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Düzenle
                </button>
                <button
                  @click="deleteWage(wage.year)"
                  class="text-red-600 hover:text-red-900"
                >
                  Sil
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Yeni Asgari Ücret Ekleme/Düzenleme Formu -->
      <div class="border-t pt-6">
        <h3 class="text-md font-medium text-gray-700 mb-4">
          {{ editingWage ? 'Asgari Ücret Düzenle' : 'Yeni Asgari Ücret Ekle' }}
        </h3>
        <form @submit.prevent="saveWage" class="space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Yıl <span class="text-red-500">*</span></label>
              <input
                v-model.number="wageForm.year"
                type="number"
                min="2020"
                :max="new Date().getFullYear() + 10"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                :disabled="editingWage"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Net Asgari Ücret (TL) <span class="text-red-500">*</span></label>
              <input
                v-model.number="wageForm.net"
                type="number"
                step="0.01"
                min="0"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="28007.50"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Brüt Asgari Ücret (TL) <span class="text-red-500">*</span></label>
              <input
                v-model.number="wageForm.brut"
                type="number"
                step="0.01"
                min="0"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="33030.00"
              />
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button
              v-if="editingWage"
              type="button"
              @click="cancelEdit"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ saving ? 'Kaydediliyor...' : (editingWage ? 'Güncelle' : 'Ekle') }}
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
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const toast = useToastStore()
const confirmModal = useConfirmStore()
const loading = ref(false)
const saving = ref(false)
const minimumWages = ref([])
const editingWage = ref(null)
const wageForm = ref({
  year: new Date().getFullYear(),
  net: null,
  brut: null
})

const loadMinimumWages = async () => {
  try {
    loading.value = true
    const response = await api.get('/global-settings/minimum-wages')
    if (response.data.success) {
      minimumWages.value = response.data.data.minimumWages || []
    }
  } catch (error) {
    console.error('Asgari ücretler yüklenemedi:', error)
    toast.error('Asgari ücretler yüklenirken bir hata oluştu')
  } finally {
    loading.value = false
  }
}

const saveWage = async () => {
  if (!wageForm.value.year || !wageForm.value.net || !wageForm.value.brut) {
    toast.warning('Lütfen tüm alanları doldurunuz')
    return
  }

  try {
    saving.value = true
    const response = await api.post('/global-settings/minimum-wages', wageForm.value)
    if (response.data.success) {
      toast.success(response.data.message || 'Asgari ücret kaydedildi')
      await loadMinimumWages()
      resetForm()
    }
  } catch (error) {
    console.error('Asgari ücret kaydedilemedi:', error)
    toast.error(error.response?.data?.message || 'Asgari ücret kaydedilirken bir hata oluştu')
  } finally {
    saving.value = false
  }
}

const editWage = (wage) => {
  editingWage.value = wage
  wageForm.value = {
    year: wage.year,
    net: wage.net,
    brut: wage.brut
  }
}

const cancelEdit = () => {
  editingWage.value = null
  resetForm()
}

const deleteWage = async (year) => {
  const confirmed = await confirmModal.show({
    title: 'Asgari Ücret Sil',
    message: `${year} yılına ait asgari ücret kaydını silmek istediğinize emin misiniz?`,
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    const response = await api.delete(`/global-settings/minimum-wages/${year}`)
    if (response.data.success) {
      toast.success('Asgari ücret silindi')
      await loadMinimumWages()
    }
  } catch (error) {
    console.error('Asgari ücret silinemedi:', error)
    toast.error(error.response?.data?.message || 'Asgari ücret silinirken bir hata oluştu')
  }
}

const resetForm = () => {
  editingWage.value = null
  wageForm.value = {
    year: new Date().getFullYear(),
    net: null,
    brut: null
  }
}

const formatCurrency = (value) => {
  if (!value) return '-'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value)
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('tr-TR')
}

onMounted(() => {
  loadMinimumWages()
})
</script>
