<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Logo -->
      <div class="text-center">
        <div class="mx-auto w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center shadow-lg">
          <svg class="w-14 h-14" viewBox="0 0 576 576">
            <path fill="#f07c01" d="M287.5,0c2.5,2.5,4.4,5.5,6.1,8.6,17.2,30.3,32.1,62.6,37.9,97.2,3.7,20.6,2.9,42.2-4.9,61.8,14.3-13.3,32.5-22.6,52.1-24.6,3.8,30,4.9,60.4,2.9,90.5-1.5,13.4-3,27-8.5,39.4,10-1.3,19.4-5.5,29.6-6.1,2.7,40.3,4.5,81-.6,121.2-3.9,31.8-15.1,63.4-35.7,88.3-13.4,15.6-31.8,25.6-45.7,40.7-16.2,16.1-29.7,36-32.9,59-3.1-23.9-17.7-44.4-34.6-60.7-13.7-14.6-31.9-24.2-44.6-39.8-15.7-19.2-25.8-42.6-31.4-66.7-9.6-46.7-7.2-94.7-4-141.9,10.1.6,19.5,4.9,29.5,6-10.9-27.4-9.5-57.6-9.1-86.5.4-14.5,1.8-28.9,3.5-43.3,19.7,1.3,39.1,9.6,52.3,24.7-3.4-9.3-5.7-19.2-5.8-29.1-2.1-37.7,11-74.1,27.1-107.6,5.1-10.6,10.7-20.9,16.7-31.1ZM256.1,138.6c.8,26.5,10.1,53.8,29.9,72.1-10.6-19-14.7-40.7-17.2-62.1-3-33.1,1.6-66.5,10.2-98.5,2.1-8.1,5.8-15.7,6.8-24.1-17.3,34.9-30.7,73.1-29.7,112.6ZM290.1,26c2.1,8.9,5.5,17.3,7.8,26.1,8.1,31.1,12.3,63.4,9.4,95.6-2.3,21.5-6.8,43.1-16.9,62.3,18.7-17.4,27.8-43,29.4-68.1,1.7-37.2-9.5-73.8-25.1-107.2-1.6-2.9-3.1-5.9-4.7-8.7ZM205.6,160c-3.4,2.1-.7,6.5-1.3,9.7-1.7,38.6.8,78.9,18.2,114.1,10.1,20.4,28,37.2,50.1,43.3-5.8-5.9-12.3-11-17.6-17.3-18.4-21.3-30.2-47.6-38.1-74.4-6.7-23.2-10.1-47.3-11.5-71.4,2.6-1.6,5.4-.6,7.1,1.7,34.5,36.4,60.3,83.1,65,133.6,1.2,8.1,0,16.3,1.4,24.3,5.9-20.2,8.5-41.7,3.4-62.4-9.3-40.6-38.1-73.5-70.3-98.4-1.4-2.1-3.6-4.3-6.3-2.9ZM332.4,191.6c-21,23.2-38,51.9-40.8,83.6-2.1,16.3,1.5,32.7,5.6,48.4,1.4-8.1.2-16.3,1.4-24.5,5-51.7,31.6-99.6,67.7-136.1,1.6-.1,3.1.4,4.3,1.6-2.9,47.5-14,96.2-42,135.5-7.1,10.2-16.4,18.6-25.5,27,15.5-4.5,29.7-13.9,39.6-26.6,16.7-21.6,24-48.8,27.3-75.5,3.1-20.5,1.5-41.4,2-62.1-.3-1.5-.9-2.9-1.8-4.2l-2.1.8c-12.5,10-25.1,20.2-35.9,32.2ZM384.9,287.3c-37,27.9-69.8,64.2-85.2,108.5-11.1,31.2-10.5,66.1,1.3,97-2.8-32.8,3.6-65.8,15-96.5,15.1-39.9,39.3-76,68.8-106.6,2.2-1.3,4.3-2.7,6.5-4,1,22-3.1,43.9-7.1,65.5-9.3,45.3-26.5,90.4-57.7,125.1-6.3,7.4-14.2,13.1-21.3,19.7,13.9-5.1,28-10.9,38.9-21.3,26.1-23.1,38.2-57.5,44.6-90.8,5.8-33.3,7.2-67.5,3.2-101-3.1-.2-5.7,2-7.2,4.5ZM186.3,285.3c24.5,23.3,44.5,51.2,60.3,81.1,19.9,38.8,31.7,82.6,28.5,126.5,2.4-7.4,4.6-14.9,6.4-22.5,5.9-27.9,2.2-57.3-8.5-83.6-15.3-36.8-42.3-67.7-73-92.6-4.2-3.5-8.4-7.1-13.7-8.8ZM181.8,306.2c-.6,26.7.6,53.5,5.7,79.8,6.4,31.9,18,64.6,42.5,87.1,11.2,11,25.7,17.7,40.5,22.5-19.1-14.7-34.7-33.7-46.5-54.7-25.3-45-36.7-96.5-39.9-147.6-2.9,3.7-2,8.6-2.3,12.9Z"/>
          </svg>
        </div>
        <h1 class="mt-4 text-2xl font-bold" style="color: #f07c01;">
          Personel Plus
        </h1>
      </div>

      <!-- Başlık -->
      <div class="text-center">
        <h2 class="text-2xl font-bold text-gray-900">Hesap Aktivasyonu</h2>
        <p class="mt-2 text-sm text-gray-600">Hesabınızı aktive etmek için şifrenizi belirleyin</p>
      </div>

      <!-- Yükleniyor -->
      <div v-if="loading" class="bg-white rounded-lg shadow p-6 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Token doğrulanıyor...</p>
      </div>

      <!-- Geçersiz Token -->
      <div v-else-if="!tokenValid" class="bg-white rounded-lg shadow p-6">
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 class="mt-4 text-lg font-medium text-gray-900">Geçersiz veya Süresi Dolmuş Link</h3>
          <p class="mt-2 text-sm text-gray-500">{{ errorMessage }}</p>
          <div class="mt-6">
            <router-link
              to="/login"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600"
            >
              Giriş Sayfasına Dön
            </router-link>
          </div>
        </div>
      </div>

      <!-- Aktivasyon Formu -->
      <div v-else-if="!activated" class="bg-white rounded-lg shadow p-6">
        <div class="mb-6">
          <div class="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mx-auto">
            <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="mt-4 text-lg font-medium text-gray-900 text-center">Token Doğrulandı</h3>
          <p class="mt-2 text-sm text-gray-500 text-center">
            E-posta: <strong>{{ userEmail }}</strong>
          </p>
        </div>

        <form @submit.prevent="activateAccount" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700">Yeni Şifre</label>
            <input
              v-model="password"
              type="password"
              required
              minlength="6"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder="En az 6 karakter"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Şifre Tekrar</label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder="Şifrenizi tekrar girin"
            />
          </div>

          <div v-if="password && confirmPassword && password !== confirmPassword" class="text-sm text-red-600">
            Şifreler eşleşmiyor
          </div>

          <div v-if="activationError" class="text-sm text-red-600 bg-red-50 p-3 rounded">
            {{ activationError }}
          </div>

          <button
            type="submit"
            :disabled="!canSubmit || activating"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="activating" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ activating ? 'Aktive Ediliyor...' : 'Hesabı Aktive Et' }}
          </button>
        </form>
      </div>

      <!-- Başarılı Aktivasyon -->
      <div v-else class="bg-white rounded-lg shadow p-6">
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="mt-4 text-lg font-medium text-gray-900">Hesabınız Aktive Edildi!</h3>
          <p class="mt-2 text-sm text-gray-500">
            Şifreniz başarıyla belirlendi. Şimdi sisteme giriş yapabilirsiniz.
          </p>
          <div class="mt-6">
            <router-link
              to="/"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600"
            >
              Panele Git
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-8 text-center">
      <p class="text-sm text-gray-500">
        Powered by <span class="font-semibold" style="color: #f07c01;">Personel Plus</span>
      </p>
      <p class="text-xs text-gray-400 mt-1">© {{ new Date().getFullYear() }} Tüm hakları saklıdır.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const tokenValid = ref(false)
const userEmail = ref('')
const password = ref('')
const confirmPassword = ref('')
const activating = ref(false)
const activated = ref(false)
const errorMessage = ref('')
const activationError = ref('')

const canSubmit = computed(() => {
  return password.value.length >= 6 && password.value === confirmPassword.value
})

const verifyToken = async () => {
  const token = route.params.token
  if (!token) {
    errorMessage.value = 'Aktivasyon linki geçersiz.'
    loading.value = false
    return
  }

  try {
    const response = await api.get(`/auth/verify-activation-token/${token}`)
    if (response.data.valid) {
      tokenValid.value = true
      userEmail.value = response.data.email
    } else {
      errorMessage.value = response.data.message || 'Aktivasyon linki geçersiz veya süresi dolmuş.'
    }
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Aktivasyon linki doğrulanamadı.'
  } finally {
    loading.value = false
  }
}

const activateAccount = async () => {
  if (!canSubmit.value) return

  activating.value = true
  activationError.value = ''

  try {
    const token = route.params.token
    const response = await api.post('/auth/activate-account', {
      token,
      password: password.value
    })

    if (response.data.token) {
      // Token ve kullanıcı bilgilerini kaydet
      authStore.setToken(response.data.token)
      authStore.setUser(response.data.user)
      activated.value = true

      // 2 saniye sonra panele yönlendir
      setTimeout(() => {
        router.push('/')
      }, 2000)
    }
  } catch (error) {
    activationError.value = error.response?.data?.message || 'Hesap aktive edilemedi.'
  } finally {
    activating.value = false
  }
}

onMounted(() => {
  verifyToken()
})
</script>
