<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <!-- Logo -->
      <div class="flex flex-col items-center mb-6">
        <img src="/logo.svg" alt="PersonelPlus" class="h-24 w-auto" />
      </div>
      <h2 class="text-lg font-semibold text-center mb-6 text-gray-600">Giriş Yap</h2>
      <form @submit.prevent="handleLogin">
        <div class="space-y-4">
          <Input
            v-model="email"
            type="email"
            label="Email"
            placeholder="Email adresiniz"
            required
          />
          <Input v-model="password" type="password" label="Şifre" placeholder="Şifreniz" required />
          <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
          <Button type="submit" :disabled="loading" class="w-full">
            {{ loading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}
          </Button>

          <div class="text-center mt-4 pt-4 border-t border-gray-200">
            <span class="text-gray-600 text-sm">Hesabınız yok mu? </span>
            <router-link
              to="/register"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Üye Ol
            </router-link>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Input from '@/components/Input.vue';
import Button from '@/components/Button.vue';

const router = useRouter();
const authStore = useAuthStore();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const handleLogin = async () => {
  error.value = '';
  loading.value = true;

  try {
    const result = await authStore.login(email.value, password.value);

    if (result.success) {
      // İlk girişte şifre belirleme zorunlu ise ayarlar sayfasına yönlendir
      if (authStore.user?.mustChangePassword || result.requiresPasswordSetup) {
        router.push('/settings?changePassword=true');
      } else {
        router.push('/');
      }
    } else {
      error.value = result.message || 'Giriş hatası';
    }
  } catch (err) {
    error.value = err.message || 'Giriş hatası';
  }

  loading.value = false;
};
</script>
