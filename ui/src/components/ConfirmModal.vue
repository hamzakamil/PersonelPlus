<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="confirmStore.isOpen"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        @click.self="confirmStore.cancel"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
          <!-- Icon Header -->
          <div class="pt-6 pb-2 flex justify-center">
            <div
              class="w-16 h-16 rounded-full flex items-center justify-center"
              :class="iconBgClass"
            >
              <!-- Warning Icon -->
              <svg v-if="confirmStore.type === 'warning'" class="w-8 h-8" :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <!-- Danger Icon -->
              <svg v-else-if="confirmStore.type === 'danger'" class="w-8 h-8" :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <!-- Info Icon -->
              <svg v-else-if="confirmStore.type === 'info'" class="w-8 h-8" :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <!-- Success Icon -->
              <svg v-else class="w-8 h-8" :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <!-- Content -->
          <div class="px-6 py-4 text-center">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {{ confirmStore.title }}
            </h3>
            <p class="text-sm text-gray-600 whitespace-pre-line">
              {{ confirmStore.message }}
            </p>
          </div>

          <!-- Actions -->
          <div class="px-6 pb-6 flex gap-3">
            <button
              @click="confirmStore.cancel"
              class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              {{ confirmStore.cancelText }}
            </button>
            <button
              @click="confirmStore.confirm"
              class="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2"
              :class="confirmButtonClass"
            >
              {{ confirmStore.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useConfirmStore } from '@/stores/confirm'

const confirmStore = useConfirmStore()

const iconBgClass = computed(() => {
  switch (confirmStore.type) {
    case 'danger':
      return 'bg-red-100'
    case 'warning':
      return 'bg-amber-100'
    case 'info':
      return 'bg-blue-100'
    case 'success':
      return 'bg-green-100'
    default:
      return 'bg-amber-100'
  }
})

const iconClass = computed(() => {
  switch (confirmStore.type) {
    case 'danger':
      return 'text-red-600'
    case 'warning':
      return 'text-amber-600'
    case 'info':
      return 'text-blue-600'
    case 'success':
      return 'text-green-600'
    default:
      return 'text-amber-600'
  }
})

const confirmButtonClass = computed(() => {
  switch (confirmStore.type) {
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-200'
    case 'warning':
      return 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-200'
    case 'info':
      return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200'
    case 'success':
      return 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-200'
    default:
      return 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-200'
  }
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9);
}
</style>
