<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <!-- Logo -->
      <div class="flex flex-col items-center mb-6">
        <img src="/logo.svg" alt="PersonelPlus" class="h-24 w-auto" />
      </div>
      <h2 class="text-lg font-semibold text-center mb-6 text-gray-600">Üye Ol</h2>

      <!-- Başarılı kayıt mesajı -->
      <div v-if="success" class="text-center">
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <svg
            class="w-12 h-12 text-green-500 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <h3 class="text-lg font-medium text-green-800 mb-2">Kayıt Başarılı!</h3>
          <p class="text-sm text-green-700">{{ successMessage }}</p>
        </div>
        <router-link
          to="/login"
          class="inline-block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Giriş Sayfasına Dön
        </router-link>
      </div>

      <!-- Kayıt formu -->
      <form v-else @submit.prevent="handleRegister">
        <div class="space-y-4">
          <Input
            v-model="form.fullName"
            type="text"
            label="Ad Soyad"
            placeholder="Adınız ve soyadınız"
            required
          />
          <Input
            v-model="form.email"
            type="email"
            label="Email"
            placeholder="Email adresiniz"
            required
          />
          <Input v-model="form.phone" type="tel" label="Telefon" placeholder="5XX XXX XX XX" />
          <Input
            v-model="form.companyName"
            type="text"
            label="Firma Adı"
            placeholder="Şirketinizin adı"
            required
          />
          <Input
            v-model="form.password"
            type="password"
            label="Şifre"
            placeholder="En az 6 karakter"
            required
          />
          <Input
            v-model="form.passwordConfirm"
            type="password"
            label="Şifre Tekrar"
            placeholder="Şifrenizi tekrar girin"
            required
          />

          <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>

          <Button type="submit" :disabled="loading" class="w-full">
            {{ loading ? 'Kayıt yapılıyor...' : 'Üye Ol' }}
          </Button>

          <div class="text-center mt-4">
            <span class="text-gray-600 text-sm">Zaten hesabınız var mı? </span>
            <router-link to="/login" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Giriş Yap
            </router-link>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import Input from '@/components/Input.vue';
import Button from '@/components/Button.vue';
import api from '@/services/api';

const form = reactive({
  fullName: '',
  email: '',
  phone: '',
  companyName: '',
  password: '',
  passwordConfirm: '',
});

const error = ref('');
const loading = ref(false);
const success = ref(false);
const successMessage = ref('');

const handleRegister = async () => {
  error.value = '';

  // Validasyonlar
  if (form.password !== form.passwordConfirm) {
    error.value = 'Şifreler eşleşmiyor';
    return;
  }

  if (form.password.length < 6) {
    error.value = 'Şifre en az 6 karakter olmalıdır';
    return;
  }

  loading.value = true;

  try {
    const response = await api.post('/auth/register', {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      companyName: form.companyName,
      password: form.password,
    });

    if (response.data.success) {
      success.value = true;
      successMessage.value = response.data.message || 'Kayıt başarılı. Hesabınız onay bekliyor.';
    } else {
      error.value = response.data.message || 'Kayıt hatası';
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Kayıt hatası';
  }

  loading.value = false;
};
</script>
