<template>
  <div class="p-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Veritabanı Sağlık Kontrolü</h1>
        <button
          @click="runHealthCheck"
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg v-if="loading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ loading ? 'Taranıyor...' : 'Sağlık Kontrolü Başlat' }}</span>
        </button>
      </div>

      <!-- Özet Kartlar -->
      <div v-if="healthReport" class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Toplam Sorun</p>
              <p class="text-2xl font-bold text-gray-900">{{ healthReport.summary.totalIssues }}</p>
            </div>
            <div class="p-3 bg-gray-100 rounded-full">
              <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Kritik</p>
              <p class="text-2xl font-bold text-red-600">{{ healthReport.summary.criticalCount }}</p>
            </div>
            <div class="p-3 bg-red-100 rounded-full">
              <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Yüksek</p>
              <p class="text-2xl font-bold text-orange-600">{{ healthReport.summary.highCount }}</p>
            </div>
            <div class="p-3 bg-orange-100 rounded-full">
              <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Orta</p>
              <p class="text-2xl font-bold text-yellow-600">{{ healthReport.summary.mediumCount }}</p>
            </div>
            <div class="p-3 bg-yellow-100 rounded-full">
              <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Düşük</p>
              <p class="text-2xl font-bold text-blue-600">{{ healthReport.summary.lowCount }}</p>
            </div>
            <div class="p-3 bg-blue-100 rounded-full">
              <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Sorun Detayları -->
      <div v-if="healthReport && healthReport.issues.length > 0" class="space-y-4">
        <div
          v-for="(issue, index) in healthReport.issues"
          :key="index"
          class="bg-white rounded-lg shadow overflow-hidden"
        >
          <div
            class="p-4 cursor-pointer"
            :class="{
              'bg-red-50 border-l-4 border-red-500': issue.severity === 'CRITICAL',
              'bg-orange-50 border-l-4 border-orange-500': issue.severity === 'HIGH',
              'bg-yellow-50 border-l-4 border-yellow-500': issue.severity === 'MEDIUM',
              'bg-blue-50 border-l-4 border-blue-500': issue.severity === 'LOW'
            }"
            @click="toggleIssue(index)"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <span
                    class="px-2 py-1 text-xs font-semibold rounded"
                    :class="{
                      'bg-red-100 text-red-800': issue.severity === 'CRITICAL',
                      'bg-orange-100 text-orange-800': issue.severity === 'HIGH',
                      'bg-yellow-100 text-yellow-800': issue.severity === 'MEDIUM',
                      'bg-blue-100 text-blue-800': issue.severity === 'LOW'
                    }"
                  >
                    {{ getSeverityText(issue.severity) }}
                  </span>
                  <h3 class="text-lg font-semibold text-gray-900">{{ issue.message }}</h3>
                </div>
                <p class="text-sm text-gray-600 mt-1">Tip: {{ getIssueTypeText(issue.type) }}</p>
              </div>
              <button class="text-gray-400 hover:text-gray-600">
                <svg
                  class="w-6 h-6 transform transition-transform"
                  :class="{ 'rotate-180': expandedIssues.has(index) }"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Genişletilmiş Detaylar -->
          <div v-if="expandedIssues.has(index)" class="border-t bg-white p-4">
            <div class="mb-4">
              <h4 class="font-semibold text-gray-700 mb-2">Etkilenen Kayıtlar ({{ issue.count }} adet):</h4>
              <div class="max-h-96 overflow-y-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bilgi</th>
                      <th v-if="isFixable(issue.type)" class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Seç</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="(item, itemIndex) in issue.items" :key="itemIndex">
                      <td class="px-4 py-2 text-sm text-gray-900">
                        <!-- Normal Employees -->
                        <div v-if="item.name">
                          <p class="font-medium">{{ item.name }}</p>
                          <p class="text-gray-500 text-xs lowercase">{{ item.email || item.id }}</p>
                          <p v-if="item.companyId" class="text-gray-400 text-xs">Şirket ID: {{ item.companyId }}</p>
                        </div>
                        <!-- Duplicate Emails - Özel Görünüm -->
                        <div v-else-if="item.email && item.employees">
                          <div class="border border-orange-200 rounded-lg p-3 bg-orange-50">
                            <p class="font-semibold text-orange-900 mb-2 lowercase">📧 {{ item.email }}</p>
                            <p class="text-xs text-orange-700 mb-3">{{ item.count }} çalışan bu email'i kullanıyor</p>
                            <div class="space-y-2">
                              <div
                                v-for="(emp, empIdx) in item.employees"
                                :key="empIdx"
                                class="flex justify-between items-center bg-white p-2 rounded border"
                              >
                                <div class="flex-1">
                                  <p class="text-sm font-medium">{{ emp.name }}</p>
                                  <p class="text-xs text-gray-500">Şirket: {{ emp.company || 'Bilinmiyor' }}</p>
                                  <p class="text-xs text-gray-400">Status: {{ emp.status }}</p>
                                </div>
                                <div class="flex gap-2">
                                  <button
                                    @click="openEmailEditModal(emp.id, item.email, emp.name)"
                                    class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Email Değiştir
                                  </button>
                                  <button
                                    @click="notifyCompanyAboutDuplicate(emp.company, item.email, item.employees)"
                                    class="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                  >
                                    Şirkete Bildir
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <!-- Other Items -->
                        <div v-else>
                          <pre class="text-xs">{{ JSON.stringify(item, null, 2) }}</pre>
                        </div>
                      </td>
                      <td v-if="isFixable(issue.type)" class="px-4 py-2 text-center">
                        <input
                          v-if="item.id"
                          type="checkbox"
                          :checked="selectedItems.has(`${issue.type}-${item.id}`)"
                          @change="toggleItemSelection(issue.type, item.id)"
                          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Düzeltme Butonları -->
            <div v-if="isFixable(issue.type)" class="flex gap-2 justify-end">
              <button
                @click="fixIssue(issue.type, getSelectedItemsForIssue(issue.type))"
                :disabled="getSelectedItemsForIssue(issue.type).length === 0 || fixing"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {{ fixing ? 'Düzeltiliyor...' : `Seçilenleri Düzelt (${getSelectedItemsForIssue(issue.type).length})` }}
              </button>
              <button
                v-if="issue.type === 'ORPHAN_EMPLOYEES'"
                @click="fixIssue(issue.type, getSelectedItemsForIssue(issue.type), 'delete')"
                :disabled="getSelectedItemsForIssue(issue.type).length === 0 || fixing"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Seçilenleri Sil
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sorun Yok Mesajı -->
      <div v-if="healthReport && healthReport.issues.length === 0" class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <svg class="mx-auto h-12 w-12 text-green-600 mb-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <h3 class="text-lg font-semibold text-green-900 mb-2">Harika! Herhangi bir sorun bulunamadı.</h3>
        <p class="text-green-700">Veritabanınız sağlıklı durumda.</p>
      </div>

      <!-- İlk Tarama Mesajı -->
      <div v-if="!healthReport && !loading" class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <svg class="mx-auto h-12 w-12 text-blue-600 mb-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <h3 class="text-lg font-semibold text-blue-900 mb-2">Veritabanı Sağlık Kontrolü</h3>
        <p class="text-blue-700 mb-4">Sistemdeki potansiyel sorunları tespit etmek için sağlık kontrolü başlatın.</p>
        <button
          @click="runHealthCheck"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          Kontrolü Başlat
        </button>
      </div>
    </div>

    <!-- Email Düzeltme Modal'ı -->
    <div v-if="showEmailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Email Adresi Değiştir</h3>
        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-2">Çalışan: <strong>{{ emailModal.employeeName }}</strong></p>
          <p class="text-sm text-gray-600 mb-2">Mevcut Email: <strong class="lowercase">{{ emailModal.currentEmail }}</strong></p>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Yeni Email Adresi</label>
          <input
            v-model="emailModal.newEmail"
            type="email"
            required
            placeholder="ornek@sirket.com"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
            @input="emailModal.newEmail = emailModal.newEmail.toLowerCase()"
          />
        </div>
        <div v-if="emailModal.error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {{ emailModal.error }}
        </div>
        <div class="flex gap-2 justify-end">
          <button
            @click="closeEmailModal"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            İptal
          </button>
          <button
            @click="updateEmployeeEmail"
            :disabled="emailModal.saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {{ emailModal.saving ? 'Kaydediliyor...' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import api from '@/services/api'

const toast = useToastStore()
const confirmModal = useConfirmStore()

const loading = ref(false)
const fixing = ref(false)
const healthReport = ref(null)
const expandedIssues = ref(new Set())
const selectedItems = ref(new Set())

// Email Modal State
const showEmailModal = ref(false)
const emailModal = ref({
  employeeId: null,
  employeeName: '',
  currentEmail: '',
  newEmail: '',
  error: '',
  saving: false
})

const runHealthCheck = async () => {
  try {
    loading.value = true
    const response = await api.get('/admin/health-check')
    healthReport.value = response.data
    toast.success('Sağlık kontrolü tamamlandı')
  } catch (error) {
    console.error('Health check error:', error)
    toast.error(error.response?.data?.message || 'Sağlık kontrolü başarısız')
  } finally {
    loading.value = false
  }
}

const toggleIssue = (index) => {
  if (expandedIssues.value.has(index)) {
    expandedIssues.value.delete(index)
  } else {
    expandedIssues.value.add(index)
  }
}

const isFixable = (issueType) => {
  return ['INVISIBLE_EMPLOYEES', 'TYPE_MISMATCH', 'ORPHAN_EMPLOYEES'].includes(issueType)
}

const toggleItemSelection = (issueType, itemId) => {
  const key = `${issueType}-${itemId}`
  if (selectedItems.value.has(key)) {
    selectedItems.value.delete(key)
  } else {
    selectedItems.value.add(key)
  }
}

const getSelectedItemsForIssue = (issueType) => {
  const items = []
  selectedItems.value.forEach(key => {
    if (key.startsWith(`${issueType}-`)) {
      items.push(key.replace(`${issueType}-`, ''))
    }
  })
  return items
}

const fixIssue = async (issueType, employeeIds, action = 'fix') => {
  if (employeeIds.length === 0) {
    toast.error('Lütfen düzeltmek için en az bir kayıt seçin')
    return
  }

  console.log('Fixing issue:', { issueType, employeeIds, action })

  const confirmed = await confirmModal.show({
    title: action === 'delete' ? 'Kayıtları Sil' : 'Kayıtları Düzelt',
    message: `${employeeIds.length} kaydı ${action === 'delete' ? 'silmek' : 'düzeltmek'} istediğinize emin misiniz?`,
    type: action === 'delete' ? 'danger' : 'warning',
    confirmText: action === 'delete' ? 'Sil' : 'Düzelt'
  })
  if (!confirmed) return

  try {
    fixing.value = true
    const response = await api.post('/admin/health-check/fix', {
      issueType,
      employeeIds,
      action
    })

    console.log('Fix response:', response.data)

    if (response.data.success) {
      const message = `${response.data.fixed} kayıt başarıyla düzeltildi${response.data.failed > 0 ? `, ${response.data.failed} başarısız` : ''}`
      toast.success(message)

      // Eğer hata varsa detayları göster
      if (response.data.failed > 0 && response.data.errors.length > 0) {
        console.error('Fix errors:', response.data.errors)
        response.data.errors.forEach(err => {
          console.error(`- Employee ${err.employeeId}: ${err.error}`)
        })
      }

      // Seçimleri temizle
      employeeIds.forEach(id => {
        selectedItems.value.delete(`${issueType}-${id}`)
      })

      // Tekrar tarama yap
      await runHealthCheck()
    }
  } catch (error) {
    console.error('Fix error:', error)
    console.error('Error response:', error.response?.data)
    toast.error(error.response?.data?.message || 'Düzeltme başarısız')
  } finally {
    fixing.value = false
  }
}

const getSeverityText = (severity) => {
  const map = {
    'CRITICAL': 'KRİTİK',
    'HIGH': 'YÜKSEK',
    'MEDIUM': 'ORTA',
    'LOW': 'DÜŞÜK'
  }
  return map[severity] || severity
}

// Email Modal Functions
const openEmailEditModal = (employeeId, currentEmail, employeeName) => {
  emailModal.value = {
    employeeId,
    employeeName,
    currentEmail,
    newEmail: '',
    error: '',
    saving: false
  }
  showEmailModal.value = true
}

const closeEmailModal = () => {
  showEmailModal.value = false
  emailModal.value = {
    employeeId: null,
    employeeName: '',
    currentEmail: '',
    newEmail: '',
    error: '',
    saving: false
  }
}

const updateEmployeeEmail = async () => {
  if (!emailModal.value.newEmail || !emailModal.value.newEmail.trim()) {
    emailModal.value.error = 'Lütfen yeni email adresi girin'
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailModal.value.newEmail)) {
    emailModal.value.error = 'Geçersiz email formatı'
    return
  }

  try {
    emailModal.value.saving = true
    emailModal.value.error = ''

    const response = await api.post('/admin/update-employee-email', {
      employeeId: emailModal.value.employeeId,
      newEmail: emailModal.value.newEmail
    })

    if (response.data.success) {
      toast.success(`Email başarıyla güncellendi: ${response.data.oldEmail} → ${response.data.newEmail}`)
      closeEmailModal()
      await runHealthCheck() // Yeniden tarama yap
    }
  } catch (error) {
    console.error('Email update error:', error)
    emailModal.value.error = error.response?.data?.message || 'Email güncelleme başarısız'
  } finally {
    emailModal.value.saving = false
  }
}

// Company Notification Function
const notifyCompanyAboutDuplicate = async (companyId, duplicateEmail, employees) => {
  if (!companyId) {
    toast.error('Şirket bilgisi bulunamadı')
    return
  }

  const confirmed = await confirmModal.show({
    title: 'Şirkete Bildir',
    message: `${duplicateEmail} duplicate email hakkında şirkete bildirim göndermek istediğinize emin misiniz?`,
    type: 'info',
    confirmText: 'Bildir'
  })
  if (!confirmed) return

  try {
    const employeeIds = employees.map(e => e.id)

    const response = await api.post('/admin/notify-company', {
      companyId,
      subject: 'Duplicate Email Adresi Uyarısı',
      message: `
        Sistemimizde tespit edilmiştir ki, aşağıdaki çalışanlarınız aynı email adresini (${duplicateEmail}) kullanmaktadır.

        Her çalışanın benzersiz bir email adresi olması sistem güvenliği ve doğru veri yönetimi için zorunludur.

        Lütfen en kısa sürede aşağıdaki çalışanların email adreslerini farklı ve benzersiz adresler ile güncelleyiniz.
      `,
      employeeIds
    })

    if (response.data.success) {
      toast.success(response.data.message || 'Şirkete sistem mesajı başarıyla gönderildi')
    }
  } catch (error) {
    console.error('Notification error:', error)
    toast.error(error.response?.data?.message || 'Bildirim gönderilemedi')
  }
}

const getIssueTypeText = (type) => {
  const map = {
    'ORPHAN_EMPLOYEES': 'Yetim Çalışanlar (Geçersiz Şirket Referansı)',
    'ORPHAN_COMPANIES': 'Yetim Şirketler (Geçersiz Bayi Referansı)',
    'INVISIBLE_EMPLOYEES': 'Görünmeyen Aktif Çalışanlar',
    'TYPE_MISMATCH': 'Tip Uyumsuzluğu',
    'DUPLICATE_EMAILS': 'Duplicate Email Adresleri',
    'INACTIVE_COMPANIES_WITH_ACTIVE_EMPLOYEES': 'Pasif Şirketlerde Aktif Çalışanlar'
  }
  return map[type] || type
}
</script>
