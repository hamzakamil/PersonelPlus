<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-xl">
      <!-- Logo -->
      <div class="text-center">
        <img src="/logo.svg" alt="PersonelPlus" class="h-24 w-auto mx-auto" />
      </div>

      <div>
        <h2 class="text-center text-2xl font-bold text-gray-900">
          Şirket Aktivasyonu
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Admin hesabınızı aktif etmek için şifrenizi belirleyin
        </p>
      </div>
      
      <form class="mt-8 space-y-6" @submit.prevent="activateCompany">
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {{ error }}
        </div>
        
        <div v-if="success" class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {{ success }}
          <p class="mt-2 text-sm">
            <router-link to="/login" class="text-green-600 hover:text-green-800 underline">
              Giriş sayfasına git
            </router-link>
          </p>
        </div>

        <div v-if="!success" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Yeni Şifre</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              minlength="6"
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              placeholder="En az 6 karakter"
            />
            <p class="mt-1 text-xs text-gray-500">Şifre en az 6 karakter olmalıdır</p>
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Şifre Tekrar</label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              required
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              placeholder="Şifrenizi tekrar girin"
            />
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading || form.password !== form.confirmPassword"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Aktif Ediliyor...' : 'Hesabı Aktif Et' }}
            </button>
          </div>

          <div v-if="form.password && form.confirmPassword && form.password !== form.confirmPassword" class="text-sm text-red-600">
            Şifreler eşleşmiyor
          </div>
        </div>
      </form>
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()

const form = ref({
  email: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const error = ref('')
const success = ref('')

onMounted(() => {
  // Get token and email from query params
  if (route.query.token) {
    // Token is in URL, but we'll still ask for email for security
  }
  if (route.query.email) {
    form.value.email = decodeURIComponent(route.query.email)
  }
})

const activateCompany = async () => {
  if (form.value.password !== form.value.confirmPassword) {
    error.value = 'Şifreler eşleşmiyor'
    return
  }

  if (form.value.password.length < 6) {
    error.value = 'Şifre en az 6 karakter olmalıdır'
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const token = route.query.token
    if (!token) {
      error.value = 'Geçersiz aktivasyon linki'
      loading.value = false
      return
    }

    await api.post('/companies/activate', {
      token,
      email: form.value.email,
      password: form.value.password
    })

    success.value = 'Şirket başarıyla aktif edildi! Artık giriş yapabilirsiniz.'
  } catch (err) {
    error.value = err.response?.data?.message || 'Aktivasyon başarısız oldu'
  } finally {
    loading.value = false
  }
}
</script>






