<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Yönetici Atama</h1>
        <p class="text-sm text-gray-500 mt-1">Çalışanlara, departmanlara ve işyerlerine yönetici atayın</p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="managerStore.selectedEmployees.length > 0"
          @click="showBulkAssignModal = true"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Toplu Ata ({{ managerStore.selectedEmployees.length }})
        </button>
        <button
          @click="refreshData"
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          :disabled="managerStore.loading"
        >
          <svg class="w-5 h-5" :class="{ 'animate-spin': managerStore.loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Yenile
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <!-- Company Filter (Super Admin / Bayi Admin) -->
        <div v-if="isSuperAdmin || isBayiAdmin">
          <label class="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
          <select
            v-model="selectedCompany"
            @change="onCompanyChange"
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Şirket Seçin</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }}
            </option>
          </select>
        </div>

        <!-- Workplace Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">SGK İşyeri</label>
          <select
            v-model="managerStore.filters.workplace"
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tümü</option>
            <option v-for="wp in workplaceOptions" :key="wp._id" :value="wp._id">
              {{ wp.name }}
            </option>
          </select>
        </div>

        <!-- Department Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Departman</label>
          <select
            v-model="managerStore.filters.department"
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tümü</option>
            <option v-for="dept in departmentOptions" :key="dept._id" :value="dept._id">
              {{ dept.name }}
            </option>
          </select>
        </div>

        <!-- Manager Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Yönetici Durumu</label>
          <select
            v-model="managerStore.filters.hasManager"
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option :value="null">Tümü</option>
            <option :value="true">Yöneticisi Var</option>
            <option :value="false">Yöneticisi Yok</option>
          </select>
        </div>

        <!-- Search -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ara</label>
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="managerStore.filters.search"
              type="text"
              placeholder="Ad, soyad, email..."
              class="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <!-- Clear Filters Button -->
      <div class="mt-3 flex justify-end">
        <button
          @click="managerStore.clearFilters()"
          class="text-sm text-gray-500 hover:text-gray-700"
        >
          Filtreleri Temizle
        </button>
      </div>
    </div>

    <!-- View Mode Tabs -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
      <div class="border-b border-gray-200">
        <nav class="flex -mb-px">
          <button
            @click="managerStore.setViewMode('hierarchy')"
            :class="[
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              managerStore.viewMode === 'hierarchy'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Hiyerarşi
            </div>
          </button>
          <button
            @click="managerStore.setViewMode('table')"
            :class="[
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              managerStore.viewMode === 'table'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Tablo
            </div>
          </button>
          <button
            @click="managerStore.setViewMode('orgchart')"
            :class="[
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              managerStore.viewMode === 'orgchart'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Org Şeması
            </div>
          </button>
        </nav>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="managerStore.loading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
      <div class="flex flex-col items-center justify-center">
        <svg class="animate-spin h-10 w-10 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-gray-500">Yükleniyor...</p>
      </div>
    </div>

    <!-- No Company Selected -->
    <div v-else-if="(isSuperAdmin || isBayiAdmin) && !selectedCompany" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
      <div class="flex flex-col items-center justify-center text-center">
        <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Şirket Seçin</h3>
        <p class="text-gray-500">Yönetici atama işlemleri için önce bir şirket seçin.</p>
      </div>
    </div>

    <!-- Content Views -->
    <template v-else>
      <!-- Hierarchy View -->
      <ManagerOrgTree
        v-if="managerStore.viewMode === 'hierarchy'"
        :organization="managerStore.organization"
        :potential-managers="managerStore.potentialManagers"
        @assign-manager="handleAssignManager"
        @assign-dept-manager="handleAssignDeptManager"
        @assign-workplace-manager="handleAssignWorkplaceManager"
        @assign-section-manager="handleAssignSectionManager"
      />

      <!-- Table View -->
      <ManagerTableView
        v-else-if="managerStore.viewMode === 'table'"
        :employees="managerStore.filteredEmployees"
        :potential-managers="managerStore.potentialManagers"
        @assign-manager="handleAssignManager"
      />

      <!-- Org Chart View -->
      <ManagerOrgChart
        v-else-if="managerStore.viewMode === 'orgchart'"
        :organization="managerStore.organization"
        :potential-managers="managerStore.potentialManagers"
        @assign-manager="handleAssignManager"
      />
    </template>

    <!-- Statistics Footer -->
    <div v-if="managerStore.statistics" class="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Employees Stats -->
        <div class="text-center p-3 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-gray-900">{{ managerStore.statistics.employees?.total || 0 }}</div>
          <div class="text-sm text-gray-500">Toplam Çalışan</div>
          <div class="mt-1 flex justify-center gap-2 text-xs">
            <span class="text-green-600">{{ managerStore.statistics.employees?.withManager || 0 }} yöneticili</span>
            <span class="text-red-600">{{ managerStore.statistics.employees?.withoutManager || 0 }} yöneticisiz</span>
          </div>
        </div>

        <!-- Departments Stats -->
        <div class="text-center p-3 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-gray-900">{{ managerStore.statistics.departments?.total || 0 }}</div>
          <div class="text-sm text-gray-500">Departman</div>
          <div class="mt-1 flex justify-center gap-2 text-xs">
            <span class="text-green-600">{{ managerStore.statistics.departments?.withManager || 0 }} yöneticili</span>
            <span class="text-red-600">{{ managerStore.statistics.departments?.withoutManager || 0 }} yöneticisiz</span>
          </div>
        </div>

        <!-- Workplaces Stats -->
        <div class="text-center p-3 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-gray-900">{{ managerStore.statistics.workplaces?.total || 0 }}</div>
          <div class="text-sm text-gray-500">SGK İşyeri</div>
          <div class="mt-1 flex justify-center gap-2 text-xs">
            <span class="text-green-600">{{ managerStore.statistics.workplaces?.withManager || 0 }} yöneticili</span>
            <span class="text-red-600">{{ managerStore.statistics.workplaces?.withoutManager || 0 }} yöneticisiz</span>
          </div>
        </div>

        <!-- Sections Stats -->
        <div class="text-center p-3 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-gray-900">{{ managerStore.statistics.sections?.total || 0 }}</div>
          <div class="text-sm text-gray-500">İşyeri Bölümü</div>
          <div class="mt-1 flex justify-center gap-2 text-xs">
            <span class="text-green-600">{{ managerStore.statistics.sections?.withManager || 0 }} yöneticili</span>
            <span class="text-red-600">{{ managerStore.statistics.sections?.withoutManager || 0 }} yöneticisiz</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Assign Modal -->
    <div v-if="showBulkAssignModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Toplu Yönetici Atama</h3>
          <p class="text-sm text-gray-500 mt-1">{{ managerStore.selectedEmployees.length }} çalışana yönetici ata</p>
        </div>
        <div class="p-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Yönetici Seç</label>
          <select
            v-model="bulkManagerId"
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Yönetici Kaldır</option>
            <option v-for="manager in managerStore.potentialManagers" :key="manager._id" :value="manager._id">
              {{ manager.firstName }} {{ manager.lastName }} - {{ manager.position || 'Pozisyon belirtilmemiş' }}
            </option>
          </select>
        </div>
        <div class="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            @click="showBulkAssignModal = false"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            İptal
          </button>
          <button
            @click="handleBulkAssign"
            :disabled="bulkAssigning"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {{ bulkAssigning ? 'Atanıyor...' : 'Ata' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useManagerStore } from '@/stores/managers'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import ManagerOrgTree from '@/components/managers/ManagerOrgTree.vue'
import ManagerTableView from '@/components/managers/ManagerTableView.vue'
import ManagerOrgChart from '@/components/managers/ManagerOrgChart.vue'

const managerStore = useManagerStore()
const authStore = useAuthStore()
const toast = useToastStore()

// User role checks
const isSuperAdmin = computed(() => authStore.isSuperAdmin)
const isBayiAdmin = computed(() => authStore.isBayiAdmin)

// Data
const companies = ref([])
const selectedCompany = ref('')
const showBulkAssignModal = ref(false)
const bulkManagerId = ref('')
const bulkAssigning = ref(false)

// Computed options for filters
const workplaceOptions = computed(() => {
  if (!managerStore.organization) return []
  return managerStore.organization.map(wp => ({ _id: wp._id, name: wp.name }))
})

const departmentOptions = computed(() => {
  if (!managerStore.organization) return []
  const depts = []
  const extractDepts = (items) => {
    for (const item of items) {
      if (item.type === 'department') {
        depts.push({ _id: item._id, name: item.name })
        if (item.children) extractDepts(item.children)
      }
    }
  }
  for (const wp of managerStore.organization) {
    if (wp.departments) extractDepts(wp.departments)
  }
  return depts
})

// Load companies (for super admin / bayi admin)
async function loadCompanies() {
  try {
    const response = await api.get('/companies')
    companies.value = response.data?.data || response.data || []

    // Bayi'nin kendi şirketi varsa onu seç, yoksa ilk şirketi seç
    if (companies.value.length > 0) {
      if (authStore.companyId) {
        // Kullanıcının kendi şirketini bul ve seç
        const userCompany = companies.value.find(c => c._id === authStore.companyId)
        if (userCompany) {
          selectedCompany.value = userCompany._id
        } else {
          selectedCompany.value = companies.value[0]._id
        }
      } else {
        // Kendi şirketi yoksa ilk şirketi seç
        selectedCompany.value = companies.value[0]._id
      }
      // Şirket seçildiğinde verileri yükle
      await loadOrganizationData(selectedCompany.value)
    }
  } catch (error) {
    console.error('Companies load error:', error)
    companies.value = []
  }
}

// Load data when company changes
async function onCompanyChange() {
  if (!selectedCompany.value) {
    managerStore.reset()
    return
  }

  await loadOrganizationData(selectedCompany.value)
}

// Load organization data
async function loadOrganizationData(companyId) {
  const orgResult = await managerStore.loadOrganization(companyId)
  if (!orgResult.success) {
    toast.error(orgResult.message || 'Organizasyon yüklenemedi')
    return
  }

  // Load statistics and potential managers in parallel
  await Promise.all([
    managerStore.loadStatistics(companyId),
    managerStore.loadPotentialManagers(companyId)
  ])
}

// Refresh data
async function refreshData() {
  const companyId = selectedCompany.value || authStore.companyId
  if (companyId) {
    await loadOrganizationData(companyId)
    toast.success('Veriler yenilendi')
  }
}

// Handler functions
async function handleAssignManager({ employeeId, managerId }) {
  const result = await managerStore.assignEmployeeManager(employeeId, managerId)
  if (result.success) {
    toast.success('Yönetici başarıyla atandı')
    await refreshData()
  } else {
    toast.error(result.message || 'Yönetici atanamıyor')
  }
}

async function handleAssignDeptManager({ departmentId, managerId }) {
  const result = await managerStore.assignDepartmentManager(departmentId, managerId)
  if (result.success) {
    toast.success('Departman yöneticisi başarıyla atandı')
    await refreshData()
  } else {
    toast.error(result.message || 'Departman yöneticisi atanamıyor')
  }
}

async function handleAssignWorkplaceManager({ workplaceId, managerId }) {
  const result = await managerStore.assignWorkplaceManager(workplaceId, managerId)
  if (result.success) {
    toast.success('İşyeri yöneticisi başarıyla atandı')
    await refreshData()
  } else {
    toast.error(result.message || 'İşyeri yöneticisi atanamıyor')
  }
}

async function handleAssignSectionManager({ sectionId, managerId }) {
  const result = await managerStore.assignSectionManager(sectionId, managerId)
  if (result.success) {
    toast.success('Bölüm yöneticisi başarıyla atandı')
    await refreshData()
  } else {
    toast.error(result.message || 'Bölüm yöneticisi atanamıyor')
  }
}

async function handleBulkAssign() {
  bulkAssigning.value = true
  try {
    const result = await managerStore.bulkAssignManager(
      managerStore.selectedEmployees,
      bulkManagerId.value || null
    )
    if (result.success) {
      toast.success(result.data?.message || 'Toplu atama tamamlandı')
      showBulkAssignModal.value = false
      bulkManagerId.value = ''
      await refreshData()
    } else {
      toast.error(result.message || 'Toplu atama başarısız')
    }
  } finally {
    bulkAssigning.value = false
  }
}

// Initialize
onMounted(async () => {
  if (isSuperAdmin.value || isBayiAdmin.value) {
    await loadCompanies()
  } else {
    // Company admin - load data directly
    const companyId = authStore.companyId
    if (companyId) {
      selectedCompany.value = companyId
      await loadOrganizationData(companyId)
    }
  }
})
</script>
