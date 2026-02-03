/**
 * Confirm Store Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfirmStore } from '@/stores/confirm'

describe('Confirm Store', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useConfirmStore()
  })

  describe('initial state', () => {
    it('baslangicta kapalı olmali', () => {
      expect(store.isOpen).toBe(false)
    })

    it('varsayilan degerler dogru olmali', () => {
      expect(store.confirmText).toBe('Onayla')
      expect(store.cancelText).toBe('İptal')
      expect(store.type).toBe('warning')
    })
  })

  describe('show', () => {
    it('dialog acmali ve Promise donmeli', async () => {
      const promise = store.show({
        title: 'Test Baslik',
        message: 'Test mesaji'
      })

      expect(promise).toBeInstanceOf(Promise)
      expect(store.isOpen).toBe(true)
      expect(store.title).toBe('Test Baslik')
      expect(store.message).toBe('Test mesaji')

      // Temizlik icin confirm
      store.confirm()
    })

    it('ozel opsiyonlar kullanmali', async () => {
      store.show({
        title: 'Ozel Baslik',
        message: 'Ozel mesaj',
        confirmText: 'Evet',
        cancelText: 'Hayir',
        type: 'danger'
      })

      expect(store.title).toBe('Ozel Baslik')
      expect(store.message).toBe('Ozel mesaj')
      expect(store.confirmText).toBe('Evet')
      expect(store.cancelText).toBe('Hayir')
      expect(store.type).toBe('danger')

      store.confirm()
    })

    it('varsayilan degerler kullanmali', async () => {
      store.show({})

      expect(store.title).toBe('Onay')
      expect(store.message).toBe('Bu işlemi onaylamak istediğinize emin misiniz?')
      expect(store.confirmText).toBe('Onayla')
      expect(store.cancelText).toBe('İptal')
      expect(store.type).toBe('warning')

      store.confirm()
    })
  })

  describe('confirm', () => {
    it('dialog kapatmali ve true donmeli', async () => {
      const promise = store.show({ message: 'Test' })

      store.confirm()

      const result = await promise
      expect(result).toBe(true)
      expect(store.isOpen).toBe(false)
    })
  })

  describe('cancel', () => {
    it('dialog kapatmali ve false donmeli', async () => {
      const promise = store.show({ message: 'Test' })

      store.cancel()

      const result = await promise
      expect(result).toBe(false)
      expect(store.isOpen).toBe(false)
    })
  })

  describe('kisayol fonksiyonlar', () => {
    it('warning dogru tip ile acmali', async () => {
      store.warning('Uyari mesaji', 'Uyari Basligi')

      expect(store.type).toBe('warning')
      expect(store.message).toBe('Uyari mesaji')
      expect(store.title).toBe('Uyari Basligi')

      store.confirm()
    })

    it('danger dogru tip ve confirmText ile acmali', async () => {
      store.danger('Silme mesaji', 'Silme Basligi')

      expect(store.type).toBe('danger')
      expect(store.confirmText).toBe('Sil')
      expect(store.title).toBe('Silme Basligi')

      store.confirm()
    })

    it('info dogru tip ile acmali', async () => {
      store.info('Bilgi mesaji', 'Bilgi Basligi')

      expect(store.type).toBe('info')
      expect(store.message).toBe('Bilgi mesaji')

      store.confirm()
    })

    it('varsayilan baslik kullanmali', async () => {
      store.warning('Sadece mesaj')

      expect(store.title).toBe('Uyarı')

      store.confirm()
    })
  })

  describe('ardisik dialoglar', () => {
    it('birden fazla dialog ardisik acilabilmeli', async () => {
      // Ilk dialog
      const promise1 = store.show({ message: 'Dialog 1' })
      store.confirm()
      const result1 = await promise1

      // Ikinci dialog
      const promise2 = store.show({ message: 'Dialog 2' })
      store.cancel()
      const result2 = await promise2

      expect(result1).toBe(true)
      expect(result2).toBe(false)
    })
  })
})
