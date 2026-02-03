<template>
  <div
    class="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-full text-xs cursor-grab hover:border-gray-300 hover:shadow-sm transition-all"
    :class="{ 'bg-indigo-50 border-indigo-300': managerStore.isSelected(employee._id) }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click="showDetails = !showDetails"
  >
    <!-- Avatar -->
    <div class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
      {{ getInitials(employee) }}
    </div>

    <!-- Name -->
    <span class="text-gray-700 max-w-20 truncate">
      {{ employee.firstName }} {{ employee.lastName?.charAt(0) }}.
    </span>

    <!-- Manager indicator -->
    <span v-if="!employee.manager" class="w-2 h-2 rounded-full bg-red-400" title="Yönetici atanmamış"></span>
    <span v-else class="w-2 h-2 rounded-full bg-green-400" title="Yöneticisi var"></span>

    <!-- Tooltip / Details Popup -->
    <div
      v-if="showDetails"
      class="absolute z-10 mt-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 min-w-48"
      @click.stop
    >
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
          {{ getInitials(employee) }}
        </div>
        <div>
          <div class="font-medium text-gray-900">{{ employee.firstName }} {{ employee.lastName }}</div>
          <div class="text-xs text-gray-500">{{ employee.position || 'Pozisyon belirtilmemiş' }}</div>
        </div>
      </div>

      <div class="space-y-1 text-xs mb-3">
        <div v-if="employee.department" class="flex justify-between">
          <span class="text-gray-500">Departman:</span>
          <span class="text-gray-700">{{ employee.department.name }}</span>
        </div>
        <div v-if="employee.manager" class="flex justify-between">
          <span class="text-gray-500">Yönetici:</span>
          <span class="text-gray-700">{{ employee.manager.firstName }} {{ employee.manager.lastName }}</span>
        </div>
        <div v-else class="text-red-500">Yönetici atanmamış</div>
      </div>

      <!-- Quick Manager Select -->
      <select
        :value="employee.manager?._id || ''"
        @change="$emit('assign-manager', { employeeId: employee._id, managerId: $event.target.value || null })"
        class="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        @click.stop
      >
        <option value="">Yönetici Kaldır</option>
        <option
          v-for="manager in availableManagers"
          :key="manager._id"
          :value="manager._id"
        >
          {{ manager.firstName }} {{ manager.lastName }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useManagerStore } from '@/stores/managers'

const props = defineProps({
  employee: Object,
  potentialManagers: Array
})

const emit = defineEmits(['assign-manager'])

const managerStore = useManagerStore()
const showDetails = ref(false)

const availableManagers = computed(() => {
  return (props.potentialManagers || []).filter(m => m._id !== props.employee._id)
})

function getInitials(person) {
  const first = person?.firstName?.charAt(0) || ''
  const last = person?.lastName?.charAt(0) || ''
  return (first + last).toUpperCase()
}

function onDragStart(event) {
  managerStore.startDrag(props.employee)
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', props.employee._id)
  showDetails.value = false
}

function onDragEnd() {
  managerStore.endDrag()
}
</script>
