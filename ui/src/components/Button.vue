<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="buttonClasses"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'danger', 'success', 'accent', 'ghost'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['xs', 'sm', 'md', 'lg'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const buttonClasses = computed(() => {
  const base = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

  // Size classes
  const sizes = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  // Variant classes with theme-aware colors
  const variants = {
    primary: 'theme-btn-primary focus:ring-[var(--primary)]',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400',
    danger: 'bg-[var(--danger)] text-white hover:opacity-90 focus:ring-[var(--danger)]',
    success: 'bg-[var(--success)] text-white hover:opacity-90 focus:ring-[var(--success)]',
    accent: 'theme-btn-accent focus:ring-[var(--accent)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-gray-100 focus:ring-gray-400'
  }

  return [base, sizes[props.size], variants[props.variant]]
})
</script>

<style scoped>
.theme-btn-primary {
  background-color: var(--primary);
  color: white;
}

.theme-btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.theme-btn-accent {
  background-color: var(--accent);
  color: white;
}

.theme-btn-accent:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
