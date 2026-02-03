<template>
  <div>
    <label v-if="label" class="block font-medium text-gray-700 mb-1" :class="compact ? 'text-[11px] uppercase tracking-wide font-semibold' : 'text-sm'">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
        <span class="text-gray-500 text-xs">🇹🇷</span>
      </div>
      <input
        type="tel"
        :value="displayValue"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        maxlength="14"
        class="w-full pl-8 pr-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        :class="[
          compact ? 'py-1.5 text-sm rounded' : 'py-2 rounded-lg',
          error ? 'border-red-500' : ''
        ]"
        inputmode="numeric"
        autocomplete="tel"
      />
    </div>
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-gray-500">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '5XX XXX XX XX'
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'valid', 'invalid'])

// Internal display value (formatted for user)
const displayValue = ref('')
const isFocused = ref(false)

/**
 * Telefon numarasını normalize eder
 * Tüm formatları kabul eder: 05XX, 5XX, +905XX, 905XX, boşluklu vs.
 * Çıktı: 05XXXXXXXXX (11 hane, sadece rakam)
 */
const normalizePhone = (input) => {
  if (!input) return ''

  // 1. Tüm non-digit karakterleri temizle
  let digits = input.replace(/\D/g, '')

  // 2. Boşsa dön
  if (!digits) return ''

  // 3. +90 veya 90 prefix'i varsa kaldır (Türkiye kodu)
  // 90 ile başlıyorsa ve 12 haneden fazlaysa veya tam 12 hane ise
  if (digits.startsWith('90') && digits.length >= 12) {
    digits = digits.substring(2)
  }

  // 4. 905 ile başlıyorsa (kullanıcı 905 yazdıysa) - 90'ı kaldır
  if (digits.startsWith('905') && digits.length >= 12) {
    digits = digits.substring(2)
  }

  // 5. 5 ile başlıyorsa başına 0 ekle
  if (digits.startsWith('5') && !digits.startsWith('05')) {
    digits = '0' + digits
  }

  // 6. 05 ile başlamıyorsa ve 10 haneden fazlaysa, muhtemelen yanlış format
  // Ama yine de kabul et, sadece ilk 11 haneyi al
  if (digits.startsWith('05')) {
    digits = digits.substring(0, 11)
  } else if (digits.startsWith('5')) {
    // Zaten yukarıda 0 ekledik, bu duruma düşmemeli
    digits = '0' + digits.substring(0, 10)
  }

  return digits
}

/**
 * Normalize edilmiş numarayı görsel formata çevirir
 * Giriş: 05XXXXXXXXX
 * Çıkış: 05XX XXX XX XX
 */
const formatForDisplay = (normalized) => {
  if (!normalized) return ''

  // Sadece rakamları al
  const digits = normalized.replace(/\D/g, '')

  if (digits.length === 0) return ''

  // Format: 05XX XXX XX XX
  let formatted = ''

  if (digits.length > 0) {
    formatted = digits.substring(0, 4) // 05XX
  }
  if (digits.length > 4) {
    formatted += ' ' + digits.substring(4, 7) // XXX
  }
  if (digits.length > 7) {
    formatted += ' ' + digits.substring(7, 9) // XX
  }
  if (digits.length > 9) {
    formatted += ' ' + digits.substring(9, 11) // XX
  }

  return formatted
}

/**
 * Telefon numarasının geçerli olup olmadığını kontrol eder
 */
const isValidPhone = (normalized) => {
  if (!normalized) return false
  const digits = normalized.replace(/\D/g, '')
  // Türk cep telefonu: 05XX XXX XX XX (11 hane, 05 ile başlamalı)
  return digits.length === 11 && digits.startsWith('05')
}

// Input handler - kullanıcı yazarken
const handleInput = (event) => {
  const rawValue = event.target.value

  // Kullanıcının yazdığı değeri normalize et
  const normalized = normalizePhone(rawValue)

  // Display değerini güncelle (formatlı)
  if (isFocused.value) {
    // Focus'tayken daha az agresif formatlama
    // Kullanıcının yazmasına izin ver
    const digits = rawValue.replace(/\D/g, '')

    // Eğer 90 ile başlıyorsa ve devam ediyorsa, henüz formatlama
    if (digits.startsWith('90') && digits.length < 12) {
      displayValue.value = rawValue
    } else {
      displayValue.value = formatForDisplay(normalized)
    }
  } else {
    displayValue.value = formatForDisplay(normalized)
  }

  // Emit normalized value (sadece rakamlar, 05XXXXXXXXX formatında)
  emit('update:modelValue', normalized)

  // Validation event
  if (isValidPhone(normalized)) {
    emit('valid', normalized)
  } else if (normalized.length > 0) {
    emit('invalid', normalized)
  }
}

// Blur handler - input'tan çıkınca
const handleBlur = () => {
  isFocused.value = false

  // Blur'da kesin formatlama uygula
  const normalized = normalizePhone(displayValue.value)
  displayValue.value = formatForDisplay(normalized)
  emit('update:modelValue', normalized)
}

// Focus handler
const handleFocus = () => {
  isFocused.value = true
}

// Watch for external modelValue changes
watch(() => props.modelValue, (newValue) => {
  if (!isFocused.value) {
    const normalized = normalizePhone(newValue)
    displayValue.value = formatForDisplay(normalized)
  }
}, { immediate: true })
</script>
