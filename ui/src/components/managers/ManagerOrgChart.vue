<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <!-- Toolbar -->
    <div class="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between">
      <div class="text-sm text-gray-600">
        Çalışanları sürükleyip bir yöneticinin üzerine bırakarak atama yapabilirsiniz
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="zoomIn"
          class="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Yakınlaştır"
        >
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
        <button
          @click="zoomOut"
          class="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Uzaklaştır"
        >
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <button
          @click="resetZoom"
          class="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Sıfırla"
        >
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Org Chart Container -->
    <div
      ref="chartContainer"
      class="p-8 overflow-auto min-h-[500px]"
      :style="{ transform: `scale(${zoom})`, transformOrigin: 'top left' }"
    >
      <!-- Empty State -->
      <div v-if="!organization || organization.length === 0" class="flex flex-col items-center justify-center h-96">
        <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Organizasyon Şeması</h3>
        <p class="text-gray-500">Veri yüklendiğinde organizasyon şeması burada görünecek.</p>
      </div>

      <!-- Org Chart -->
      <div v-else class="flex flex-col items-center">
        <!-- Loop through workplaces as top-level nodes -->
        <div v-for="workplace in organization" :key="workplace._id" class="mb-12">
          <!-- Workplace Card -->
          <OrgChartNode
            :node="{ ...workplace, type: 'workplace', name: workplace.name }"
            :potential-managers="potentialManagers"
            node-color="green"
            @assign-manager="handleAssignManager"
          />

          <!-- Workplace Children (Departments + Sections) -->
          <div v-if="hasChildren(workplace)" class="flex justify-center mt-8">
            <!-- Connector Line -->
            <div class="absolute w-px h-8 bg-gray-300 -mt-8"></div>

            <!-- Children Container -->
            <div class="flex gap-8 items-start">
              <!-- Departments -->
              <div v-for="dept in workplace.departments" :key="dept._id" class="flex flex-col items-center">
                <OrgChartNode
                  :node="{ ...dept, type: 'department' }"
                  :potential-managers="potentialManagers"
                  node-color="blue"
                  @assign-manager="handleAssignManager"
                />

                <!-- Department Employees -->
                <div v-if="dept.employees?.length" class="mt-4 flex flex-wrap gap-2 justify-center max-w-xs">
                  <EmployeeChip
                    v-for="emp in dept.employees.slice(0, 5)"
                    :key="emp._id"
                    :employee="emp"
                    :potential-managers="potentialManagers"
                    @assign-manager="$emit('assign-manager', $event)"
                  />
                  <div v-if="dept.employees.length > 5" class="text-xs text-gray-500 w-full text-center mt-1">
                    +{{ dept.employees.length - 5 }} çalışan daha
                  </div>
                </div>

                <!-- Child Departments (recursive) -->
                <div v-if="dept.children?.length" class="mt-4 flex gap-4">
                  <div v-for="child in dept.children" :key="child._id" class="flex flex-col items-center">
                    <OrgChartNode
                      :node="{ ...child, type: 'department' }"
                      :potential-managers="potentialManagers"
                      node-color="blue"
                      @assign-manager="handleAssignManager"
                    />
                  </div>
                </div>
              </div>

              <!-- Sections -->
              <div v-for="section in workplace.sections" :key="section._id" class="flex flex-col items-center">
                <OrgChartNode
                  :node="{ ...section, type: 'section' }"
                  :potential-managers="potentialManagers"
                  node-color="purple"
                  @assign-manager="handleAssignManager"
                />

                <!-- Section Employees -->
                <div v-if="section.employees?.length" class="mt-4 flex flex-wrap gap-2 justify-center max-w-xs">
                  <EmployeeChip
                    v-for="emp in section.employees.slice(0, 5)"
                    :key="emp._id"
                    :employee="emp"
                    :potential-managers="potentialManagers"
                    @assign-manager="$emit('assign-manager', $event)"
                  />
                  <div v-if="section.employees.length > 5" class="text-xs text-gray-500 w-full text-center mt-1">
                    +{{ section.employees.length - 5 }} çalışan daha
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import OrgChartNode from './OrgChartNode.vue'
import EmployeeChip from './EmployeeChip.vue'

const props = defineProps({
  organization: Array,
  potentialManagers: Array
})

const emit = defineEmits(['assign-manager'])

const chartContainer = ref(null)
const zoom = ref(1)

function zoomIn() {
  zoom.value = Math.min(zoom.value + 0.1, 2)
}

function zoomOut() {
  zoom.value = Math.max(zoom.value - 0.1, 0.5)
}

function resetZoom() {
  zoom.value = 1
}

function hasChildren(workplace) {
  return (workplace.departments?.length > 0) || (workplace.sections?.length > 0)
}

function handleAssignManager(payload) {
  emit('assign-manager', payload)
}
</script>
