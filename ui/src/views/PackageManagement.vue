<template>
  <div>
    <div class="flex justify-end items-center mb-6">
      <Button @click="openCreateModal">Yeni Paket Ekle</Button>
    </div>

    <!-- Paket Listesi -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sira</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paket Adi</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calisan Limiti</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aylik Fiyat</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yillik Fiyat</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kisi Basi</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Islemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="pkg in packages" :key="pkg._id" :class="{ 'bg-gray-50': !pkg.isActive }">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ pkg.sortOrder }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ pkg.name }}</div>
              <div v-if="pkg.highlightText" class="text-xs text-blue-600">{{ pkg.highlightText }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ pkg.code }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{{ pkg.employeeLimit }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatCurrency(pkg.monthlyPrice) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatCurrency(pkg.yearlyPrice) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatCurrency(pkg.pricePerEmployee) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ pkg.isActive ? 'Aktif' : 'Pasif' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="editPackage(pkg)" class="text-indigo-600 hover:text-indigo-900 mr-3">Duzenle</button>
              <button
                @click="toggleActive(pkg)"
                :class="pkg.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'"
                class="mr-3"
              >
                {{ pkg.isActive ? 'Pasif Yap' : 'Aktif Yap' }}
              </button>
              <button @click="deletePackage(pkg._id)" class="text-red-600 hover:text-red-900">Sil</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paket Olustur/Duzenle Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">{{ editingPackage ? 'Paket Duzenle' : 'Yeni Paket Olustur' }}</h2>
        <form @submit.prevent="savePackage">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Paket Adi *</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10 Kisilik Paket"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kod *</label>
              <input
                v-model="form.code"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="PKG_10"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Calisan Limiti *</label>
              <input
                v-model.number="form.employeeLimit"
                type="number"
                required
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Siralama</label>
              <input
                v-model.number="form.sortOrder"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Aylik Fiyat (TL) *</label>
              <input
                v-model.number="form.monthlyPrice"
                type="number"
                required
                min="0"
                step="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Yillik Fiyat (TL) *</label>
              <input
                v-model.number="form.yearlyPrice"
                type="number"
                required
                min="0"
                step="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kisi Basi Fiyat (TL)</label>
              <input
                v-model.number="form.pricePerEmployee"
                type="number"
                min="0"
                step="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Vurgulama Metni</label>
              <input
                v-model="form.highlightText"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="En Populer"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Aciklama</label>
              <textarea
                v-model="form.description"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paket aciklamasi..."
              ></textarea>
            </div>
            <div class="col-span-2">
              <label class="flex items-center">
                <input
                  v-model="form.isActive"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span class="ml-2 text-sm text-gray-700">Aktif</span>
              </label>
            </div>
          </div>

          <!-- Ozellikler -->
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Ozellikler</label>
            <div class="space-y-2">
              <div v-for="(feature, index) in form.features" :key="index" class="flex items-center gap-2">
                <input
                  v-model="feature.name"
                  type="text"
                  placeholder="Ozellik adi"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label class="flex items-center">
                  <input
                    v-model="feature.enabled"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600"
                  />
                  <span class="ml-1 text-sm">Aktif</span>
                </label>
                <button
                  type="button"
                  @click="removeFeature(index)"
                  class="text-red-600 hover:text-red-800"
                >
                  Sil
                </button>
              </div>
              <button
                type="button"
                @click="addFeature"
                class="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Ozellik Ekle
              </button>
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
            <Button type="submit" :loading="saving">
              {{ editingPackage ? 'Guncelle' : 'Olustur' }}
            </Button>
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
const packages = ref([])
const showModal = ref(false)
const editingPackage = ref(null)
const saving = ref(false)

const form = ref({
  name: '',
  code: '',
  employeeLimit: 10,
  monthlyPrice: 0,
  yearlyPrice: 0,
  pricePerEmployee: 0,
  description: '',
  highlightText: '',
  sortOrder: 0,
  isActive: true,
  features: []
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(value || 0)
}

const fetchPackages = async () => {
  try {
    const response = await api.get('/packages')
    packages.value = response.data.data || response.data
  } catch (error) {
    console.error('Paketler yuklenirken hata:', error)
    toast.error('Paketler yüklenirken bir hata oluştu')
  }
}

const openCreateModal = () => {
  editingPackage.value = null
  form.value = {
    name: '',
    code: '',
    employeeLimit: 10,
    monthlyPrice: 0,
    yearlyPrice: 0,
    pricePerEmployee: 0,
    description: '',
    highlightText: '',
    sortOrder: packages.value.length + 1,
    isActive: true,
    features: []
  }
  showModal.value = true
}

const editPackage = (pkg) => {
  editingPackage.value = pkg
  form.value = {
    name: pkg.name,
    code: pkg.code,
    employeeLimit: pkg.employeeLimit,
    monthlyPrice: pkg.monthlyPrice,
    yearlyPrice: pkg.yearlyPrice,
    pricePerEmployee: pkg.pricePerEmployee || 0,
    description: pkg.description || '',
    highlightText: pkg.highlightText || '',
    sortOrder: pkg.sortOrder || 0,
    isActive: pkg.isActive,
    features: pkg.features ? [...pkg.features] : []
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingPackage.value = null
}

const addFeature = () => {
  form.value.features.push({ name: '', enabled: true })
}

const removeFeature = (index) => {
  form.value.features.splice(index, 1)
}

const savePackage = async () => {
  saving.value = true
  try {
    // Kisi basi fiyati hesapla
    if (!form.value.pricePerEmployee && form.value.monthlyPrice && form.value.employeeLimit) {
      form.value.pricePerEmployee = Math.round(form.value.monthlyPrice / form.value.employeeLimit)
    }

    if (editingPackage.value) {
      await api.put(`/packages/${editingPackage.value._id}`, form.value)
      toast.success('Paket güncellendi')
    } else {
      await api.post('/packages', form.value)
      toast.success('Paket oluşturuldu')
    }
    closeModal()
    await fetchPackages()
  } catch (error) {
    console.error('Paket kaydetme hatasi:', error)
    toast.error(error.response?.data?.message || 'Paket kaydedilirken bir hata oluştu')
  } finally {
    saving.value = false
  }
}

const toggleActive = async (pkg) => {
  try {
    await api.post(`/packages/${pkg._id}/toggle-active`)
    await fetchPackages()
  } catch (error) {
    console.error('Durum degistirme hatasi:', error)
    toast.error(error.response?.data?.message || 'Durum değiştirilirken bir hata oluştu')
  }
}

const deletePackage = async (id) => {
  const confirmed = await confirmModal.show({
    title: 'Paketi Sil',
    message: 'Bu paketi silmek istediginizden emin misiniz?',
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    await api.delete(`/packages/${id}`)
    await fetchPackages()
    toast.success('Paket silindi')
  } catch (error) {
    console.error('Paket silme hatasi:', error)
    toast.error(error.response?.data?.message || 'Paket silinirken bir hata oluştu')
  }
}

onMounted(fetchPackages)
</script>
