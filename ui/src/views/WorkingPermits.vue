<template>
  <div>
    <!-- Bayi Admin için Şirket Seçimi -->
    <div v-if="isBayiAdmin" class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        İşlem Yapmak İstediğiniz Şirketi Seçiniz <span class="text-red-500">*</span>
      </label>
      <select
        v-model="selectedCompanyId"
        @change="loadLeaveTypes"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      >
        <option value="">Seçiniz</option>
        <option v-for="comp in companies" :key="comp._id" :value="comp._id">
          {{ comp.name }}
        </option>
      </select>
      <p v-if="!selectedCompanyId" class="mt-2 text-sm text-yellow-600">
        Lütfen işlem yapmak istediğiniz şirketi seçiniz.
      </p>
    </div>

    <div class="flex justify-end items-center mb-6">
      <Button 
        @click="showModal = true" 
        :disabled="isBayiAdmin && !selectedCompanyId"
      >
        Yeni İzin Türü Ekle
      </Button>
    </div>

    <div v-if="isBayiAdmin && !selectedCompanyId" class="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
      Lütfen işlem yapmak istediğiniz şirketi seçiniz.
    </div>

    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <div class="divide-y divide-gray-200">
        <div
          v-for="leaveType in mainLeaveTypes"
          :key="leaveType._id"
          class="p-4 hover:bg-gray-50"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 flex-1">
              <!-- Kilit ikonu (varsayılan izinler için) -->
              <span v-if="leaveType.isDefault" class="text-gray-400" title="Sistem varsayılanı - değiştirilemez">
                🔒
              </span>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-900">{{ leaveType.name }}</span>
                  <span v-if="leaveType.isDefault" class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    Varsayılan
                  </span>
                  <span v-else class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    Şirket Özel
                  </span>
                </div>
                <p v-if="leaveType.description" class="text-sm text-gray-500 mt-1">{{ leaveType.description }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="canEdit(leaveType)"
                @click="editLeaveType(leaveType)"
                class="text-indigo-600 hover:text-indigo-900 text-sm"
              >
                Düzenle
              </button>
              <button
                v-if="canDelete(leaveType)"
                @click="deleteLeaveType(leaveType._id)"
                class="text-red-600 hover:text-red-900 text-sm"
              >
                Sil
              </button>
            </div>
          </div>
          
          <!-- Alt kategoriler (accordion) - "Diğer izinler" için -->
          <div v-if="leaveType.name === 'Diğer izinler' && getSubTypes(leaveType._id).length > 0" class="mt-3 ml-8">
            <button
              @click="toggleAccordion(leaveType._id)"
              class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <span>{{ expandedLeaveTypes.includes(leaveType._id) ? '▼' : '▶' }}</span>
              <span>Alt kategoriler ({{ getSubTypes(leaveType._id).length }})</span>
            </button>
            <div v-if="expandedLeaveTypes.includes(leaveType._id)" class="mt-2 space-y-2 pl-6 border-l-2 border-gray-200">
              <div
                v-for="subType in getSubTypes(leaveType._id)"
                :key="subType._id"
                class="flex items-center justify-between py-2"
              >
                <div class="flex items-center gap-3 flex-1">
                  <span v-if="subType.isDefault" class="text-gray-400" title="Sistem varsayılanı - değiştirilemez">
                    🔒
                  </span>
                  <div>
                    <span class="text-sm text-gray-700">{{ subType.name }}</span>
                    <p v-if="subType.description" class="text-xs text-gray-500 mt-1">{{ subType.description }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    v-if="canEditSubType(subType)"
                    @click="editSubType(subType)"
                    class="text-indigo-600 hover:text-indigo-900 text-xs"
                  >
                    Düzenle
                  </button>
                  <button
                    v-if="canDeleteSubType(subType)"
                    @click="deleteSubType(subType._id)"
                    class="text-red-600 hover:text-red-900 text-xs"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal - İzin Türü Ekleme/Düzenleme -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">{{ editingLeaveType ? 'İzin Türü Düzenle' : 'Yeni İzin Türü Ekle' }}</h2>
        <form @submit.prevent="saveLeaveType">
          <div class="space-y-4">
            <!-- Bayi Admin için Şirket Seçimi -->
            <div v-if="isBayiAdmin && !editingLeaveType">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Bu izin türünü şu şirketlere uygula <span class="text-red-500">*</span>
              </label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    v-model="applyToAllCompanies"
                    @change="handleApplyToAllChange"
                    class="mr-2"
                  />
                  <span class="text-sm text-gray-700">Tüm Şirketler İçin Uygula</span>
                </label>
                <div v-if="!applyToAllCompanies" class="max-h-48 overflow-y-auto border border-gray-300 rounded p-2">
                  <div v-for="comp in companies" :key="comp._id" class="mb-2">
                    <label class="flex items-center">
                      <input
                        type="checkbox"
                        :value="comp._id"
                        v-model="selectedCompanyIds"
                        class="mr-2"
                      />
                      <span class="text-sm text-gray-700">{{ comp.name }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <Input v-model="form.name" label="İzin Türü Adı" required />
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Üst Kategori (Opsiyonel)</label>
              <select
                v-model="form.parentPermitId"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ana kategori (üst kategori yok)</option>
                <option
                  v-for="lt in mainLeaveTypes.filter(lt => lt.name === 'Diğer izinler')"
                  :key="lt._id"
                  :value="lt._id"
                >
                  {{ lt.name }}
                </option>
              </select>
              <p class="mt-1 text-xs text-gray-500">
                Üst kategori seçilirse bu izin türü alt kategori olarak kaydedilir.
              </p>
            </div>
            <Textarea v-model="form.description" label="Açıklama" />
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeModal">İptal</Button>
              <Button type="submit">Kaydet</Button>
            </div>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Textarea from '@/components/Textarea.vue'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const toast = useToastStore()
const confirmModal = useConfirmStore()
const authStore = useAuthStore()
const leaveTypes = ref([])
const companies = ref([])
const showModal = ref(false)
const editingLeaveType = ref(null)
const editingSubType = ref(null)
const expandedLeaveTypes = ref([])
const selectedCompanyId = ref(null)
const applyToAllCompanies = ref(false)
const selectedCompanyIds = ref([])

const form = ref({
  name: '',
  description: '',
  parentPermitId: ''
})

const subTypeForm = ref({
  name: '',
  description: '',
  parentPermitId: ''
})

const isSuperAdmin = computed(() => authStore.isSuperAdmin)
const isBayiAdmin = computed(() => authStore.isBayiAdmin)
const isCompanyAdmin = computed(() => authStore.hasAnyRole('company_admin', 'resmi_muhasebe_ik'))

// Ana kategoriler (parentPermitId olmayanlar)
const mainLeaveTypes = computed(() => {
  return leaveTypes.value.filter(lt => !lt.parentPermitId)
})

// Alt kategorileri getir
const getSubTypes = (parentPermitId) => {
  return leaveTypes.value.filter(st => 
    st.parentPermitId && 
    (st.parentPermitId === parentPermitId || st.parentPermitId?._id === parentPermitId || st.parentPermitId?.toString() === parentPermitId?.toString())
  )
}

// Accordion toggle
const toggleAccordion = (leaveTypeId) => {
  const index = expandedLeaveTypes.value.indexOf(leaveTypeId)
  if (index > -1) {
    expandedLeaveTypes.value.splice(index, 1)
  } else {
    expandedLeaveTypes.value.push(leaveTypeId)
  }
}

const canEdit = (leaveType) => {
  if (isSuperAdmin.value) return true
  if (leaveType.isDefault) return false // Varsayılan izinler düzenlenemez (sadece customDays)
  if (isBayiAdmin.value) {
    // Bayi admin için şirket kontrolü
    return selectedCompanyId.value && leaveType.company === selectedCompanyId.value
  }
  const userCompanyId = authStore.companyId
  return leaveType.company === userCompanyId || leaveType.company?._id === userCompanyId
}

const canDelete = (leaveType) => {
  if (isSuperAdmin.value) return true
  if (leaveType.isDefault) return false // Varsayılan izinler silinemez
  if (isBayiAdmin.value) {
    return selectedCompanyId.value && leaveType.company === selectedCompanyId.value
  }
  const userCompanyId = authStore.companyId
  return leaveType.company === userCompanyId || leaveType.company?._id === userCompanyId
}

const canEditSubType = (subType) => {
  return canEdit(subType)
}

const canDeleteSubType = (subType) => {
  return canDelete(subType)
}

const loadCompanies = async () => {
  if (isBayiAdmin.value) {
    try {
      const response = await api.get('/companies')
      companies.value = response.data?.data || response.data || []
    } catch (error) {
      console.error('Şirketler yüklenemedi:', error)
      companies.value = []
    }
  }
}

const loadLeaveTypes = async () => {
  try {
    let companyId = null
    if (isBayiAdmin.value) {
      if (!selectedCompanyId.value) {
        leaveTypes.value = []
        return
      }
      companyId = selectedCompanyId.value
    } else if (isCompanyAdmin.value) {
      companyId = authStore.user?.company
    }

    if (!companyId && !isSuperAdmin) {
      leaveTypes.value = []
      return
    }

    const response = await api.get('/working-permits', {
      params: { companyId }
    })
    if (response.data.success) {
      leaveTypes.value = response.data.data || []
    }
  } catch (error) {
    console.error('İzin türleri yüklenemedi:', error)
    toast.error(error.response?.data?.message || 'İzin türleri yüklenemedi')
  }
}

const handleApplyToAllChange = () => {
  if (applyToAllCompanies.value) {
    selectedCompanyIds.value = []
  }
}

const saveLeaveType = async () => {
  try {
    // Bayi admin için şirket seçimi kontrolü
    if (isBayiAdmin.value && !editingLeaveType.value) {
      if (applyToAllCompanies.value === false && (!selectedCompanyIds.value || selectedCompanyIds.value.length === 0)) {
        toast.warning('Lütfen izin türünü uygulamak istediğiniz şirketleri seçiniz.')
        return
      }
    }

    // Onay mesajı
    if (isBayiAdmin.value && !editingLeaveType.value) {
      const confirmed = await confirmModal.show({
        title: 'İşlemi Onayla',
        message: 'Bu işlem seçtiğiniz şirket(ler) için uygulanacaktır. Onaylıyor musunuz?',
        type: 'warning',
        confirmText: 'Onayla'
      })
      if (!confirmed) return
    }

    const payload = {
      name: form.value.name.trim(),
      description: form.value.description?.trim() || null
    }

    if (isBayiAdmin.value && !editingLeaveType.value) {
      if (applyToAllCompanies.value) {
        // Tüm şirketler için oluştur
        const promises = companies.value.map(comp => 
          api.post('/working-permits', {
            ...payload,
            companyId: comp._id,
            parentPermitId: form.value.parentPermitId || null
          })
        )
        await Promise.all(promises)
        closeModal()
        loadLeaveTypes()
        return
      } else if (selectedCompanyIds.value && selectedCompanyIds.value.length > 0) {
        // Seçili şirketler için oluştur
        const promises = selectedCompanyIds.value.map(companyId => 
          api.post('/working-permits', {
            ...payload,
            companyId: companyId,
            parentPermitId: form.value.parentPermitId || null
          })
        )
        await Promise.all(promises)
        closeModal()
        loadLeaveTypes()
        return
      } else {
        // Tek şirket için
        payload.companyId = selectedCompanyId.value
      }
    }

    if (form.value.parentPermitId) {
      payload.parentPermitId = form.value.parentPermitId
    }

    let response
    console.log(editingLeaveType.value)
    if (editingLeaveType.value) {
      response = await api.put(`/working-permits/${editingLeaveType.value._id}`, payload)
    } else {
      response = await api.post('/working-permits', payload)
    }

    if (response.data.success === false) {
      toast.error(response.data.message || 'Hata oluştu')
      return
    }

    if (response.data.message) {
      toast.success(response.data.message)
    }

    closeModal()
    loadLeaveTypes()
  } catch (error) {
    toast.error(error.response?.data?.message || error.response?.data?.error || 'Hata oluştu')
  }
}

const editLeaveType = (leaveType) => {
  editingLeaveType.value = leaveType
  form.value = {
    name: leaveType.name,
    description: leaveType.description || '',
    parentPermitId: leaveType.parentPermitId?._id || leaveType.parentPermitId || ''
  }
  showModal.value = true
}

const deleteLeaveType = async (id) => {
  const confirmed = await confirmModal.show({
    title: 'İzin Türünü Sil',
    message: 'Bu izin türünü silmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    const response = await api.delete(`/working-permits/${id}`)
    if (response.data.success === false) {
      toast.error(response.data.message || 'Hata oluştu')
      return
    }
    toast.success('İzin türü silindi')
    loadLeaveTypes()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const editSubType = (subType) => {
  editingSubType.value = subType
  editingLeaveType.value = subType
  form.value = {
    name: subType.name,
    description: subType.description || '',
    parentPermitId: subType.parentPermitId?._id || subType.parentPermitId || ''
  }
  showModal.value = true
}

const deleteSubType = async (id) => {
  const confirmed = await confirmModal.show({
    title: 'Alt İzin Türünü Sil',
    message: 'Bu alt izin türünü silmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    const response = await api.delete(`/working-permits/${id}`)
    if (response.data.success === false) {
      toast.error(response.data.message || 'Hata oluştu')
      return
    }
    toast.success('Alt izin türü silindi')
    loadLeaveTypes()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const closeModal = () => {
  showModal.value = false
  editingLeaveType.value = null
  editingSubType.value = null
  form.value = {
    name: '',
    description: '',
    parentPermitId: ''
  }
  applyToAllCompanies.value = false
  selectedCompanyIds.value = []
}

onMounted(() => {
  if (isBayiAdmin.value) {
    loadCompanies()
  } else {
    loadLeaveTypes()
  }
})
</script>
