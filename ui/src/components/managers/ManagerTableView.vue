<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <!-- Selection Toolbar -->
    <div v-if="managerStore.selectedEmployees.length > 0" class="bg-indigo-50 border-b border-indigo-200 p-3">
      <div class="flex items-center justify-between">
        <span class="text-sm text-indigo-700">
          {{ managerStore.selectedEmployees.length }} çalışan seçildi
        </span>
        <button
          @click="managerStore.clearSelection()"
          class="text-sm text-indigo-600 hover:text-indigo-800"
        >
          Seçimi Temizle
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="w-12 px-4 py-3">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @change="toggleSelectAll"
                class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Çalışan
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Departman
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SGK İşyeri
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Mevcut Yönetici
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Yönetici Ata
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="(employee, index) in employees"
            :key="employee._id"
            :class="{
              'bg-indigo-50': managerStore.isSelected(employee._id),
              'bg-gray-50': index % 2 === 1 && !managerStore.isSelected(employee._id),
              'hover:bg-gray-100': !managerStore.isSelected(employee._id)
            }"
            draggable="true"
            @dragstart="onDragStart($event, employee)"
            @dragend="onDragEnd"
            class="cursor-grab"
          >
            <!-- Checkbox -->
            <td class="px-4 py-3">
              <input
                type="checkbox"
                :checked="managerStore.isSelected(employee._id)"
                @change="managerStore.toggleSelectEmployee(employee._id)"
                class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
            </td>

            <!-- Employee Info -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {{ getInitials(employee) }}
                </div>
                <div>
                  <div class="font-medium text-gray-900 text-sm">
                    {{ employee.firstName }} {{ employee.lastName }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ employee.email || '-' }}
                  </div>
                </div>
              </div>
            </td>

            <!-- Department -->
            <td class="px-4 py-3 text-sm text-gray-600">
              {{ employee.department?.name || '-' }}
            </td>

            <!-- Workplace -->
            <td class="px-4 py-3 text-sm text-gray-600">
              {{ employee.workplace?.name || '-' }}
            </td>

            <!-- Current Manager -->
            <td class="px-4 py-3">
              <div v-if="employee.manager" class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-700">
                  {{ getInitials(employee.manager) }}
                </div>
                <span class="text-sm text-gray-700">
                  {{ employee.manager.firstName }} {{ employee.manager.lastName }}
                </span>
              </div>
              <span v-else class="text-sm text-red-500">Atanmamış</span>
            </td>

            <!-- Manager Dropdown -->
            <td class="px-4 py-3">
              <select
                :value="employee.manager?._id || ''"
                @change="$emit('assign-manager', { employeeId: employee._id, managerId: $event.target.value || null })"
                class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Yönetici Kaldır</option>
                <option
                  v-for="manager in availableManagers(employee)"
                  :key="manager._id"
                  :value="manager._id"
                >
                  {{ manager.firstName }} {{ manager.lastName }}
                </option>
              </select>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-if="!employees || employees.length === 0">
            <td colspan="6" class="px-4 py-12 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">Çalışan bulunamadı</h3>
              <p class="mt-1 text-sm text-gray-500">Filtreleri değiştirerek tekrar deneyin.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="bg-gray-50 border-t border-gray-200 px-4 py-3">
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-600">
          Toplam {{ employees?.length || 0 }} çalışan
        </span>
        <div class="flex gap-4 text-sm">
          <span class="text-green-600">
            {{ employeesWithManager }} yöneticili
          </span>
          <span class="text-red-600">
            {{ employeesWithoutManager }} yöneticisiz
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useManagerStore } from '@/stores/managers'

const props = defineProps({
  employees: Array,
  potentialManagers: Array
})

const emit = defineEmits(['assign-manager'])

const managerStore = useManagerStore()

// Computed
const isAllSelected = computed(() => {
  if (!props.employees?.length) return false
  return props.employees.every(e => managerStore.isSelected(e._id))
})

const isIndeterminate = computed(() => {
  if (!props.employees?.length) return false
  const selectedCount = props.employees.filter(e => managerStore.isSelected(e._id)).length
  return selectedCount > 0 && selectedCount < props.employees.length
})

const employeesWithManager = computed(() => {
  return (props.employees || []).filter(e => e.manager).length
})

const employeesWithoutManager = computed(() => {
  return (props.employees || []).filter(e => !e.manager).length
})

// Methods
function toggleSelectAll() {
  if (isAllSelected.value) {
    managerStore.clearSelection()
  } else {
    managerStore.selectAllEmployees()
  }
}

function getInitials(person) {
  const first = person?.firstName?.charAt(0) || ''
  const last = person?.lastName?.charAt(0) || ''
  return (first + last).toUpperCase()
}

function availableManagers(employee) {
  return (props.potentialManagers || []).filter(m => m._id !== employee._id)
}

function onDragStart(event, employee) {
  managerStore.startDrag(employee)
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', employee._id)
}

function onDragEnd() {
  managerStore.endDrag()
}
</script>
