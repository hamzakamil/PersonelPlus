<template>
  <div class="p-4 md:p-6">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-bold text-gray-800">Mesajlar</h1>
      <button
        @click="showNewMessageModal = true"
        class="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Yeni Mesaj
      </button>
    </div>

    <!-- Sekmeler -->
    <div class="bg-white rounded-lg shadow mb-4">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex">
          <button
            @click="activeTab = 'inbox'"
            :class="[
              'py-3 px-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'inbox'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Gelen Kutusu
            <span v-if="unreadCount > 0" class="ml-1.5 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {{ unreadCount }}
            </span>
          </button>
          <button
            @click="activeTab = 'sent'"
            :class="[
              'py-3 px-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'sent'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Gönderilen
          </button>
        </nav>
      </div>

      <!-- Mesaj Listesi -->
      <div v-if="loading" class="p-6 text-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-sm text-gray-500">Mesajlar yükleniyor...</p>
      </div>

      <div v-else-if="filteredMessages.length === 0" class="p-6 text-center text-gray-500 text-sm">
        {{ activeTab === 'inbox' ? 'Gelen kutunuz boş.' : 'Gönderilen mesaj yok.' }}
      </div>

      <div v-else class="divide-y divide-gray-200 max-h-[calc(100vh-280px)] overflow-y-auto">
        <div
          v-for="message in filteredMessages"
          :key="message._id"
          @click="viewMessage(message)"
          :class="[
            'p-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3 transition-colors',
            !message.isRead && activeTab === 'inbox' ? 'bg-blue-50' : ''
          ]"
        >
          <!-- Avatar -->
          <div class="flex-shrink-0">
            <div class="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-semibold">
              {{ getInitials(message.sender?.email || message.recipient?.email) }}
            </div>
          </div>

          <!-- İçerik -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <p :class="['text-sm truncate', !message.isRead && activeTab === 'inbox' ? 'font-semibold text-gray-900' : 'text-gray-900']">
                  {{ activeTab === 'inbox' ? (message.sender?.email || 'Bilinmeyen') : getRecipientName(message) }}
                </p>
                <!-- Gönderen/Alıcı rolü -->
                <span v-if="getSenderRoleBadge(message)" :class="getSenderRoleBadgeClass(message)" class="px-1.5 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0">
                  {{ getSenderRoleBadge(message) }}
                </span>
              </div>
              <span class="text-xs text-gray-400 whitespace-nowrap">{{ formatDate(message.createdAt) }}</span>
            </div>
            <p :class="['text-sm truncate', !message.isRead && activeTab === 'inbox' ? 'font-medium text-gray-800' : 'text-gray-600']">
              {{ message.subject || '(Konu yok)' }}
            </p>
            <!-- İlgili talep bilgisi -->
            <div v-if="message.relatedRequest" class="flex items-center gap-2 mt-1">
              <span :class="getRequestTypeBadgeClass(message.relatedRequest)" class="px-1.5 py-0.5 text-[10px] font-medium rounded-full">
                {{ message.relatedRequest.processType === 'hire' ? '📥 İşe Giriş' : '📤 İşten Çıkış' }}
              </span>
              <span class="text-xs text-gray-500 truncate">
                {{ getEmployeeName(message.relatedRequest) }}
              </span>
            </div>
            <p v-else class="text-xs text-gray-500 truncate mt-0.5">
              {{ message.content?.substring(0, 80) }}{{ message.content?.length > 80 ? '...' : '' }}
            </p>
          </div>

          <!-- Okunmadı göstergesi -->
          <div v-if="!message.isRead && activeTab === 'inbox'" class="flex-shrink-0 mt-1">
            <span class="w-2 h-2 bg-blue-500 rounded-full block"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Mesaj Görüntüleme Modal -->
    <div v-if="selectedMessage" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
        <div class="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 class="text-base font-semibold text-gray-800 truncate pr-4">{{ selectedMessage.subject || '(Konu yok)' }}</h3>
          <button @click="selectedMessage = null" class="text-gray-500 hover:text-gray-700 flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-4 flex-1 overflow-y-auto">
          <div class="mb-3 text-xs text-gray-500 space-y-1 bg-gray-50 p-2 rounded">
            <div class="flex items-center gap-2">
              <span class="font-medium">Gönderen:</span>
              <span>{{ selectedMessage.sender?.email || 'Bilinmeyen' }}</span>
              <span v-if="getSenderRoleBadge(selectedMessage)" :class="getSenderRoleBadgeClass(selectedMessage)" class="px-1.5 py-0.5 text-[10px] font-medium rounded-full">
                {{ getSenderRoleBadge(selectedMessage) }}
              </span>
            </div>
            <p><span class="font-medium">Alıcı:</span> {{ getRecipientName(selectedMessage) }}</p>
            <p><span class="font-medium">Tarih:</span> {{ formatDateTime(selectedMessage.createdAt) }}</p>
            <!-- İlgili Talep -->
            <div v-if="selectedMessage.relatedRequest" class="flex items-center gap-2 pt-1 border-t border-gray-200 mt-1">
              <span class="font-medium">İlgili Talep:</span>
              <span :class="getRequestTypeBadgeClass(selectedMessage.relatedRequest)" class="px-1.5 py-0.5 text-[10px] font-medium rounded-full">
                {{ selectedMessage.relatedRequest.processType === 'hire' ? '📥 İşe Giriş' : '📤 İşten Çıkış' }}
              </span>
              <span>{{ getEmployeeName(selectedMessage.relatedRequest) }}</span>
            </div>
          </div>
          <div class="text-sm text-gray-700">
            <p class="whitespace-pre-wrap">{{ selectedMessage.content }}</p>
          </div>
        </div>
        <div class="p-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50">
          <button
            v-if="activeTab === 'inbox' && !(selectedMessage.type === 'SYSTEM' && selectedMessage.senderRole === 'super_admin')"
            @click="replyToMessage"
            class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Yanıtla
          </button>
          <button
            @click="selectedMessage = null"
            class="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-100"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>

    <!-- Yeni Mesaj Modal -->
    <div v-if="showNewMessageModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div class="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 class="text-base font-semibold text-gray-800">Yeni Mesaj</h3>
          <button @click="closeNewMessageModal" class="text-gray-500 hover:text-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form @submit.prevent="sendMessage" class="p-4 space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Alıcı (E-posta)</label>
            <input
              v-model="newMessage.recipientEmail"
              type="email"
              required
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ornek@email.com"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Konu</label>
            <input
              v-model="newMessage.subject"
              type="text"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mesaj konusu"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
            <textarea
              v-model="newMessage.content"
              rows="5"
              required
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Mesajınızı yazın..."
            ></textarea>
          </div>
          <div v-if="sendError" class="text-sm text-red-600 bg-red-50 p-2 rounded">
            {{ sendError }}
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="closeNewMessageModal"
              class="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              :disabled="sending"
              class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ sending ? 'Gönderiliyor...' : 'Gönder' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { useToastStore } from '@/stores/toast'

const messagesStore = useMessagesStore()
const toast = useToastStore()

const activeTab = ref('inbox')
const selectedMessage = ref(null)
const showNewMessageModal = ref(false)
const sending = ref(false)
const sendError = ref('')
const inboxMessages = ref([])
const sentMessages = ref([])

const newMessage = ref({
  recipientEmail: '',
  subject: '',
  content: ''
})

const loading = computed(() => messagesStore.loading)
const unreadCount = computed(() => messagesStore.unreadCount)

const filteredMessages = computed(() => {
  if (activeTab.value === 'inbox') {
    return inboxMessages.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } else {
    return sentMessages.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }
})

const getInitials = (email) => {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

const getRecipientName = (message) => {
  if (message.recipientCompany?.name) return message.recipientCompany.name
  if (message.recipientDealer?.name) return message.recipientDealer.name
  return 'Bilinmeyen'
}

const getSenderRoleBadge = (message) => {
  const role = message.senderRole
  if (role === 'company_admin') return '🏢 Şirket'
  if (['bayi_admin', 'resmi_muhasebe_ik'].includes(role)) return '🏪 Bayi'
  if (role === 'super_admin') return '⚙️ Sistem'
  return null
}

const getSenderRoleBadgeClass = (message) => {
  const role = message.senderRole
  if (role === 'company_admin') return 'bg-blue-100 text-blue-700'
  if (['bayi_admin', 'resmi_muhasebe_ik'].includes(role)) return 'bg-green-100 text-green-700'
  if (role === 'super_admin') return 'bg-gray-100 text-gray-700'
  return 'bg-gray-100 text-gray-700'
}

const getRequestTypeBadgeClass = (request) => {
  if (request.processType === 'hire') return 'bg-emerald-100 text-emerald-700'
  return 'bg-orange-100 text-orange-700'
}

const getEmployeeName = (request) => {
  if (request.processType === 'hire') {
    return request.candidateFullName || '-'
  } else {
    const emp = request.employeeId
    return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '-'
  }
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now - d

  // Bugün ise saat göster
  if (diff < 24 * 60 * 60 * 1000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  // Bu hafta ise gün adı göster
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString('tr-TR', { weekday: 'short' })
  }

  // Daha eski ise tarih göster
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

const formatDateTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('tr-TR')
}

const viewMessage = async (message) => {
  selectedMessage.value = message
  if (!message.isRead && activeTab.value === 'inbox') {
    await messagesStore.markAsRead(message._id)
    // Update local message
    const localMessage = inboxMessages.value.find(m => m._id === message._id)
    if (localMessage) {
      localMessage.isRead = true
      localMessage.readAt = new Date()
    }
    await messagesStore.fetchUnreadCount()
  }
}

const replyToMessage = () => {
  if (!selectedMessage.value) return

  // Sistem mesajlarına yanıt verilemez
  if (selectedMessage.value.type === 'SYSTEM' && selectedMessage.value.senderRole === 'super_admin') {
    toast.warning('Sistem mesajlarına yanıt verilemez. Lütfen genel mesajlaşma sistemini kullanın.')
    selectedMessage.value = null
    return
  }

  const recipientEmail = selectedMessage.value.sender?.email || ''

  newMessage.value = {
    recipientEmail: recipientEmail.toLowerCase().trim(),
    subject: `RE: ${selectedMessage.value.subject || ''}`,
    content: ''
  }
  selectedMessage.value = null
  showNewMessageModal.value = true
}

const closeNewMessageModal = () => {
  showNewMessageModal.value = false
  newMessage.value = {
    recipientEmail: '',
    subject: '',
    content: ''
  }
  sendError.value = ''
}

const sendMessage = async () => {
  sending.value = true
  sendError.value = ''

  const result = await messagesStore.sendMessage({
    recipientEmail: newMessage.value.recipientEmail,
    subject: newMessage.value.subject,
    content: newMessage.value.content
  })

  if (result.success) {
    closeNewMessageModal()
    await loadMessages()
  } else {
    sendError.value = result.error
  }

  sending.value = false
}

const loadMessages = async () => {
  // Fetch inbox messages
  await messagesStore.fetchMessages('inbox')
  inboxMessages.value = [...messagesStore.messages]

  // Fetch sent messages
  await messagesStore.fetchMessages('sent')
  sentMessages.value = [...messagesStore.messages]

  // Update unread count
  await messagesStore.fetchUnreadCount()
}

onMounted(() => {
  loadMessages()
})
</script>
