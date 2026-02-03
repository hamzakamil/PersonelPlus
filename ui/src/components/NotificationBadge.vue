<template>
  <div class="relative">
    <!-- Bildirim Butonu -->
    <button
      @click="toggleDropdown"
      class="relative p-2 rounded-lg transition-colors"
      :style="{ color: 'var(--header-text)' }"
      @mouseenter="$event.target.style.backgroundColor = 'var(--primary-light)'"
      @mouseleave="$event.target.style.backgroundColor = 'transparent'"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <!-- Badge -->
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full px-1"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50 overflow-hidden"
        :style="{ borderColor: 'var(--header-border)' }"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 class="font-semibold text-gray-800">Bildirimler</h3>
          <div class="flex items-center gap-2">
            <button
              v-if="unreadCount > 0"
              @click="markAllAsRead"
              class="text-xs text-blue-600 hover:text-blue-800"
            >
              Tümünü okundu işaretle
            </button>
            <router-link
              to="/notifications"
              @click="isOpen = false"
              class="text-xs text-gray-500 hover:text-gray-700"
            >
              Tümünü gör
            </router-link>
          </div>
        </div>

        <!-- Bildirim Listesi -->
        <div class="max-h-96 overflow-y-auto">
          <div v-if="loading" class="p-4 text-center text-gray-500">
            <svg class="animate-spin h-5 w-5 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>

          <div v-else-if="notifications.length === 0" class="p-8 text-center text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p class="text-sm">Bildirim yok</p>
          </div>

          <div v-else>
            <div
              v-for="notification in notifications"
              :key="notification._id"
              @click="handleNotificationClick(notification)"
              class="px-4 py-3 border-b cursor-pointer transition-colors hover:bg-gray-50"
              :class="{ 'bg-blue-50': !notification.isRead }"
            >
              <div class="flex items-start gap-3">
                <!-- İkon -->
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="getNotificationIconClass(notification.type)"
                >
                  <span v-html="getNotificationIcon(notification.type)" class="w-4 h-4"></span>
                </div>
                <!-- İçerik -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {{ notification.title }}
                    </p>
                    <span class="text-xs text-gray-400 whitespace-nowrap">
                      {{ formatTimeAgo(notification.createdAt) }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-600 line-clamp-2 mt-0.5">
                    {{ notification.body }}
                  </p>
                </div>
                <!-- Okunmadı işareti -->
                <div v-if="!notification.isRead" class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-2 border-t bg-gray-50 text-center">
          <router-link
            to="/notifications"
            @click="isOpen = false"
            class="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Tüm bildirimleri görüntüle
          </router-link>
        </div>
      </div>
    </Transition>

    <!-- Overlay -->
    <div
      v-if="isOpen"
      @click="isOpen = false"
      class="fixed inset-0 z-40"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()

const isOpen = ref(false)
const loading = ref(false)
const notifications = ref([])
const unreadCount = ref(0)

let pollInterval = null

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    loadNotifications()
  }
}

const loadNotifications = async () => {
  loading.value = true
  try {
    const response = await api.get('/notifications', { params: { limit: 10 } })
    if (response.data.success) {
      notifications.value = response.data.data.notifications || []
    }
  } catch (error) {
    console.error('Bildirimler yüklenemedi:', error)
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

const markAllAsRead = async () => {
  try {
    await api.put('/notifications/read-all')
    notifications.value.forEach(n => n.isRead = true)
    unreadCount.value = 0
  } catch (error) {
    console.error('Okundu işaretlenemedi:', error)
  }
}

const handleNotificationClick = async (notification) => {
  // Okundu işaretle
  if (!notification.isRead) {
    try {
      await api.put(`/notifications/${notification._id}/read`)
      notification.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (error) {
      console.error('Okundu işaretlenemedi:', error)
    }
  }

  // İlgili sayfaya yönlendir
  const route = getNotificationRoute(notification)
  if (route) {
    isOpen.value = false
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
      return '/notifications'
  }
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

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Az önce'
  if (diffMins < 60) return `${diffMins} dk`
  if (diffHours < 24) return `${diffHours} sa`
  if (diffDays < 7) return `${diffDays} gün`
  return date.toLocaleDateString('tr-TR')
}

onMounted(() => {
  loadUnreadCount()
  // Her 60 saniyede bir okunmamış sayısını güncelle
  pollInterval = setInterval(loadUnreadCount, 60000)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
