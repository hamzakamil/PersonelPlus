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

          <!-- Google ile Giriş -->
          <div class="relative my-4">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500">veya</span>
            </div>
          </div>

          <button
            type="button"
            @click="handleGoogleLogin"
            :disabled="googleLoading"
            class="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span class="text-sm font-medium text-gray-700">
              {{ googleLoading ? 'Giriş yapılıyor...' : 'Google ile Giriş Yap' }}
            </span>
          </button>

          <!-- Google Kayıt Mesajı -->
          <div v-if="googleMessage" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p class="text-blue-800 text-sm">{{ googleMessage }}</p>
          </div>

          <div class="text-center mt-4 pt-4 border-t border-gray-200">
            <span class="text-gray-600 text-sm">Hesabınız yok mu? </span>
            <router-link
              to="/register"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Üye Ol
            </router-link>
          </div>

          <div class="text-center mt-3">
            <router-link
              to="/privacy-policy"
              class="text-gray-400 hover:text-gray-600 text-xs transition-colors"
            >
              Gizlilik Politikası
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

const googleLoading = ref(false);
const googleMessage = ref('');

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
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

// Google GSI ile giriş
const loadGoogleScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    if (document.getElementById('google-gsi-script')) {
      const check = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error('Google GSI timeout')); }, 10000);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const check = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error('Google GSI timeout')); }, 5000);
    };
    script.onerror = () => reject(new Error('Google GSI script yüklenemedi'));
    document.head.appendChild(script);
  });
};

const handleGoogleLogin = async () => {
  if (!GOOGLE_CLIENT_ID) {
    error.value = 'Google giriş yapılandırması eksik';
    return;
  }

  googleLoading.value = true;
  googleMessage.value = '';
  error.value = '';

  try {
    await loadGoogleScript();

    // Google One Tap / popup ile credential al
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const result = await authStore.googleLogin(response.credential);

          if (result.success) {
            router.push('/');
          } else if (result.isNewUser) {
            googleMessage.value = result.message;
          } else {
            error.value = result.message;
          }
        } catch (err) {
          error.value = 'Google ile giriş sırasında hata oluştu';
        }
        googleLoading.value = false;
      },
    });

    // Popup açılması için prompt tetikle
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap gösterilemedi, manuel popup ile dene
        window.google.accounts.oauth2.initCodeClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          ux_mode: 'popup',
        });
        // Fallback: renderButton kullan
        googleLoading.value = false;
      }
    });
  } catch (err) {
    error.value = 'Google giriş servisi yüklenemedi';
    googleLoading.value = false;
  }
};

onBeforeUnmount(() => {
  clearInterval(rateLimitTimer);
  clearInterval(lockTimer);
});
</script>
