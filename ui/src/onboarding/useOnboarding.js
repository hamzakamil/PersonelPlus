import { nextTick } from 'vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useAuthStore } from '@/stores/auth'
import { useOnboardingStore } from '@/stores/onboarding'
import { baseDriverConfig } from './driverConfig'

// Tur tanımları registry
import * as superAdminTour from './tours/superAdminTour'
import * as bayiAdminTour from './tours/bayiAdminTour'
import * as companyAdminTour from './tours/companyAdminTour'
import * as employeeTour from './tours/employeeTour'

const tourRegistry = {
  super_admin: superAdminTour,
  bayi_admin: bayiAdminTour,
  company_admin: companyAdminTour,
  resmi_muhasebe_ik: companyAdminTour,
  employee: employeeTour
}

let driverInstance = null

export function useOnboarding() {
  const authStore = useAuthStore()
  const onboardingStore = useOnboardingStore()

  // Mevcut rol için tur modülünü getir
  const getTourForRole = () => {
    const role = authStore.roleName
    return tourRegistry[role] || null
  }

  // Dashboard onMounted'dan çağrılır
  const initOnboarding = async () => {
    onboardingStore.loadState()

    const tourModule = getTourForRole()
    if (!tourModule) return

    const tourId = tourModule.TOUR_ID
    if (!onboardingStore.shouldShowTour(tourId)) return

    // DOM'un tamamen render olmasını bekle
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 800))

    startTour(tourModule)
  }

  // Belirli bir turu başlat
  const startTour = (tourModule) => {
    const tourId = tourModule.TOUR_ID
    const steps = tourModule.getSteps()

    if (driverInstance) {
      driverInstance.destroy()
    }

    onboardingStore.startTour(tourId)

    driverInstance = driver({
      ...baseDriverConfig,
      steps,
      onDestroyStarted: () => {
        if (driverInstance.hasNextStep()) {
          // Tur atlandı (tamamlanmadan kapatıldı)
          onboardingStore.skipTour(tourId)
        } else {
          // Son adımdayken kapatıldı = tamamlandı
          onboardingStore.completeTour(tourId)
        }
        driverInstance.destroy()
      },
      onDestroyed: () => {
        driverInstance = null
      }
    })

    driverInstance.drive()
  }

  // Turu tekrar başlat
  const replayTour = async () => {
    const tourModule = getTourForRole()
    if (!tourModule) return

    onboardingStore.resetTour(tourModule.TOUR_ID)

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 300))

    startTour(tourModule)
  }

  // Mevcut rol için tur var mı
  const hasTourAvailable = () => !!getTourForRole()

  // Aktif turu temizle
  const destroyTour = () => {
    if (driverInstance) {
      driverInstance.destroy()
      driverInstance = null
    }
  }

  return {
    initOnboarding,
    replayTour,
    hasTourAvailable,
    destroyTour
  }
}
