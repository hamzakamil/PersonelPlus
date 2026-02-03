/**
 * Vitest Test Setup
 * Her test dosyasindan once calisir
 */

import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Vue Test Utils global config
config.global.stubs = {
  // Router Link stub
  RouterLink: {
    template: '<a><slot /></a>'
  },
  RouterView: true
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock

// Mock sessionStorage
global.sessionStorage = localStorageMock

// Mock window.location
delete window.location
window.location = {
  href: '',
  origin: 'http://localhost:5173',
  pathname: '/',
  reload: vi.fn()
}

// Mock fetch (gerekirse)
global.fetch = vi.fn()

// Console warning/error temizligi (opsiyonel)
// beforeEach(() => {
//   vi.spyOn(console, 'warn').mockImplementation(() => {})
//   vi.spyOn(console, 'error').mockImplementation(() => {})
// })
