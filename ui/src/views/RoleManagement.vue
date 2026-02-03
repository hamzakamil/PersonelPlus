<template>
  <div class="p-6">
    <div class="flex justify-end items-center mb-6">
      <Button v-if="canCreateRole" @click="showRoleModal = true">Yeni Rol</Button>
    </div>

    <!-- Roller Tablosu -->
    <div class="bg-white rounded-lg shadow overflow-hidden mb-6">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol Adı</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yetki Sayısı</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="role in roles" :key="role._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {{ role.name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ role.description }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span :class="role.isSystemRole ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'" 
                    class="px-2 py-1 text-xs font-semibold rounded-full">
                {{ role.isSystemRole ? 'Sistem' : 'Özel' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ getRolePermissionCount(role._id) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                @click="viewRolePermissions(role)"
                class="text-blue-600 hover:text-blue-900 mr-4"
              >
                Yetkiler
              </button>
              <button
                v-if="canEditRole(role)"
                @click="editRole(role)"
                class="text-green-600 hover:text-green-900 mr-4"
              >
                Düzenle
              </button>
              <button
                v-if="canDeleteRole(role)"
                @click="deleteRole(role)"
                class="text-red-600 hover:text-red-900"
              >
                Sil
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Rol Oluştur/Düzenle Modal -->
    <div v-if="showRoleModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">{{ editingRole ? 'Rol Düzenle' : 'Yeni Rol' }}</h2>
        <form @submit.prevent="saveRole">
          <div class="space-y-4">
            <Input
              v-model="roleForm.name"
              label="Rol Adı"
              required
              :disabled="editingRole && editingRole.isSystemRole"
            />
            <Textarea
              v-model="roleForm.description"
              label="Açıklama"
              required
            />
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeRoleModal">İptal</Button>
              <Button type="submit" :disabled="saving">{{ saving ? 'Kaydediliyor...' : 'Kaydet' }}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Yetki Atama Modal -->
    <div v-if="showPermissionModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
        <h2 class="text-xl font-bold mb-4">{{ selectedRole?.name }} - Yetki Yönetimi</h2>
        
        <!-- Yetki Kategorileri -->
        <div class="space-y-6">
          <div v-for="category in permissionCategories" :key="category">
            {{selectedRole.isSystemRole}}
            <h3 class="text-lg font-semibold text-gray-800 mb-3">{{ getCategoryName(category) }}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label
                v-for="permission in getPermissionsByCategory(category)"
                :key="permission._id"
                class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                :class="{ 'bg-blue-50 border-blue-300': isPermissionAssigned(permission._id) }"
              >
                <input
                  type="checkbox"
                  :checked="isPermissionAssigned(permission._id)"
                  :disabled="selectedRole.isSystemRole && !authStore.isSuperAdmin"
                  @change="togglePermission(permission._id, $event.target.checked)"
                  class="mr-3"
                />
                <div class="flex-1">
                  <div class="font-medium text-gray-900">{{ permission.description }}</div>
                  <div class="text-xs text-gray-500">{{ permission.name }}</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <Button variant="secondary" @click="closePermissionModal">Kapat</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Textarea from '@/components/Textarea.vue'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const toast = useToastStore()
const confirmModal = useConfirmStore()
const authStore = useAuthStore()
const roles = ref([])
const permissions = ref([])
const rolePermissions = ref([])
const showRoleModal = ref(false)
const showPermissionModal = ref(false)
const selectedRole = ref(null)
const editingRole = ref(null)
const saving = ref(false)

const roleForm = ref({
  name: '',
  description: ''
})

const canCreateRole = computed(() => {
  return authStore.hasAnyRole('super_admin', 'bayi_admin')
})

const permissionCategories = computed(() => {
  const categories = [...new Set(permissions.value.map(p => p.category))]
  console.log(permissions)
  return categories.sort()
})

const getCategoryName = (category) => {
  const names = {
    company: 'Şirket',
    employee: 'Çalışan',
    attendance: 'İşe Giriş/Çıkış',
    leave: 'İzin',
    system: 'Sistem'
  }
  return names[category] || category
}

const getPermissionsByCategory = (category) => {
  return permissions.value.filter(p => p.category === category)
}

const isPermissionAssigned = (permissionId) => {
  if (!selectedRole.value) return false
  return rolePermissions.value.some(
    rp => rp.role === selectedRole.value._id && rp.permission === permissionId
  )
}

const getRolePermissionCount = (roleId) => {
  return rolePermissions.value.filter(rp => rp.role === roleId).length
}

const canEditRole = (role) => {
  if (role.isSystemRole && !authStore.isSuperAdmin) return false
  if (authStore.isBayiAdmin) {
    const roleDealerId = role.dealer?._id || role.dealer
    return roleDealerId === authStore.dealerId && role.createdBy === authStore.user?.id
  }
  return authStore.isSuperAdmin
}

const canDeleteRole = (role) => {
  if (role.isSystemRole) return false
  if (authStore.isBayiAdmin) {
    const roleDealerId = role.dealer?._id || role.dealer
    return roleDealerId === authStore.dealerId && role.createdBy === authStore.user?.id
  }
  return authStore.isSuperAdmin
}

const loadRoles = async () => {
  try {
    const response = await api.get('/roles')
    if (response.data.success) {
      roles.value = response.data.data
    }
  } catch (error) {
    console.error('Roller yüklenemedi:', error)
    toast.error(error.response?.data?.message || 'Roller yüklenemedi')
  }
}

const loadPermissions = async () => {
  try {
      const response = await api.get('/permissions')
      console.log(response)
      if (response.data.success) {
        permissions.value = response.data.data
      }
  } catch (error) {
    console.error('Yetkiler yüklenemedi:', error)
  }
}

const loadRolePermissions = async (roleId) => {
  try {
    const response = await api.get(`/roles/${roleId}`)
    if (response.data.success) {
      rolePermissions.value = response.data.data.permissions.map(p => ({
        role: roleId,
        permission: p.permission._id,
        id: p.id
      }))
    }
  } catch (error) {
    console.error('Rol yetkileri yüklenemedi:', error)
  }
}

const viewRolePermissions = async (role) => {
  selectedRole.value = role
  await loadRolePermissions(role._id)
  showPermissionModal.value = true
}

const togglePermission = async (permissionId, checked) => {
  if (!selectedRole.value) return

  try {
    const action = checked ? 'add' : 'remove'
    await api.post(`/roles/${selectedRole.value._id}/permissions`, {
      permissionId,
      action
    })
    
    // Local state'i güncelle
    if (checked) {
      rolePermissions.value.push({
        role: selectedRole.value._id,
        permission: permissionId
      })
    } else {
      rolePermissions.value = rolePermissions.value.filter(
        rp => !(rp.role === selectedRole.value._id && rp.permission === permissionId)
      )
    }
  } catch (error) {
    console.error('Yetki atama hatası:', error)
    toast.error(error.response?.data?.message || 'Yetki atama başarısız')
  }
}

const editRole = (role) => {
  editingRole.value = role
  roleForm.value = {
    name: role.name,
    description: role.description
  }
  showRoleModal.value = true
}

const saveRole = async () => {
  saving.value = true
  try {
    if (editingRole.value) {
      await api.put(`/roles/${editingRole.value._id}`, {
        description: roleForm.value.description
      })
    } else {
      await api.post('/roles', roleForm.value)
    }
    closeRoleModal()
    loadRoles()
  } catch (error) {
    console.error('Rol kaydetme hatası:', error)
    toast.error(error.response?.data?.message || 'Rol kaydedilemedi')
  } finally {
    saving.value = false
  }
}

const deleteRole = async (role) => {
  const confirmed = await confirmModal.show({
    title: 'Rolü Sil',
    message: `"${role.name}" rolünü silmek istediğinizden emin misiniz?`,
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    await api.delete(`/roles/${role._id}`)
    loadRoles()
  } catch (error) {
    console.error('Rol silme hatası:', error)
    toast.error(error.response?.data?.message || 'Rol silinemedi')
  }
}

const closeRoleModal = () => {
  showRoleModal.value = false
  editingRole.value = null
  roleForm.value = {
    name: '',
    description: ''
  }
}

const closePermissionModal = () => {
  showPermissionModal.value = false
  selectedRole.value = null
  rolePermissions.value = []
}

onMounted(async () => {
  await loadRoles()
    await loadPermissions()
})
</script>

<style scoped>
</style>

