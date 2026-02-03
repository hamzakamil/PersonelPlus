<template>
  <div class="space-y-1">
    <div
      v-for="employee in employees"
      :key="employee._id"
      class="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:border-gray-300 transition-colors"
      draggable="true"
      @dragstart="onDragStart($event, employee)"
      @dragend="onDragEnd"
      :class="{
        'bg-indigo-50 border-indigo-300': managerStore.isSelected(employee._id),
        'cursor-grab': true
      }"
    >
      <div class="flex items-center gap-3">
        <!-- Checkbox -->
        <input
          type="checkbox"
          :checked="managerStore.isSelected(employee._id)"
          @change="managerStore.toggleSelectEmployee(employee._id)"
          class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <!-- Avatar -->
        <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
          {{ getInitials(employee) }}
        </div>
        <!-- Info -->
        <div>
          <div class="font-medium text-gray-900 text-sm">
            {{ employee.firstName }} {{ employee.lastName }}
          </div>
          <div class="text-xs text-gray-500">
            {{ employee.position || 'Pozisyon belirtilmemiş' }}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Current Manager Badge -->
        <div v-if="employee.manager" class="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {{ employee.manager.firstName }} {{ employee.manager.lastName }}
        </div>
        <span v-else class="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">Yönetici Yok</span>

        <!-- Manager Dropdown -->
        <select
          :value="employee.manager?._id || ''"
          @change="$emit('assign-manager', { employeeId: employee._id, managerId: $event.target.value || null })"
          class="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Yönetici Yok</option>
          <option
            v-for="manager in availableManagers(employee)"
            :key="manager._id"
            :value="manager._id"
          >
            {{ manager.firstName }} {{ manager.lastName }}
          </option>
        </select>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!employees || employees.length === 0" class="text-center py-4 text-gray-500 text-sm">
      Bu alanda çalışan bulunmuyor
    </div>
  </div>
</template>

<script setup>
import { useManagerStore } from '@/stores/managers'

const props = defineProps({
  employees: Array,
  potentialManagers: Array
})

const emit = defineEmits(['assign-manager'])

const managerStore = useManagerStore()

function getInitials(employee) {
  const first = employee.firstName?.charAt(0) || ''
  const last = employee.lastName?.charAt(0) || ''
  return (first + last).toUpperCase()
}

function availableManagers(employee) {
  // Filter out the employee themselves from potential managers
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
