<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-indigo-600">PersonelPlus</h1>
        <p class="text-gray-600 mt-2">Şifre Sıfırlama</p>
      </div>

      <!-- Form Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div v-if="!submitted">
          <div class="text-center mb-6">
            <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900">Şifrenizi mi unuttunuz?</h2>
            <p class="text-gray-600 mt-2">Email adresinizi girin, size şifre sıfırlama linki gönderelim.</p>
          </div>

          <form @submit.prevent="handleSubmit">
            <div class="mb-6">
              <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                Email Adresi
              </label>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                placeholder="ornek@sirket.com"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                :disabled="loading"
              />
            </div>

            <button
              type="submit"
              :disabled="loading || !email"
              class="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder' }}
            </button>
          </form>

          <div class="mt-6 text-center">
            <router-link to="/login" class="text-indigo-600 hover:text-indigo-700 text-sm font-medium inline-flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Giriş sayfasına dön
            </router-link>
          </div>
        </div>

        <!-- Success Message -->
        <div v-else class="text-center">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Email Gönderildi!</h3>
          <p class="text-gray-600 mb-6">
            Eğer <strong>{{ email }}</strong> adresi sistemde kayıtlıysa, şifre sıfırlama linki gönderildi.
            Lütfen email kutunuzu kontrol edin.
          </p>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p class="text-sm text-yellow-800">
              <svg class="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Link 1 saat süreyle geçerlidir
            </p>
          </div>
          <router-link
            to="/login"
            class="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Giriş Sayfasına Dön
          </router-link>
        </div>
      </div>

      <!-- Help Text -->
      <div class="mt-6 text-center text-sm text-gray-600">
        <p>Email gelmediyse spam klasörünü kontrol edin</p>
        <p class="mt-2">
          Sorun mu yaşıyorsunuz?
          <a href="mailto:destek@personelplus.com" class="text-indigo-600 hover:text-indigo-700 font-medium">
            Destek ekibimizle iletişime geçin
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const email = ref('');
const loading = ref(false);
const submitted = ref(false);

const handleSubmit = async () => {
  loading.value = true;

  try {
    await axios.post('http://localhost:3000/api/auth/forgot-password', {
      email: email.value
    });

    submitted.value = true;
  } catch (error) {
    console.error('Forgot password error:', error);
    alert(error.response?.data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
  } finally {
    loading.value = false;
  }
};
</script>
