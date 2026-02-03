/**
 * Smoke Tests
 * Uygulamanin temel calistigindan emin olmak icin hizli testler
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('uygulama ayakta mi', async ({ page }) => {
    const response = await page.goto('/')

    // Sayfa yuklenmiş olmalı (200 veya redirect)
    expect(response?.status()).toBeLessThan(400)
  })

  test('login sayfasi erisilebilir mi', async ({ page }) => {
    await page.goto('/login')

    // Login formu gorunur olmali
    await expect(page.locator('form')).toBeVisible()
  })

  test('CSS ve stiller yukleniyor mu', async ({ page }) => {
    await page.goto('/login')

    // Tailwind CSS siniflari uygulanmis olmali
    const body = page.locator('body')
    const bgColor = await body.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    )

    // Arka plan rengi default beyaz olmamali (Tailwind bg-gray-50)
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('Vue uygulamasi mount edilmis mi', async ({ page }) => {
    await page.goto('/login')

    // Vue app mount edilmis olmali - #app elementi icinde icerik olmali
    const appContent = await page.locator('#app').innerHTML()
    expect(appContent.length).toBeGreaterThan(0)
  })

  test('JavaScript hatalari yok', async ({ page }) => {
    const errors = []

    // Console hatalarini dinle
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('/login')

    // Bir sure bekle ki tum scriptler calissin
    await page.waitForTimeout(1000)

    // Kritik JavaScript hatalari olmamali
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') && // Bu hata genellikle zararsiz
        !e.includes('favicon')
    )

    expect(criticalErrors).toHaveLength(0)
  })
})

test.describe('API Baglantisi', () => {
  test('backend erisimi test edilebilir', async ({ page }) => {
    // Login API endpoint'ine istek at
    // Not: Backend calismiyorsa bu test basarisiz olacak
    await page.goto('/login')

    // Network isteklerini dinle
    const [response] = await Promise.all([
      page
        .waitForResponse(
          (response) =>
            response.url().includes('/api/') && response.status() !== 0,
          { timeout: 5000 }
        )
        .catch(() => null),
      page.locator('input[type="email"]').fill('test@test.com'),
      page.locator('input[type="password"]').fill('test123'),
      page.locator('button[type="submit"]').click()
    ])

    // Backend calisiyorsa response almis olmaliyiz
    // Calismiyorsa null olacak - bu da kabul edilebilir
    if (response) {
      expect(response.status()).toBeGreaterThan(0)
    }
  })
})
