<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Logo -->
      <div class="text-center">
        <img src="/logo.svg" alt="PersonelPlus" class="h-24 w-auto mx-auto" />
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
        Powered by <span class="font-semibold" style="color: #E53935;">PersonelPlus</span>
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
