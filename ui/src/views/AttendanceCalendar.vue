<template>
  <div>
    <div class="flex justify-end items-center mb-6">
      <div class="flex gap-2">
        <select
          v-model="selectedMonth"
          @change="loadCalendar"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="month in months" :key="month.value" :value="month.value">
            {{ month.label }}
          </option>
        </select>
        <select
          v-model="selectedYear"
          @change="loadCalendar"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="year in years" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
        <select
          v-if="employees.length > 0"
          v-model="selectedEmployee"
          @change="loadCalendar"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tüm Çalışanlar</option>
          <option v-for="emp in employees" :key="emp._id" :value="emp._id">
            {{ emp.firstName }} {{ emp.lastName }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="!companyTemplate" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <p class="text-yellow-800">Lütfen şirket için bir puantaj şablonu seçin.</p>
    </div>

    <div v-if="companyTemplate" class="bg-white rounded-lg shadow overflow-hidden mb-6">
      <div class="p-4 border-b">
        <h3 class="font-semibold text-gray-800">Aktif Şablon: {{ companyTemplate.name }}</h3>
        <div class="mt-2 flex flex-wrap gap-2">
          <span
            v-for="item in templateItems"
            :key="item.code"
            class="px-3 py-1 rounded text-sm font-medium"
            :style="{ backgroundColor: item.color + '20', color: item.color }"
          >
            <span class="font-mono font-bold">{{ item.code }}</span> - {{ item.description }}
          </span>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                Çalışan
              </th>
              <th
                v-for="day in daysInMonth"
                :key="day"
                class="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[40px]"
                :class="{ 'bg-red-50': isWeekend(day), 'bg-blue-50': isHoliday(day) }"
              >
                {{ day }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="employee in calendarEmployees" :key="employee._id">
              <td class="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                {{ employee.firstName }} {{ employee.lastName }}
              </td>
              <td
                v-for="day in daysInMonth"
                :key="day"
                class="px-2 py-3 text-center text-xs min-w-[40px] cursor-pointer hover:bg-gray-50"
                :class="getDayClass(employee._id, day)"
                :style="getDayStyle(employee._id, day)"
                @click="openDayModal(employee, day)"
              >
                {{ getDayCode(employee._id, day) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Day Detail Modal -->
    <div v-if="showDayModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">
          {{ selectedDayEmployee?.firstName }} {{ selectedDayEmployee?.lastName }} - 
          {{ selectedDay }}/{{ selectedMonth }}/{{ selectedYear }}
        </h2>
        <form @submit.prevent="saveDayAttendance">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kod</label>
              <select
                v-model="dayForm.code"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seçiniz</option>
                <option
                  v-for="item in templateItems"
                  :key="item.code"
                  :value="item.code"
                  :style="{ color: item.color }"
                >
                  {{ item.code }} - {{ item.description }}
                </option>
              </select>
            </div>
            <Input v-model="dayForm.description" label="Açıklama" />
            <div class="grid grid-cols-2 gap-2">
              <Input v-model="dayForm.startTime" type="time" label="Başlangıç Saati" />
              <Input v-model="dayForm.endTime" type="time" label="Bitiş Saati" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <Input v-model="dayForm.workingHours" type="number" step="0.5" label="Çalışma Saati" />
              <Input v-model="dayForm.overtime" type="number" step="0.5" label="Mesai Saati" />
            </div>
            <Textarea v-model="dayForm.notes" label="Notlar" />
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeDayModal">İptal</Button>
              <Button type="submit">Kaydet</Button>
              <Button v-if="dayForm.code" variant="danger" type="button" @click="deleteDayAttendance">Sil</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Textarea from '@/components/Textarea.vue'

const authStore = useAuthStore()
const toast = useToastStore()
const confirmModal = useConfirmStore()
const employees = ref([])
const calendarData = ref({})
const companyTemplate = ref(null)
const templateItems = ref([])
const selectedMonth = ref(new Date().getMonth() + 1)
const selectedYear = ref(new Date().getFullYear())
const selectedEmployee = ref('')
const showDayModal = ref(false)
const selectedDayEmployee = ref(null)
const selectedDay = ref(null)
const dayForm = ref({
  code: '',
  description: '',
  startTime: '',
  endTime: '',
  workingHours: '',
  overtime: '',
  notes: ''
})

const months = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' }
]

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  const yearsArray = []
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    yearsArray.push(i)
  }
  return yearsArray
})

const daysInMonth = computed(() => {
  const days = []
  const daysCount = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
  for (let i = 1; i <= daysCount; i++) {
    days.push(i)
  }
  return days
})

const calendarEmployees = computed(() => {
  if (selectedEmployee.value) {
    const emp = employees.value.find(e => e._id === selectedEmployee.value)
    return emp ? [emp] : []
  }
  return employees.value
})

const loadEmployees = async () => {
  try {
    let companyId = authStore.user?.company?._id || authStore.user?.company
    const userRole = authStore.user?.role?.name || authStore.user?.role

    // Check for company query parameter
    const urlParams = new URLSearchParams(window.location.search)
    const companyParam = urlParams.get('company')
    if (companyParam) {
      companyId = companyParam
    } else if (userRole === 'super_admin' || userRole === 'bayi_admin') {
      const companiesResponse = await api.get('/companies')
      const companies = companiesResponse.data?.data || companiesResponse.data || []
      if (companies.length > 0) {
        companyId = companies[0]._id
      }
    }

    if (!companyId) {
      console.error('Şirket bulunamadı')
      return
    }

    const response = await api.get('/employees', {
      params: { company: companyId }
    })
    employees.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
    employees.value = []
  }
}

const loadCompanyTemplate = async () => {
  try {
    let companyId = authStore.user?.company?._id || authStore.user?.company
    const userRole = authStore.user?.role?.name || authStore.user?.role

    // Check for company query parameter
    const urlParams = new URLSearchParams(window.location.search)
    const companyParam = urlParams.get('company')
    if (companyParam) {
      companyId = companyParam
    } else if (userRole === 'super_admin' || userRole === 'bayi_admin') {
      // For super admin and bayi admin, get first company
      const companiesResponse = await api.get('/companies')
      const companies = companiesResponse.data?.data || companiesResponse.data || []
      if (companies.length > 0) {
        companyId = companies[0]._id
      }
    }

    if (companyId) {
      const companyResponse = await api.get(`/companies/${companyId}`)
      const companyData = companyResponse.data?.data || companyResponse.data
      if (companyData?.activeAttendanceTemplate) {
        companyTemplate.value = companyData.activeAttendanceTemplate

        const templateResponse = await api.get(`/attendance-templates/${companyTemplate.value}`)
        const templateData = templateResponse.data?.data || templateResponse.data
        templateItems.value = templateData?.items || []
      }
    }
  } catch (error) {
    console.error('Şablon yüklenemedi:', error)
  }
}

const loadCalendar = async () => {
  try {
    let companyId = authStore.user?.company?._id || authStore.user?.company
    const userRole = authStore.user?.role?.name || authStore.user?.role

    // Check for company query parameter
    const urlParams = new URLSearchParams(window.location.search)
    const companyParam = urlParams.get('company')
    if (companyParam) {
      companyId = companyParam
    } else if (userRole === 'super_admin' || userRole === 'bayi_admin') {
      const companiesResponse = await api.get('/companies')
      const companies = companiesResponse.data?.data || companiesResponse.data || []
      if (companies.length > 0) {
        companyId = companies[0]._id
      }
    }

    if (!companyId) {
      console.error('Şirket bulunamadı')
      return
    }

    const params = {
      company: companyId,
      month: selectedMonth.value,
      year: selectedYear.value
    }

    if (selectedEmployee.value) {
      params.employee = selectedEmployee.value
    }

    const response = await api.get('/attendances/calendar', { params })
    calendarData.value = response.data?.data || response.data || {}
  } catch (error) {
    console.error('Takvim yüklenemedi:', error)
    calendarData.value = {}
  }
}

const getDayCode = (employeeId, day) => {
  const empData = calendarData.value[employeeId]
  if (!empData) return ''
  
  const date = new Date(selectedYear.value, selectedMonth.value - 1, day)
  const dateKey = date.toLocaleDateString('en-CA')
  const dayData = empData.dates?.[dateKey]
  
  return dayData?.code || ''
}

const getDayStyle = (employeeId, day) => {
  const code = getDayCode(employeeId, day)
  if (!code) return {}
  
  const item = templateItems.value.find(i => i.code === code)
  if (!item) return {}
  
  return {
    backgroundColor: item.color + '20',
    color: item.color,
    fontWeight: 'bold'
  }
}

const getDayClass = (employeeId, day) => {
  const date = new Date(selectedYear.value, selectedMonth.value - 1, day)
  const dayOfWeek = date.getDay()
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'bg-gray-100'
  }
  
  return ''
}

const isWeekend = (day) => {
  const date = new Date(selectedYear.value, selectedMonth.value - 1, day)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

const isHoliday = (day) => {
  // This can be extended to check actual holidays
  return false
}

const openDayModal = (employee, day) => {
  selectedDayEmployee.value = employee
  selectedDay.value = day
  
  const empData = calendarData.value[employee._id]
  if (empData) {
    const date = new Date(selectedYear.value, selectedMonth.value - 1, day)
    const dateKey = date.toLocaleDateString('en-CA')
    const dayData = empData.dates?.[dateKey]
    
    if (dayData) {
      dayForm.value = {
        code: dayData.code || '',
        description: dayData.description || '',
        startTime: dayData.startTime || '',
        endTime: dayData.endTime || '',
        workingHours: dayData.workingHours?.toString() || '',
        overtime: dayData.overtime?.toString() || '',
        notes: dayData.notes || ''
      }
    } else {
      dayForm.value = {
        code: '',
        description: '',
        startTime: '',
        endTime: '',
        workingHours: '',
        overtime: '',
        notes: ''
      }
    }
  } else {
    dayForm.value = {
      code: '',
      description: '',
      startTime: '',
      endTime: '',
      workingHours: '',
      overtime: '',
      notes: ''
    }
  }
  
  showDayModal.value = true
}

const saveDayAttendance = async () => {
  try {
    const date = new Date(selectedYear.value, selectedMonth.value - 1, selectedDay.value+1)

    const payload = {
      employee: selectedDayEmployee.value._id,
      date: date.toLocaleDateString('en-CA'),
      code: dayForm.value.code,
      description: dayForm.value.description,
      startTime: dayForm.value.startTime,
      endTime: dayForm.value.endTime,
      workingHours: parseFloat(dayForm.value.workingHours) || 0,
      overtime: parseFloat(dayForm.value.overtime) || 0,
      notes: dayForm.value.notes
    }

    await api.post('/attendances', payload)
    toast.success('Puantaj kaydı başarıyla güncellendi')
    closeDayModal()
    loadCalendar()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const deleteDayAttendance = async () => {
  const confirmed = await confirmModal.show({
    title: 'Kaydı Sil',
    message: 'Bu kaydı silmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    const date = new Date(selectedYear.value, selectedMonth.value-1, selectedDay.value)
    const ldate = new Date(selectedYear.value, selectedMonth.value-1, selectedDay.value+1)
    const dateKey = date.toLocaleDateString('en-CA')
    const empData = calendarData.value[selectedDayEmployee.value._id]

    if (empData && empData.dates?.[dateKey]) {
      // Find attendance ID from calendar data (we need to modify backend to return IDs)
      // For now, we'll use a different approach - get all attendances and find the one
      const response = await api.get('/attendances', {
        params: {
          employee: selectedDayEmployee.value._id,
          startDate: date.toLocaleDateString('en-CA'),
          endDate: ldate.toLocaleDateString('en-CA')
        }
      })
      const attendances = response.data?.data || response.data || []

      if (attendances.length > 0) {
        await api.delete(`/attendances/${attendances[0]._id}`)
        toast.success('Puantaj kaydı başarıyla silindi')
      }
    }

    closeDayModal()
    loadCalendar()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const closeDayModal = () => {
  showDayModal.value = false
  selectedDayEmployee.value = null
  selectedDay.value = null
  dayForm.value = {
    code: '',
    description: '',
    startTime: '',
    endTime: '',
    workingHours: '',
    overtime: '',
    notes: ''
  }
}

onMounted(async () => {
  await loadEmployees()
  await loadCompanyTemplate()
  await loadCalendar()
})
</script>

