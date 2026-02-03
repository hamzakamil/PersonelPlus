/**
 * Auth Store Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Mock api module
vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

import api from '@/services/api'

describe('Auth Store', () => {
  let store

  beforeEach(() => {
    // Her testten once Pinia olustur
    setActivePinia(createPinia())
    store = useAuthStore()

    // localStorage temizle
    localStorage.clear()

    // Mock'lari sifirla
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('baslangicta token ve user null olmali', () => {
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('login', () => {
    it('basarili giris yapilmali', async () => {
      const mockResponse = {
        data: {
          token: 'test-token',
          user: { id: 1, email: 'test@example.com', role: { name: 'admin' } }
        }
      }

      api.post.mockResolvedValueOnce(mockResponse)

      const result = await store.login('test@example.com', 'password123')

      expect(result.success).toBe(true)
      expect(store.token).toBe('test-token')
      expect(store.user.email).toBe('test@example.com')
      expect(store.isAuthenticated).toBe(true)
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token')
    })

    it('basarisiz giris hatasi donmeli', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { message: 'Gecersiz sifre' } }
      })

      const result = await store.login('test@example.com', 'wrong-password')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Gecersiz sifre')
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('logout', () => {
    it('cikis yapildiginda state temizlenmeli', async () => {
      // Once giris yapalim
      store.token = 'test-token'
      store.user = { id: 1, email: 'test@example.com' }

      await store.logout()

      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
    })
  })

  describe('fetchCurrentUser', () => {
    it('kullanici bilgisi basariyla getirilmeli', async () => {
      const mockUser = { id: 1, email: 'test@example.com', role: { name: 'admin' } }
      api.get.mockResolvedValueOnce({ data: mockUser })

      const result = await store.fetchCurrentUser()

      expect(result.success).toBe(true)
      expect(store.user).toEqual(mockUser)
    })

    it('hata durumunda logout yapilmali', async () => {
      api.get.mockRejectedValueOnce(new Error('Unauthorized'))

      const result = await store.fetchCurrentUser()

      expect(result.success).toBe(false)
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
    })
  })

  describe('setUser', () => {
    it('kullanici bilgisi guncellenebilmeli', () => {
      const userData = { id: 2, email: 'updated@example.com' }

      store.setUser(userData)

      expect(store.user).toEqual(userData)
      expect(localStorage.setItem).toHaveBeenCalled()
    })
  })

  describe('computed properties', () => {
    it('userRole dogru donmeli', () => {
      store.user = { role: { name: 'company_admin' } }

      expect(store.userRole).toEqual({ name: 'company_admin' })
    })

    it('isAuthenticated token varken true donmeli', () => {
      store.token = 'some-token'

      expect(store.isAuthenticated).toBe(true)
    })
  })
})
