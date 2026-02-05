<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-gray-900">{{ title }}</h2>
        <button @click="close" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <p v-if="description" class="text-gray-600 mb-4 text-sm">{{ description }}</p>

      <!-- SMS Gonderme Asamasi -->
      <div v-if="step === 'send'" class="space-y-4">
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="flex items-center">
            <svg
              class="w-5 h-5 text-blue-600 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span class="text-sm text-blue-700">Dogrulama kodu telefonunuza gonderilecektir.</span>
          </div>
        </div>

        <button
          @click="sendCode"
          :disabled="sending || resendCountdown > 0"
          class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="sending" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            SMS Gonderiliyor...
          </span>
          <span v-else-if="resendCountdown > 0"> Yeniden gonder ({{ resendCountdown }}s) </span>
          <span v-else> SMS Gonder </span>
        </button>
      </div>

      <!-- Kod Dogrulama Asamasi -->
      <div v-else-if="step === 'verify'" class="space-y-4">
        <div class="bg-green-50 rounded-lg p-4">
          <div class="flex items-center">
            <svg
              class="w-5 h-5 text-green-600 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span class="text-sm text-green-700">
              Kod {{ maskedPhone }} numarasina gonderildi
            </span>
          </div>
        </div>

        <!-- OTP Giris Alanlari -->
        <div class="flex justify-center gap-2">
          <input
            v-for="(digit, index) in 6"
            :key="index"
            :ref="
              el => {
                otpInputs[index] = el;
              }
            "
            v-model="otpDigits[index]"
            type="text"
            inputmode="numeric"
            maxlength="1"
            class="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            @input="handleInput(index, $event)"
            @keydown="handleKeydown(index, $event)"
            @paste="handlePaste($event)"
          />
        </div>

        <!-- Kalan Sure -->
        <div v-if="expiresIn > 0" class="text-center text-sm text-gray-500">
          Kod gecerliligi: {{ formatTime(expiresIn) }}
        </div>
        <div v-else class="text-center text-sm text-red-600">
          Kodun suresi doldu. Yeni kod isteyin.
        </div>

        <!-- Dogrula Butonu -->
        <button
          @click="verifyCode"
          :disabled="verifying || otpCode.length !== 6"
          class="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="verifying" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Dogrulanıyor...
          </span>
          <span v-else>Dogrula</span>
        </button>

        <!-- Yeniden Gonder -->
        <div class="text-center">
          <button
            @click="sendCode"
            :disabled="sending || resendCountdown > 0"
            class="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <span v-if="resendCountdown > 0"> Yeniden gonder ({{ resendCountdown }}s) </span>
            <span v-else>Yeni kod gonder</span>
          </button>
        </div>
      </div>

      <!-- Hata Mesaji -->
      <div v-if="error" class="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'SMS Dogrulama',
  },
  description: {
    type: String,
    default: '',
  },
  sendCodeFn: {
    type: Function,
    required: true,
  },
  verifyCodeFn: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['close', 'verified', 'error']);

const step = ref('send');
const sending = ref(false);
const verifying = ref(false);
const error = ref('');
const verificationId = ref(null);
const maskedPhone = ref('');
const expiresAt = ref(null);
const expiresIn = ref(0);
const resendCountdown = ref(0);
const otpDigits = ref(['', '', '', '', '', '']);
const otpInputs = ref([]);

let expiryTimer = null;
let resendTimer = null;

const otpCode = computed(() => otpDigits.value.join(''));

const formatTime = seconds => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const startExpiryTimer = () => {
  if (expiryTimer) clearInterval(expiryTimer);
  if (!expiresAt.value) return;

  const updateExpiry = () => {
    const now = Date.now();
    const expires = new Date(expiresAt.value).getTime();
    expiresIn.value = Math.max(0, Math.floor((expires - now) / 1000));

    if (expiresIn.value <= 0) {
      clearInterval(expiryTimer);
    }
  };

  updateExpiry();
  expiryTimer = setInterval(updateExpiry, 1000);
};

const startResendCountdown = () => {
  resendCountdown.value = 60;
  if (resendTimer) clearInterval(resendTimer);

  resendTimer = setInterval(() => {
    resendCountdown.value--;
    if (resendCountdown.value <= 0) {
      clearInterval(resendTimer);
    }
  }, 1000);
};

const sendCode = async () => {
  error.value = '';
  sending.value = true;

  try {
    const result = await props.sendCodeFn();
    verificationId.value = result.verificationId;
    maskedPhone.value = result.maskedPhone;
    expiresAt.value = result.expiresAt;
    step.value = 'verify';
    startExpiryTimer();
    startResendCountdown();
    otpDigits.value = ['', '', '', '', '', ''];
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'SMS gonderilemedi';
    emit('error', error.value);
  } finally {
    sending.value = false;
  }
};

const verifyCode = async () => {
  if (otpCode.value.length !== 6) return;

  error.value = '';
  verifying.value = true;

  try {
    const result = await props.verifyCodeFn(otpCode.value, verificationId.value);
    emit('verified', result);
    close();
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Dogrulama basarisiz';
    // Hatali giris sonrasi alanlari temizle
    otpDigits.value = ['', '', '', '', '', ''];
    if (otpInputs.value[0]) {
      otpInputs.value[0].focus();
    }
  } finally {
    verifying.value = false;
  }
};

const handleInput = (index, event) => {
  const value = event.target.value.replace(/\D/g, '');
  otpDigits.value[index] = value.slice(-1);

  // Sonraki alana gec
  if (value && index < 5) {
    otpInputs.value[index + 1]?.focus();
  }
};

const handleKeydown = (index, event) => {
  // Backspace ile onceki alana gec
  if (event.key === 'Backspace' && !otpDigits.value[index] && index > 0) {
    otpInputs.value[index - 1]?.focus();
  }
};

const handlePaste = event => {
  event.preventDefault();
  const paste = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);

  paste.split('').forEach((char, index) => {
    if (index < 6) {
      otpDigits.value[index] = char;
    }
  });

  // Son dolu alana fokusla
  const lastFilledIndex = Math.min(paste.length, 5);
  otpInputs.value[lastFilledIndex]?.focus();
};

const close = () => {
  step.value = 'send';
  error.value = '';
  otpDigits.value = ['', '', '', '', '', ''];
  verificationId.value = null;
  emit('close');
};

watch(
  () => props.show,
  newVal => {
    if (newVal) {
      step.value = 'send';
      error.value = '';
      otpDigits.value = ['', '', '', '', '', ''];
    }
  }
);

onUnmounted(() => {
  if (expiryTimer) clearInterval(expiryTimer);
  if (resendTimer) clearInterval(resendTimer);
});
</script>
