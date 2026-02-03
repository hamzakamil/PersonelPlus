<template>
  <div
    class="relative border-2 rounded-xl p-4 min-w-48 text-center transition-all"
    :class="[
      nodeClasses,
      { 'ring-2 ring-offset-2': isDragOver }
    ]"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Node Icon -->
    <div class="flex justify-center mb-2">
      <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="iconBgClass">
        <svg v-if="node.type === 'workplace'" class="w-5 h-5" :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <svg v-else-if="node.type === 'department'" class="w-5 h-5" :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <svg v-else class="w-5 h-5" :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </div>
    </div>

    <!-- Node Name -->
    <div class="font-semibold text-gray-900 mb-1">{{ node.name }}</div>

    <!-- Node Type Badge -->
    <div class="text-xs mb-3" :class="typeClass">
      {{ nodeTypeLabel }}
    </div>

    <!-- Manager -->
    <div class="border-t pt-3 mt-2" :class="borderClass">
      <div class="text-xs text-gray-500 mb-1">Yönetici</div>
      <div v-if="node.manager" class="flex items-center justify-center gap-2">
        <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
          {{ getInitials(node.manager) }}
        </div>
        <span class="text-sm font-medium text-gray-700">
          {{ node.manager.firstName }} {{ node.manager.lastName }}
        </span>
      </div>
      <div v-else class="text-sm text-red-500">
        Atanmamış
      </div>
    </div>

    <!-- Drop Zone Indicator -->
    <div v-if="isDragOver" class="absolute inset-0 bg-indigo-500 bg-opacity-10 rounded-xl flex items-center justify-center">
      <span class="text-indigo-700 font-medium text-sm">Yönetici olarak ata</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useManagerStore } from '@/stores/managers'

const props = defineProps({
  node: Object,
  potentialManagers: Array,
  nodeColor: {
    type: String,
    default: 'gray'
  }
})

const emit = defineEmits(['assign-manager'])

const managerStore = useManagerStore()
const isDragOver = ref(false)

const nodeClasses = computed(() => {
  const colors = {
    green: 'border-green-300 bg-green-50',
    blue: 'border-blue-300 bg-blue-50',
    purple: 'border-purple-300 bg-purple-50',
    gray: 'border-gray-300 bg-gray-50'
  }
  return colors[props.nodeColor] || colors.gray
})

const iconBgClass = computed(() => {
  const colors = {
    green: 'bg-green-200',
    blue: 'bg-blue-200',
    purple: 'bg-purple-200',
    gray: 'bg-gray-200'
  }
  return colors[props.nodeColor] || colors.gray
})

const iconClass = computed(() => {
  const colors = {
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    gray: 'text-gray-700'
  }
  return colors[props.nodeColor] || colors.gray
})

const typeClass = computed(() => {
  const colors = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600'
  }
  return colors[props.nodeColor] || colors.gray
})

const borderClass = computed(() => {
  const colors = {
    green: 'border-green-200',
    blue: 'border-blue-200',
    purple: 'border-purple-200',
    gray: 'border-gray-200'
  }
  return colors[props.nodeColor] || colors.gray
})

const nodeTypeLabel = computed(() => {
  const labels = {
    workplace: 'SGK İşyeri',
    department: 'Departman',
    section: 'Bölüm'
  }
  return labels[props.node.type] || 'Birim'
})

function getInitials(person) {
  const first = person?.firstName?.charAt(0) || ''
  const last = person?.lastName?.charAt(0) || ''
  return (first + last).toUpperCase()
}

function onDragOver(event) {
  isDragOver.value = true
  managerStore.setDragOverTarget({ type: props.node.type, id: props.node._id })
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(event) {
  isDragOver.value = false
  const employee = managerStore.draggedEmployee

  if (employee) {
    // Emit based on node type
    if (props.node.type === 'workplace') {
      emit('assign-manager', {
        type: 'workplace',
        workplaceId: props.node._id,
        managerId: employee._id
      })
    } else if (props.node.type === 'department') {
      emit('assign-manager', {
        type: 'department',
        departmentId: props.node._id,
        managerId: employee._id
      })
    } else if (props.node.type === 'section') {
      emit('assign-manager', {
        type: 'section',
        sectionId: props.node._id,
        managerId: employee._id
      })
    }
  }

  managerStore.endDrag()
}
</script>
