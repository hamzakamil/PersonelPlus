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
            type="text"
            label="Email / TC Kimlik No / Telefon"
            placeholder="Email, TC Kimlik No veya Telefon"
            required
            :disabled="isLocked"
          />
          <Input
            v-model="password"
            type="password"
            label="Şifre"
            placeholder="Şifreniz"
            required
            :disabled="isLocked"
          />

          <!-- Şifremi Unuttum Linki -->
          <div class="flex justify-end -mt-1 mb-4">
            <router-link
              to="/forgot-password"
              class="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              Şifremi Unuttum?
            </router-link>
          </div>

          <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>

          <!-- Rate Limit Geri Sayım -->
          <div v-if="rateLimitCountdown > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p class="text-yellow-800 text-sm">
              Lütfen <strong>{{ rateLimitCountdown }}</strong> saniye bekleyip tekrar deneyin.
            </p>
          </div>

          <!-- Hesap Kilidi Geri Sayım -->
          <div v-if="isLocked" class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-red-800 text-sm">
              Hesabınız geçici olarak kilitlendi.
              <strong>{{ formatLockTime(lockCountdown) }}</strong> sonra tekrar deneyebilirsiniz.
            </p>
          </div>

          <!-- reCAPTCHA Widget -->
          <div v-if="showCaptcha && !isLocked" class="flex justify-center">
            <div ref="captchaContainer" id="recaptcha-container"></div>
          </div>

          <!-- Hesap Aktif Değil - Email Doğrulama -->
          <div v-if="showResendButton && activationMethod === 'email_verification'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p class="text-yellow-800 text-sm mb-2">Doğrulama emaili gelmemiş olabilir. Tekrar göndermek ister misiniz?</p>
            <button
              type="button"
              @click="resendVerification"
              :disabled="resendLoading"
              class="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {{ resendLoading ? 'Gönderiliyor...' : 'Aktivasyon Maili Tekrar Gönder' }}
            </button>
            <p v-if="resendMessage" class="text-sm mt-2" :class="resendSuccess ? 'text-green-600' : 'text-red-600'">{{ resendMessage }}</p>
          </div>

          <!-- Hesap Aktif Değil - Manuel Onay Bekleniyor -->
          <div v-if="showResendButton && activationMethod === 'manual_approval'" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div class="flex items-start mb-3">
              <svg class="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="text-blue-800 text-sm font-medium">Admin Onayı Bekleniyor</p>
                <p class="text-blue-700 text-sm mt-1">Kayıt talebiniz sistem yöneticisi tarafından inceleniyor. Onaylandıktan sonra giriş yapabileceksiniz.</p>
              </div>
            </div>
            <button
              type="button"
              @click="notifyAdmin"
              :disabled="notifyLoading"
              class="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg v-if="!notifyLoading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <svg
                v-if="notifyLoading"
                class="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ notifyLoading ? 'Gönderiliyor...' : 'Admin\'e Bildirim Gönder' }}
            </button>
            <p v-if="notifyMessage" class="text-sm mt-2" :class="notifySuccess ? 'text-green-600' : 'text-red-600'">{{ notifyMessage }}</p>
          </div>

          <Button
            type="submit"
            :disabled="loading || isLocked || rateLimitCountdown > 0 || (showCaptcha && !captchaToken)"
            class="w-full"
          >
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
import { ref, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';
import Input from '@/components/Input.vue';
import Button from '@/components/Button.vue';

const router = useRouter();
const authStore = useAuthStore();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const showResendButton = ref(false);
const activationMethod = ref(''); // 'email_verification', 'manual_approval', veya 'unknown'
const resendLoading = ref(false);
const resendSuccess = ref(false);
const resendMessage = ref('');
const notifyLoading = ref(false);
const notifySuccess = ref(false);
const notifyMessage = ref('');

// Brute-force koruma state
const showCaptcha = ref(false);
const captchaToken = ref(null);
const captchaContainer = ref(null);
const captchaWidgetId = ref(null);
const rateLimitCountdown = ref(0);
const isLocked = ref(false);
const lockCountdown = ref(0);

let rateLimitTimer = null;
let lockTimer = null;

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

// reCAPTCHA script'ini dinamik yükle
const loadRecaptchaScript = () => {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha && window.grecaptcha.render) {
      resolve();
      return;
    }
    if (document.getElementById('recaptcha-script')) {
      // Script zaten yükleniyor, onload'u bekle
      const checkInterval = setInterval(() => {
        if (window.grecaptcha && window.grecaptcha.render) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(checkInterval); reject(new Error('reCAPTCHA timeout')); }, 10000);
      return;
    }
    const script = document.createElement('script');
    script.id = 'recaptcha-script';
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    window.onRecaptchaLoad = () => resolve();
    script.onerror = () => reject(new Error('reCAPTCHA script yüklenemedi'));
    document.head.appendChild(script);
  });
};

// reCAPTCHA widget'ını render et
const renderCaptcha = async () => {
  if (!RECAPTCHA_SITE_KEY) {
    console.warn('VITE_RECAPTCHA_SITE_KEY ayarlanmamış, CAPTCHA atlanıyor');
    captchaToken.value = 'dev-bypass';
    return;
  }

  try {
    await loadRecaptchaScript();
    await nextTick();

    if (captchaWidgetId.value !== null && window.grecaptcha) {
      window.grecaptcha.reset(captchaWidgetId.value);
      captchaToken.value = null;
    } else if (captchaContainer.value && window.grecaptcha) {
      captchaWidgetId.value = window.grecaptcha.render(captchaContainer.value, {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (token) => { captchaToken.value = token; },
        'expired-callback': () => { captchaToken.value = null; },
        'error-callback': () => { captchaToken.value = null; },
      });
    }
  } catch (err) {
    console.error('reCAPTCHA render hatası:', err);
    // CAPTCHA yüklenemezse bypass et
    captchaToken.value = 'load-error-bypass';
  }
};

// Rate limit geri sayım başlat
const startRateLimitCountdown = (seconds) => {
  rateLimitCountdown.value = seconds;
  clearInterval(rateLimitTimer);
  rateLimitTimer = setInterval(() => {
    rateLimitCountdown.value--;
    if (rateLimitCountdown.value <= 0) {
      clearInterval(rateLimitTimer);
    }
  }, 1000);
};

// Hesap kilidi geri sayım başlat
const startLockCountdown = (seconds) => {
  isLocked.value = true;
  lockCountdown.value = seconds;
  clearInterval(lockTimer);
  lockTimer = setInterval(() => {
    lockCountdown.value--;
    if (lockCountdown.value <= 0) {
      clearInterval(lockTimer);
      isLocked.value = false;
    }
  }, 1000);
};

// Kilit süresini formatla
const formatLockTime = (seconds) => {
  if (seconds <= 0) return '0 saniye';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins} dakika ${secs} saniye`;
  return `${secs} saniye`;
};

const handleLogin = async () => {
  error.value = '';
  showResendButton.value = false;
  activationMethod.value = '';
  resendMessage.value = '';
  resendSuccess.value = false;
  notifyMessage.value = '';
  notifySuccess.value = false;
  loading.value = true;

  try {
    const result = await authStore.login(email.value, password.value, captchaToken.value);

    if (result.success) {
      // Başarılı giriş - state temizle
      showCaptcha.value = false;
      captchaToken.value = null;

      if (authStore.user?.mustChangePassword || result.requiresPasswordSetup) {
        // Employee rolü ise Hesabım sayfasına yönlendir
        const role = authStore.user?.role?.name || authStore.user?.role;
        if (role === 'employee') {
          router.push('/my-account');
        } else {
          router.push('/settings?changePassword=true');
        }
      } else {
        router.push('/');
      }
    } else {
      error.value = result.message || 'Giriş hatası';

      switch (result.errorCode) {
        case 'ACCOUNT_INACTIVE':
          showResendButton.value = true;
          activationMethod.value = result.data?.activationMethod || 'unknown';
          break;

        case 'LOGIN_RATE_LIMITED':
          if (result.data?.retryAfter) {
            startRateLimitCountdown(result.data.retryAfter);
          }
          break;

        case 'LOGIN_CAPTCHA_REQUIRED':
          showCaptcha.value = true;
          captchaToken.value = null;
          await nextTick();
          renderCaptcha();
          break;

        case 'LOGIN_ACCOUNT_LOCKED':
          if (result.data?.remainingSeconds) {
            startLockCountdown(result.data.remainingSeconds);
          }
          showCaptcha.value = false;
          break;
      }
    }
  } catch (err) {
    error.value = err.message || 'Giriş hatası';
  }

  loading.value = false;
};

const resendVerification = async () => {
  resendLoading.value = true;
  resendMessage.value = '';
  resendSuccess.value = false;

  try {
    const response = await api.post('/auth/resend-verification', { email: email.value });
    resendSuccess.value = true;
    resendMessage.value = response.data?.message || 'Doğrulama emaili tekrar gönderildi.';
  } catch (err) {
    resendSuccess.value = false;
    resendMessage.value = err.response?.data?.message || 'Email gönderilemedi. Lütfen daha sonra tekrar deneyin.';
  }

  resendLoading.value = false;
};

const notifyAdmin = async () => {
  notifyLoading.value = true;
  notifyMessage.value = '';
  notifySuccess.value = false;

  try {
    const response = await api.post('/auth/notify-admin', { email: email.value });
    notifySuccess.value = true;
    notifyMessage.value = response.data?.message || 'Admin\'e bildirim gönderildi.';
  } catch (err) {
    notifySuccess.value = false;
    notifyMessage.value = err.response?.data?.message || 'Bildirim gönderilemedi. Lütfen daha sonra tekrar deneyin.';
  }

  notifyLoading.value = false;
};

onBeforeUnmount(() => {
  clearInterval(rateLimitTimer);
  clearInterval(lockTimer);
});
</script>
