<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200">
    <!-- Empty State -->
    <div v-if="!organization || organization.length === 0" class="p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">Organizasyon verisi bulunamadı</h3>
      <p class="mt-1 text-sm text-gray-500">Henüz işyeri veya departman tanımlanmamış.</p>
    </div>

    <!-- Organization Tree -->
    <div v-else class="p-4 space-y-4">
      <!-- Workplaces -->
      <div
        v-for="workplace in organization"
        :key="workplace._id"
        class="border border-green-200 rounded-xl overflow-hidden"
        @dragover.prevent="onDragOver($event, { type: 'workplace', id: workplace._id })"
        @drop="onDrop($event, { type: 'workplace', id: workplace._id })"
        :class="{ 'ring-2 ring-green-500': isDragOver('workplace', workplace._id) }"
      >
        <!-- Workplace Header -->
        <div class="bg-green-50 p-4 border-b border-green-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <button
                @click="toggleExpand('workplace', workplace._id)"
                class="p-1 hover:bg-green-100 rounded"
              >
                <svg class="w-5 h-5 text-green-600 transition-transform" :class="{ 'rotate-90': isExpanded('workplace', workplace._id) }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div>
                <div class="flex items-center gap-2">
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span class="font-semibold text-green-800">{{ workplace.name }}</span>
                  <span v-if="workplace.sgkRegisterNumber" class="text-xs text-green-600">({{ workplace.sgkRegisterNumber }})</span>
                </div>
                <div class="text-sm text-green-600 mt-1">SGK İşyeri</div>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <!-- Manager Dropdown -->
              <div class="flex items-center gap-2">
                <span class="text-sm text-green-700">Yönetici:</span>
                <select
                  :value="workplace.manager?._id || ''"
                  @change="$emit('assign-workplace-manager', { workplaceId: workplace._id, managerId: $event.target.value || null })"
                  class="px-3 py-1.5 bg-white border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Atanmamış</option>
                  <option v-for="manager in potentialManagers" :key="manager._id" :value="manager._id">
                    {{ manager.firstName }} {{ manager.lastName }}
                  </option>
                </select>
              </div>
              <!-- Employee Count -->
              <div class="flex items-center gap-1 text-green-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span class="text-sm">{{ getWorkplaceEmployeeCount(workplace) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Workplace Content -->
        <div v-show="isExpanded('workplace', workplace._id)" class="p-4 space-y-3">
          <!-- Sections -->
          <div
            v-for="section in workplace.sections"
            :key="section._id"
            class="border border-purple-200 rounded-lg overflow-hidden ml-4"
            @dragover.prevent="onDragOver($event, { type: 'section', id: section._id })"
            @drop="onDrop($event, { type: 'section', id: section._id })"
            :class="{ 'ring-2 ring-purple-500': isDragOver('section', section._id) }"
          >
            <div class="bg-purple-50 p-3 border-b border-purple-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-purple-400">|--</span>
                  <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span class="font-medium text-purple-800">{{ section.name }}</span>
                  <span class="text-xs text-purple-500">(Bölüm)</span>
                </div>
                <div class="flex items-center gap-3">
                  <select
                    :value="section.manager?._id || ''"
                    @change="$emit('assign-section-manager', { sectionId: section._id, managerId: $event.target.value || null })"
                    class="px-2 py-1 bg-white border border-purple-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Yönetici Yok</option>
                    <option v-for="manager in potentialManagers" :key="manager._id" :value="manager._id">
                      {{ manager.firstName }} {{ manager.lastName }}
                    </option>
                  </select>
                  <span class="text-sm text-purple-600">{{ section.employees?.length || 0 }} çalışan</span>
                </div>
              </div>
            </div>
            <!-- Section Employees -->
            <div v-if="section.employees?.length" class="p-2 bg-purple-25">
              <EmployeeList
                :employees="section.employees"
                :potential-managers="potentialManagers"
                @assign-manager="$emit('assign-manager', $event)"
              />
            </div>
          </div>

          <!-- Departments -->
          <DepartmentNode
            v-for="dept in workplace.departments"
            :key="dept._id"
            :department="dept"
            :potential-managers="potentialManagers"
            :depth="0"
            @assign-dept-manager="$emit('assign-dept-manager', $event)"
            @assign-manager="$emit('assign-manager', $event)"
          />

          <!-- Direct Employees (no section/dept) -->
          <div v-if="workplace.directEmployees?.length" class="ml-4 mt-3">
            <div class="text-sm text-gray-500 mb-2">Doğrudan Bağlı Çalışanlar:</div>
            <EmployeeList
              :employees="workplace.directEmployees"
              :potential-managers="potentialManagers"
              @assign-manager="$emit('assign-manager', $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useManagerStore } from '@/stores/managers'
import DepartmentNode from './DepartmentNode.vue'
import EmployeeList from './EmployeeList.vue'

const props = defineProps({
  organization: Array,
  potentialManagers: Array
})

const emit = defineEmits([
  'assign-manager',
  'assign-dept-manager',
  'assign-workplace-manager',
  'assign-section-manager'
])

const managerStore = useManagerStore()

// Expand state
const expanded = ref({})

function toggleExpand(type, id) {
  const key = `${type}-${id}`
  expanded.value[key] = !expanded.value[key]
}

function isExpanded(type, id) {
  const key = `${type}-${id}`
  return expanded.value[key] !== false // Default expanded
}

// Drag-drop handlers
function onDragOver(event, target) {
  managerStore.setDragOverTarget(target)
}

function onDrop(event, target) {
  const employee = managerStore.draggedEmployee
  if (employee && target.type === 'workplace') {
    // Assign workplace manager
    emit('assign-workplace-manager', { workplaceId: target.id, managerId: employee._id })
  } else if (employee && target.type === 'section') {
    // Assign section manager
    emit('assign-section-manager', { sectionId: target.id, managerId: employee._id })
  }
  managerStore.endDrag()
}

function isDragOver(type, id) {
  const target = managerStore.dragOverTarget
  return target && target.type === type && target.id === id
}

function getWorkplaceEmployeeCount(workplace) {
  let count = workplace.directEmployees?.length || 0

  for (const section of workplace.sections || []) {
    count += section.employees?.length || 0
  }

  const countDeptEmployees = (dept) => {
    let c = dept.employees?.length || 0
    for (const child of dept.children || []) {
      c += countDeptEmployees(child)
    }
    return c
  }

  for (const dept of workplace.departments || []) {
    count += countDeptEmployees(dept)
  }

  return count
}
</script>
