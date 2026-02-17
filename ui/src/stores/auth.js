import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

const parseUserFromStorage = () => {
  try {
    const stored = localStorage.getItem('user')
    if (!stored || stored === 'undefined' || stored === 'null') return null
    return JSON.parse(stored)
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(parseUserFromStorage())

  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role)
  const roleName = computed(() => user.value?.role?.name || user.value?.role)

  // Populated object'lerden ID çıkaran computed'lar
  const companyId = computed(() => user.value?.company?._id || user.value?.company || null)
  const dealerId = computed(() => user.value?.dealer?._id || user.value?.dealer || null)
  const employeeId = computed(() => user.value?.employee?._id || user.value?.employee || null)

  // Rol kontrolü için yardımcı fonksiyonlar
  const hasRole = (role) => roleName.value === role
  const hasAnyRole = (...roles) => roles.includes(roleName.value)
  const isSuperAdmin = computed(() => roleName.value === 'super_admin')
  const isBayiAdmin = computed(() => roleName.value === 'bayi_admin')
  const isCompanyAdmin = computed(() => roleName.value === 'company_admin')

  async function login(email, password, captchaToken = null) {
    try {
      const payload = { email, password: password || '' }
      if (captchaToken) {
        payload.captchaToken = captchaToken
      }
      const response = await api.post('/auth/login', payload)
      const data = response.data?.data || response.data
      token.value = data.token
      user.value = data.user
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      return {
        success: true,
        requiresPasswordSetup: response.data.requiresPasswordSetup || false
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Giriş başarısız',
        errorCode: error.response?.data?.errorCode || null,
        data: error.response?.data?.data || null
      }
    }
  }

  async function googleLogin(credential) {
    try {
      const response = await api.post('/auth/google', { credential })
      const resData = response.data?.data || response.data

      // Token varsa (mevcut kullanıcı veya yeni deneme kullanıcı) - giriş yap
      if (resData.token) {
        token.value = resData.token
        user.value = resData.user
        localStorage.setItem('token', resData.token)
        localStorage.setItem('user', JSON.stringify(resData.user))
        return { success: true, isNewUser: !!resData.isNewUser }
      }

      // Token yoksa - kayıt onay bekliyor (eski akış fallback)
      return {
        success: false,
        isNewUser: true,
        message: response.data?.message || 'Kayıt talebi oluşturuldu',
        mode: resData.mode
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Google ile giriş başarısız',
        errorCode: error.response?.data?.errorCode || null
      }
    }
  }

  async function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function fetchCurrentUser() {
    try {
      const response = await api.get('/auth/me')
      const data = response.data?.data || response.data
      user.value = data
      localStorage.setItem('user', JSON.stringify(data))
      return { success: true }
    } catch (error) {
      await logout()
      return { success: false }
    }
  }

  function setUser(userData) {
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return {
    token,
    user,
    isAuthenticated,
    userRole,
    roleName,
    companyId,
    dealerId,
    employeeId,
    hasRole,
    hasAnyRole,
    isSuperAdmin,
    isBayiAdmin,
    isCompanyAdmin,
    login,
    googleLogin,
    logout,
    fetchCurrentUser,
    setUser
  }
})

