<template>
  <div>
    <div v-if="isEmployee" class="mb-6">
      <div v-if="myBalance" class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">İzin Bakiyem</h2>
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{ myBalance.annualLeaveDays }}</div>
            <div class="text-sm text-gray-600 mt-1">Toplam Yıllık İzin</div>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ myBalance.remainingAnnualLeaveDays }}</div>
            <div class="text-sm text-gray-600 mt-1">Kalan Yıllık İzin</div>
          </div>
          <div class="text-center p-4 bg-red-50 rounded-lg">
            <div class="text-2xl font-bold text-red-600">{{ myBalance.usedAnnualLeaveDays }}</div>
            <div class="text-sm text-gray-600 mt-1">Kullanılan Yıllık İzin</div>
          </div>
        </div>
        <div v-if="myBalance.hourlyLeaveHours > 0" class="mt-4 p-4 bg-yellow-50 rounded-lg">
          <div class="text-sm text-gray-700">
            <strong>Saatlik İzin:</strong> { myBalance.hourlyLeaveHours }} saat
            <span v-if="myBalance.hourlyLeaveDaysEquivalent >= 1" class="text-yellow-700 font-semibold">
              ({{ myBalance.hourlyLeaveDaysEquivalent }} gün eşdeğeri - Telafi gerekli)
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kıdem</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanılan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saatlik İzin</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="balance in balances" :key="balance._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <span v-if="balance.employee?.firstName || balance.employee?.lastName">
                {{ balance.employee?.firstName }} {{ balance.employee?.lastName }}
              </span>
              <span v-else class="text-gray-400 italic">İsim bilgisi yok</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ balance.seniority }} yıl</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ balance.annualLeaveDays }} gün</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ balance.usedAnnualLeaveDays }} gün</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
              {{ balance.remainingAnnualLeaveDays }} gün
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ balance.hourlyLeaveHours }} saat
              <span v-if="balance.hourlyLeaveDaysEquivalent >= 1" class="text-yellow-600 font-semibold">
                ({{ balance.hourlyLeaveDaysEquivalent }} gün)
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                v-if="balance.employee?._id"
                @click="recalculateBalance(balance.employee._id)"
                class="text-indigo-600 hover:text-indigo-900"
              >
                Yeniden Hesapla
              </button>
              <span v-else class="text-gray-400">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const authStore = useAuthStore()
const toast = useToastStore()
const balances = ref([])
const myBalance = ref(null)

const isEmployee = computed(() => authStore.hasRole('employee'))

const loadBalances = async () => {
  try {
    if (isEmployee.value) {
      const response = await api.get('/leave-balances/employee/me')
      myBalance.value = response.data
    } else {
      const response = await api.get('/leave-balances')
      balances.value = response.data
    }
  } catch (error) {
    console.error('Bakiyeler yüklenemedi:', error)
  }
}

const recalculateBalance = async (employeeId) => {
  if (!employeeId) {
    toast.error('Çalışan bilgisi bulunamadı')
    return
  }
  try {
    await api.post(`/leave-balances/employee/${employeeId}/recalculate`)
    loadBalances()
    toast.success('Bakiye yeniden hesaplandı')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

onMounted(() => {
  loadBalances()
})
</script>






