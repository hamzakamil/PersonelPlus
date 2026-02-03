<template>
  <div class="p-6">
    <!-- Bayi Admin için Şirket Seçimi -->
    <div v-if="isBayiAdmin" class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        İşlem Yapmak İstediğiniz Şirketi Seçiniz <span class="text-red-500">*</span>
      </label>
      <select
        v-model="selectedCompanyId"
        @change="loadSettings"
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

    <div v-if="isBayiAdmin && !selectedCompanyId" class="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
      Lütfen işlem yapmak istediğiniz şirketi seçiniz.
    </div>

    <div v-else class="bg-white rounded-lg shadow p-6 max-w-4xl">
      <!-- Mevcut Ayarlar Bilgisi -->
      <div v-if="settings && settings.data" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-medium text-green-800">WhatsApp ayarları yapılandırılmış</span>
        </div>
        <div class="text-sm text-green-700">
          <p><strong>Numara:</strong> {{ settings.data.whatsappBusinessNumber }}</p>
          <p><strong>API Sağlayıcı:</strong> {{ settings.data.apiProvider }}</p>
          <p><strong>Durum:</strong> 
            <span :class="settings.data.isActive ? 'text-green-600' : 'text-gray-600'">
              {{ settings.data.isActive ? 'Aktif' : 'Pasif' }}
            </span>
          </p>
          <p v-if="settings.data.lastTestedAt" class="text-xs text-gray-600 mt-1">
            Son test: {{ formatDate(settings.data.lastTestedAt) }}
          </p>
        </div>
      </div>

      <form @submit.prevent="saveSettings">
        <div class="space-y-6">
          <!-- WhatsApp İşletme Numarası -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp İşletme Numarası <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.whatsappBusinessNumber"
              type="text"
              placeholder="+90 532 000 00 00"
              required
              maxlength="17"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': phoneError }"
            />
            <p v-if="phoneError" class="mt-1 text-sm text-red-600">{{ phoneError }}</p>
            <p class="mt-1 text-xs text-gray-500">Numara +90 ile başlamalı ve geçerli formatta olmalıdır</p>
          </div>

          <!-- API Sağlayıcı -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              API Sağlayıcı <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.apiProvider"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Meta Cloud API">Meta Cloud API</option>
              <option value="Twilio">Twilio</option>
              <option value="Diğer">Diğer</option>
            </select>
            <p class="mt-1 text-xs text-gray-500">Entegrasyon henüz aktif değil, sadece seçim yapılabilir</p>
          </div>

          <!-- API Key / Token -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              API Key / Token <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.apiKey"
              type="password"
              placeholder="API anahtarınızı giriniz"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="mt-1 text-xs text-gray-500">API anahtarı şifrelenmiş olarak saklanacaktır</p>
            <p v-if="settings && settings.data" class="mt-1 text-xs text-yellow-600">
              Mevcut API anahtarı değiştirmek için yeni bir değer giriniz
            </p>
          </div>

          <!-- Aktif/Pasif -->
          <div>
            <label class="flex items-center">
              <input
                type="checkbox"
                v-model="form.isActive"
                class="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700">Entegrasyonu Aktif Et</span>
            </label>
            <p class="mt-1 text-xs text-gray-500">Aktif edilse bile mesaj gönderimi henüz çalışmamaktadır</p>
          </div>

          <!-- Mesaj Şablonları -->
          <div class="border-t pt-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Mesaj Şablonları</h2>
            <p class="text-sm text-gray-600 mb-4">İleride kullanılacak mesaj şablonlarını düzenleyebilirsiniz</p>
            
            <div class="space-y-4">
              <!-- İşe Giriş Bildirimi -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  İşe Giriş Bildirimi
                </label>
                <textarea
                  v-model="form.messageTemplates.onEmployeeOnboarding"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sayın {employeeName}, {companyName} şirketine hoş geldiniz! İşe giriş tarihiniz: {hireDate}"
                ></textarea>
                <p class="mt-1 text-xs text-gray-500">Kullanılabilir değişkenler: {employeeName}, {companyName}, {hireDate}</p>
              </div>

              <!-- İşten Çıkış Bildirimi -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  İşten Çıkış Bildirimi
                </label>
                <textarea
                  v-model="form.messageTemplates.onEmployeeOffboarding"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sayın {employeeName}, {companyName} şirketinden ayrılışınız {exitDate} tarihinde gerçekleşmiştir."
                ></textarea>
                <p class="mt-1 text-xs text-gray-500">Kullanılabilir değişkenler: {employeeName}, {companyName}, {exitDate}</p>
              </div>

              <!-- İzin Talebi Oluşturuldu -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  İzin Talebi Oluşturuldu
                </label>
                <textarea
                  v-model="form.messageTemplates.onLeaveRequestSubmitted"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sayın {employeeName}, {startDate} - {endDate} tarihleri arasındaki izin talebiniz alınmıştır."
                ></textarea>
                <p class="mt-1 text-xs text-gray-500">Kullanılabilir değişkenler: {employeeName}, {startDate}, {endDate}</p>
              </div>

              <!-- İzin Onaylandı -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  İzin Onaylandı
                </label>
                <textarea
                  v-model="form.messageTemplates.onLeaveApproved"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sayın {employeeName}, {startDate} - {endDate} tarihleri arasındaki izin talebiniz onaylanmıştır."
                ></textarea>
                <p class="mt-1 text-xs text-gray-500">Kullanılabilir değişkenler: {employeeName}, {startDate}, {endDate}</p>
              </div>

              <!-- İzin Reddedildi -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  İzin Reddedildi
                </label>
                <textarea
                  v-model="form.messageTemplates.onLeaveRejected"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sayın {employeeName}, {reason} nedeniyle {startDate} - {endDate} tarihleri arasındaki izin talebiniz reddedilmiştir."
                ></textarea>
                <p class="mt-1 text-xs text-gray-500">Kullanılabilir değişkenler: {employeeName}, {reason}, {startDate}, {endDate}</p>
              </div>
            </div>
          </div>

          <!-- Test Butonu -->
          <div class="border-t pt-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-medium text-gray-700 mb-1">API Bağlantı Testi</h3>
                <p class="text-xs text-gray-500">API credentials'larınızı test edebilirsiniz</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                @click="testConnection"
                :disabled="testing || !form.whatsappBusinessNumber || !form.apiKey"
              >
                {{ testing ? 'Test Ediliyor...' : 'Bağlantıyı Test Et' }}
              </Button>
            </div>
            <div v-if="testResult" class="mt-4 p-3 rounded-lg" :class="testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
              <p :class="testResult.success ? 'text-green-800' : 'text-red-800'" class="text-sm">
                {{ testResult.message }}
              </p>
            </div>
          </div>

          <!-- Kaydet Butonu -->
          <div class="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              @click="resetForm"
            >
              İptal
            </Button>
            <Button
              type="submit"
              :disabled="saving || !form.whatsappBusinessNumber || !form.apiKey"
            >
              {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import Button from '@/components/Button.vue'

const authStore = useAuthStore()
const toast = useToastStore()
const settings = ref(null)
const companies = ref([])
const selectedCompanyId = ref(null)
const saving = ref(false)
const testing = ref(false)
const testResult = ref(null)
const phoneError = ref('')

const isBayiAdmin = computed(() => authStore.isBayiAdmin)
const isCompanyAdmin = computed(() => authStore.hasAnyRole('company_admin', 'resmi_muhasebe_ik'))

const form = ref({
  whatsappBusinessNumber: '',
  apiProvider: 'Meta Cloud API',
  apiKey: '',
  messageTemplates: {
    onEmployeeOnboarding: 'Sayın {employeeName}, {companyName} şirketine hoş geldiniz! İşe giriş tarihiniz: {hireDate}',
    onEmployeeOffboarding: 'Sayın {employeeName}, {companyName} şirketinden ayrılışınız {exitDate} tarihinde gerçekleşmiştir.',
    onLeaveRequestSubmitted: 'Sayın {employeeName}, {startDate} - {endDate} tarihleri arasındaki izin talebiniz alınmıştır. Onay sürecinde bilgilendirileceksiniz.',
    onLeaveApproved: 'Sayın {employeeName}, {startDate} - {endDate} tarihleri arasındaki izin talebiniz onaylanmıştır.',
    onLeaveRejected: 'Sayın {employeeName}, {reason} nedeniyle {startDate} - {endDate} tarihleri arasındaki izin talebiniz reddedilmiştir.'
  },
  isActive: false
})

const loadCompanies = async () => {
  if (isBayiAdmin.value) {
    try {
      const response = await api.get('/companies')
      companies.value = response.data?.data || response.data || []
    } catch (error) {
      console.error('Şirketler yüklenemedi:', error)
    }
  }
}

const loadSettings = async () => {
  try {
    let companyId = null
    
    if (isBayiAdmin.value) {
      if (!selectedCompanyId.value) {
        settings.value = null
        return
      }
      companyId = selectedCompanyId.value
    } else if (isCompanyAdmin.value) {
      companyId = authStore.companyId
    }

    if (!companyId) {
      settings.value = null
      return
    }

    const response = await api.get(`/whatsapp/settings/${companyId}`)
    
    if (response.data.success && response.data.data) {
      settings.value = response.data
      // Formu doldur
      form.value.whatsappBusinessNumber = response.data.data.whatsappBusinessNumber || ''
      form.value.apiProvider = response.data.data.apiProvider || 'Meta Cloud API'
      form.value.apiKey = '' // API key gösterilmez, yeni değer girilmeli
      form.value.isActive = response.data.data.isActive || false
      if (response.data.data.messageTemplates) {
        form.value.messageTemplates = { ...form.value.messageTemplates, ...response.data.data.messageTemplates }
      }
    } else {
      settings.value = null
      // Varsayılan değerleri yükle
      resetForm()
    }
  } catch (error) {
    console.error('WhatsApp ayarları yüklenemedi:', error)
    settings.value = null
  }
}

const validatePhone = () => {
  const phoneRegex = /^\+90\s?[0-9]{3}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/
  if (form.value.whatsappBusinessNumber && !phoneRegex.test(form.value.whatsappBusinessNumber)) {
    phoneError.value = 'Numara +90 ile başlamalı ve geçerli formatta olmalıdır (örn: +90 532 000 00 00)'
    return false
  }
  phoneError.value = ''
  return true
}

const saveSettings = async () => {
  if (!validatePhone()) {
    return
  }

  saving.value = true
  testResult.value = null

  try {
    let companyId = null
    
    if (isBayiAdmin.value) {
      if (!selectedCompanyId.value) {
        toast.warning('Lütfen şirket seçiniz')
        return
      }
      companyId = selectedCompanyId.value
    } else if (isCompanyAdmin.value) {
      companyId = authStore.companyId
    }

    if (!companyId) {
      toast.error('Şirket bilgisi bulunamadı')
      return
    }

    const payload = {
      companyId,
      whatsappBusinessNumber: form.value.whatsappBusinessNumber.trim(),
      apiProvider: form.value.apiProvider,
      messageTemplates: form.value.messageTemplates,
      isActive: form.value.isActive
    }

    // API key sadece yeni değer girilmişse gönder
    // Eğer boşsa ve mevcut ayarlar varsa, backend mevcut key'i koruyacak
    if (form.value.apiKey && form.value.apiKey.trim() !== '') {
      payload.apiKey = form.value.apiKey
    } else if (!settings.value || !settings.value.data) {
      // Yeni kayıt için API key zorunlu
      toast.warning('API anahtarı zorunludur')
      saving.value = false
      return
    }

    const response = await api.post('/whatsapp/settings', payload)

    if (response.data.success) {
      toast.success('WhatsApp entegrasyon ayarları başarıyla kaydedildi')
      await loadSettings()
    } else {
      toast.error(response.data.message || 'Kayıt başarısız oldu')
    }
  } catch (error) {
    console.error('WhatsApp ayarları kaydetme hatası:', error)
    toast.error(error.response?.data?.message || error.message || 'Hata oluştu')
  } finally {
    saving.value = false
  }
}

const testConnection = async () => {
  if (!validatePhone()) {
    return
  }

  testing.value = true
  testResult.value = null

  try {
    let companyId = null
    
    if (isBayiAdmin.value) {
      companyId = selectedCompanyId.value
    } else if (isCompanyAdmin.value) {
      companyId = authStore.companyId
    }

    if (!companyId) {
      testResult.value = {
        success: false,
        message: 'Şirket bilgisi bulunamadı'
      }
      return
    }

    // Önce ayarları kaydet (test için)
    const payload = {
      companyId,
      whatsappBusinessNumber: form.value.whatsappBusinessNumber.trim(),
      apiProvider: form.value.apiProvider,
      apiKey: form.value.apiKey,
      isActive: false // Test için aktif etme
    }

    await api.post('/whatsapp/settings', payload)

    // Sonra test et
    const response = await api.post('/whatsapp/validate', { companyId })

    testResult.value = {
      success: response.data.success,
      message: response.data.message || 'Test tamamlandı'
    }
  } catch (error) {
    console.error('Bağlantı testi hatası:', error)
    testResult.value = {
      success: false,
      message: error.response?.data?.message || 'Test başarısız oldu'
    }
  } finally {
    testing.value = false
  }
}

const resetForm = () => {
  form.value = {
    whatsappBusinessNumber: '',
    apiProvider: 'Meta Cloud API',
    apiKey: '',
    messageTemplates: {
      onEmployeeOnboarding: 'Sayın {employeeName}, {companyName} şirketine hoş geldiniz! İşe giriş tarihiniz: {hireDate}',
      onEmployeeOffboarding: 'Sayın {employeeName}, {companyName} şirketinden ayrılışınız {exitDate} tarihinde gerçekleşmiştir.',
      onLeaveRequestSubmitted: 'Sayın {employeeName}, {startDate} - {endDate} tarihleri arasındaki izin talebiniz alınmıştır. Onay sürecinde bilgilendirileceksiniz.',
      onLeaveApproved: 'Sayın {employeeName}, {startDate} - {endDate} tarihleri arasındaki izin talebiniz onaylanmıştır.',
      onLeaveRejected: 'Sayın {employeeName}, {reason} nedeniyle {startDate} - {endDate} tarihleri arasındaki izin talebiniz reddedilmiştir.'
    },
    isActive: false
  }
  phoneError.value = ''
  testResult.value = null
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Telefon numarası validasyonu (real-time)
const watchPhone = () => {
  if (form.value.whatsappBusinessNumber) {
    validatePhone()
  }
}

// Telefon numarası değiştiğinde validasyon yap
watch(() => form.value.whatsappBusinessNumber, () => {
  watchPhone()
})

onMounted(async () => {
  if (isBayiAdmin.value) {
    await loadCompanies()
  } else {
    await loadSettings()
  }
})
</script>

