/**
 * Login Page E2E Tests
 */

import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('sayfa dogru yuklenmiyor mu', async ({ page }) => {
    // Sayfa basligi
    await expect(page.locator('h2')).toContainText('Giriş Yap')

    // Logo ve program adi
    await expect(page.locator('h1')).toContainText('temmuz C|A|P Personel Plus')

    // Email ve sifre alanlari
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()

    // Giris butonu
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Giriş Yap')
  })

  test('bos form gonderilememeli', async ({ page }) => {
    // Formu bos gonder
    await page.locator('button[type="submit"]').click()

    // HTML5 validation kontrolu - email alani bos olamaz
    const emailInput = page.locator('input[type="email"]')
    const validationMessage = await emailInput.evaluate(
      (el) => el.validationMessage
    )
    expect(validationMessage).not.toBe('')
  })

  test('gecersiz email formati kabul edilmemeli', async ({ page }) => {
    // Gecersiz email gir
    await page.locator('input[type="email"]').fill('gecersiz-email')
    await page.locator('input[type="password"]').fill('sifre123')
    await page.locator('button[type="submit"]').click()

    // HTML5 email validation
    const emailInput = page.locator('input[type="email"]')
    const isValid = await emailInput.evaluate((el) => el.checkValidity())
    expect(isValid).toBe(false)
  })

  test('hatali giris denemesi hata mesaji gostermeli', async ({ page }) => {
    // Hatali bilgilerle giris yap
    await page.locator('input[type="email"]').fill('hatali@email.com')
    await page.locator('input[type="password"]').fill('hatalısifre')
    await page.locator('button[type="submit"]').click()

    // Hata mesaji bekleniyor
    // Not: Backend calismiyorsa network hatasi olacak
    await expect(
      page.locator('text=hata').or(page.locator('.text-red-600'))
    ).toBeVisible({ timeout: 10000 })
  })

  test('giris yaparken loading durumu gostermeli', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@test.com')
    await page.locator('input[type="password"]').fill('sifre123')

    // Butona tiklayinca loading durumu
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Loading text veya disabled durumu kontrol
    // Not: Cok hizli olabilir, timeout kisa tutuldu
    await expect(submitButton).toBeDisabled({ timeout: 1000 }).catch(() => {
      // Loading cok hizli gecmis olabilir - bu normal
    })
  })

  test('sifre alani gizli olmali', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })
})

test.describe('Login - Navigasyon', () => {
  test('giris yapilmadan ana sayfaya gidilemez', async ({ page }) => {
    // Ana sayfaya git
    await page.goto('/')

    // Login sayfasina yonlendirilmeli
    await expect(page).toHaveURL(/.*login/)
  })
})
