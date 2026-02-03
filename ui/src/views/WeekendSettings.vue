<template>
  <div>
    <div class="mb-6">
      <div class="flex gap-2 mb-4">
        <Button
          :variant="selectedTab === 'company' ? 'primary' : 'secondary'"
          @click="selectedTab = 'company'"
        >
          Şirket
        </Button>
        <Button
          :variant="selectedTab === 'department' ? 'primary' : 'secondary'"
          @click="selectedTab = 'department'"
        >
          Departman
        </Button>
        <Button
          :variant="selectedTab === 'employee' ? 'primary' : 'secondary'"
          @click="selectedTab = 'employee'"
        >
          Çalışan
        </Button>
      </div>
    </div>

    <!-- Company Settings -->
    <div v-if="selectedTab === 'company'" class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold mb-4">Sirket Hafta Tatili Ayarlari</h2>
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Hafta Tatili Gunleri</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="day in days"
              :key="day.value"
              class="flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50"
              :class="{
                'bg-blue-100 border-blue-500': companyWeekendDays.includes(day.value),
                'bg-white border-gray-300': !companyWeekendDays.includes(day.value)
              }"
            >
              <input
                type="checkbox"
                :value="day.value"
                v-model="companyWeekendDays"
                class="mr-2"
                @change="saveCompanySettings"
              />
              <span>{{ day.label }}</span>
            </label>
          </div>
        </div>

        <!-- Yillik Izin Hesaplama Secenegi (2 gun seciliyse goster) -->
        <div v-if="companyWeekendDays.length >= 2" class="border-t pt-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Yillik Izin Hesaplamasinda Hafta Tatili
          </label>
          <p class="text-sm text-gray-500 mb-3">
            2 gun hafta tatili secildiginde, yillik izin talebinde hangi gunler izinden dusulecek?
          </p>
          <div class="space-y-2">
            <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              :class="{ 'bg-blue-50 border-blue-500': weekendLeaveDeduction === 'none' }"
            >
              <input
                type="radio"
                v-model="weekendLeaveDeduction"
                value="none"
                class="mr-3"
                @change="saveCompanySettings"
              />
              <div>
                <span class="font-medium">Hicbiri dusulmesin</span>
                <p class="text-sm text-gray-500">Hafta tatili gunleri yillik izinden dusulmez</p>
              </div>
            </label>
            <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              :class="{ 'bg-blue-50 border-blue-500': weekendLeaveDeduction === 'all' }"
            >
              <input
                type="radio"
                v-model="weekendLeaveDeduction"
                value="all"
                class="mr-3"
                @change="saveCompanySettings"
              />
              <div>
                <span class="font-medium">Tumu dusulsun</span>
                <p class="text-sm text-gray-500">Tum hafta tatili gunleri yillik izinden dusulur</p>
              </div>
            </label>
            <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              :class="{ 'bg-blue-50 border-blue-500': weekendLeaveDeduction === 'first_only' }"
            >
              <input
                type="radio"
                v-model="weekendLeaveDeduction"
                value="first_only"
                class="mr-3"
                @change="saveCompanySettings"
              />
              <div>
                <span class="font-medium">Sadece birinci gun dusulsun</span>
                <p class="text-sm text-gray-500">
                  Sadece {{ getDayName(primaryWeekendDay) }} yillik izinden dusulur
                </p>
              </div>
            </label>
            <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              :class="{ 'bg-blue-50 border-blue-500': weekendLeaveDeduction === 'second_only' }"
            >
              <input
                type="radio"
                v-model="weekendLeaveDeduction"
                value="second_only"
                class="mr-3"
                @change="saveCompanySettings"
              />
              <div>
                <span class="font-medium">Sadece ikinci gun dusulsun</span>
                <p class="text-sm text-gray-500">
                  Sadece {{ getDayName(secondaryWeekendDay) }} yillik izinden dusulur
                </p>
              </div>
            </label>
          </div>

          <!-- Birinci gun secimi -->
          <div v-if="weekendLeaveDeduction === 'first_only' || weekendLeaveDeduction === 'second_only'" class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Birinci Hafta Tatili Gunu</label>
            <select
              v-model="primaryWeekendDay"
              @change="saveCompanySettings"
              class="w-full max-w-xs px-3 py-2 border rounded-lg"
            >
              <option
                v-for="dayValue in companyWeekendDays"
                :key="dayValue"
                :value="dayValue"
              >
                {{ getDayName(dayValue) }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Department Settings -->
    <div v-if="selectedTab === 'department'" class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold mb-4">Departman Hafta Tatili Ayarları</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Departman Seçiniz</label>
          <select
            v-model="selectedDepartment"
            @change="loadDepartmentSettings"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seçiniz</option>
            <option
              v-for="dept in departments"
              :key="dept._id"
              :value="dept._id"
            >
              {{ dept.name }}
            </option>
          </select>
        </div>
        <div v-if="selectedDepartment">
          <label class="block text-sm font-medium text-gray-700 mb-2">Hafta Tatili Günleri</label>
          <p class="text-sm text-gray-500 mb-2">
            Boş bırakılırsa şirket ayarları kullanılır
          </p>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="day in days"
              :key="day.value"
              class="flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50"
              :class="{
                'bg-blue-100 border-blue-500': departmentWeekendDays.includes(day.value),
                'bg-white border-gray-300': !departmentWeekendDays.includes(day.value)
              }"
            >
              <input
                type="checkbox"
                :value="day.value"
                v-model="departmentWeekendDays"
                class="mr-2"
                @change="saveDepartmentSettings"
              />
              <span>{{ day.label }}</span>
            </label>
          </div>
          <Button variant="secondary" @click="clearDepartmentSettings" class="mt-2">
            Şirket Ayarlarını Kullan
          </Button>
        </div>
      </div>
    </div>

    <!-- Employee Settings -->
    <div v-if="selectedTab === 'employee'" class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold mb-4">Çalışan Hafta Tatili Ayarları</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Çalışan Seçiniz</label>
          <select
            v-model="selectedEmployee"
            @change="loadEmployeeSettings"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seçiniz</option>
            <option
              v-for="emp in employees"
              :key="emp._id"
              :value="emp._id"
            >
              {{ emp.firstName }} {{ emp.lastName }}
            </option>
          </select>
        </div>
        <div v-if="selectedEmployee">
          <label class="block text-sm font-medium text-gray-700 mb-2">Hafta Tatili Günleri</label>
          <p class="text-sm text-gray-500 mb-2">
            Boş bırakılırsa departman/şirket ayarları kullanılır
          </p>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="day in days"
              :key="day.value"
              class="flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50"
              :class="{
                'bg-blue-100 border-blue-500': employeeWeekendDays.includes(day.value),
                'bg-white border-gray-300': !employeeWeekendDays.includes(day.value)
              }"
            >
              <input
                type="checkbox"
                :value="day.value"
                v-model="employeeWeekendDays"
                class="mr-2"
                @change="saveEmployeeSettings"
              />
              <span>{{ day.label }}</span>
            </label>
          </div>
          <Button variant="secondary" @click="clearEmployeeSettings" class="mt-2">
            Departman/Şirket Ayarlarını Kullan
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import Button from '@/components/Button.vue'

const authStore = useAuthStore()
const toast = useToastStore()
const selectedTab = ref('company')
const companyWeekendDays = ref([0]) // Default: Sunday
const departmentWeekendDays = ref([])
const employeeWeekendDays = ref([])
const selectedDepartment = ref('')
const selectedEmployee = ref('')
const departments = ref([])
const employees = ref([])
const weekendLeaveDeduction = ref('none')
const primaryWeekendDay = ref(0)

// Ikinci hafta tatili gununu hesapla
const secondaryWeekendDay = computed(() => {
  if (companyWeekendDays.value.length < 2) return null
  return companyWeekendDays.value.find(d => d !== primaryWeekendDay.value) ?? companyWeekendDays.value[1]
})

const getDayName = (dayValue) => {
  const day = days.find(d => d.value === dayValue)
  return day ? day.label : ''
}

const days = [
  { value: 0, label: 'Pazar' },
  { value: 1, label: 'Pazartesi' },
  { value: 2, label: 'Salı' },
  { value: 3, label: 'Çarşamba' },
  { value: 4, label: 'Perşembe' },
  { value: 5, label: 'Cuma' },
  { value: 6, label: 'Cumartesi' }
]

const loadCompanySettings = async () => {
  try {
    let companyId = authStore.companyId
    if (authStore.isSuperAdmin || authStore.isBayiAdmin) {
      const companiesResponse = await api.get('/companies')
      const companiesData = companiesResponse.data?.data || companiesResponse.data || []
      if (companiesData.length > 0) {
        companyId = companiesData[0]._id
      }
    }

    if (companyId) {
      const response = await api.get(`/weekend-settings/company/${companyId}`)
      companyWeekendDays.value = response.data.weekendDays || [0]
      weekendLeaveDeduction.value = response.data.weekendLeaveDeduction || 'none'
      primaryWeekendDay.value = response.data.primaryWeekendDay ?? companyWeekendDays.value[0] ?? 0
    }
  } catch (error) {
    console.error('Sirket ayarlari yuklenemedi:', error)
  }
}

const saveCompanySettings = async () => {
  try {
    let companyId = authStore.companyId
    if (authStore.isSuperAdmin || authStore.isBayiAdmin) {
      const companiesResponse = await api.get('/companies')
      const companiesData = companiesResponse.data?.data || companiesResponse.data || []
      if (companiesData.length > 0) {
        companyId = companiesData[0]._id
      }
    }

    if (companyId) {
      await api.put(`/weekend-settings/company/${companyId}`, {
        weekendDays: companyWeekendDays.value,
        weekendLeaveDeduction: weekendLeaveDeduction.value,
        primaryWeekendDay: primaryWeekendDay.value
      })
      toast.success('Ayarlar kaydedildi')
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const loadDepartments = async () => {
  try {
    const response = await api.get('/departments')
    departments.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error)
  }
}

const loadDepartmentSettings = async () => {
  if (!selectedDepartment.value) return

  try {
    const response = await api.get(`/weekend-settings/department/${selectedDepartment.value}`)
    departmentWeekendDays.value = response.data.weekendDays || []
  } catch (error) {
    console.error('Departman ayarları yüklenemedi:', error)
  }
}

const saveDepartmentSettings = async () => {
  if (!selectedDepartment.value) return

  try {
    await api.put(`/weekend-settings/department/${selectedDepartment.value}`, {
      weekendDays: departmentWeekendDays.value.length > 0 ? departmentWeekendDays.value : null
    })
    toast.success('Ayarlar kaydedildi')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const clearDepartmentSettings = async () => {
  departmentWeekendDays.value = []
  await saveDepartmentSettings()
}

const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    employees.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
  }
}

const loadEmployeeSettings = async () => {
  if (!selectedEmployee.value) return

  try {
    const response = await api.get(`/weekend-settings/employee/${selectedEmployee.value}`)
    employeeWeekendDays.value = response.data.weekendDays || []
  } catch (error) {
    console.error('Çalışan ayarları yüklenemedi:', error)
  }
}

const saveEmployeeSettings = async () => {
  if (!selectedEmployee.value) return

  try {
    await api.put(`/weekend-settings/employee/${selectedEmployee.value}`, {
      weekendDays: employeeWeekendDays.value.length > 0 ? employeeWeekendDays.value : null
    })
    toast.success('Ayarlar kaydedildi')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const clearEmployeeSettings = async () => {
  employeeWeekendDays.value = []
  await saveEmployeeSettings()
}

onMounted(() => {
  loadCompanySettings()
  loadDepartments()
  loadEmployees()
})
</script>






