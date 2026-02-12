<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
  >
    <div class="max-w-md w-full space-y-8">
      <!-- Logo -->
      <div class="text-center">
        <img src="/logo.svg" alt="PersonelPlus" class="h-24 w-auto mx-auto" />
      </div>

      <!-- Başlık -->
      <div class="text-center">
        <h2 class="text-2xl font-bold text-gray-900">Email Doğrulama</h2>
      </div>

      <!-- Yükleniyor -->
      <div v-if="loading" class="bg-white rounded-lg shadow p-6 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Email doğrulanıyor...</p>
      </div>

      <!-- Başarılı Doğrulama -->
      <div v-else-if="verified" class="bg-white rounded-lg shadow p-6">
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              class="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 class="mt-4 text-lg font-medium text-gray-900">Email Adresiniz Doğrulandı!</h3>
          <p class="mt-2 text-sm text-gray-500">
            Hesabınız başarıyla aktif edildi. Şimdi sisteme giriş yapabilirsiniz.
          </p>
          <div class="mt-6">
            <router-link
              to="/login"
              class="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Giriş Yap
            </router-link>
          </div>
        </div>
      </div>

      <!-- Hata -->
      <div v-else class="bg-white rounded-lg shadow p-6">
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h3 class="mt-4 text-lg font-medium text-gray-900">Doğrulama Başarısız</h3>
          <p class="mt-2 text-sm text-gray-500">{{ errorMessage }}</p>
        </div>

        <!-- Tekrar Gönder -->
        <div class="mt-6 border-t pt-6">
          <p class="text-sm text-gray-600 mb-3">
            Yeni doğrulama linki göndermek için email adresinizi girin:
          </p>
          <div class="flex gap-2">
            <input
              v-model="resendEmail"
              type="email"
              placeholder="email@example.com"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <button
              @click="resendVerification"
              :disabled="resending || !resendEmail"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {{ resending ? 'Gönderiliyor...' : 'Tekrar Gönder' }}
            </button>
          </div>
          <p
            v-if="resendMessage"
            class="mt-2 text-sm"
            :class="resendSuccess ? 'text-green-600' : 'text-red-600'"
          >
            {{ resendMessage }}
          </p>
        </div>

        <div class="mt-4 text-center">
          <router-link to="/login" class="text-sm text-blue-600 hover:text-blue-800">
            Giriş Sayfasına Dön
          </router-link>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-8 text-center">
      <p class="text-sm text-gray-500">
        Powered by <span class="font-semibold" style="color: #e53935">PersonelPlus</span>
      </p>
      <p class="text-xs text-gray-400 mt-1">
        &copy; {{ new Date().getFullYear() }} Tüm hakları saklıdır.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';

const route = useRoute();

const loading = ref(true);
const verified = ref(false);
const errorMessage = ref('');
const resendEmail = ref('');
const resending = ref(false);
const resendMessage = ref('');
const resendSuccess = ref(false);

onMounted(async () => {
  const token = route.params.token;
  if (!token) {
    errorMessage.value = 'Doğrulama linki geçersiz.';
    loading.value = false;
    return;
  }

  try {
    const response = await api.get(`/auth/verify-email/${token}`);
    if (response.data.success) {
      verified.value = true;
    } else {
      errorMessage.value = response.data.message || 'Doğrulama başarısız.';
    }
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message || 'Doğrulama linki geçersiz veya süresi dolmuş.';
  } finally {
    loading.value = false;
  }
});

const resendVerification = async () => {
  if (!resendEmail.value) return;

  resending.value = true;
  resendMessage.value = '';

  try {
    const response = await api.post('/auth/resend-verification', {
      email: resendEmail.value,
    });
    resendSuccess.value = true;
    resendMessage.value = response.data.message || 'Doğrulama emaili tekrar gönderildi.';
  } catch (error) {
    resendSuccess.value = false;
    resendMessage.value =
      error.response?.data?.message || 'Email gönderilemedi. Lütfen daha sonra tekrar deneyin.';
  } finally {
    resending.value = false;
  }
};
</script>
