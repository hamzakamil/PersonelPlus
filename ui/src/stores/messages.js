import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import api from '@/services/api'

export const useMessagesStore = defineStore('messages', {
  state: () => ({
    messages: [],
    unreadCount: 0,
    loading: false,
    error: null
  }),

  getters: {
    unreadMessages: (state) => state.messages.filter(m => !m.isRead),
    sentMessages: (state) => {
      const authStore = useAuthStore()
      const userId = authStore.user?._id
      return state.messages.filter(m => {
        const senderId = m.sender?._id || m.sender
        return senderId && userId && senderId.toString() === userId.toString()
      })
    },
    receivedMessages: (state) => {
      const authStore = useAuthStore()
      const userId = authStore.user?._id
      return state.messages.filter(m => {
        const senderId = m.sender?._id || m.sender
        return !senderId || !userId || senderId.toString() !== userId.toString()
      })
    },
    messagesByRequest: (state) => (requestId) => state.messages.filter(m => {
      const relatedId = m.relatedRequest?._id || m.relatedRequest
      return relatedId?.toString() === requestId?.toString()
    })
  },

  actions: {
    async fetchMessages(direction = null) {
      this.loading = true
      this.error = null
      try {
        const params = direction ? { direction } : {}
        const response = await api.get('/messages', { params })
        this.messages = response.data.messages || response.data.data || response.data || []
        this.unreadCount = this.messages.filter(m => !m.isRead).length
      } catch (error) {
        this.error = error.response?.data?.message || 'Mesajlar yüklenemedi'
        console.error('Mesaj yükleme hatası:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchUnreadCount() {
      try {
        const response = await api.get('/messages/unread-count')
        this.unreadCount = response.data.count || 0
      } catch (error) {
        console.error('Okunmamış mesaj sayısı alınamadı:', error)
      }
    },

    async sendMessage(messageData) {
      try {
        const response = await api.post('/messages', messageData)
        // Mesajları yenile
        await this.fetchMessages()
        return { success: true, data: response.data }
      } catch (error) {
        return { success: false, error: error.response?.data?.message || 'Mesaj gönderilemedi' }
      }
    },

    async markAsRead(messageId) {
      try {
        await api.put(`/messages/${messageId}/read`)
        // Mesajı güncelle
        const message = this.messages.find(m => m._id === messageId)
        if (message) {
          message.isRead = true
          message.readAt = new Date()
        }
        // Okunmamış sayısını güncelle
        this.unreadCount = Math.max(0, this.unreadCount - 1)
      } catch (error) {
        console.error('Mesaj okundu olarak işaretlenemedi:', error)
      }
    },

    async markAllAsRead() {
      try {
        await api.put('/messages/read-all')
        // Tüm mesajları okundu olarak işaretle
        this.messages.forEach(m => {
          if (!m.isRead) {
            m.isRead = true
            m.readAt = new Date()
          }
        })
        this.unreadCount = 0
      } catch (error) {
        console.error('Mesajlar okundu olarak işaretlenemedi:', error)
      }
    }
  }
})
