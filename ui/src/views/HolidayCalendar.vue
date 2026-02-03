<template>
  <div class="p-6">
    <div class="bg-white rounded-lg shadow p-6">
      <!-- Yıl ve Ay Seçimi -->
      <div class="flex flex-wrap gap-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Yıl Seçiniz
          </label>
          <select
            v-model="selectedYear"
            @change="handleYearChange"
            class="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="year in availableYears" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Ay Seçiniz
          </label>
          <select
            v-model="selectedMonth"
            @change="handleMonthChange"
            class="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="(month, index) in months" :key="index" :value="index">
              {{ month }}
            </option>
          </select>
        </div>
      </div>

      <!-- Loading States -->
      <div v-if="loadingGoogleHolidays" class="text-center py-8">
        <p class="text-gray-500">Yükleniyor...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        <p class="font-medium">Hata:</p>
        <p>{{ error }}</p>
      </div>

      <!-- Takvim Görünümü -->
      <div v-else>
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-800">
            {{ months[selectedMonth] }} {{ selectedYear }}
          </h2>
          <div class="flex gap-2">
            <button @click="prevMonth" class="px-3 py-1 border rounded-lg hover:bg-gray-50">
              ←
            </button>
            <button @click="nextMonth" class="px-3 py-1 border rounded-lg hover:bg-gray-50">
              →
            </button>
          </div>
        </div>

        <div class="grid grid-cols-7 gap-2 mb-4">
          <div
            v-for="day in ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']"
            :key="day"
            class="text-center text-sm font-semibold text-gray-600 py-2"
          >
            {{ day }}
          </div>
        </div>

        <div class="grid grid-cols-7 gap-2">
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            :class="[
              'p-2 text-center rounded-lg border transition-colors min-h-24 flex flex-col relative',
              day.isCurrentMonth
                ? day.isWeekend
                  ? 'bg-gray-100 text-gray-500 border-gray-200'
                  : 'bg-white border-gray-200 text-gray-800'
                : 'bg-gray-50 text-gray-400 border-gray-100',
              day.isToday ? 'ring-2 ring-blue-500' : ''
            ]"
            :title="getDayTooltip(day)"
          >
            <!-- Çapraz Bölünmüş Arka Plan için Yarım Gün Overlay -->
            <div 
              v-if="day.isGoogleHoliday && day.isHalfDay"
              :class="getHalfDayOverlayClass(day.holidayType)"
              class="absolute inset-0 rounded-lg overflow-hidden z-0"
            >
              <div class="half-day-diagonal"></div>
            </div>
            
            <!-- Tam Gün Tatil Arka Planı -->
            <div 
              v-else-if="day.isGoogleHoliday && !day.isHalfDay"
              :class="getFullDayBackgroundClass(day.holidayType)"
              class="absolute inset-0 rounded-lg z-0"
            ></div>

            <!-- Gün Numarası -->
            <div class="text-sm font-medium mb-1 z-10 relative">
              {{ day.day }}
              <span v-if="day.isToday" class="ml-1 text-xs text-blue-600">●</span>
            </div>
            
            <!-- Tatil İsmi -->
            <div v-if="day.isGoogleHoliday" class="flex-1 flex flex-col justify-center z-10 relative">
              <div class="text-xs font-semibold mb-1 px-1 py-0.5 rounded" 
                   :class="getHolidayNameClass(day.holidayType, day.isHalfDay)">
                {{ getShortHolidayName(day.googleHolidayName) }}
              </div>
              <div class="text-xs" :class="day.isHalfDay ? 'text-gray-700' : 'text-gray-800'">
                {{ day.isHalfDay ? '½ Gün' : 'Tam Gün' }}
              </div>
              <!-- Tatil Simgesi -->
              <div class="mt-1 text-sm">
                {{ getHolidayIcon(day.holidayType) }}
              </div>
            </div>
            
            <!-- Hafta Sonu -->
            <div v-else-if="day.isWeekend && day.isCurrentMonth" class="flex-1 flex items-center justify-center z-10 relative">
              <span class="text-xs text-gray-500">Hafta Sonu</span>
            </div>
            
            <!-- Normal İş Günü -->
            <div v-else-if="day.isCurrentMonth" class="flex-1 flex items-center justify-center z-10 relative">
              <span class="text-xs text-gray-600">İş Günü</span>
            </div>
            
            <!-- Diğer Ay -->
            <div v-else class="flex-1 flex items-center justify-center z-10 relative">
              <span class="text-xs text-gray-400">{{ day.day }}</span>
            </div>
          </div>
        </div>

        <!-- Renk Açıklamaları -->
        <div class="mt-4 pt-4 border-t border-gray-200">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Renk Açıklamaları</h3>
          <div class="flex flex-wrap gap-3 text-xs">
            <div class="flex items-center">
              <div class="w-4 h-4 bg-red-200 border border-red-300 rounded mr-2"></div>
              <span>Ulusal Bayramlar (23 Nisan, 19 Mayıs, 30 Ağustos, 29 Ekim)</span>
            </div>
            <div class="flex items-center">
              <div class="w-4 h-4 bg-green-200 border border-green-300 rounded mr-2"></div>
              <span>Dini Bayramlar (Ramazan, Kurban Bayramı)</span>
            </div>
            <div class="flex items-center">
              <div class="w-4 h-4 bg-blue-200 border border-blue-300 rounded mr-2"></div>
              <span>Önemli Günler (15 Temmuz, 1 Ocak, 1 Mayıs)</span>
            </div>
            <div class="flex items-center">
              <div class="w-4 h-4 relative rounded mr-2 overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-yellow-200 to-white"></div>
                <div class="absolute inset-0 half-day-diagonal-small"></div>
              </div>
              <span>Yarım Gün Tatiller (Arefe Günleri)</span>
            </div>
          </div>
        </div>

        <!-- Seçilen Ayın Detaylı Tatil Listesi -->
        <div v-if="filteredGoogleHolidays.length > 0" class="mt-8 pt-6 border-t border-gray-200">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">
            {{ months[selectedMonth] }} {{ selectedYear }} - Türkiye Resmi Tatilleri
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="holiday in filteredGoogleHolidays"
              :key="holiday.id"
              :class="[
                'p-4 rounded-lg shadow-sm flex items-center justify-between relative',
                holiday.isHalfDay ? 'bg-gradient-to-r from-white to-gray-50' : getHolidayCardClass(holiday.holidayType)
              ]"
            >
              <!-- Yarım gün çapraz çizgi -->
              <div 
                v-if="holiday.isHalfDay"
                class="absolute inset-0 overflow-hidden rounded-lg"
              >
                <div class="half-day-diagonal-card"></div>
              </div>
              
              <div class="z-10 relative">
                <p class="text-sm font-medium" :class="getHolidayTextColor(holiday.holidayType)">
                  {{ formatDate(holiday.date) }}
                </p>
                <p class="text-md font-semibold" :class="getHolidayTextColor(holiday.holidayType)">
                  {{ holiday.name }}
                </p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs px-2 py-1 rounded-full" 
                        :class="getHolidayTypeBadgeClass(holiday.holidayType)">
                    {{ getHolidayTypeLabel(holiday.holidayType) }}
                  </span>
                  <span v-if="holiday.isHalfDay" class="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                    ⏰ Yarım Gün
                  </span>
                </div>
              </div>
              <span class="text-2xl z-10 relative">{{ getHolidayIcon(holiday.holidayType) }}</span>
            </div>
          </div>
        </div>

        <!-- Ay İçinde Tatil Yoksa -->
        <div v-else class="mt-8 pt-6 border-t border-gray-200 text-center">
          <p class="text-gray-500">
            {{ months[selectedMonth] }} {{ selectedYear }} ayında resmi tatil bulunmamaktadır.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// State variables
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth())
const googleHolidays = ref([])
const loadingGoogleHolidays = ref(false)
const error = ref(null)

// Constants
const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const holidayTypes = {
  NATIONAL: 'national',       // 23 Nisan, 19 Mayıs, 30 Ağustos, 29 Ekim
  RELIGIOUS: 'religious',     // Ramazan Bayramı, Kurban Bayramı
  IMPORTANT: 'important',     // 15 Temmuz, 1 Ocak, 1 Mayıs
  HALF_DAY: 'half_day'        // Arefe günleri
}

const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
})

// Yarım gün tatillerini tespit etmek için anahtar kelimeler
const halfDayKeywords = ['arife', 'yarım', 'öğleden sonra', 'yarim', 'öğleden sonra']

// Tatil isimlerini kısaltma
const holidayShortNames = {
  'Ulusal Egemenlik ve Çocuk Bayramı': '23 Nisan',
  'Atatürk\'ü Anma, Gençlik ve Spor Bayramı': '19 Mayıs',
  'Zafer Bayramı': '30 Ağustos',
  'Cumhuriyet Bayramı': '29 Ekim',
  'Demokrasi ve Millî Birlik Günü': '15 Temmuz',
  'Yılbaşı Tatili': 'Yılbaşı',
  'Emek ve Dayanışma Günü': '1 Mayıs'
}

// Google tatillerini filtrele (seçilen aya göre)
const filteredGoogleHolidays = computed(() => {
  const startDate = new Date(selectedYear.value, selectedMonth.value, 1)
  const endDate = new Date(selectedYear.value, selectedMonth.value + 1, 0)
  
  return googleHolidays.value.filter(holiday => {
    const holidayDate = new Date(holiday.date)
    return holidayDate >= startDate && holidayDate <= endDate
  })
})

const calendarDays = computed(() => {
  const year = selectedYear.value
  const month = selectedMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // Pazartesi'den başla (1. gün pazartesi)
  const startDate = new Date(firstDay)
  const dayOfWeek = firstDay.getDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  startDate.setDate(firstDay.getDate() + daysToMonday)

  const days = []
  const totalCells = 42 // 6 hafta * 7 gün

  for (let i = 0; i < totalCells; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    
    const dateStr = date.toISOString().split('T')[0]
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    // Google tatillerini bul
    const googleHoliday = googleHolidays.value.find(h => h.date === dateStr)
    const isGoogleHoliday = !!googleHoliday
    const googleHolidayName = googleHoliday?.name || ''
    const holidayType = googleHoliday?.holidayType || ''
    const isHalfDay = googleHoliday?.isHalfDay || false

    const isCurrentMonth = date.getMonth() === month
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()

    days.push({
      date: dateStr,
      day: date.getDate(),
      isCurrentMonth,
      isWeekend,
      isGoogleHoliday,
      googleHolidayName,
      holidayType,
      isHalfDay,
      isToday,
      fullDate: date
    })
  }

  return days
})

const detectHolidayType = (name) => {
  const lowerName = name.toLowerCase()
  
  // Ulusal Bayramlar
  if (lowerName.includes('23 nisan') || 
      lowerName.includes('19 mayıs') || 
      lowerName.includes('30 ağustos') || 
      lowerName.includes('29 ekim') ||
      lowerName.includes('ulusal egemenlik') ||
      lowerName.includes('cumhuriyet bayramı') ||
      lowerName.includes('zafer bayramı')) {
    return holidayTypes.NATIONAL
  }
  
  // Dini Bayramlar
  if (lowerName.includes('ramazan') || 
      lowerName.includes('kurban') || 
      lowerName.includes('şeker') ||
      lowerName.includes('dini')) {
    return holidayTypes.RELIGIOUS
  }
  
  // Önemli Günler
  if (lowerName.includes('15 temmuz') || 
      lowerName.includes('demokrasi') ||
      lowerName.includes('1 ocak') ||
      lowerName.includes('yılbaşı') ||
      lowerName.includes('1 mayıs')) {
    return holidayTypes.IMPORTANT
  }
  
  return holidayTypes.IMPORTANT
}

const loadGoogleHolidays = async () => {
  try {
    loadingGoogleHolidays.value = true
    error.value = null

    const apiKey = import.meta.env.VITE_GOOGLE_API_HOLIDAY_KEY

    if (!apiKey) {
      error.value = 'Google API anahtarı bulunamadı. Lütfen sistem yöneticinize başvurun.'
      return
    }

    // Yılın tüm tatillerini çek
    const url = `https://www.googleapis.com/calendar/v3/calendars/turkish__tr%40holiday.calendar.google.com/events?key=${apiKey}&timeMin=${selectedYear.value}-01-01T00:00:00Z&timeMax=${selectedYear.value}-12-31T23:59:59Z`

    const response = await axios.get(url)

    if (response.data && response.data.items) {
      const holidayList = response.data.items
        .filter(item => item.summary && item.start && item.start.date)
        .map(item => {
          const name = item.summary
          // Yarım gün tatili kontrolü
          const isHalfDay = halfDayKeywords.some(keyword => 
            name.toLowerCase().includes(keyword)
          )
          
          // Tatil türünü belirle
          const holidayType = detectHolidayType(name)
          
          return {
            id: item.id,
            name: name,
            date: item.start.date,
            isHalfDay: isHalfDay,
            holidayType: isHalfDay ? holidayTypes.HALF_DAY : holidayType
          }
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      googleHolidays.value = holidayList
    } else {
      console.warn('Google Calendar tatil verileri bulunamadı.')
      googleHolidays.value = []
    }
  } catch (err) {
    console.error('Google Calendar tatilleri yüklenemedi:', err)
    error.value = 'Resmi tatiller yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
    googleHolidays.value = []
  } finally {
    loadingGoogleHolidays.value = false
  }
}

const handleYearChange = () => {
  loadGoogleHolidays()
}

const handleMonthChange = () => {
  // Ay değiştiğinde sadece görünüm güncellenir
}

const prevMonth = () => {
  if (selectedMonth.value === 0) {
    selectedMonth.value = 11
    selectedYear.value--
  } else {
    selectedMonth.value--
  }
}

const nextMonth = () => {
  if (selectedMonth.value === 11) {
    selectedMonth.value = 0
    selectedYear.value++
  } else {
    selectedMonth.value++
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString + 'T00:00:00')
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

const getShortHolidayName = (fullName) => {
  // Öncelikle kısa isimler listesinden kontrol et
  if (holidayShortNames[fullName]) {
    return holidayShortNames[fullName]
  }
  
  // Eğer listede yoksa, bazı kısaltmalar yap
  if (fullName.includes('Ramazan Bayramı')) {
    if (fullName.includes('1. Gün')) return 'Ramazan 1'
    if (fullName.includes('2. Gün')) return 'Ramazan 2'
    if (fullName.includes('3. Gün')) return 'Ramazan 3'
    return 'Ramazan Bayramı'
  }
  
  if (fullName.includes('Kurban Bayramı')) {
    if (fullName.includes('1. Gün')) return 'Kurban 1'
    if (fullName.includes('2. Gün')) return 'Kurban 2'
    if (fullName.includes('3. Gün')) return 'Kurban 3'
    if (fullName.includes('4. Gün')) return 'Kurban 4'
    return 'Kurban Bayramı'
  }
  
  if (fullName.includes('Arefe')) {
    if (fullName.includes('Ramazan')) return 'Ramazan Arefe'
    if (fullName.includes('Kurban')) return 'Kurban Arefe'
    return 'Arefe'
  }
  
  // Uzun isimleri kısalt
  if (fullName.length > 15) {
    return fullName.substring(0, 12) + '...'
  }
  
  return fullName
}

// Yarım gün overlay sınıfı
const getHalfDayOverlayClass = (holidayType) => {
  switch(holidayType) {
    case holidayTypes.NATIONAL:
      return 'bg-gradient-to-br from-red-200 to-white'
    case holidayTypes.RELIGIOUS:
      return 'bg-gradient-to-br from-green-200 to-white'
    case holidayTypes.IMPORTANT:
      return 'bg-gradient-to-br from-blue-200 to-white'
    default:
      return 'bg-gradient-to-br from-yellow-200 to-white'
  }
}

// Tam gün arka plan sınıfı
const getFullDayBackgroundClass = (holidayType) => {
  switch(holidayType) {
    case holidayTypes.NATIONAL:
      return 'bg-red-200 border-red-300'
    case holidayTypes.RELIGIOUS:
      return 'bg-green-200 border-green-300'
    case holidayTypes.IMPORTANT:
      return 'bg-blue-200 border-blue-300'
    default:
      return 'bg-yellow-200 border-yellow-300'
  }
}

// Tatil kartı sınıfı
const getHolidayCardClass = (holidayType) => {
  switch(holidayType) {
    case holidayTypes.NATIONAL:
      return 'bg-red-50 border-red-200'
    case holidayTypes.RELIGIOUS:
      return 'bg-green-50 border-green-200'
    case holidayTypes.IMPORTANT:
      return 'bg-blue-50 border-blue-200'
    default:
      return 'bg-yellow-50 border-yellow-200'
  }
}

const getHolidayNameClass = (holidayType, isHalfDay) => {
  if (isHalfDay) {
    switch(holidayType) {
      case holidayTypes.NATIONAL:
        return 'bg-red-100 text-red-800'
      case holidayTypes.RELIGIOUS:
        return 'bg-green-100 text-green-800'
      case holidayTypes.IMPORTANT:
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  } else {
    switch(holidayType) {
      case holidayTypes.NATIONAL:
        return 'bg-red-200 text-red-900'
      case holidayTypes.RELIGIOUS:
        return 'bg-green-200 text-green-900'
      case holidayTypes.IMPORTANT:
        return 'bg-blue-200 text-blue-900'
      default:
        return 'bg-yellow-200 text-yellow-900'
    }
  }
}

const getHolidayTextColor = (holidayType) => {
  switch(holidayType) {
    case holidayTypes.NATIONAL:
      return 'text-red-800'
    case holidayTypes.RELIGIOUS:
      return 'text-green-800'
    case holidayTypes.IMPORTANT:
      return 'text-blue-800'
    case holidayTypes.HALF_DAY:
      return 'text-yellow-800'
    default:
      return 'text-gray-800'
  }
}

const getHolidayIcon = (holidayType) => {
  switch(holidayType) {
    case holidayTypes.NATIONAL:
      return '🇹🇷'
    case holidayTypes.RELIGIOUS:
      return '🕌'
    case holidayTypes.IMPORTANT:
      return '⭐'
    case holidayTypes.HALF_DAY:
      return '⏰'
    default:
      return '🎉'
  }
}

const getHolidayTypeLabel = (holidayType) => {
  switch(holidayType) {
    case holidayTypes.NATIONAL:
      return 'Ulusal Bayram'
    case holidayTypes.RELIGIOUS:
      return 'Dini Bayram'
    case holidayTypes.IMPORTANT:
      return 'Önemli Gün'
    case holidayTypes.HALF_DAY:
      return 'Yarım Gün'
    default:
      return 'Tatil'
  }
}

const getHolidayTypeBadgeClass = (holidayType) => {
  switch(holidayType) {
    case holidayTypes.NATIONAL:
      return 'bg-red-200 text-red-800'
    case holidayTypes.RELIGIOUS:
      return 'bg-green-200 text-green-800'
    case holidayTypes.IMPORTANT:
      return 'bg-blue-200 text-blue-800'
    case holidayTypes.HALF_DAY:
      return 'bg-yellow-200 text-yellow-800'
    default:
      return 'bg-gray-200 text-gray-800'
  }
}

const getDayTooltip = (day) => {
  if (day.isGoogleHoliday) {
    return `${day.googleHolidayName} - ${day.isHalfDay ? 'Yarım Gün Tatili' : 'Tam Gün Tatili'}`
  }
  if (day.isWeekend) return 'Hafta Sonu'
  return 'İş Günü'
}

onMounted(() => {
  loadGoogleHolidays()
})
</script>

<style scoped>
.min-h-24 {
  min-height: 6rem;
}

/* Yarım gün çapraz çizgi efekti */
.half-day-diagonal {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    transparent 0%,
    transparent calc(50% - 1px),
    rgba(0, 0, 0, 0.2) 50%,
    transparent calc(50% + 1px),
    transparent 100%
  );
}

/* Küçük gösterim için yarım gün çapraz çizgi */
.half-day-diagonal-small {
  background: linear-gradient(
    135deg,
    transparent 0%,
    transparent calc(50% - 0.5px),
    rgba(0, 0, 0, 0.2) 50%,
    transparent calc(50% + 0.5px),
    transparent 100%
  );
}

/* Kart için yarım gün çapraz çizgi */
.half-day-diagonal-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    transparent 0%,
    transparent calc(50% - 1px),
    rgba(0, 0, 0, 0.15) 50%,
    transparent calc(50% + 1px),
    transparent 100%
  );
}
</style>