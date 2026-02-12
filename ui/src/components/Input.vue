<template>
  <div class="w-full">
    <label
      v-if="label"
      class="block text-sm font-medium mb-1.5"
      :style="{ color: 'var(--text-primary)' }"
    >
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </label>
    <div class="relative">
      <input
        :type="isPassword ? (showPassword ? 'text' : 'password') : type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :class="inputClasses"
        @input="
          emit(
            'update:modelValue',
            props.uppercase ? $event.target.value.toLocaleUpperCase('tr-TR') : $event.target.value
          )
        "
      />
      <div v-if="icon" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <span class="w-5 h-5" v-html="icon"></span>
      </div>
      <button
        v-if="isPassword"
        type="button"
        tabindex="-1"
        @click="showPassword = !showPassword"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <svg
          v-if="!showPassword"
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
          />
        </svg>
      </button>
    </div>
    <p v-if="error" class="mt-1.5 text-sm" :style="{ color: 'var(--danger)' }">{{ error }}</p>
    <p v-if="hint && !error" class="mt-1.5 text-xs" :style="{ color: 'var(--text-muted)' }">
      {{ hint }}
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  uppercase: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
    validator: value => ['sm', 'md', 'lg'].includes(value),
  },
});

const emit = defineEmits(['update:modelValue']);

const showPassword = ref(false);
const isPassword = computed(() => props.type === 'password');

const inputClasses = computed(() => {
  const base =
    'w-full border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  const states = props.error
    ? 'border-red-300 focus:ring-red-200 focus:border-red-500 bg-red-50'
    : props.disabled
      ? 'border-gray-200 bg-gray-100 text-gray-500'
      : 'border-gray-300 focus:ring-[color:var(--primary-light)] focus:border-[color:var(--primary)] bg-white hover:border-gray-400';

  const iconPadding = props.icon ? 'pl-10' : '';
  const passwordPadding = isPassword.value ? 'pr-10' : '';

  return [base, sizes[props.size], states, iconPadding, passwordPadding];
});
</script>

<style scoped>
input::placeholder {
  color: var(--text-muted);
}

input:focus {
  box-shadow: 0 0 0 3px var(--primary-light);
  border-color: var(--primary);
}
</style>
