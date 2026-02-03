<template>
  <div class="w-full">
    <label v-if="label" class="block text-sm font-medium mb-1.5" :style="{ color: 'var(--text-primary)' }">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </label>
    <div class="relative">
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :class="inputClasses"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <div v-if="icon" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <span class="w-5 h-5" v-html="icon"></span>
      </div>
    </div>
    <p v-if="error" class="mt-1.5 text-sm" :style="{ color: 'var(--danger)' }">{{ error }}</p>
    <p v-if="hint && !error" class="mt-1.5 text-xs" :style="{ color: 'var(--text-muted)' }">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
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
  icon: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue'])

const inputClasses = computed(() => {
  const base = 'w-full border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed'

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  const states = props.error
    ? 'border-red-300 focus:ring-red-200 focus:border-red-500 bg-red-50'
    : props.disabled
      ? 'border-gray-200 bg-gray-100 text-gray-500'
      : 'border-gray-300 focus:ring-[color:var(--primary-light)] focus:border-[color:var(--primary)] bg-white hover:border-gray-400'

  const iconPadding = props.icon ? 'pl-10' : ''

  return [base, sizes[props.size], states, iconPadding]
})
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
