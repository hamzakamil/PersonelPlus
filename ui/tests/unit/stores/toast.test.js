/**
 * Toast Store Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToastStore } from '@/stores/toast'

describe('Toast Store', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useToastStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('baslangicta toasts bos olmali', () => {
      expect(store.toasts).toEqual([])
    })
  })

  describe('addToast', () => {
    it('yeni toast eklemeli', () => {
      store.addToast('Test mesaji', 'info', 3000)

      expect(store.toasts.length).toBe(1)
      expect(store.toasts[0].message).toBe('Test mesaji')
      expect(store.toasts[0].type).toBe('info')
      expect(store.toasts[0].duration).toBe(3000)
    })

    it('varsayilan degerler kullanmali', () => {
      store.addToast('Mesaj')

      expect(store.toasts[0].type).toBe('info')
      expect(store.toasts[0].duration).toBe(3000)
    })

    it('benzersiz id donmeli', () => {
      const id1 = store.addToast('Mesaj 1')
      const id2 = store.addToast('Mesaj 2')

      expect(id1).not.toBe(id2)
    })

    it('duration sonunda otomatik kaldirmali', () => {
      store.addToast('Gecici mesaj', 'info', 1000)

      expect(store.toasts.length).toBe(1)

      vi.advanceTimersByTime(1000)

      expect(store.toasts.length).toBe(0)
    })

    it('duration 0 ise otomatik kaldirmamali', () => {
      store.addToast('Kalici mesaj', 'info', 0)

      vi.advanceTimersByTime(10000)

      expect(store.toasts.length).toBe(1)
    })
  })

  describe('removeToast', () => {
    it('toast kaldirmali', () => {
      const id = store.addToast('Silinecek', 'info', 0)

      expect(store.toasts.length).toBe(1)

      store.removeToast(id)

      expect(store.toasts.length).toBe(0)
    })

    it('olmayan id ile hata vermemeli', () => {
      store.addToast('Mesaj', 'info', 0)

      expect(() => store.removeToast(9999)).not.toThrow()
      expect(store.toasts.length).toBe(1)
    })
  })

  describe('kisayol fonksiyonlar', () => {
    it('success dogru tip ile eklemeli', () => {
      store.success('Basarili!')

      expect(store.toasts[0].type).toBe('success')
      expect(store.toasts[0].duration).toBe(3000)
    })

    it('error dogru tip ve uzun sure ile eklemeli', () => {
      store.error('Hata!')

      expect(store.toasts[0].type).toBe('error')
      expect(store.toasts[0].duration).toBe(5000)
    })

    it('warning dogru tip ile eklemeli', () => {
      store.warning('Uyari!')

      expect(store.toasts[0].type).toBe('warning')
      expect(store.toasts[0].duration).toBe(4000)
    })

    it('info dogru tip ile eklemeli', () => {
      store.info('Bilgi')

      expect(store.toasts[0].type).toBe('info')
      expect(store.toasts[0].duration).toBe(3000)
    })

    it('ozel duration kabul etmeli', () => {
      store.success('Mesaj', 10000)

      expect(store.toasts[0].duration).toBe(10000)
    })
  })

  describe('birden fazla toast', () => {
    it('birden fazla toast ekleyebilmeli', () => {
      store.success('Basarili')
      store.error('Hata')
      store.warning('Uyari')

      expect(store.toasts.length).toBe(3)
    })

    it('toastlar eklendigi sirada olmali', () => {
      store.addToast('Birinci', 'info', 0)
      store.addToast('Ikinci', 'info', 0)
      store.addToast('Ucuncu', 'info', 0)

      expect(store.toasts[0].message).toBe('Birinci')
      expect(store.toasts[1].message).toBe('Ikinci')
      expect(store.toasts[2].message).toBe('Ucuncu')
    })
  })
})
