import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useManagerStore = defineStore('managers', () => {
  // Data state
  const organization = ref(null)
  const employees = ref([])
  const departments = ref([])
  const workplaces = ref([])
  const workplaceSections = ref([])
  const potentialManagers = ref([])
  const statistics = ref(null)

  // Selection state
  const selectedEmployees = ref([])
  const selectedCompany = ref(null)

  // UI state
  const viewMode = ref('hierarchy') // 'hierarchy' | 'table' | 'orgchart'
  const loading = ref(false)
  const filters = ref({
    company: '',
    workplace: '',
    department: '',
    search: '',
    hasManager: null // true/false/null
  })

  // Drag-drop state
  const draggedEmployee = ref(null)
  const dragOverTarget = ref(null)

  // Computed
  const filteredEmployees = computed(() => {
    if (!employees.value.length) return []

    return employees.value.filter(emp => {
      // Search filter
      if (filters.value.search) {
        const search = filters.value.search.toLowerCase()
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase()
        if (!fullName.includes(search) && !emp.email?.toLowerCase().includes(search)) {
          return false
        }
      }

      // Workplace filter
      if (filters.value.workplace) {
        if (!emp.workplace || emp.workplace._id !== filters.value.workplace) {
          return false
        }
      }

      // Department filter
      if (filters.value.department) {
        if (!emp.department || emp.department._id !== filters.value.department) {
          return false
        }
      }

      // Manager filter
      if (filters.value.hasManager === true && !emp.manager) return false
      if (filters.value.hasManager === false && emp.manager) return false

      return true
    })
  })

  const unassignedCount = computed(() => {
    return employees.value.filter(e => !e.manager).length
  })

  const totalEmployees = computed(() => employees.value.length)

  // Actions
  async function loadOrganization(companyId) {
    loading.value = true
    try {
      const params = companyId ? { company: companyId } : {}
      const response = await api.get('/managers/organization', { params })

      if (response.data.success) {
        organization.value = response.data.data.organization
        employees.value = extractAllEmployees(response.data.data.organization, response.data.data.unassigned)
        return { success: true, data: response.data.data }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Organization load error:', error)
      return { success: false, message: error.response?.data?.message || 'Organizasyon yüklenemedi' }
    } finally {
      loading.value = false
    }
  }

  function extractAllEmployees(org, unassigned) {
    const all = [...(unassigned || [])]

    for (const workplace of org || []) {
      // Direct employees
      if (workplace.directEmployees) {
        all.push(...workplace.directEmployees)
      }

      // Section employees
      for (const section of workplace.sections || []) {
        if (section.employees) {
          all.push(...section.employees)
        }
      }

      // Department employees (recursive)
      const extractDeptEmployees = (dept) => {
        if (dept.employees) {
          all.push(...dept.employees)
        }
        for (const child of dept.children || []) {
          extractDeptEmployees(child)
        }
      }

      for (const dept of workplace.departments || []) {
        extractDeptEmployees(dept)
      }
    }

    return all
  }

  async function loadStatistics(companyId) {
    try {
      const params = companyId ? { company: companyId } : {}
      const response = await api.get('/managers/statistics', { params })

      if (response.data.success) {
        statistics.value = response.data.data
        return { success: true, data: response.data.data }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Statistics load error:', error)
      return { success: false, message: error.response?.data?.message || 'İstatistikler yüklenemedi' }
    }
  }

  async function loadPotentialManagers(companyId, excludeId = null) {
    try {
      const params = { company: companyId }
      if (excludeId) params.excludeId = excludeId

      const response = await api.get('/managers/potential-managers', { params })

      if (response.data.success) {
        potentialManagers.value = response.data.data
        return { success: true, data: response.data.data }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Potential managers load error:', error)
      return { success: false, message: error.response?.data?.message || 'Yöneticiler yüklenemedi' }
    }
  }

  async function assignEmployeeManager(employeeId, managerId) {
    try {
      const response = await api.put(`/managers/employee/${employeeId}/manager`, { managerId })

      if (response.data.success) {
        // Update local state
        const employee = employees.value.find(e => e._id === employeeId)
        if (employee) {
          employee.manager = managerId ? potentialManagers.value.find(m => m._id === managerId) : null
        }
        return { success: true, data: response.data.data }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Assign manager error:', error)
      return { success: false, message: error.response?.data?.message || 'Yönetici atanamadı' }
    }
  }

  async function assignDepartmentManager(departmentId, managerId) {
    try {
      const response = await api.put(`/managers/department/${departmentId}/manager`, { managerId })

      if (response.data.success) {
        return { success: true, data: response.data.data }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Assign department manager error:', error)
      return { success: false, message: error.response?.data?.message || 'Departman yöneticisi atanamadı' }
    }
  }

  async function assignWorkplaceManager(workplaceId, managerId) {
    try {
      const response = await api.put(`/managers/workplace/${workplaceId}/manager`, { managerId })

      if (response.data.success) {
        return { success: true, data: response.data.data }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Assign workplace manager error:', error)
      return { success: false, message: error.response?.data?.message || 'İşyeri yöneticisi atanamadı' }
    }
  }

  async function assignSectionManager(sectionId, managerId) {
    try {
      const response = await api.put(`/managers/workplace-section/${sectionId}/manager`, { managerId })

      if (response.data.success) {
        return { success: true, data: response.data.data }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Assign section manager error:', error)
      return { success: false, message: error.response?.data?.message || 'Bölüm yöneticisi atanamadı' }
    }
  }

  async function bulkAssignManager(employeeIds, managerId) {
    try {
      const response = await api.post('/managers/bulk-assign', { employeeIds, managerId })

      if (response.data.success) {
        // Clear selection after successful bulk operation
        selectedEmployees.value = []
        return { success: true, data: response.data.data }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Bulk assign error:', error)
      return { success: false, message: error.response?.data?.message || 'Toplu atama başarısız' }
    }
  }

  async function getApprovalChain(employeeId) {
    try {
      const response = await api.get(`/managers/employee/${employeeId}/approval-chain`)

      if (response.data.success) {
        return { success: true, data: response.data.data }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Get approval chain error:', error)
      return { success: false, message: error.response?.data?.message || 'Onay zinciri alınamadı' }
    }
  }

  // Selection helpers
  function toggleSelectEmployee(employeeId) {
    const index = selectedEmployees.value.indexOf(employeeId)
    if (index === -1) {
      selectedEmployees.value.push(employeeId)
    } else {
      selectedEmployees.value.splice(index, 1)
    }
  }

  function selectAllEmployees() {
    selectedEmployees.value = filteredEmployees.value.map(e => e._id)
  }

  function clearSelection() {
    selectedEmployees.value = []
  }

  function isSelected(employeeId) {
    return selectedEmployees.value.includes(employeeId)
  }

  // Drag-drop helpers
  function startDrag(employee) {
    draggedEmployee.value = employee
  }

  function endDrag() {
    draggedEmployee.value = null
    dragOverTarget.value = null
  }

  function setDragOverTarget(target) {
    dragOverTarget.value = target
  }

  // Filter helpers
  function setFilter(key, value) {
    filters.value[key] = value
  }

  function clearFilters() {
    filters.value = {
      company: '',
      workplace: '',
      department: '',
      search: '',
      hasManager: null
    }
  }

  function setViewMode(mode) {
    viewMode.value = mode
  }

  function reset() {
    organization.value = null
    employees.value = []
    departments.value = []
    workplaces.value = []
    workplaceSections.value = []
    potentialManagers.value = []
    statistics.value = null
    selectedEmployees.value = []
    selectedCompany.value = null
    clearFilters()
  }

  return {
    // State
    organization,
    employees,
    departments,
    workplaces,
    workplaceSections,
    potentialManagers,
    statistics,
    selectedEmployees,
    selectedCompany,
    viewMode,
    loading,
    filters,
    draggedEmployee,
    dragOverTarget,

    // Computed
    filteredEmployees,
    unassignedCount,
    totalEmployees,

    // Actions
    loadOrganization,
    loadStatistics,
    loadPotentialManagers,
    assignEmployeeManager,
    assignDepartmentManager,
    assignWorkplaceManager,
    assignSectionManager,
    bulkAssignManager,
    getApprovalChain,

    // Selection helpers
    toggleSelectEmployee,
    selectAllEmployees,
    clearSelection,
    isSelected,

    // Drag-drop helpers
    startDrag,
    endDrag,
    setDragOverTarget,

    // Filter helpers
    setFilter,
    clearFilters,
    setViewMode,
    reset
  }
})
