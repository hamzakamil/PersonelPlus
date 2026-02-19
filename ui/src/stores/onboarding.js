import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export const useOnboardingStore = defineStore('onboarding', () => {
  const authStore = useAuthStore()

  // State
  const completedTours = ref({})
  const skippedTours = ref({})
  const isActive = ref(false)
  const currentTourId = ref(null)

  // Storage key (kullanıcı bazlı)
  const storagePrefix = computed(() => {
    const userId = authStore.user?._id || authStore.user?.id || 'anonymous'
    return `pp_onboarding_${userId}`
  })

  const isTourCompleted = (tourId) => completedTours.value[tourId] === true
  const isTourSkipped = (tourId) => skippedTours.value[tourId] === true
  const shouldShowTour = (tourId) => !isTourCompleted(tourId) && !isTourSkipped(tourId)

  const loadState = () => {
    try {
      const stored = localStorage.getItem(storagePrefix.value)
      if (stored) {
        const parsed = JSON.parse(stored)
        completedTours.value = parsed.completedTours || {}
        skippedTours.value = parsed.skippedTours || {}
      }
    } catch {
      // localStorage erişilemezse sessizce devam et
    }
  }

  const saveState = () => {
    try {
      localStorage.setItem(storagePrefix.value, JSON.stringify({
        completedTours: completedTours.value,
        skippedTours: skippedTours.value
      }))
    } catch {
      // Sessizce devam et
    }
  }

  const completeTour = (tourId) => {
    completedTours.value[tourId] = true
    isActive.value = false
    currentTourId.value = null
    saveState()
  }

  const skipTour = (tourId) => {
    skippedTours.value[tourId] = true
    isActive.value = false
    currentTourId.value = null
    saveState()
  }

  const startTour = (tourId) => {
    isActive.value = true
    currentTourId.value = tourId
  }

  const resetTour = (tourId) => {
    delete completedTours.value[tourId]
    delete skippedTours.value[tourId]
    saveState()
  }

  return {
    completedTours,
    skippedTours,
    isActive,
    currentTourId,
    isTourCompleted,
    isTourSkipped,
    shouldShowTour,
    loadState,
    completeTour,
    skipTour,
    startTour,
    resetTour
  }
})
