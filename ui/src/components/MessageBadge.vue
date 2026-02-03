<template>
  <router-link
    to="/messages"
    class="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
    title="Mesajlar"
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
    <span
      v-if="unreadCount > 0"
      class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
    >
      {{ unreadCount > 9 ? '9+' : unreadCount }}
    </span>
  </router-link>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useMessagesStore } from '@/stores/messages'

const messagesStore = useMessagesStore()

const unreadCount = computed(() => messagesStore.unreadCount)

let pollInterval = null

onMounted(() => {
  // İlk yüklemede okunmamış sayısını al
  messagesStore.fetchUnreadCount()

  // Her 60 saniyede bir kontrol et
  pollInterval = setInterval(() => {
    messagesStore.fetchUnreadCount()
  }, 60000)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>
