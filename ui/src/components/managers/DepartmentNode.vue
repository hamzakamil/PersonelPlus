<template>
  <div
    class="border rounded-lg overflow-hidden"
    :class="[
      depth === 0 ? 'border-blue-200 ml-4' : 'border-blue-100 ml-6',
      { 'ring-2 ring-blue-500': isDragOver }
    ]"
    @dragover.prevent="onDragOver"
    @drop="onDrop"
  >
    <!-- Department Header -->
    <div
      class="p-3 border-b"
      :class="depth === 0 ? 'bg-blue-50 border-blue-200' : 'bg-blue-25 border-blue-100'"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            v-if="hasChildren"
            @click="isExpanded = !isExpanded"
            class="p-1 hover:bg-blue-100 rounded"
          >
            <svg class="w-4 h-4 text-blue-600 transition-transform" :class="{ 'rotate-90': isExpanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span v-else class="w-6"></span>
          <span class="text-blue-400">|--</span>
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span class="font-medium text-blue-800">{{ department.name }}</span>
          <span class="text-xs text-blue-500">(Departman)</span>
        </div>
        <div class="flex items-center gap-3">
          <!-- Manager Dropdown -->
          <select
            :value="department.manager?._id || ''"
            @change="$emit('assign-dept-manager', { departmentId: department._id, managerId: $event.target.value || null })"
            class="px-2 py-1 bg-white border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Yönetici Yok</option>
            <option v-for="manager in potentialManagers" :key="manager._id" :value="manager._id">
              {{ manager.firstName }} {{ manager.lastName }}
            </option>
          </select>
          <!-- Employee Count -->
          <span class="text-sm text-blue-600">{{ totalEmployeeCount }} çalışan</span>
        </div>
      </div>
    </div>

    <!-- Department Content -->
    <div v-show="isExpanded" class="p-2">
      <!-- Employees -->
      <div v-if="department.employees?.length" class="mb-2">
        <EmployeeList
          :employees="department.employees"
          :potential-managers="potentialManagers"
          @assign-manager="$emit('assign-manager', $event)"
        />
      </div>

      <!-- Child Departments (recursive) -->
      <DepartmentNode
        v-for="child in department.children"
        :key="child._id"
        :department="child"
        :potential-managers="potentialManagers"
        :depth="depth + 1"
        @assign-dept-manager="$emit('assign-dept-manager', $event)"
        @assign-manager="$emit('assign-manager', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useManagerStore } from '@/stores/managers'
import EmployeeList from './EmployeeList.vue'

const props = defineProps({
  department: Object,
  potentialManagers: Array,
  depth: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['assign-dept-manager', 'assign-manager'])

const managerStore = useManagerStore()
const isExpanded = ref(true)

const hasChildren = computed(() => {
  return (props.department.children?.length || 0) > 0 || (props.department.employees?.length || 0) > 0
})

const totalEmployeeCount = computed(() => {
  let count = props.department.employees?.length || 0
  const countChildren = (dept) => {
    let c = dept.employees?.length || 0
    for (const child of dept.children || []) {
      c += countChildren(child)
    }
    return c
  }
  for (const child of props.department.children || []) {
    count += countChildren(child)
  }
  return count
})

const isDragOver = computed(() => {
  const target = managerStore.dragOverTarget
  return target && target.type === 'department' && target.id === props.department._id
})

function onDragOver(event) {
  managerStore.setDragOverTarget({ type: 'department', id: props.department._id })
}

function onDrop(event) {
  const employee = managerStore.draggedEmployee
  if (employee) {
    emit('assign-dept-manager', { departmentId: props.department._id, managerId: employee._id })
  }
  managerStore.endDrag()
}
</script>
