<template>
  <div class="p-6">
    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-sm font-semibold text-gray-700">Filtreler</h3>
        <Button v-if="canCreateUser" @click="showUserModal = true">Yeni Kullanıcı</Button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div v-if="userRole === 'super_admin'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Bayi</label>
          <select
            v-model="filters.dealerId"
            @change="loadUsers"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option v-for="dealer in dealers" :key="dealer._id" :value="dealer._id">
              {{ dealer.name }}
            </option>
          </select>
        </div>
        <div v-if="userRole === 'super_admin' || userRole === 'bayi_admin'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
          <select
            v-model="filters.companyId"
            @change="loadUsers"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            v-model="filters.role"
            @change="loadUsers"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option v-for="role in availableRoles" :key="role.name" :value="role.name">
              {{ role.description }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ara</label>
          <input
            v-model="filters.search"
            @input="debounceSearch"
            type="text"
            placeholder="Email..."
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Hierarchical View (Super Admin için) -->
    <div
      v-if="
        userRole === 'super_admin' && !filters.dealerId && !filters.companyId && hierarchicalData
      "
      class="mb-6"
    >
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="p-4 border-b">
          <h2 class="text-lg font-semibold text-gray-800">Hiyerarşik Görünüm</h2>
        </div>
        <div class="p-4 space-y-4 max-h-96 overflow-y-auto">
          <div
            v-for="dealerGroup in hierarchicalData"
            :key="dealerGroup.dealer._id"
            class="border-l-4 border-blue-500 pl-4"
          >
            <h3 class="font-semibold text-gray-800 mb-2">
              🏢 {{ dealerGroup.dealer.name }}
              <span class="text-sm text-gray-500 ml-2"
                >({{ dealerGroup.dealerUsers.length }} kullanıcı)</span
              >
            </h3>

            <!-- Bayi seviyesindeki kullanıcılar -->
            <div v-if="dealerGroup.dealerUsers.length > 0" class="ml-4 mb-3">
              <div
                v-for="user in dealerGroup.dealerUsers"
                :key="user._id"
                class="text-sm text-gray-600 mb-1"
              >
                • <span class="no-uppercase">{{ user.email }}</span> - {{ user.role?.description }}
              </div>
            </div>

            <!-- Şirketler -->
            <div
              v-for="companyGroup in dealerGroup.companies"
              :key="companyGroup.company._id"
              class="ml-4 mt-3 border-l-2 border-gray-300 pl-4"
            >
              <h4 class="font-medium text-gray-700 mb-1">
                📦 {{ companyGroup.company.name }}
                <span class="text-xs text-gray-500"
                  >({{ companyGroup.users.length }} kullanıcı)</span
                >
              </h4>
              <div
                v-for="user in companyGroup.users"
                :key="user._id"
                class="text-sm text-gray-600 mb-1 ml-2"
              >
                • <span class="no-uppercase">{{ user.email }}</span> - {{ user.role?.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Kullanıcı Tablosu -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 table-fixed">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="w-16 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                No
              </th>
              <th
                class="w-[20%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Email
              </th>
              <th
                class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Rol
              </th>
              <th
                class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Bayi
              </th>
              <th
                class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Şirket
              </th>
              <th
                class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Durum
              </th>
              <th
                class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="(user, index) in users"
              :key="user._id"
              :class="{ 'bg-gray-50': index % 2 === 1, 'bg-white': index % 2 === 0 }"
            >
              <td class="px-2 py-3 text-sm text-gray-900 font-medium">
                {{ (pagination.page - 1) * pagination.limit + index + 1 }}
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-900 truncate lowercase" :title="user.email">
                  {{ user.email }}
                </div>
              </td>
              <td class="px-2 py-3">
                <div
                  class="text-sm text-gray-600 truncate"
                  :title="user.role?.description || user.role?.name"
                >
                  {{ user.role?.description || user.role?.name }}
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600 truncate" :title="user.dealer?.name || '-'">
                  {{ user.dealer?.name || '-' }}
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600 truncate" :title="user.company?.name || '-'">
                  {{ user.company?.name || '-' }}
                </div>
              </td>
              <td class="px-2 py-3">
                <span
                  :class="user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="px-1.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap"
                >
                  {{ user.isActive ? 'Aktif' : 'Pasif' }}
                </span>
              </td>
              <td class="px-2 py-3">
                <div class="flex gap-1">
                  <button
                    @click="editUser(user)"
                    class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                    title="Düzenle"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="manageRolePermissions(user)"
                    class="p-1.5 text-green-600 hover:bg-green-50 rounded"
                    title="Rol & Yetki"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </button>
                  <button
                    v-if="canDeleteUser(user)"
                    @click="deleteUser(user)"
                    class="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Sil"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- İstatistikler ve Sayfalama -->
      <div class="p-4 bg-gray-50 border-t">
        <div class="flex justify-between items-center mb-3">
          <p class="text-sm text-gray-600">
            Toplam {{ pagination.total }} kullanıcı
            <span v-if="pagination.pages > 1" class="text-gray-500">
              ({{ (pagination.page - 1) * pagination.limit + 1 }}-{{
                Math.min(pagination.page * pagination.limit, pagination.total)
              }}
              gösteriliyor)
            </span>
          </p>
          <div class="flex gap-4 text-sm text-gray-600">
            <span
              >Aktif: <strong class="text-green-600">{{ activeUserCount }}</strong></span
            >
            <span
              >Pasif: <strong class="text-red-600">{{ inactiveUserCount }}</strong></span
            >
          </div>
        </div>

        <!-- Sayfalama -->
        <div v-if="pagination.pages > 1" class="flex justify-center gap-2">
          <button
            :disabled="pagination.page === 1"
            @click="changePage(pagination.page - 1)"
            class="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Önceki
          </button>
          <button
            :disabled="pagination.page === pagination.pages"
            @click="changePage(pagination.page + 1)"
            class="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>

    <!-- Rol & Yetki Yönetim Modal -->
    <div
      v-if="showRolePermissionModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">
          <span class="no-uppercase">{{ selectedUser?.email }}</span> - Rol & Yetki Yönetimi
        </h2>

        <div class="space-y-6">
          <!-- Rol Seçimi -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Rol</label>
            <select
              v-model="rolePermissionForm.roleId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Mevcut Rol: {{ selectedUser?.role?.description }}</option>
              <option v-for="role in availableRolesForAssignment" :key="role._id" :value="role._id">
                {{ role.description }}
              </option>
            </select>
          </div>

          <!-- Yetki Seçimi -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Yetkiler</label>
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4"
            >
              <label
                v-for="permission in permissions"
                :key="permission._id"
                class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                :class="{
                  'bg-blue-50 border-blue-300': rolePermissionForm.permissionIds.includes(
                    permission._id
                  ),
                }"
              >
                <input
                  type="checkbox"
                  :value="permission._id"
                  v-model="rolePermissionForm.permissionIds"
                  class="mr-2"
                />
                <div class="flex-1">
                  <div class="font-medium text-sm text-gray-900">{{ permission.description }}</div>
                  <div class="text-xs text-gray-500">{{ permission.name }}</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Şirket Seçimi (Bayi Admin için) -->
          <div v-if="userRole === 'bayi_admin' && companies.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Geçerli Şirketler (Yetkilerin geçerli olacağı şirketler)</label
            >
            <div
              class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4"
            >
              <label
                v-for="company in companies"
                :key="company._id"
                class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                :class="{
                  'bg-blue-50 border-blue-300': rolePermissionForm.companies.includes(company._id),
                }"
              >
                <input
                  type="checkbox"
                  :value="company._id"
                  v-model="rolePermissionForm.companies"
                  class="mr-2"
                />
                <span class="text-sm text-gray-900">{{ company.name }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-6 flex gap-2 justify-end">
          <Button variant="secondary" @click="closeRolePermissionModal">İptal</Button>
          <Button @click="saveRolePermissions" :disabled="savingRolePermissions">
            {{ savingRolePermissions ? 'Kaydediliyor...' : 'Kaydet' }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Kullanıcı Oluştur/Düzenle Modal -->
    <div
      v-if="showUserModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">
          {{ editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı' }}
        </h2>
        <form @submit.prevent="saveUser">
          <div class="space-y-4">
            <Input
              v-model="userForm.email"
              label="Email"
              type="email"
              required
              :disabled="!!editingUser"
            />

            <div v-if="!editingUser">
              <Input
                v-model="userForm.password"
                label="Şifre"
                type="password"
                :required="!editingUser"
              />
              <Input
                v-model="userForm.passwordConfirm"
                label="Şifre Tekrar"
                type="password"
                :required="!editingUser"
              />
              <p v-if="userForm.password && userForm.passwordConfirm && userForm.password !== userForm.passwordConfirm" class="text-xs text-red-500 mt-1">Şifreler eşleşmiyor</p>
              <p v-else class="text-xs text-gray-500 mt-1">
                Boş bırakılırsa kullanıcı ilk girişte şifre belirleyecektir
              </p>
            </div>
            <div v-else>
              <Input v-model="userForm.password" label="Yeni Şifre (Opsiyonel)" type="password" />
              <Input v-model="userForm.passwordConfirm" label="Yeni Şifre Tekrar" type="password" />
              <p v-if="userForm.password && userForm.passwordConfirm && userForm.password !== userForm.passwordConfirm" class="text-xs text-red-500 mt-1">Şifreler eşleşmiyor</p>
              <p v-else class="text-xs text-gray-500 mt-1">Sadece değiştirmek istiyorsanız doldurun</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Rol <span class="text-red-500">*</span></label
              >
              <select
                v-model="userForm.roleName"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçiniz</option>
                <option
                  v-for="role in availableRolesForAssignment"
                  :key="role.name"
                  :value="role.name"
                >
                  {{ role.description }}
                </option>
              </select>
            </div>

            <div v-if="userRole === 'super_admin'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Bayi</label>
              <select
                v-model="userForm.dealerId"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Bayi Seçiniz (Opsiyonel)</option>
                <option v-for="dealer in dealers" :key="dealer._id" :value="dealer._id">
                  {{ dealer.name }}
                </option>
              </select>
            </div>

            <div v-if="userRole === 'super_admin' || userRole === 'bayi_admin'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
              <select
                v-model="userForm.companyId"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Şirket Seçiniz (Opsiyonel)</option>
                <option v-for="company in companies" :key="company._id" :value="company._id">
                  {{ company.name }}
                </option>
              </select>
            </div>

            <div class="flex items-center">
              <input v-model="userForm.isActive" type="checkbox" id="isActive" class="mr-2" />
              <label for="isActive" class="text-sm text-gray-700">Hesap Aktif</label>
            </div>

            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeUserModal">İptal</Button>
              <Button type="submit" :disabled="saving">{{
                saving ? 'Kaydediliyor...' : 'Kaydet'
              }}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import api from '@/services/api';
import Button from '@/components/Button.vue';
import Input from '@/components/Input.vue';

const authStore = useAuthStore();
const toast = useToastStore();
const confirmModal = useConfirmStore();
const users = ref([]);
const dealers = ref([]);
const companies = ref([]);
const roles = ref([]);
const permissions = ref([]);
const hierarchicalData = ref(null);
const showUserModal = ref(false);
const showRolePermissionModal = ref(false);
const selectedUser = ref(null);
const editingUser = ref(null);
const saving = ref(false);
const savingRolePermissions = ref(false);
const pagination = ref({
  total: 0,
  page: 1,
  limit: 50,
  pages: 1,
});

const filters = ref({
  dealerId: '',
  companyId: '',
  role: '',
  search: '',
});

const userForm = ref({
  email: '',
  password: '',
  passwordConfirm: '',
  roleName: '',
  dealerId: '',
  companyId: '',
  isActive: true,
});

const rolePermissionForm = ref({
  roleId: '',
  permissionIds: [],
  companies: [],
});

const userRole = computed(() => authStore.roleName);

const canCreateUser = computed(() => {
  return ['super_admin', 'bayi_admin', 'company_admin'].includes(userRole.value);
});

const availableRoles = computed(() => {
  return roles.value.filter(r => r.isSystemRole);
});

const availableRolesForAssignment = computed(() => {
  if (!userRole.value) return [];

  const roleHierarchy = {
    super_admin: 1,
    bayi_admin: 2,
    bayi_yetkilisi: 3,
    company_admin: 4,
    resmi_muhasebe_ik: 5,
    employee: 6,
  };

  const currentLevel = roleHierarchy[userRole.value] || 999;

  return roles.value.filter(role => {
    const roleLevel = roleHierarchy[role.name] || 999;
    return role.isSystemRole && roleLevel > currentLevel;
  });
});

const canDeleteUser = user => {
  if (!userRole.value) return false;
  if (user._id === authStore.user?.id) return false; // Kendini silemez

  const roleHierarchy = {
    super_admin: 1,
    bayi_admin: 2,
    bayi_yetkilisi: 3,
    company_admin: 4,
    resmi_muhasebe_ik: 5,
    employee: 6,
  };

  const currentLevel = roleHierarchy[userRole.value] || 999;
  const userRoleLevel = roleHierarchy[user.role?.name] || 999;

  return userRoleLevel > currentLevel;
};

const activeUserCount = computed(() => users.value.filter(u => u.isActive).length);
const inactiveUserCount = computed(() => users.value.filter(u => !u.isActive).length);

let searchTimeout = null;
const debounceSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadUsers();
  }, 500);
};

const loadDealers = async () => {
  if (userRole.value !== 'super_admin') return;

  try {
    const response = await api.get('/dealers');
    dealers.value = response.data?.data || response.data || [];
  } catch (error) {
    console.error('Bayiler yüklenemedi:', error);
    dealers.value = [];
  }
};

const loadCompanies = async () => {
  if (!['super_admin', 'bayi_admin'].includes(userRole.value)) return;

  try {
    const response = await api.get('/companies');
    companies.value = response.data?.data || response.data || [];

    // Filtreleme: Bayi admin sadece kendi şirketlerini görür
    if (userRole.value === 'bayi_admin') {
      companies.value = companies.value.filter(c => {
        const companyDealerId = c.dealer?._id || c.dealer;
        return companyDealerId === authStore.dealerId;
      });
    }
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error);
    companies.value = [];
  }
};

const loadRoles = async () => {
  try {
    const response = await api.get('/roles');
    const data = response.data?.data || response.data || [];
    roles.value = Array.isArray(data) ? data.filter(r => r.isSystemRole) : [];
  } catch (error) {
    console.error('Roller yüklenemedi:', error);
    roles.value = [];
  }
};

const loadPermissions = async () => {
  if (!['super_admin', 'bayi_admin', 'company_admin'].includes(userRole.value)) return;

  try {
    const response = await api.get('/permissions');
    permissions.value = response.data?.data || response.data || [];
  } catch (error) {
    console.error('Yetkiler yüklenemedi:', error);
    permissions.value = [];
  }
};

const loadUsers = async () => {
  try {
    const params = {
      page: pagination.value?.page || 1,
      limit: pagination.value?.limit || 10,
    };

    if (filters.value.dealerId) params.dealerId = filters.value.dealerId;
    if (filters.value.companyId) params.companyId = filters.value.companyId;
    if (filters.value.role) params.role = filters.value.role;
    if (filters.value.search) params.search = filters.value.search;

    const response = await api.get('/users', { params });

    if (response.data?.success) {
      users.value = response.data.data || [];
      hierarchicalData.value = response.data.meta?.hierarchical || {};
      pagination.value = response.data.meta?.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 1,
      };
    }
  } catch (error) {
    console.error('Kullanıcılar yüklenemedi:', error);
    toast.error(error.response?.data?.message || 'Kullanıcılar yüklenemedi');
    users.value = [];
  }
};

const changePage = page => {
  pagination.value.page = page;
  loadUsers();
};

const editUser = user => {
  editingUser.value = user;
  userForm.value = {
    email: user.email,
    password: '',
    roleName: user.role?.name || '',
    dealerId: user.dealer?._id || '',
    companyId: user.company?._id || '',
    isActive: user.isActive,
  };
  showUserModal.value = true;
};

const saveUser = async () => {
  // Şifre eşleşme kontrolü
  if (userForm.value.password) {
    if (userForm.value.password.length < 6) {
      toast.warning('Şifre en az 6 karakter olmalıdır');
      return;
    }
    if (userForm.value.password !== userForm.value.passwordConfirm) {
      toast.warning('Şifreler eşleşmiyor');
      return;
    }
  }

  saving.value = true;
  try {
    const payload = {
      email: userForm.value.email,
      roleName: userForm.value.roleName,
      isActive: userForm.value.isActive,
    };

    if (userForm.value.password) {
      payload.password = userForm.value.password;
    }

    if (userRole.value === 'super_admin' && userForm.value.dealerId) {
      payload.dealerId = userForm.value.dealerId;
    }

    if (
      (userRole.value === 'super_admin' || userRole.value === 'bayi_admin') &&
      userForm.value.companyId
    ) {
      payload.companyId = userForm.value.companyId;
    }

    if (editingUser.value) {
      await api.put(`/users/${editingUser.value._id}`, payload);
    } else {
      await api.post('/users', payload);
    }

    closeUserModal();
    loadUsers();
  } catch (error) {
    console.error('Kullanıcı kaydetme hatası:', error);
    toast.error(error.response?.data?.message || 'Kullanıcı kaydedilemedi');
  } finally {
    saving.value = false;
  }
};

const deleteUser = async user => {
  const confirmed = await confirmModal.show({
    title: 'Kullanıcıyı Sil',
    message: `"${user.email}" kullanıcısını silmek istediğinizden emin misiniz?`,
    type: 'danger',
    confirmText: 'Sil',
  });
  if (!confirmed) return;

  try {
    await api.delete(`/users/${user._id}`);
    loadUsers();
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error);
    toast.error(error.response?.data?.message || 'Kullanıcı silinemedi');
  }
};

const manageRolePermissions = async user => {
  selectedUser.value = user;
  rolePermissionForm.value = {
    roleId: user.role?._id || '',
    permissionIds: [],
    companies: [],
  };

  // Kullanıcının mevcut yetkilerini yükle
  try {
    const roleResponse = await api.get(`/roles/${user.role?._id}`);
    if (roleResponse.data.success && roleResponse.data.data.permissions) {
      rolePermissionForm.value.permissionIds = roleResponse.data.data.permissions
        .map(p => p.permission._id)
        .filter(id => id);
    }
  } catch (error) {
    console.error('Rol yetkileri yüklenemedi:', error);
  }

  showRolePermissionModal.value = true;
};

const saveRolePermissions = async () => {
  savingRolePermissions.value = true;
  try {
    await api.post(`/users/${selectedUser.value._id}/assign-role-permissions`, {
      roleId: rolePermissionForm.value.roleId || null,
      permissionIds: rolePermissionForm.value.permissionIds,
      companies: rolePermissionForm.value.companies,
    });

    closeRolePermissionModal();
    loadUsers();
  } catch (error) {
    console.error('Rol ve yetki kaydetme hatası:', error);
    toast.error(error.response?.data?.message || 'Rol ve yetkiler kaydedilemedi');
  } finally {
    savingRolePermissions.value = false;
  }
};

const closeRolePermissionModal = () => {
  showRolePermissionModal.value = false;
  selectedUser.value = null;
  rolePermissionForm.value = {
    roleId: '',
    permissionIds: [],
    companies: [],
  };
};

const closeUserModal = () => {
  showUserModal.value = false;
  editingUser.value = null;
  userForm.value = {
    email: '',
    password: '',
    passwordConfirm: '',
    roleName: '',
    dealerId: '',
    companyId: '',
    isActive: true,
  };
};

watch(
  () => filters.value.dealerId,
  () => {
    if (userRole.value === 'super_admin') {
      loadCompanies();
    }
  }
);

onMounted(async () => {
  await loadRoles();
  await loadPermissions();
  await loadDealers();
  await loadCompanies();
  await loadUsers();
});
</script>

<style scoped></style>
