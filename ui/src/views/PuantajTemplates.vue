<template>
  <div>
    <div class="flex justify-end items-center mb-6">
      <button
        @click="openNewTemplateModal"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Yeni Sablon
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-lg shadow p-8 text-center">
      <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p class="text-gray-600">Sablonlar yukleniyor...</p>
    </div>

    <!-- Sablon Listesi -->
    <div v-else class="grid gap-4">
      <div
        v-for="template in templates"
        :key="template._id"
        class="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold text-gray-800">{{ template.name }}</h3>
              <span
                v-if="template.isDefault"
                class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full"
              >
                Varsayilan
              </span>
              <span
                v-if="!template.company"
                class="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
              >
                Global
              </span>
              <span
                v-if="isActiveTemplate(template._id)"
                class="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full"
              >
                Aktif
              </span>
            </div>
            <p v-if="template.description" class="text-sm text-gray-500 mt-1">{{ template.description }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="!isActiveTemplate(template._id)"
              @click="setActiveTemplate(template)"
              class="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Aktif Yap
            </button>
            <button
              @click="openTemplateDetail(template)"
              class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Detay
            </button>
            <button
              v-if="template.company && !template.isDefault"
              @click="deleteTemplate(template)"
              class="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Sil
            </button>
          </div>
        </div>

        <!-- Kodlar Onizleme -->
        <div class="mt-3 flex flex-wrap gap-2">
          <div
            v-for="code in templateCodes[template._id]?.slice(0, 8)"
            :key="code.code"
            class="px-2 py-1 rounded text-xs font-medium"
            :style="{ backgroundColor: code.color, color: code.textColor }"
          >
            {{ code.code }} - {{ code.name }}
          </div>
          <span
            v-if="templateCodes[template._id]?.length > 8"
            class="px-2 py-1 text-xs text-gray-500"
          >
            +{{ templateCodes[template._id].length - 8 }} daha
          </span>
        </div>
      </div>
    </div>

    <!-- Sablon Detay Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">{{ selectedTemplate?.name }}</h3>
          <button @click="closeDetailModal" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p v-if="selectedTemplate?.description" class="text-gray-500 mb-4">{{ selectedTemplate.description }}</p>

        <!-- Kodlar Tablosu -->
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-semibold">Puantaj Kodlari</h4>
            <button
              v-if="selectedTemplate?.company"
              @click="showAddCodeModal = true"
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Kod Ekle
            </button>
          </div>

          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-50">
                <th class="px-3 py-2 text-left text-sm font-medium text-gray-600">Kod</th>
                <th class="px-3 py-2 text-left text-sm font-medium text-gray-600">Ad</th>
                <th class="px-3 py-2 text-left text-sm font-medium text-gray-600">Renk</th>
                <th class="px-3 py-2 text-left text-sm font-medium text-gray-600">Otomatik Atama</th>
                <th class="px-3 py-2 text-left text-sm font-medium text-gray-600">Sira</th>
                <th v-if="selectedTemplate?.company" class="px-3 py-2 text-right text-sm font-medium text-gray-600">Islem</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="code in detailCodes" :key="code._id" class="hover:bg-gray-50">
                <td class="px-3 py-2">
                  <span
                    class="px-2 py-1 rounded font-bold"
                    :style="{ backgroundColor: code.color, color: code.textColor }"
                  >
                    {{ code.code }}
                  </span>
                </td>
                <td class="px-3 py-2">{{ code.name }}</td>
                <td class="px-3 py-2">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded border" :style="{ backgroundColor: code.color }"></div>
                    <span class="text-xs text-gray-500">{{ code.color }}</span>
                  </div>
                </td>
                <td class="px-3 py-2 text-sm">{{ autoAssignLabels[code.autoAssignType] || code.autoAssignType }}</td>
                <td class="px-3 py-2">{{ code.sortOrder }}</td>
                <td v-if="selectedTemplate?.company" class="px-3 py-2 text-right">
                  <button
                    v-if="!code.isSystem"
                    @click="editCode(code)"
                    class="text-blue-600 hover:text-blue-800 mr-2"
                  >
                    Duzenle
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end">
          <button @click="closeDetailModal" class="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
            Kapat
          </button>
        </div>
      </div>
    </div>

    <!-- Yeni Sablon Modal -->
    <div v-if="showNewModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-bold mb-4">Yeni Puantaj Sablonu</h3>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Sablon Adi *</label>
          <input
            v-model="newTemplate.name"
            type="text"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Sablon adi..."
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Aciklama</label>
          <textarea
            v-model="newTemplate.description"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            rows="2"
            placeholder="Sablon aciklamasi..."
          ></textarea>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Kodlari Kopyala</label>
          <select v-model="newTemplate.copyFromTemplate" class="w-full px-3 py-2 border rounded-lg">
            <option :value="null">Bos sablon</option>
            <option v-for="t in templates" :key="t._id" :value="t._id">{{ t.name }}</option>
          </select>
        </div>

        <div class="flex justify-end gap-2">
          <button @click="showNewModal = false" class="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Iptal
          </button>
          <button
            @click="createTemplate"
            :disabled="!newTemplate.name"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Olustur
          </button>
        </div>
      </div>
    </div>

    <!-- Kod Ekleme/Duzenleme Modal -->
    <div v-if="showAddCodeModal || editingCode" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-bold mb-4">{{ editingCode ? 'Kod Duzenle' : 'Yeni Kod Ekle' }}</h3>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kod *</label>
            <input
              v-model="codeForm.code"
              type="text"
              maxlength="2"
              class="w-full px-3 py-2 border rounded-lg uppercase"
              placeholder="N"
              :disabled="editingCode"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Sira</label>
            <input
              v-model.number="codeForm.sortOrder"
              type="number"
              min="1"
              class="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
          <input
            v-model="codeForm.name"
            type="text"
            class="w-full px-3 py-2 border rounded-lg"
            placeholder="Normal"
          />
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Arkaplan Rengi</label>
            <div class="flex gap-2">
              <input v-model="codeForm.color" type="color" class="w-12 h-10 rounded cursor-pointer" />
              <input v-model="codeForm.color" type="text" class="flex-1 px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Yazi Rengi</label>
            <div class="flex gap-2">
              <input v-model="codeForm.textColor" type="color" class="w-12 h-10 rounded cursor-pointer" />
              <input v-model="codeForm.textColor" type="text" class="flex-1 px-3 py-2 border rounded-lg" />
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Otomatik Atama Turu</label>
          <select v-model="codeForm.autoAssignType" class="w-full px-3 py-2 border rounded-lg">
            <option value="custom">Ozel (Manuel)</option>
            <option value="normal">Normal Gun</option>
            <option value="weekend">Hafta Tatili</option>
            <option value="public_holiday">Resmi Tatil</option>
            <option value="annual_leave">Yillik Izin</option>
            <option value="sick_leave">Rapor</option>
            <option value="leave">Diger Izin</option>
            <option value="absent">Eksik Gun</option>
            <option value="half_day">Yarim Gun</option>
            <option value="day_overtime">Gunduz Mesai</option>
            <option value="night_overtime">Gece Mesai</option>
          </select>
        </div>

        <!-- Onizleme -->
        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
          <label class="block text-sm font-medium text-gray-700 mb-2">Onizleme</label>
          <span
            class="px-3 py-1.5 rounded font-bold"
            :style="{ backgroundColor: codeForm.color, color: codeForm.textColor }"
          >
            {{ codeForm.code || '?' }} - {{ codeForm.name || 'Ad' }}
          </span>
        </div>

        <div class="flex justify-end gap-2">
          <button @click="closeCodeModal" class="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Iptal
          </button>
          <button
            @click="saveCode"
            :disabled="!codeForm.code || !codeForm.name"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ editingCode ? 'Guncelle' : 'Ekle' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import api from '@/services/api'

const authStore = useAuthStore()
const toast = useToastStore()
const confirmModal = useConfirmStore()

const loading = ref(false)
const templates = ref([])
const templateCodes = ref({})
const activeTemplateId = ref(null)

// Modals
const showDetailModal = ref(false)
const showNewModal = ref(false)
const showAddCodeModal = ref(false)
const selectedTemplate = ref(null)
const detailCodes = ref([])
const editingCode = ref(null)

// Forms
const newTemplate = ref({
  name: '',
  description: '',
  copyFromTemplate: null
})

const codeForm = ref({
  code: '',
  name: '',
  color: '#FFFFFF',
  textColor: '#000000',
  autoAssignType: 'custom',
  sortOrder: 99
})

const autoAssignLabels = {
  normal: 'Normal Gun',
  weekend: 'Hafta Tatili',
  public_holiday: 'Resmi Tatil',
  annual_leave: 'Yillik Izin',
  sick_leave: 'Rapor',
  leave: 'Diger Izin',
  absent: 'Eksik Gun',
  half_day: 'Yarim Gun',
  day_overtime: 'Gunduz Mesai',
  night_overtime: 'Gece Mesai',
  half_public: 'Yarim Gun Resmi Tatil',
  half_weekend: 'Yarim Gun Hafta Tatili',
  custom: 'Ozel'
}

const loadTemplates = async () => {
  loading.value = true
  try {
    const response = await api.get('/puantaj/templates')
    templates.value = response.data?.data || response.data

    // Aktif sablonu al
    const companyId = authStore.user?.company
    if (companyId) {
      const companyRes = await api.get(`/companies/${companyId}`)
      activeTemplateId.value = companyRes.data.activePuantajTemplate
    }

    // Her sablonun kodlarini yukle
    for (const template of templates.value) {
      const codesRes = await api.get(`/puantaj/templates/${template._id}/codes`)
      templateCodes.value[template._id] = codesRes.data
    }
  } catch (error) {
    console.error('Sablonlar yuklenemedi:', error)
    toast.error(error.response?.data?.message || 'Şablonlar yüklenemedi')
  } finally {
    loading.value = false
  }
}

const isActiveTemplate = (templateId) => {
  return activeTemplateId.value === templateId
}

const setActiveTemplate = async (template) => {
  try {
    const companyId = authStore.user?.company
    if (!companyId) {
      toast.error('Şirket bilgisi bulunamadı')
      return
    }

    await api.put(`/companies/${companyId}`, {
      activePuantajTemplate: template._id
    })

    activeTemplateId.value = template._id
    toast.success(`"${template.name}" şablonu aktif olarak ayarlandı`)
  } catch (error) {
    toast.error(error.response?.data?.message || 'Şablon aktif yapılamadı')
  }
}

const openNewTemplateModal = () => {
  newTemplate.value = {
    name: '',
    description: '',
    copyFromTemplate: null
  }
  showNewModal.value = true
}

const createTemplate = async () => {
  try {
    const response = await api.post('/puantaj/templates', newTemplate.value)
    templates.value.push(response.data)

    // Kodlari yukle
    const codesRes = await api.get(`/puantaj/templates/${response.data._id}/codes`)
    templateCodes.value[response.data._id] = codesRes.data

    showNewModal.value = false
    toast.success('Şablon oluşturuldu')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Şablon oluşturulamadı')
  }
}

const openTemplateDetail = async (template) => {
  selectedTemplate.value = template
  try {
    const response = await api.get(`/puantaj/templates/${template._id}`)
    detailCodes.value = await api.get(`/puantaj/templates/${template._id}/codes`).then(r => r.data)
  } catch (error) {
    console.error('Detay yuklenemedi:', error)
  }
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedTemplate.value = null
  detailCodes.value = []
}

const deleteTemplate = async (template) => {
  const confirmed = await confirmModal.show({
    title: 'Şablonu Sil',
    message: `"${template.name}" sablonunu silmek istediginize emin misiniz?`,
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    await api.delete(`/puantaj/templates/${template._id}`)
    templates.value = templates.value.filter(t => t._id !== template._id)
    delete templateCodes.value[template._id]
    toast.success('Şablon silindi')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Şablon silinemedi')
  }
}

const editCode = (code) => {
  codeForm.value = { ...code }
  editingCode.value = code
}

const closeCodeModal = () => {
  showAddCodeModal.value = false
  editingCode.value = null
  codeForm.value = {
    code: '',
    name: '',
    color: '#FFFFFF',
    textColor: '#000000',
    autoAssignType: 'custom',
    sortOrder: 99
  }
}

const saveCode = async () => {
  try {
    if (editingCode.value) {
      // Guncelle
      await api.put(`/puantaj/codes/${editingCode.value._id}`, codeForm.value)
      const idx = detailCodes.value.findIndex(c => c._id === editingCode.value._id)
      if (idx !== -1) {
        detailCodes.value[idx] = { ...detailCodes.value[idx], ...codeForm.value }
      }
    } else {
      // Yeni ekle
      const response = await api.post(`/puantaj/templates/${selectedTemplate.value._id}/codes`, codeForm.value)
      detailCodes.value.push(response.data)
      templateCodes.value[selectedTemplate.value._id] = detailCodes.value
    }
    closeCodeModal()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Kod kaydedilemedi')
  }
}

onMounted(() => {
  loadTemplates()
})
</script>
