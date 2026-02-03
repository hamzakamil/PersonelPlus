<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
      <!-- Header -->
      <div class="p-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
        <div class="flex justify-between items-center">
          <div class="text-white">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-semibold">Mesajlar</h3>
              <span :class="statusBadgeClass" class="px-2 py-0.5 text-[10px] font-medium rounded-full">
                {{ statusLabel }}
              </span>
            </div>
            <p class="text-xs text-blue-100 mt-0.5">
              {{ employeeName }} - {{ processTypeLabel }}
            </p>
          </div>
          <button @click="$emit('close')" class="text-white hover:text-blue-200">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Messages Area -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3" style="min-height: 200px; max-height: 400px;">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>

        <!-- Empty State -->
        <div v-else-if="messages.length === 0" class="text-center py-8">
          <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p class="text-sm text-gray-500">Henüz mesaj yok</p>
          <p v-if="canSendNewMessage" class="text-xs text-gray-400 mt-1">Bu talep hakkında mesaj gönderin</p>
          <p v-else class="text-xs text-gray-400 mt-1">Bu talep için mesaj geçmişi bulunmuyor</p>
        </div>

        <!-- Messages -->
        <div v-else class="space-y-3">
          <div
            v-for="msg in messages"
            :key="msg._id"
            :class="[
              'max-w-[85%] rounded-lg p-3 shadow-sm',
              getMessageAlignment(msg)
            ]"
          >
            <!-- Sender Badge -->
            <div class="flex items-center gap-2 mb-1">
              <span :class="getSenderBadgeClass(msg)" class="px-2 py-0.5 text-[10px] font-medium rounded-full">
                {{ getSenderLabel(msg) }}
              </span>
              <span :class="['text-xs', isMyMessage(msg) ? 'text-blue-200' : 'text-gray-400']">
                {{ formatTime(msg.createdAt) }}
              </span>
            </div>
            <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
          </div>
        </div>
      </div>

      <!-- Input Area - Sadece aktif talepler için göster -->
      <div v-if="canSendNewMessage" class="p-3 border-t border-gray-200 bg-white">
        <form @submit.prevent="sendMessage" class="flex gap-2">
          <textarea
            v-model="newMessage"
            rows="2"
            class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Mesajınızı yazın..."
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>
          <button
            type="submit"
            :disabled="!newMessage.trim() || sending"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg v-if="sending" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      <!-- Read-only footer for closed requests -->
      <div v-else class="p-3 border-t border-gray-200 bg-gray-100 text-center">
        <p class="text-xs text-gray-500">
          Bu talep {{ statusLabel.toLowerCase() }} olduğu için mesaj gönderilemiyor
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const props = defineProps({
  record: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'messageSent'])

const authStore = useAuthStore()
const toast = useToastStore()

const messages = ref([])
const newMessage = ref('')
const loading = ref(false)
const sending = ref(false)
const messagesContainer = ref(null)

const employeeName = computed(() => {
  if (props.record.processType === 'hire') {
    return props.record.candidateFullName || '-'
  } else {
    const emp = props.record.employeeId
    return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '-'
  }
})

const processTypeLabel = computed(() => {
  return props.record.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış'
})

const statusLabel = computed(() => {
  const labels = {
    'PENDING': 'Bekliyor',
    'REVISION_REQUESTED': 'Düzeltme Bekleniyor',
    'APPROVED': 'Onaylandı',
    'CANCELLED': 'İptal Edildi'
  }
  return labels[props.record.status] || props.record.status
})

const statusBadgeClass = computed(() => {
  const classes = {
    'PENDING': 'bg-yellow-400 text-yellow-900',
    'REVISION_REQUESTED': 'bg-orange-400 text-orange-900',
    'APPROVED': 'bg-green-400 text-green-900',
    'CANCELLED': 'bg-red-400 text-red-900'
  }
  return classes[props.record.status] || 'bg-gray-400 text-gray-900'
})

const canSendNewMessage = computed(() => {
  return ['PENDING', 'REVISION_REQUESTED'].includes(props.record.status)
})

const isMyMessage = (msg) => {
  const userId = authStore.user?._id
  const senderId = msg.sender?._id || msg.sender
  return userId && senderId && userId.toString() === senderId.toString()
}

// Şirket mi bayi mi?
const isCompanyMessage = (msg) => {
  return msg.senderRole === 'company_admin'
}

const isDealerMessage = (msg) => {
  return ['bayi_admin', 'resmi_muhasebe_ik'].includes(msg.senderRole)
}

// Mesaj hizalama - Şirket sola, Bayi sağa
const getMessageAlignment = (msg) => {
  if (isCompanyMessage(msg)) {
    return 'mr-auto bg-blue-100 text-blue-900 border border-blue-200'
  } else if (isDealerMessage(msg)) {
    return 'ml-auto bg-green-100 text-green-900 border border-green-200'
  } else {
    // Super admin veya diğer
    return 'mx-auto bg-gray-100 text-gray-900 border border-gray-200'
  }
}

const getSenderLabel = (msg) => {
  const role = msg.senderRole
  if (role === 'company_admin') return '🏢 Şirket'
  if (['bayi_admin', 'resmi_muhasebe_ik'].includes(role)) return '🏪 Bayi'
  if (role === 'super_admin') return '⚙️ Sistem'
  return msg.sender?.email || 'Bilinmeyen'
}

const getSenderBadgeClass = (msg) => {
  if (isCompanyMessage(msg)) {
    return 'bg-blue-200 text-blue-800'
  } else if (isDealerMessage(msg)) {
    return 'bg-green-200 text-green-800'
  }
  return 'bg-gray-200 text-gray-800'
}

const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()

  // Bugün ise sadece saat
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  // Bu yıl ise gün ve ay
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  // Daha eski ise tam tarih
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const loadMessages = async () => {
  loading.value = true
  try {
    const response = await api.get(`/messages/request/${props.record._id}`)
    messages.value = response.data.messages || []

    // Okunmamış mesajları okundu olarak işaretle
    for (const msg of messages.value) {
      if (!msg.isRead && !isMyMessage(msg)) {
        try {
          await api.put(`/messages/${msg._id}/read`)
        } catch (e) {
          // Sessizce devam et
        }
      }
    }

    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('Mesajlar yüklenemedi:', error)
    toast.error('Mesajlar yüklenemedi')
  } finally {
    loading.value = false
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return

  sending.value = true
  try {
    const response = await api.post('/messages', {
      relatedRequestId: props.record._id,
      subject: `${processTypeLabel.value} Talebi - ${employeeName.value}`,
      content: newMessage.value.trim(),
      type: 'EMPLOYMENT_REQUEST'
    })

    if (response.data.success) {
      newMessage.value = ''
      await loadMessages()
      emit('messageSent')
    } else {
      toast.error(response.data.message || 'Mesaj gönderilemedi')
    }
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error)
    toast.error(error.response?.data?.message || 'Mesaj gönderilemedi')
  } finally {
    sending.value = false
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

watch(messages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })

onMounted(() => {
  loadMessages()
})
</script>
