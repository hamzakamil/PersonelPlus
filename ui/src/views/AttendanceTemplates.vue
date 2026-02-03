<template>
  <div>
    <div class="flex justify-end items-center mb-6">
      <Button @click="showModal = true">Yeni Şablon Ekle</Button>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kodlar</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="template in templates" :key="template._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ template.name }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ template.description }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span v-if="template.isDefault" class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                Varsayılan
              </span>
              <span v-else class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                Şirket Özel
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              <span v-for="item in template.items" :key="item._id" class="inline-block mr-2">
                <span class="font-mono font-semibold" :style="{ color: item.color }">{{ item.code }}</span>
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                v-if="canEdit(template)"
                @click="editTemplate(template)"
                class="text-indigo-600 hover:text-indigo-900 mr-4"
              >
                Düzenle
              </button>
              <button
                v-if="canDelete(template)"
                @click="deleteTemplate(template._id)"
                class="text-red-600 hover:text-red-900"
              >
                Sil
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Template Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-3xl my-8">
        <h2 class="text-xl font-bold mb-4">{{ editingTemplate ? 'Şablon Düzenle' : 'Yeni Şablon Ekle' }}</h2>
        <form @submit.prevent="saveTemplate">
          <div class="space-y-4">
            <Input v-model="form.name" label="Şablon Adı" required />
            <Textarea v-model="form.description" label="Açıklama" />
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kodlar</label>
              <div class="space-y-2">
                <div
                  v-for="(item, index) in form.items"
                  :key="index"
                  class="flex gap-2 items-center p-3 border rounded-lg"
                >
                  <Input
                    v-model="item.code"
                    placeholder="Kod (örn: N)"
                    class="w-20"
                    required
                    @input="item.code = item.code.toUpperCase()"
                  />
                  <Input
                    v-model="item.description"
                    placeholder="Açıklama (örn: Normal)"
                    class="flex-1"
                    required
                  />
                  <input
                    v-model="item.color"
                    type="color"
                    class="w-12 h-10 rounded border"
                  />
                  <input
                    v-model="item.isWorkingDay"
                    type="checkbox"
                    class="mr-2"
                  />
                  <span class="text-sm text-gray-600">Çalışma Günü</span>
                  <Button
                    variant="danger"
                    type="button"
                    @click="form.items.splice(index, 1)"
                  >
                    Sil
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                @click="form.items.push({ code: '', description: '', color: '#6B7280', isWorkingDay: true })"
              >
                Kod Ekle
              </Button>
            </div>

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
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Textarea from '@/components/Textarea.vue'

const authStore = useAuthStore()
const toast = useToastStore()
const confirmModal = useConfirmStore()
const templates = ref([])
const showModal = ref(false)
const editingTemplate = ref(null)
const form = ref({
  name: '',
  description: '',
  items: [
    { code: 'N', description: 'Normal', color: '#10B981', isWorkingDay: true },
    { code: 'T', description: 'Resmi Tatil', color: '#EF4444', isWorkingDay: false },
    { code: 'İ', description: 'İzinli', color: '#F59E0B', isWorkingDay: false }
  ]
})

const isSuperAdmin = computed(() => authStore.isSuperAdmin)

const canEdit = (template) => {
  if (isSuperAdmin.value) return true
  if (template.isDefault) return false
  const templateCompanyId = template.company?._id || template.company
  return templateCompanyId === authStore.companyId
}

const canDelete = (template) => {
  if (isSuperAdmin.value) return true
  if (template.isDefault) return false
  const templateCompanyId = template.company?._id || template.company
  return templateCompanyId === authStore.companyId
}

const loadTemplates = async () => {
  try {
    const response = await api.get('/attendance-templates')
    const templatesWithItems = await Promise.all(
      response.data.map(async (template) => {
        const itemResponse = await api.get(`/attendance-templates/${template._id}`)
        return itemResponse.data
      })
    )
    templates.value = templatesWithItems
  } catch (error) {
    console.error('Şablonlar yüklenemedi:', error)
  }
}

const saveTemplate = async () => {
  try {
    const payload = {
      name: form.value.name,
      description: form.value.description,
      items: form.value.items.map((item, index) => ({
        code: item.code.toUpperCase(),
        description: item.description,
        color: item.color,
        isWorkingDay: item.isWorkingDay,
        order: index
      }))
    }

    if (editingTemplate.value) {
      await api.put(`/attendance-templates/${editingTemplate.value._id}`, payload)
    } else {
      await api.post('/attendance-templates', payload)
    }
    toast.success('Şablon başarıyla kaydedildi')
    closeModal()
    loadTemplates()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const editTemplate = (template) => {
  editingTemplate.value = template
  form.value = {
    name: template.name,
    description: template.description || '',
    items: template.items?.length > 0 
      ? template.items.map(item => ({
          code: item.code,
          description: item.description,
          color: item.color,
          isWorkingDay: item.isWorkingDay
        }))
      : [
          { code: 'N', description: 'Normal', color: '#10B981', isWorkingDay: true },
          { code: 'T', description: 'Resmi Tatil', color: '#EF4444', isWorkingDay: false },
          { code: 'İ', description: 'İzinli', color: '#F59E0B', isWorkingDay: false }
        ]
  }
  showModal.value = true
}

const deleteTemplate = async (id) => {
  const confirmed = await confirmModal.show({
    title: 'Şablonu Sil',
    message: 'Bu şablonu silmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    await api.delete(`/attendance-templates/${id}`)
    toast.success('Şablon başarıyla silindi')
    loadTemplates()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const closeModal = () => {
  showModal.value = false
  editingTemplate.value = null
  form.value = {
    name: '',
    description: '',
    items: [
      { code: 'N', description: 'Normal', color: '#10B981', isWorkingDay: true },
      { code: 'T', description: 'Resmi Tatil', color: '#EF4444', isWorkingDay: false },
      { code: 'İ', description: 'İzinli', color: '#F59E0B', isWorkingDay: false }
    ]
  }
}

onMounted(() => {
  loadTemplates()
})
</script>

