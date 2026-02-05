<template>
  <div class="p-4 md:p-6">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-bold text-gray-800">Destek Talepleri</h1>
      <button
        @click="showNewTicketModal = true"
        class="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Yeni Talep
      </button>
    </div>

    <!-- İstatistikler -->
    <div v-if="stats" class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      <div class="bg-white rounded-lg shadow p-3">
        <p class="text-xs text-gray-500">Toplam</p>
        <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-3">
        <p class="text-xs text-gray-500">Açık</p>
        <p class="text-2xl font-bold text-yellow-600">{{ stats.open }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-3">
        <p class="text-xs text-gray-500">İşlemde</p>
        <p class="text-2xl font-bold text-blue-600">{{ stats.inProgress }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-3">
        <p class="text-xs text-gray-500">Çözüldü</p>
        <p class="text-2xl font-bold text-green-600">{{ stats.resolved }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-3">
        <p class="text-xs text-gray-500">Kapatıldı</p>
        <p class="text-2xl font-bold text-gray-600">{{ stats.closed }}</p>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-3 mb-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Durum</label>
          <select v-model="filters.status" @change="loadTickets" class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
            <option value="">Tümü</option>
            <option value="OPEN">Açık</option>
            <option value="IN_PROGRESS">İşlemde</option>
            <option value="RESOLVED">Çözüldü</option>
            <option value="CLOSED">Kapatıldı</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Kategori</label>
          <select v-model="filters.category" @change="loadTickets" class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
            <option value="">Tümü</option>
            <option value="ISSUE">Sorun</option>
            <option value="REQUEST">İstek</option>
            <option value="SUGGESTION">Öneri</option>
            <option value="QUESTION">Soru</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Öncelik</label>
          <select v-model="filters.priority" @change="loadTickets" class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
            <option value="">Tümü</option>
            <option value="LOW">Düşük</option>
            <option value="MEDIUM">Orta</option>
            <option value="HIGH">Yüksek</option>
            <option value="URGENT">Acil</option>
          </select>
        </div>
        <div class="flex items-end">
          <button @click="clearFilters" class="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 w-full">
            Filtreleri Temizle
          </button>
        </div>
      </div>
    </div>

    <!-- Talep Listesi -->
    <div class="bg-white rounded-lg shadow">
      <div v-if="loading" class="p-6 text-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-sm text-gray-500">Talepler yükleniyor...</p>
      </div>

      <div v-else-if="tickets.length === 0" class="p-6 text-center text-gray-500 text-sm">
        Henüz destek talebi yok.
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="ticket in tickets"
          :key="ticket._id"
          @click="viewTicket(ticket)"
          class="p-3 hover:bg-gray-50 cursor-pointer"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span :class="getCategoryClass(ticket.category)" class="px-1.5 py-0.5 text-[10px] font-semibold rounded">
                  {{ getCategoryLabel(ticket.category) }}
                </span>
                <span :class="getPriorityClass(ticket.priority)" class="px-1.5 py-0.5 text-[10px] font-semibold rounded">
                  {{ getPriorityLabel(ticket.priority) }}
                </span>
                <span :class="getStatusClass(ticket.status)" class="px-1.5 py-0.5 text-[10px] font-semibold rounded">
                  {{ getStatusLabel(ticket.status) }}
                </span>
              </div>
              <h3 class="text-sm font-medium text-gray-900 truncate">{{ ticket.subject }}</h3>
              <p class="text-xs text-gray-500 truncate mt-1">{{ ticket.description }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ formatDate(ticket.createdAt) }}</p>
            </div>
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Yeni Talep Modal -->
    <div v-if="showNewTicketModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg w-full max-w-lg shadow-xl">
        <div class="p-3 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-base font-semibold text-gray-800">Yeni Destek Talebi</h3>
          <button @click="closeNewTicketModal" class="text-gray-500 hover:text-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form @submit.prevent="submitTicket" class="p-4 space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
            <select v-model="newTicket.category" required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
              <option value="">Seçiniz</option>
              <option value="ISSUE">🔴 Sorun</option>
              <option value="REQUEST">💡 İstek</option>
              <option value="SUGGESTION">✨ Öneri</option>
              <option value="QUESTION">❓ Soru</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Öncelik</label>
            <select v-model="newTicket.priority" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
              <option value="LOW">Düşük</option>
              <option value="MEDIUM">Orta</option>
              <option value="HIGH">Yüksek</option>
              <option value="URGENT">Acil</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Konu *</label>
            <input
              v-model="newTicket.subject"
              type="text"
              required
              maxlength="200"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              placeholder="Kısa ve açıklayıcı bir başlık"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Açıklama *</label>
            <textarea
              v-model="newTicket.description"
              rows="6"
              required
              maxlength="2000"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
              placeholder="Detaylı açıklama..."
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">{{ newTicket.description.length }} / 2000 karakter</p>
          </div>
          <div v-if="error" class="text-sm text-red-600 bg-red-50 p-2 rounded">
            {{ error }}
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="closeNewTicketModal"
              class="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ submitting ? 'Gönderiliyor...' : 'Gönder' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Talep Detay Modal -->
    <div v-if="selectedTicket" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <div class="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h3 class="text-base font-semibold text-gray-800">{{ selectedTicket.subject }}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span :class="getCategoryClass(selectedTicket.category)" class="px-1.5 py-0.5 text-[10px] font-semibold rounded">
                {{ getCategoryLabel(selectedTicket.category) }}
              </span>
              <span :class="getPriorityClass(selectedTicket.priority)" class="px-1.5 py-0.5 text-[10px] font-semibold rounded">
                {{ getPriorityLabel(selectedTicket.priority) }}
              </span>
              <span :class="getStatusClass(selectedTicket.status)" class="px-1.5 py-0.5 text-[10px] font-semibold rounded">
                {{ getStatusLabel(selectedTicket.status) }}
              </span>
            </div>
          </div>
          <button @click="selectedTicket = null" class="text-gray-500 hover:text-gray-700 flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-4">
          <div class="bg-gray-50 p-3 rounded mb-4">
            <p class="text-xs text-gray-500 mb-2">{{ formatDateTime(selectedTicket.createdAt) }}</p>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedTicket.description }}</p>
          </div>

          <!-- Yanıtlar -->
          <div v-if="replies.length > 0" class="space-y-3">
            <h4 class="text-sm font-semibold text-gray-700">Yanıtlar</h4>
            <div
              v-for="reply in replies"
              :key="reply._id"
              :class="reply.isAdminReply ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'"
              class="p-3 rounded border"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium" :class="reply.isAdminReply ? 'text-blue-700' : 'text-gray-700'">
                  {{ reply.isAdminReply ? '👤 Destek Ekibi' : reply.repliedBy?.email }}
                </span>
                <span class="text-xs text-gray-500">{{ formatDateTime(reply.createdAt) }}</span>
              </div>
              <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ reply.message }}</p>
            </div>
          </div>

          <!-- Yanıt Formu -->
          <div v-if="selectedTicket.status !== 'CLOSED'" class="mt-4">
            <form @submit.prevent="submitReply" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">Yanıt Ekle</label>
              <textarea
                v-model="replyMessage"
                rows="3"
                required
                maxlength="2000"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
                placeholder="Yanıtınızı yazın..."
              ></textarea>
              <div class="flex justify-end">
                <button
                  type="submit"
                  :disabled="replySubmitting"
                  class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {{ replySubmitting ? 'Gönderiliyor...' : 'Yanıt Gönder' }}
                </button>
              </div>
            </form>
          </div>
          <div v-else class="mt-4 p-3 bg-gray-100 border border-gray-300 rounded text-sm text-gray-600 text-center">
            Bu talep kapatılmıştır. Yeni yanıt eklenemez.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const toast = useToastStore()

const loading = ref(false)
const submitting = ref(false)
const replySubmitting = ref(false)
const showNewTicketModal = ref(false)
const selectedTicket = ref(null)
const tickets = ref([])
const replies = ref([])
const stats = ref(null)
const error = ref('')
const replyMessage = ref('')

const filters = ref({
  status: '',
  category: '',
  priority: ''
})

const newTicket = ref({
  category: '',
  priority: 'MEDIUM',
  subject: '',
  description: ''
})

const loadTickets = async () => {
  try {
    loading.value = true
    const params = {}
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.category) params.category = filters.value.category
    if (filters.value.priority) params.priority = filters.value.priority

    const response = await api.get('/support', { params })
    tickets.value = response.data.tickets || []
  } catch (err) {
    console.error('Load tickets error:', err)
    toast.error(err.response?.data?.message || 'Talepler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await api.get('/support/stats')
    stats.value = response.data?.data || response.data
  } catch (err) {
    console.error('Load stats error:', err)
  }
}

const submitTicket = async () => {
  try {
    submitting.value = true
    error.value = ''

    await api.post('/support', newTicket.value)

    toast.success('Destek talebi oluşturuldu')
    closeNewTicketModal()
    await loadTickets()
    await loadStats()
  } catch (err) {
    console.error('Submit ticket error:', err)
    error.value = err.response?.data?.message || 'Talep gönderilemedi'
  } finally {
    submitting.value = false
  }
}

const viewTicket = async (ticket) => {
  try {
    selectedTicket.value = ticket
    const response = await api.get(`/support/${ticket._id}`)
    replies.value = response.data.replies || []
  } catch (err) {
    console.error('View ticket error:', err)
    toast.error('Talep detayı yüklenemedi')
  }
}

const submitReply = async () => {
  try {
    replySubmitting.value = true

    await api.post(`/support/${selectedTicket.value._id}/reply`, {
      message: replyMessage.value
    })

    toast.success('Yanıt gönderildi')
    replyMessage.value = ''

    // Yanıtları yeniden yükle
    const response = await api.get(`/support/${selectedTicket.value._id}`)
    replies.value = response.data.replies || []
  } catch (err) {
    console.error('Submit reply error:', err)
    toast.error(err.response?.data?.message || 'Yanıt gönderilemedi')
  } finally {
    replySubmitting.value = false
  }
}

const closeNewTicketModal = () => {
  showNewTicketModal.value = false
  newTicket.value = {
    category: '',
    priority: 'MEDIUM',
    subject: '',
    description: ''
  }
  error.value = ''
}

const clearFilters = () => {
  filters.value = {
    status: '',
    category: '',
    priority: ''
  }
  loadTickets()
}

const getCategoryLabel = (category) => {
  const map = {
    'ISSUE': '🔴 Sorun',
    'REQUEST': '💡 İstek',
    'SUGGESTION': '✨ Öneri',
    'QUESTION': '❓ Soru'
  }
  return map[category] || category
}

const getCategoryClass = (category) => {
  const map = {
    'ISSUE': 'bg-red-100 text-red-700',
    'REQUEST': 'bg-purple-100 text-purple-700',
    'SUGGESTION': 'bg-yellow-100 text-yellow-700',
    'QUESTION': 'bg-blue-100 text-blue-700'
  }
  return map[category] || 'bg-gray-100 text-gray-700'
}

const getPriorityLabel = (priority) => {
  const map = {
    'LOW': 'Düşük',
    'MEDIUM': 'Orta',
    'HIGH': 'Yüksek',
    'URGENT': 'Acil'
  }
  return map[priority] || priority
}

const getPriorityClass = (priority) => {
  const map = {
    'LOW': 'bg-gray-100 text-gray-600',
    'MEDIUM': 'bg-blue-100 text-blue-700',
    'HIGH': 'bg-orange-100 text-orange-700',
    'URGENT': 'bg-red-100 text-red-700'
  }
  return map[priority] || 'bg-gray-100 text-gray-700'
}

const getStatusLabel = (status) => {
  const map = {
    'OPEN': 'Açık',
    'IN_PROGRESS': 'İşlemde',
    'RESOLVED': 'Çözüldü',
    'CLOSED': 'Kapatıldı'
  }
  return map[status] || status
}

const getStatusClass = (status) => {
  const map = {
    'OPEN': 'bg-yellow-100 text-yellow-800',
    'IN_PROGRESS': 'bg-blue-100 text-blue-800',
    'RESOLVED': 'bg-green-100 text-green-800',
    'CLOSED': 'bg-gray-100 text-gray-800'
  }
  return map[status] || 'bg-gray-100 text-gray-700'
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now - d

  if (diff < 24 * 60 * 60 * 1000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString('tr-TR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('tr-TR')
}

onMounted(() => {
  loadTickets()
  loadStats()
})
</script>
