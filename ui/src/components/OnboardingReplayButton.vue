<template>
  <button
    v-if="showButton"
    @click="handleReplay"
    class="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl
           bg-blue-600 text-white shadow-lg transition-all duration-300
           hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5
           text-sm font-medium"
    title="Tanıtım turunu tekrar başlat"
  >
    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003
           8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
    <span>Turu Tekrar İzle</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useOnboarding } from '@/onboarding'
import { useOnboardingStore } from '@/stores/onboarding'

const route = useRoute()
const { replayTour, hasTourAvailable } = useOnboarding()
const onboardingStore = useOnboardingStore()

const showButton = computed(() => {
  return route.path === '/' && hasTourAvailable() && !onboardingStore.isActive
})

const handleReplay = () => {
  replayTour()
}
</script>
