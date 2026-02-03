<template>
  <div v-if="settings?.enabled" class="bg-white rounded-lg shadow p-6 mb-6">
    <h2 class="text-lg font-semibold text-gray-800 mb-4">İşe Giriş/Çıkış</h2>
    <div v-if="loading" class="text-center py-4">
      <p class="text-gray-500">Yükleniyor...</p>
    </div>
    <div v-else-if="todayCheckIn" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-600">Giriş Zamanı</p>
          <p class="text-lg font-semibold text-gray-800">
            {{ formatTime(todayCheckIn.checkInTime) }}
          </p>
        </div>
        <div v-if="todayCheckIn.checkOutTime">
          <p class="text-sm text-gray-600">Çıkış Zamanı</p>
          <p class="text-lg font-semibold text-gray-800">
            {{ formatTime(todayCheckIn.checkOutTime) }}
          </p>
        </div>
      </div>
      <div v-if="!todayCheckIn.checkOutTime" class="flex justify-center">
        <Button
          @click="handleCheckOut"
          variant="danger"
          :disabled="checkingOut"
        >
          {{ checkingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap' }}
        </Button>
      </div>
    </div>
    <div v-else class="flex justify-center">
      <Button
        @click="handleCheckIn"
        variant="primary"
        :disabled="checkingIn"
      >
        {{ checkingIn ? 'Giriş yapılıyor...' : 'İşe Giriş Yap' }}
      </Button>
    </div>
    <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-sm text-red-800">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import Button from '@/components/Button.vue'

const settings = ref(null)
const todayCheckIn = ref(null)
const loading = ref(true)
const checkingIn = ref(false)
const checkingOut = ref(false)
const error = ref('')

const loadTodayStatus = async () => {
  try {
    loading.value = true
    error.value = ''
    const response = await api.get('/check-ins/today')
    settings.value = response.data.settings
    todayCheckIn.value = response.data.checkIn
  } catch (err) {
    console.error('Durum yüklenemedi:', err)
    error.value = err.response?.data?.message || 'Durum yüklenemedi'
  } finally {
    loading.value = false
  }
}

const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tarayıcınız konum özelliğini desteklemiyor'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Try to get address from coordinates (optional)
        let address = null
        try {
          // You could use a geocoding API here if needed
          address = `${position.coords.latitude}, ${position.coords.longitude}`
        } catch (err) {
          // Ignore geocoding errors
        }

        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address
        })
      },
      (err) => {
        reject(err)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

const handleCheckIn = async () => {
  try {
    checkingIn.value = true
    error.value = ''

    let location = null
    if (settings.value?.locationRequired) {
      try {
        location = await getCurrentLocation()
      } catch (err) {
        error.value = 'Konum izni verilmedi veya konum alınamadı. Lütfen tarayıcı ayarlarından konum izni verin.'
        checkingIn.value = false
        return
      }

      // Check location before checking in
      try {
        const locationCheck = await api.post('/check-ins/check-location', {
          latitude: location.latitude,
          longitude: location.longitude
        })

        if (!locationCheck.data.isWithinRadius) {
          error.value = locationCheck.data.message
          checkingIn.value = false
          return
        }
      } catch (err) {
        error.value = err.response?.data?.message || 'Lokasyon kontrolü başarısız'
        checkingIn.value = false
        return
      }
    }

    await api.post('/check-ins/check-in', {
      latitude: location?.latitude,
      longitude: location?.longitude,
      address: location?.address
    })

    await loadTodayStatus()
  } catch (err) {
    error.value = err.response?.data?.message || 'Giriş yapılamadı'
  } finally {
    checkingIn.value = false
  }
}

const handleCheckOut = async () => {
  try {
    checkingOut.value = true
    error.value = ''

    let location = null
    if (settings.value?.locationRequired) {
      try {
        location = await getCurrentLocation()
      } catch (err) {
        error.value = 'Konum izni verilmedi veya konum alınamadı. Lütfen tarayıcı ayarlarından konum izni verin.'
        checkingOut.value = false
        return
      }

      // Check location before checking out
      try {
        const locationCheck = await api.post('/check-ins/check-location', {
          latitude: location.latitude,
          longitude: location.longitude
        })

        if (!locationCheck.data.isWithinRadius) {
          error.value = locationCheck.data.message
          checkingOut.value = false
          return
        }
      } catch (err) {
        error.value = err.response?.data?.message || 'Lokasyon kontrolü başarısız'
        checkingOut.value = false
        return
      }
    }

    await api.post('/check-ins/check-out', {
      latitude: location?.latitude,
      longitude: location?.longitude,
      address: location?.address
    })

    await loadTodayStatus()
  } catch (err) {
    error.value = err.response?.data?.message || 'Çıkış yapılamadı'
  } finally {
    checkingOut.value = false
  }
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  loadTodayStatus()
})
</script>






