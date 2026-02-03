import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useLeaveRequestsStore = defineStore('leaveRequests', () => {
  const myRequests = ref([])
  const pendingRequests = ref([])
  const pendingCancellations = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Çalışan kendi taleplerini getir
  async function fetchMyRequests() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/leave-requests/my')
      if (response.data.success) {
        myRequests.value = response.data.data || []
      } else {
        error.value = response.data.message || 'Talepler yüklenemedi'
        myRequests.value = []
      }
      return { success: true, data: myRequests.value }
    } catch (err) {
      error.value = err.response?.data?.message || 'Talepler yüklenemedi'
      myRequests.value = []
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Yöneticinin bekleyen talepleri
  async function fetchPendingRequests() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/leave-requests/pending')
      if (response.data.success) {
        pendingRequests.value = response.data.data || []
      } else {
        error.value = response.data.message || 'Bekleyen talepler yüklenemedi'
        pendingRequests.value = []
      }
      return { success: true, data: pendingRequests.value }
    } catch (err) {
      error.value = err.response?.data?.message || 'Bekleyen talepler yüklenemedi'
      pendingRequests.value = []
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // İzin talebi oluştur
  async function createRequest(formData) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/leave-requests', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      if (response.data.success) {
        // Kendi taleplerini yeniden yükle
        await fetchMyRequests()
        return { success: true, data: response.data.data }
      } else {
        error.value = response.data.message || 'İzin talebi oluşturulamadı'
        return { success: false, error: error.value }
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'İzin talebi oluşturulamadı'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // İzin talebini onayla
  async function approveRequest(requestId, note = '') {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/leave-requests/${requestId}/approve`, { note })
      if (response.data.success) {
        // Bekleyen talepleri yeniden yükle
        await fetchPendingRequests()
        return { success: true, data: response.data.data }
      } else {
        error.value = response.data.message || 'İzin talebi onaylanamadı'
        return { success: false, error: error.value }
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'İzin talebi onaylanamadı'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // İzin talebini reddet
  async function rejectRequest(requestId, note) {
    if (!note || note.trim() === '') {
      error.value = 'Red nedeni zorunludur'
      return { success: false, error: error.value }
    }

    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/leave-requests/${requestId}/reject`, { note: note.trim() })
      if (response.data.success) {
        // Bekleyen talepleri yeniden yükle
        await fetchPendingRequests()
        return { success: true, data: response.data.data }
      } else {
        error.value = response.data.message || 'İzin talebi reddedilemedi'
        return { success: false, error: error.value }
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'İzin talebi reddedilemedi'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Bekleyen iptal taleplerini getir
  async function fetchPendingCancellations() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/leave-requests/pending-cancellations')
      if (response.data.success) {
        pendingCancellations.value = response.data.data || []
      } else {
        error.value = response.data.message || 'Bekleyen iptal talepleri yüklenemedi'
        pendingCancellations.value = []
      }
      return { success: true, data: pendingCancellations.value }
    } catch (err) {
      error.value = err.response?.data?.message || 'Bekleyen iptal talepleri yüklenemedi'
      pendingCancellations.value = []
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // İptal talebini onayla
  async function approveCancellation(requestId, note = '') {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/leave-requests/${requestId}/approve-cancellation`, { note })
      if (response.data.success) {
        // Bekleyen iptal taleplerini yeniden yükle
        await fetchPendingCancellations()
        return { success: true, data: response.data.data }
      } else {
        error.value = response.data.message || 'İptal talebi onaylanamadı'
        return { success: false, error: error.value }
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'İptal talebi onaylanamadı'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // İptal talebini reddet
  async function rejectCancellation(requestId, note) {
    if (!note || note.trim() === '') {
      error.value = 'Red nedeni zorunludur'
      return { success: false, error: error.value }
    }

    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/leave-requests/${requestId}/reject-cancellation`, { note: note.trim() })
      if (response.data.success) {
        // Bekleyen iptal taleplerini yeniden yükle
        await fetchPendingCancellations()
        return { success: true, data: response.data.data }
      } else {
        error.value = response.data.message || 'İptal talebi reddedilemedi'
        return { success: false, error: error.value }
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'İptal talebi reddedilemedi'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  return {
    myRequests,
    pendingRequests,
    pendingCancellations,
    loading,
    error,
    fetchMyRequests,
    fetchPendingRequests,
    fetchPendingCancellations,
    createRequest,
    approveRequest,
    rejectRequest,
    approveCancellation,
    rejectCancellation
  }
})




