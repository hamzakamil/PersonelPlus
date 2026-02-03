<template>
  <div>
    <div class="flex justify-end items-center mb-6">
      <div class="flex items-center gap-4">
        <select v-model="selectedYear" class="border rounded-lg px-3 py-2" @change="loadData">
          <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
    </div>

    <!-- Ozet Kartlar -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Toplam Gelir</div>
            <div class="text-2xl font-bold text-green-600">{{ formatCurrency(summary.totalRevenue) }}</div>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-500">
          <span :class="summary.revenueChange >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ summary.revenueChange >= 0 ? '+' : '' }}{{ summary.revenueChange }}%
          </span>
          onceki yila gore
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Aktif Abonelikler</div>
            <div class="text-2xl font-bold text-blue-600">{{ summary.activeSubscriptions }}</div>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Ortalama Odeme</div>
            <div class="text-2xl font-bold text-purple-600">{{ formatCurrency(summary.averagePayment) }}</div>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Yenileme Orani</div>
            <div class="text-2xl font-bold text-orange-600">%{{ summary.renewalRate }}</div>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Grafikler -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Aylik Gelir Grafigi -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="font-semibold text-gray-800 mb-4">Aylik Gelir</h3>
        <div class="h-64">
          <div class="flex items-end justify-between h-full gap-2">
            <div
              v-for="(month, index) in monthlyRevenue"
              :key="index"
              class="flex-1 flex flex-col items-center"
            >
              <div
                class="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                :style="{ height: getBarHeight(month.amount) + '%' }"
                :title="formatCurrency(month.amount)"
              ></div>
              <div class="text-xs text-gray-500 mt-2">{{ month.label }}</div>
            </div>
          </div>
        </div>
        <div class="mt-4 text-center text-sm text-gray-500">
          En yuksek: {{ formatCurrency(maxMonthlyRevenue) }} ({{ maxMonthLabel }})
        </div>
      </div>

      <!-- Paket Dagilimi -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="font-semibold text-gray-800 mb-4">Paket Dagilimi</h3>
        <div class="space-y-4">
          <div v-for="pkg in packageDistribution" :key="pkg.name" class="flex items-center">
            <div class="w-24 text-sm text-gray-600 truncate">{{ pkg.name }}</div>
            <div class="flex-1 mx-4">
              <div class="w-full bg-gray-200 rounded-full h-4">
                <div
                  class="h-4 rounded-full"
                  :class="pkg.color"
                  :style="{ width: pkg.percentage + '%' }"
                ></div>
              </div>
            </div>
            <div class="w-16 text-sm text-gray-600 text-right">{{ pkg.count }} adet</div>
            <div class="w-12 text-sm text-gray-500 text-right">%{{ pkg.percentage }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detay Tablolari -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Son Odemeler -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="font-semibold text-gray-800 mb-4">Son Odemeler</h3>
        <div class="space-y-3">
          <div
            v-for="payment in recentPayments"
            :key="payment._id"
            class="flex items-center justify-between border-b pb-3"
          >
            <div>
              <div class="text-sm font-medium text-gray-800">{{ payment.dealer?.name }}</div>
              <div class="text-xs text-gray-500">{{ payment.package?.name }}</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium text-green-600">{{ formatCurrency(payment.amount) }}</div>
              <div class="text-xs text-gray-500">{{ formatDate(payment.paidAt) }}</div>
            </div>
          </div>
          <div v-if="recentPayments.length === 0" class="text-center text-gray-500 py-4">
            Henuz odeme yok
          </div>
        </div>
      </div>

      <!-- Yakinda Bitecek Abonelikler -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="font-semibold text-gray-800 mb-4">Yakinda Bitecek Abonelikler</h3>
        <div class="space-y-3">
          <div
            v-for="sub in expiringSoon"
            :key="sub._id"
            class="flex items-center justify-between border-b pb-3"
          >
            <div>
              <div class="text-sm font-medium text-gray-800">{{ sub.dealer?.name }}</div>
              <div class="text-xs text-gray-500">{{ sub.package?.name }}</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium text-red-600">{{ getDaysRemaining(sub.endDate) }} gun</div>
              <div class="text-xs text-gray-500">{{ formatDate(sub.endDate) }}</div>
            </div>
          </div>
          <div v-if="expiringSoon.length === 0" class="text-center text-gray-500 py-4">
            Yaklasan bitis yok
          </div>
        </div>
      </div>
    </div>

    <!-- Fatura Tipi Karsilastirmasi -->
    <div class="bg-white rounded-lg shadow p-6 mt-6">
      <h3 class="font-semibold text-gray-800 mb-4">Fatura Tipi Karsilastirmasi</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="text-center p-6 bg-blue-50 rounded-lg">
          <div class="text-3xl font-bold text-blue-600">{{ billingComparison.monthly.count }}</div>
          <div class="text-sm text-gray-600 mt-1">Aylik Abonelik</div>
          <div class="text-lg font-semibold text-blue-700 mt-2">{{ formatCurrency(billingComparison.monthly.revenue) }}</div>
          <div class="text-xs text-gray-500">Toplam Gelir</div>
        </div>
        <div class="text-center p-6 bg-green-50 rounded-lg">
          <div class="text-3xl font-bold text-green-600">{{ billingComparison.yearly.count }}</div>
          <div class="text-sm text-gray-600 mt-1">Yillik Abonelik</div>
          <div class="text-lg font-semibold text-green-700 mt-2">{{ formatCurrency(billingComparison.yearly.revenue) }}</div>
          <div class="text-xs text-gray-500">Toplam Gelir</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const selectedYear = ref(new Date().getFullYear())
const availableYears = ref([])

const summary = ref({
  totalRevenue: 0,
  revenueChange: 0,
  activeSubscriptions: 0,
  averagePayment: 0,
  renewalRate: 0
})

const monthlyRevenue = ref([])
const packageDistribution = ref([])
const recentPayments = ref([])
const expiringSoon = ref([])
const billingComparison = ref({
  monthly: { count: 0, revenue: 0 },
  yearly: { count: 0, revenue: 0 }
})

const monthLabels = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara']
const packageColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']

const maxMonthlyRevenue = computed(() => {
  return Math.max(...monthlyRevenue.value.map(m => m.amount), 0)
})

const maxMonthLabel = computed(() => {
  const maxMonth = monthlyRevenue.value.find(m => m.amount === maxMonthlyRevenue.value)
  return maxMonth?.label || '-'
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0
  }).format(value || 0)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

const getDaysRemaining = (endDate) => {
  if (!endDate) return 0
  const end = new Date(endDate)
  const now = new Date()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
}

const getBarHeight = (amount) => {
  if (maxMonthlyRevenue.value === 0) return 0
  return Math.max((amount / maxMonthlyRevenue.value) * 100, 5)
}

const loadData = async () => {
  await Promise.all([
    loadSummary(),
    loadMonthlyRevenue(),
    loadPackageDistribution(),
    loadRecentPayments(),
    loadExpiringSoon(),
    loadBillingComparison()
  ])
}

const loadSummary = async () => {
  try {
    const response = await api.get(`/payments/stats/revenue?year=${selectedYear.value}`)
    const data = response.data.data || response.data

    summary.value = {
      totalRevenue: data.totalRevenue || 0,
      revenueChange: data.revenueChange || 0,
      activeSubscriptions: data.activeSubscriptions || 0,
      averagePayment: data.averagePayment || 0,
      renewalRate: data.renewalRate || 0
    }
  } catch (error) {
    console.error('Ozet yukleme hatasi:', error)
  }
}

const loadMonthlyRevenue = async () => {
  try {
    const response = await api.get(`/payments/stats/revenue?year=${selectedYear.value}&groupBy=month`)
    const data = response.data.data || response.data

    // Tum aylari doldur
    monthlyRevenue.value = monthLabels.map((label, index) => {
      const monthData = data.monthlyRevenue?.find(m => m.month === index + 1)
      return {
        label,
        amount: monthData?.amount || 0
      }
    })
  } catch (error) {
    console.error('Aylik gelir yukleme hatasi:', error)
    // Bos veri ile doldur
    monthlyRevenue.value = monthLabels.map(label => ({ label, amount: 0 }))
  }
}

const loadPackageDistribution = async () => {
  try {
    const response = await api.get('/subscriptions/stats/overview')
    const data = response.data.data || response.data

    const packages = data.packageDistribution || []
    const total = packages.reduce((sum, p) => sum + (p.count || 0), 0)

    packageDistribution.value = packages.map((pkg, index) => ({
      name: pkg.name || pkg._id || 'Bilinmiyor',
      count: pkg.count || 0,
      percentage: total > 0 ? Math.round((pkg.count / total) * 100) : 0,
      color: packageColors[index % packageColors.length]
    }))
  } catch (error) {
    console.error('Paket dagilimi yukleme hatasi:', error)
  }
}

const loadRecentPayments = async () => {
  try {
    const response = await api.get('/payments?status=completed&limit=5&sort=-paidAt')
    const data = response.data.data || response.data
    recentPayments.value = data.payments || data || []
  } catch (error) {
    console.error('Son odemeler yukleme hatasi:', error)
  }
}

const loadExpiringSoon = async () => {
  try {
    const response = await api.get('/subscriptions?status=active&expiringDays=30&limit=5')
    const data = response.data.data || response.data
    expiringSoon.value = data.subscriptions || data || []
  } catch (error) {
    console.error('Yakinda bitecekler yukleme hatasi:', error)
  }
}

const loadBillingComparison = async () => {
  try {
    const response = await api.get(`/payments/stats/revenue?year=${selectedYear.value}&groupBy=billingType`)
    const data = response.data.data || response.data

    const monthlyData = data.billingTypeRevenue?.find(b => b.billingType === 'monthly')
    const yearlyData = data.billingTypeRevenue?.find(b => b.billingType === 'yearly')

    billingComparison.value = {
      monthly: {
        count: monthlyData?.count || 0,
        revenue: monthlyData?.amount || 0
      },
      yearly: {
        count: yearlyData?.count || 0,
        revenue: yearlyData?.amount || 0
      }
    }
  } catch (error) {
    console.error('Fatura tipi karsilastirmasi yukleme hatasi:', error)
  }
}

const initYears = () => {
  const currentYear = new Date().getFullYear()
  availableYears.value = [currentYear, currentYear - 1, currentYear - 2]
}

onMounted(() => {
  initYears()
  loadData()
})
</script>
