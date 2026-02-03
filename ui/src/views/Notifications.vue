<template>
  <div class="p-6">
    <!-- Başlık ve İstatistikler -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Bildirimler</h1>
        <p class="text-sm text-gray-500 mt-1">
          {{ unreadCount }} okunmamış bildirim
        </p>
      </div>
      <div class="flex gap-2 mt-4 md:mt-0">
        <button
          v-if="unreadCount > 0"
          @click="markAllAsRead"
          class="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Tümünü okundu işaretle
        </button>
        <button
          @click="showPreferences = true"
          class="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Tercihler
        </button>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select
            v-model="filters.unreadOnly"
            @change="loadNotifications"
            class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option :value="false">Tümü</option>
            <option :value="true">Sadece okunmamış</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tür</label>
          <select
            v-model="filters.type"
            @change="loadNotifications"
            class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="LEAVE_REQUEST">İzin Talepleri</option>
            <option value="LEAVE_APPROVED">İzin Onayları</option>
            <option value="LEAVE_REJECTED">İzin Redleri</option>
            <option value="ADVANCE_REQUEST">Avans Talepleri</option>
            <option value="ADVANCE_APPROVED">Avans Onayları</option>
            <option value="OVERTIME_REQUEST">Fazla Mesai</option>
            <option value="MESSAGE_RECEIVED">Mesajlar</option>
            <option value="SYSTEM">Sistem</option>
            <option value="ANNOUNCEMENT">Duyurular</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Bildirim Listesi -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="loading" class="p-8 text-center">
        <svg class="animate-spin h-8 w-8 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-gray-500 mt-2">Yükleniyor...</p>
      </div>

      <div v-else-if="notifications.length === 0" class="p-12 text-center">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-1">Bildirim yok</h3>
        <p class="text-gray-500">Henüz hiç bildiriminiz bulunmuyor.</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="notification in notifications"
          :key="notification._id"
          class="p-4 hover:bg-gray-50 transition-colors"
          :class="{ 'bg-blue-50 hover:bg-blue-100': !notification.isRead }"
        >
          <div class="flex items-start gap-4">
            <!-- İkon -->
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              :class="getNotificationIconClass(notification.type)"
            >
              <span v-html="getNotificationIcon(notification.type)" class="w-5 h-5"></span>
            </div>

            <!-- İçerik -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h4 class="text-sm font-semibold text-gray-900">
                    {{ notification.title }}
                  </h4>
                  <p class="text-sm text-gray-600 mt-1">
                    {{ notification.body }}
                  </p>
                  <div class="flex items-center gap-3 mt-2">
                    <span class="text-xs text-gray-400">
                      {{ formatDate(notification.createdAt) }}
                    </span>
                    <span
                      class="px-2 py-0.5 text-xs rounded-full"
                      :class="getTypeClass(notification.type)"
                    >
                      {{ getTypeLabel(notification.type) }}
                    </span>
                    <span
                      v-if="notification.priority === 'high' || notification.priority === 'urgent'"
                      class="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700"
                    >
                      {{ notification.priority === 'urgent' ? 'Acil' : 'Önemli' }}
                    </span>
                  </div>
                </div>

                <!-- Aksiyonlar -->
                <div class="flex items-center gap-2 flex-shrink-0">
                  <button
                    v-if="!notification.isRead"
                    @click="markAsRead(notification)"
                    class="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Okundu işaretle"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    v-if="getNotificationRoute(notification)"
                    @click="goToRelated(notification)"
                    class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Detaya git"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                  <button
                    @click="deleteNotification(notification)"
                    class="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sayfalama -->
      <div v-if="totalPages > 1" class="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
        <div class="text-sm text-gray-500">
          Toplam {{ total }} bildirim
        </div>
        <div class="flex gap-2">
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Önceki
          </button>
          <span class="px-3 py-1 text-sm">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>

    <!-- Tercihler Modal -->
    <div v-if="showPreferences" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4 text-gray-800">Bildirim Tercihleri</h2>

        <div class="space-y-6">
          <!-- Kanal Tercihleri -->
          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Bildirim Kanalları</h3>
            <div class="space-y-3">
              <label class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Push Bildirimleri</span>
                <input
                  type="checkbox"
                  v-model="preferences.channels.push"
                  class="w-4 h-4 text-blue-600 rounded"
                />
              </label>
              <label class="flex items-center justify-between">
                <span class="text-sm text-gray-600">E-posta Bildirimleri</span>
                <input
                  type="checkbox"
                  v-model="preferences.channels.email"
                  class="w-4 h-4 text-blue-600 rounded"
                />
              </label>
              <label class="flex items-center justify-between opacity-50">
                <span class="text-sm text-gray-600">Uygulama İçi (her zaman açık)</span>
                <input
                  type="checkbox"
                  checked
                  disabled
                  class="w-4 h-4 text-blue-600 rounded"
                />
              </label>
            </div>
          </div>

          <!-- Sessiz Saatler -->
          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Sessiz Saatler</h3>
            <label class="flex items-center justify-between mb-3">
              <span class="text-sm text-gray-600">Sessiz saatleri etkinleştir</span>
              <input
                type="checkbox"
                v-model="preferences.quietHours.enabled"
                class="w-4 h-4 text-blue-600 rounded"
              />
            </label>
            <div v-if="preferences.quietHours.enabled" class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Başlangıç</label>
                <input
                  type="time"
                  v-model="preferences.quietHours.start"
                  class="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Bitiş</label>
                <input
                  type="time"
                  v-model="preferences.quietHours.end"
                  class="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-3 justify-end mt-6 pt-4 border-t">
          <button
            @click="showPreferences = false"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            İptal
          </button>
          <button
            @click="savePreferences"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import api from '@/services/api'

const router = useRouter()
const toast = useToastStore()
const confirmModal = useConfirmStore()

const loading = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const total = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)
const showPreferences = ref(false)

const filters = ref({
  unreadOnly: false,
  type: ''
})

const preferences = ref({
  channels: {
    push: true,
    email: true,
    inApp: true
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
})

const loadNotifications = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: 20,
      unreadOnly: filters.value.unreadOnly
    }
    if (filters.value.type) params.type = filters.value.type

    const response = await api.get('/notifications', { params })
    if (response.data.success) {
      const data = response.data.data
      notifications.value = data.notifications || []
      total.value = data.total || 0
      totalPages.value = data.totalPages || 1
    }
  } catch (error) {
    console.error('Bildirimler yüklenemedi:', error)
    toast.error('Bildirimler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const loadUnreadCount = async () => {
  try {
    const response = await api.get('/notifications/unread-count')
    if (response.data.success) {
      unreadCount.value = response.data.data.count || 0
    }
  } catch (error) {
    // Sessizce başarısız ol
  }
}

const loadPreferences = async () => {
  try {
    const response = await api.get('/notifications/preferences')
    if (response.data.success && response.data.data) {
      const data = response.data.data
      if (data.channels) preferences.value.channels = { ...preferences.value.channels, ...data.channels }
      if (data.quietHours) preferences.value.quietHours = { ...preferences.value.quietHours, ...data.quietHours }
    }
  } catch (error) {
    // Varsayılan tercihler kullanılır
  }
}

const markAsRead = async (notification) => {
  try {
    await api.put(`/notifications/${notification._id}/read`)
    notification.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch (error) {
    toast.error('İşlem başarısız')
  }
}

const markAllAsRead = async () => {
  try {
    await api.put('/notifications/read-all')
    notifications.value.forEach(n => n.isRead = true)
    unreadCount.value = 0
    toast.success('Tüm bildirimler okundu işaretlendi')
  } catch (error) {
    toast.error('İşlem başarısız')
  }
}

const deleteNotification = async (notification) => {
  const confirmed = await confirmModal.show({
    title: 'Bildirimi Sil',
    message: 'Bu bildirimi silmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    await api.delete(`/notifications/${notification._id}`)
    notifications.value = notifications.value.filter(n => n._id !== notification._id)
    if (!notification.isRead) {
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    total.value = Math.max(0, total.value - 1)
    toast.success('Bildirim silindi')
  } catch (error) {
    toast.error('Silme işlemi başarısız')
  }
}

const savePreferences = async () => {
  try {
    await api.put('/notifications/preferences', preferences.value)
    toast.success('Tercihler kaydedildi')
    showPreferences.value = false
  } catch (error) {
    toast.error('Tercihler kaydedilemedi')
  }
}

const goToRelated = (notification) => {
  const route = getNotificationRoute(notification)
  if (route) {
    if (!notification.isRead) {
      markAsRead(notification)
    }
    router.push(route)
  }
}

const getNotificationRoute = (notification) => {
  switch (notification.type) {
    case 'LEAVE_REQUEST':
    case 'LEAVE_APPROVED':
    case 'LEAVE_REJECTED':
      return '/leave-requests'
    case 'ADVANCE_REQUEST':
    case 'ADVANCE_APPROVED':
    case 'ADVANCE_REJECTED':
      return '/advance-requests'
    case 'OVERTIME_REQUEST':
    case 'OVERTIME_APPROVED':
    case 'OVERTIME_REJECTED':
      return '/overtime-requests'
    case 'MESSAGE_RECEIVED':
      return '/messages'
    default:
      return null
  }
}

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    loadNotifications()
  }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getTypeLabel = (type) => {
  const labels = {
    'LEAVE_REQUEST': 'İzin Talebi',
    'LEAVE_APPROVED': 'İzin Onayı',
    'LEAVE_REJECTED': 'İzin Reddi',
    'ADVANCE_REQUEST': 'Avans Talebi',
    'ADVANCE_APPROVED': 'Avans Onayı',
    'ADVANCE_REJECTED': 'Avans Reddi',
    'OVERTIME_REQUEST': 'Fazla Mesai',
    'OVERTIME_APPROVED': 'Mesai Onayı',
    'OVERTIME_REJECTED': 'Mesai Reddi',
    'MESSAGE_RECEIVED': 'Mesaj',
    'EMPLOYMENT_STATUS': 'İşe Giriş/Çıkış',
    'SYSTEM': 'Sistem',
    'REMINDER': 'Hatırlatma',
    'ANNOUNCEMENT': 'Duyuru'
  }
  return labels[type] || type
}

const getTypeClass = (type) => {
  const classes = {
    'LEAVE_REQUEST': 'bg-blue-100 text-blue-700',
    'LEAVE_APPROVED': 'bg-green-100 text-green-700',
    'LEAVE_REJECTED': 'bg-red-100 text-red-700',
    'ADVANCE_REQUEST': 'bg-purple-100 text-purple-700',
    'ADVANCE_APPROVED': 'bg-green-100 text-green-700',
    'ADVANCE_REJECTED': 'bg-red-100 text-red-700',
    'OVERTIME_REQUEST': 'bg-orange-100 text-orange-700',
    'OVERTIME_APPROVED': 'bg-green-100 text-green-700',
    'OVERTIME_REJECTED': 'bg-red-100 text-red-700',
    'MESSAGE_RECEIVED': 'bg-indigo-100 text-indigo-700',
    'SYSTEM': 'bg-gray-100 text-gray-700',
    'REMINDER': 'bg-yellow-100 text-yellow-700',
    'ANNOUNCEMENT': 'bg-pink-100 text-pink-700'
  }
  return classes[type] || 'bg-gray-100 text-gray-700'
}

const getNotificationIcon = (type) => {
  const icons = {
    'LEAVE_REQUEST': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
    'LEAVE_APPROVED': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>',
    'LEAVE_REJECTED': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>',
    'ADVANCE_REQUEST': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    'ADVANCE_APPROVED': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>',
    'ADVANCE_REJECTED': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>',
    'OVERTIME_REQUEST': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    'OVERTIME_APPROVED': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>',
    'OVERTIME_REJECTED': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>',
    'MESSAGE_RECEIVED': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>',
    'SYSTEM': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    'REMINDER': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>',
    'ANNOUNCEMENT': '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>'
  }
  return icons[type] || icons['SYSTEM']
}

const getNotificationIconClass = (type) => {
  const classes = {
    'LEAVE_REQUEST': 'bg-blue-100 text-blue-600',
    'LEAVE_APPROVED': 'bg-green-100 text-green-600',
    'LEAVE_REJECTED': 'bg-red-100 text-red-600',
    'ADVANCE_REQUEST': 'bg-purple-100 text-purple-600',
    'ADVANCE_APPROVED': 'bg-green-100 text-green-600',
    'ADVANCE_REJECTED': 'bg-red-100 text-red-600',
    'OVERTIME_REQUEST': 'bg-orange-100 text-orange-600',
    'OVERTIME_APPROVED': 'bg-green-100 text-green-600',
    'OVERTIME_REJECTED': 'bg-red-100 text-red-600',
    'MESSAGE_RECEIVED': 'bg-indigo-100 text-indigo-600',
    'SYSTEM': 'bg-gray-100 text-gray-600',
    'REMINDER': 'bg-yellow-100 text-yellow-600',
    'ANNOUNCEMENT': 'bg-pink-100 text-pink-600'
  }
  return classes[type] || 'bg-gray-100 text-gray-600'
}

onMounted(() => {
  loadNotifications()
  loadUnreadCount()
  loadPreferences()
})
</script>
