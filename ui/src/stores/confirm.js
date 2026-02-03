import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfirmStore = defineStore('confirm', () => {
  const isOpen = ref(false)
  const title = ref('')
  const message = ref('')
  const confirmText = ref('Onayla')
  const cancelText = ref('İptal')
  const type = ref('warning') // warning, danger, info, success
  const resolvePromise = ref(null)

  const show = (options) => {
    return new Promise((resolve) => {
      title.value = options.title || 'Onay'
      message.value = options.message || 'Bu işlemi onaylamak istediğinize emin misiniz?'
      confirmText.value = options.confirmText || 'Onayla'
      cancelText.value = options.cancelText || 'İptal'
      type.value = options.type || 'warning'
      resolvePromise.value = resolve
      isOpen.value = true
    })
  }

  const confirm = () => {
    isOpen.value = false
    if (resolvePromise.value) {
      resolvePromise.value(true)
      resolvePromise.value = null
    }
  }

  const cancel = () => {
    isOpen.value = false
    if (resolvePromise.value) {
      resolvePromise.value(false)
      resolvePromise.value = null
    }
  }

  // Kısayol fonksiyonlar
  const warning = (message, title = 'Uyarı') => show({ message, title, type: 'warning' })
  const danger = (message, title = 'Dikkat') => show({ message, title, type: 'danger', confirmText: 'Sil' })
  const info = (message, title = 'Bilgi') => show({ message, title, type: 'info' })

  return {
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    type,
    show,
    confirm,
    cancel,
    warning,
    danger,
    info
  }
})
