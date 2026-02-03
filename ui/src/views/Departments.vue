<template>
  <div class="p-6">
    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-sm font-semibold text-gray-700">Organizasyon Yapısı</h3>
        <Button @click="showModal = true">Yeni Ekle</Button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ara</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Departman, bölüm, birim adı..."
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select
            v-model="statusFilter"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tümü</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            @click="resetFilters"
            class="w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="p-6">
        <!-- İşyerlerine göre gruplu gösterim -->
        <div v-for="workplace in activeWorkplaces" :key="workplace._id" class="mb-6">
          <!-- İşyeri başlığı (Yeşil) -->
          <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg mb-3 border-2 border-green-200">
            <div class="flex items-center flex-wrap gap-2">
              <span class="text-sm font-semibold text-gray-800">{{ workplace.name }}</span>
              <span v-if="workplace.isDefault" class="text-xs text-gray-600">(Varsayılan SGK İşyeri)</span>
              <span v-if="workplace.sgkRegisterNumber" class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                SGK: {{ workplace.sgkRegisterNumber }}
              </span>
              <span v-if="workplace.manager" class="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                Yönetici: {{ workplace.manager.firstName }} {{ workplace.manager.lastName }}
              </span>
            </div>
            <div class="flex gap-1">
              <span class="text-xs text-gray-500 mr-2">{{ getWorkplaceDepartments(workplace._id).length }} departman</span>
            </div>
          </div>

          <!-- Bu işyerine bağlı departmanlar -->
          <div v-if="getWorkplaceDepartments(workplace._id).length > 0" class="ml-6 space-y-2">
            <div
              v-for="dept in getWorkplaceDepartments(workplace._id).filter(matchesSearch)"
              :key="dept._id"
            >
              <!-- Departman (Mavi) -->
              <div class="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                <div class="flex items-center flex-wrap gap-2">
                  <span class="text-sm text-gray-700 font-medium">└─ {{ dept.name }}</span>
                  <span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">Departman</span>
                  <span v-if="dept.description" class="text-sm text-gray-500">({{ dept.description }})</span>
                  <span v-if="dept.workingHours" class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Mesai: {{ dept.workingHours.name }}
                  </span>
                  <span v-if="dept.manager" class="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                    Yönetici: {{ dept.manager.firstName }} {{ dept.manager.lastName }}
                  </span>
                </div>
                <div class="flex gap-1">
                  <button @click="editDepartment(dept)" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Düzenle">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button v-if="!dept.isDefault" @click="deleteDepartment(dept._id)" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Bölümler (Departman altı - Mor) -->
              <div v-if="getDepartmentSections(dept._id).length > 0" class="ml-6 mt-2 space-y-2">
                <div
                  v-for="section in getDepartmentSections(dept._id)"
                  :key="section._id"
                >
                  <div class="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-200">
                    <div class="flex items-center flex-wrap gap-2">
                      <span class="text-sm text-gray-600">└─ {{ section.name }}</span>
                      <span class="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">Bölüm</span>
                      <span v-if="section.description" class="text-sm text-gray-500">({{ section.description }})</span>
                      <span v-if="section.workingHours" class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        Mesai: {{ section.workingHours.name }}
                      </span>
                      <span v-if="section.manager" class="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                        Yönetici: {{ section.manager.firstName }} {{ section.manager.lastName }}
                      </span>
                    </div>
                    <div class="flex gap-1">
                      <button @click="editDepartment(section)" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Düzenle">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button @click="deleteDepartment(section._id)" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Birimler (Bölüm altı - Sarı) -->
                  <div v-if="getSectionUnits(section._id).length > 0" class="ml-6 mt-2 space-y-2">
                    <div
                      v-for="unit in getSectionUnits(section._id)"
                      :key="unit._id"
                      class="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <div class="flex items-center flex-wrap gap-2">
                        <span class="text-sm text-gray-600">└─ {{ unit.name }}</span>
                        <span class="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">Birim</span>
                        <span v-if="unit.description" class="text-sm text-gray-500">({{ unit.description }})</span>
                        <span v-if="unit.workingHours" class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          Mesai: {{ unit.workingHours.name }}
                        </span>
                        <span v-if="unit.manager" class="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                          Yönetici: {{ unit.manager.firstName }} {{ unit.manager.lastName }}
                        </span>
                      </div>
                      <div class="flex gap-1">
                        <button @click="editDepartment(unit)" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Düzenle">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button @click="deleteDepartment(unit._id)" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bu işyerine bağlı departman yoksa mesaj -->
          <div v-else class="ml-6 text-sm text-gray-500 italic">
            Bu işyerine henüz departman eklenmemiş
          </div>
        </div>

        <!-- İşyerine atanmamış departmanlar -->
        <div v-if="unassignedDepartments.length > 0" class="mb-6">
          <div class="flex items-center justify-between p-3 bg-gray-100 rounded-lg mb-3 border-2 border-gray-300">
            <div class="flex items-center flex-wrap gap-2">
              <span class="text-sm font-semibold text-gray-700">İşyeri Atanmamış</span>
              <span class="text-xs text-gray-500">(Bu departmanlar bir SGK işyerine bağlı değil)</span>
            </div>
          </div>
          <div class="ml-6 space-y-2">
            <div
              v-for="dept in unassignedDepartments.filter(matchesSearch)"
              :key="dept._id"
              class="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200"
            >
              <div class="flex items-center flex-wrap gap-2">
                <span class="text-sm text-gray-700 font-medium">└─ {{ dept.name }}</span>
                <span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">Departman</span>
                <span v-if="dept.description" class="text-sm text-gray-500">({{ dept.description }})</span>
              </div>
              <div class="flex gap-1">
                <button @click="editDepartment(dept)" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Düzenle">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button @click="deleteDepartment(dept._id)" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pasif departmanlar -->
        <div v-if="filteredInactiveDepartments.length > 0 && (statusFilter === 'all' || statusFilter === 'inactive')" class="mt-8">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Pasif Kayıtlar</h3>
          <div class="space-y-2">
            <div
              v-for="dept in filteredInactiveDepartments"
              :key="dept._id"
            >
              <!-- Ana pasif departman -->
              <div
                class="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200"
                :class="dept.parentDepartment ? 'ml-6' : ''"
              >
                <div class="flex items-center flex-wrap gap-2">
                  <span v-if="dept.parentDepartment" class="text-xs text-gray-600">└─</span>
                  <span class="text-xs text-gray-700">{{ dept.name }}</span>
                  <span v-if="dept.description" class="text-sm text-gray-500">({{ dept.description }})</span>
                  <span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Pasif</span>
                </div>
                <div class="flex gap-1">
                  <button @click="activateDepartment(dept._id)" class="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Aktif Et">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </button>
                  <button @click="editDepartment(dept)" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Düzenle">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button @click="deleteDepartment(dept._id)" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Pasif alt kayıtlar -->
              <div v-if="getInactiveChildren(dept._id).length > 0" class="ml-12 mt-2 space-y-2">
                <div
                  v-for="child in getInactiveChildren(dept._id)"
                  :key="child._id"
                  class="flex items-center justify-between p-2 rounded-lg bg-gray-100 border border-gray-300"
                >
                  <div class="flex items-center flex-wrap gap-2">
                    <span class="text-sm text-gray-600">└─</span>
                    <span class="text-sm text-gray-600">{{ child.name }}</span>
                    <span v-if="child.description" class="text-sm text-gray-400">({{ child.description }})</span>
                    <span class="text-xs bg-gray-300 text-gray-700 px-2 py-0.5 rounded">Pasif Alt Kayıt</span>
                  </div>
                  <div class="flex gap-1">
                    <button @click="activateDepartment(child._id)" class="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Aktif Et">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </button>
                    <button @click="editDepartment(child)" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Düzenle">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button @click="deleteDepartment(child._id)" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Boş durum -->
        <div v-if="departments.length === 0" class="text-center py-8 text-gray-500">
          Henüz kayıt eklenmemiş
        </div>
      </div>

      <!-- İstatistikler -->
      <div class="p-4 bg-gray-50 border-t">
        <div class="flex justify-between items-center">
          <p class="text-sm text-gray-600">
            Toplam {{ totalCount }} kayıt
          </p>
          <div class="flex gap-4 text-sm text-gray-600">
            <span>Aktif: <strong class="text-green-600">{{ activeCount }}</strong></span>
            <span>Pasif: <strong class="text-red-600">{{ inactiveCount }}</strong></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">{{ editingDepartment ? 'Düzenle' : 'Yeni Ekle' }}</h2>
        <form @submit.prevent="saveDepartment">
          <div class="space-y-4">
            <Input v-model="form.name" label="Ad" required />

            <!-- SGK İşyeri seçimi -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">SGK İşyeri</label>
              <select
                v-model="form.workplace"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçiniz</option>
                <option
                  v-for="wp in activeWorkplaces"
                  :key="wp._id"
                  :value="wp._id"
                >
                  {{ wp.name }} {{ wp.isDefault ? '(Varsayılan)' : '' }}
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                Departmanın bağlı olduğu SGK işyerini seçin
              </p>
            </div>

            <!-- Üst Seviye (Departman/Bölüm) seçimi -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Üst Seviye (Opsiyonel)</label>
              <select
                v-model="form.parent"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ana Departman (Üst seviye yok)</option>

                <!-- Seçili işyerindeki departmanlar -->
                <optgroup v-if="getAvailableParentDepartments.length > 0" label="Departmanlar (Bölüm olarak ekle)">
                  <option
                    v-for="dept in getAvailableParentDepartments"
                    :key="dept._id"
                    :value="dept._id"
                  >
                    └─ {{ dept.name }} - Bölüm olarak ekle
                  </option>
                </optgroup>

                <!-- Bölümler (Birim olarak eklenebilir) -->
                <optgroup v-if="getAvailableSections.length > 0" label="Bölümler (Birim olarak ekle)">
                  <option
                    v-for="section in getAvailableSections"
                    :key="section._id"
                    :value="section._id"
                  >
                    &nbsp;&nbsp;&nbsp;&nbsp;└─ {{ section.name }} - Birim olarak ekle
                  </option>
                </optgroup>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                • Boş bırakırsanız → <strong>Ana Departman</strong> olarak eklenir<br>
                • Departman seçerseniz → <strong>Bölüm</strong> olarak eklenir<br>
                • Bölüm seçerseniz → <strong>Birim</strong> olarak eklenir
              </p>
            </div>
            <Textarea v-model="form.description" label="Açıklama" />
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Mesai Saatleri (Opsiyonel)</label>
              <select
                v-model="form.workingHours"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Mesai saati seçilmedi</option>
                <option
                  v-for="wh in availableWorkingHours"
                  :key="wh._id"
                  :value="wh._id"
                >
                  {{ wh.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Yönetici (Opsiyonel)</label>
              <select
                v-model="form.manager"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Yönetici seçilmedi</option>
                <option
                  v-for="emp in availableEmployees"
                  :key="emp._id"
                  :value="emp._id"
                >
                  {{ emp.firstName }} {{ emp.lastName }} {{ emp.position ? `(${emp.position})` : '' }}
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                İzin talepleri bu yöneticiye iletilecektir.
              </p>
            </div>
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeModal">İptal</Button>
              <Button type="submit">Kaydet</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Textarea from '@/components/Textarea.vue'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const toast = useToastStore()
const confirmModal = useConfirmStore()

const departments = ref([])
const workplaces = ref([])
const workingHoursList = ref([])
const employees = ref([])
const showModal = ref(false)
const editingDepartment = ref(null)
const searchQuery = ref('')
const statusFilter = ref('all')
const form = ref({
  name: '',
  parent: '',
  workplace: '',
  description: '',
  workingHours: '',
  manager: ''
})

const resetFilters = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
}

// Merkez İşyeri görüntüleme adı
const getMerkezDisplayName = (dept) => {
  if (dept.name === 'Merkez' || dept.isDefault) {
    return 'Merkez İşyeri (SGK Merkez İşyeri)'
  }
  return dept.name
}

// Hiyerarşi etiketi
const getHierarchyLabel = (dept) => {
  if (dept.isDefault) {
    return 'Merkez İşyeri'
  }
  
  // Parent'ını kontrol et
  const parentId = dept.parentDepartment?._id || dept.parentDepartment || dept.parent?._id || dept.parent
  
  if (parentId) {
    const parent = departments.value.find(d => d._id === parentId || d._id === parentId.toString())
    
    if (parent) {
      if (parent.isDefault) {
        // Merkez altındaysa → Departman
        return `${dept.name} (Departman)`
      } else {
        // Departman altındaysa → Bölüm
        return `   └─ ${dept.name} (Bölüm)`
      }
    }
  }
  
  return dept.name
}

// Aktif işyerleri (workplace model'den)
const activeWorkplaces = computed(() => {
  return workplaces.value.filter(wp => wp.isActive !== false)
})

// Bir workplace'e bağlı departmanları getir (sadece ana departmanlar - parentDepartment yok)
const getWorkplaceDepartments = (workplaceId) => {
  const wpId = workplaceId?.toString()
  return departments.value.filter(dept => {
    if (!dept.isActive) return false
    // parentDepartment yoksa ve workplace eşleşiyorsa = ana departman
    const parent = dept.parentDepartment || dept.parent
    if (parent) return false // Alt seviye ise dahil etme

    const deptWorkplace = dept.workplace?._id || dept.workplace
    return deptWorkplace?.toString() === wpId
  })
}

// Workplace'e atanmamış departmanları getir
const unassignedDepartments = computed(() => {
  return departments.value.filter(dept => {
    if (!dept.isActive) return false
    const parent = dept.parentDepartment || dept.parent
    if (parent) return false // Alt seviye ise dahil etme

    const deptWorkplace = dept.workplace?._id || dept.workplace
    return !deptWorkplace
  })
})

const merkezDepartment = computed(() => {
  return departments.value.find(dept => dept.isDefault === true)
})

// Merkez altındaki departmanlar (1. seviye - Merkez'in direkt çocukları)
const getMerkezDepartments = () => {
  if (!merkezDepartment.value) return []
  
  const merkezId = merkezDepartment.value._id.toString()
  
  return departments.value.filter(dept => {
    if (!dept.isActive || dept.isDefault) return false
    
    const parent = dept.parentDepartment || dept.parent
    if (!parent) return false
    
    // Parent ID'yi string'e çevir
    let parentIdValue
    if (typeof parent === 'object' && parent._id) {
      parentIdValue = parent._id.toString()
    } else if (typeof parent === 'string') {
      parentIdValue = parent
    } else {
      parentIdValue = parent.toString()
    }
    
    return parentIdValue === merkezId
  })
}

// Departman altındaki bölümler (2. seviye - Departmanın direkt çocukları)
const getDepartmentSections = (departmentId) => {
  const deptId = departmentId.toString()

  return departments.value.filter(dept => {
    if (!dept.isActive) return false

    const parent = dept.parentDepartment || dept.parent
    if (!parent) return false

    // Parent ID'yi string'e çevir
    let parentIdValue
    if (typeof parent === 'object' && parent._id) {
      parentIdValue = parent._id.toString()
    } else if (typeof parent === 'string') {
      parentIdValue = parent
    } else {
      parentIdValue = parent.toString()
    }

    return parentIdValue === deptId
  })
}

// Bölüm altındaki birimler (3. seviye - Bölümün direkt çocukları)
const getSectionUnits = (sectionId) => {
  const secId = sectionId.toString()

  return departments.value.filter(dept => {
    if (!dept.isActive) return false

    const parent = dept.parentDepartment || dept.parent
    if (!parent) return false

    // Parent ID'yi string'e çevir
    let parentIdValue
    if (typeof parent === 'object' && parent._id) {
      parentIdValue = parent._id.toString()
    } else if (typeof parent === 'string') {
      parentIdValue = parent
    } else {
      parentIdValue = parent.toString()
    }

    return parentIdValue === secId
  })
}

const activeParentDepartments = computed(() => {
  // Üst seviye departmanlar = SGK işyerleri (şirket ismiyle oluşanlar dahil)
  return departments.value.filter(dept =>
    dept.isActive === true &&
    !dept.parentDepartment &&
    !dept.parent
  )
})

// Tüm bölümler (Birim eklemek için dropdown'da gösterilir)
const allSections = computed(() => {
  // Önce tüm departmanları bul (Merkez'in çocukları)
  const deptIds = new Set()
  if (merkezDepartment.value) {
    getMerkezDepartments().forEach(dept => deptIds.add(dept._id.toString()))
  }

  // Şimdi bu departmanların çocuklarını bul (bölümler)
  return departments.value.filter(dept => {
    if (!dept.isActive) return false
    const parent = dept.parentDepartment || dept.parent
    if (!parent) return false
    const parentIdValue = typeof parent === 'object' && parent._id ? parent._id.toString() : parent?.toString()
    return deptIds.has(parentIdValue)
  })
})

// Modal için - seçili işyerindeki ana departmanlar (üst seviye seçimi için)
const getAvailableParentDepartments = computed(() => {
  if (!form.value.workplace) return []

  const wpId = form.value.workplace.toString()
  return departments.value.filter(dept => {
    if (!dept.isActive) return false
    // Parent yok = ana departman
    const parent = dept.parentDepartment || dept.parent
    if (parent) return false

    // Workplace eşleşmeli
    const deptWorkplace = dept.workplace?._id || dept.workplace
    if (deptWorkplace?.toString() !== wpId) return false

    // Düzenleme modundaysa kendisini hariç tut
    if (editingDepartment.value && dept._id === editingDepartment.value._id) return false

    return true
  })
})

// Modal için - seçili işyerindeki bölümler (birim eklemek için)
const getAvailableSections = computed(() => {
  if (!form.value.workplace) return []

  const wpId = form.value.workplace.toString()
  // Önce o workplace'deki ana departmanların ID'lerini bul
  const parentDeptIds = new Set(
    getAvailableParentDepartments.value.map(d => d._id.toString())
  )

  // Bu departmanların çocuklarını bul (bölümler)
  return departments.value.filter(dept => {
    if (!dept.isActive) return false
    const parent = dept.parentDepartment || dept.parent
    if (!parent) return false

    const parentId = typeof parent === 'object' && parent._id ? parent._id.toString() : parent?.toString()
    if (!parentDeptIds.has(parentId)) return false

    // Düzenleme modundaysa kendisini hariç tut
    if (editingDepartment.value && dept._id === editingDepartment.value._id) return false

    return true
  })
})

const inactiveDepartments = computed(() => {
  // Sadece parent olmayan pasif departmanları göster (alt kayıtları ayrı göstereceğiz)
  return departments.value.filter(dept => 
    dept.isActive === false && 
    (!dept.parentDepartment || (typeof dept.parentDepartment === 'object' && !dept.parentDepartment._id))
  )
})

// Pasif departmanın pasif alt kayıtlarını getir
const getInactiveChildren = (parentId) => {
  return departments.value.filter(dept => {
    if (dept.isActive !== false) return false
    const parent = dept.parentDepartment || dept.parent
    if (!parent) return false
    const parentIdValue = typeof parent === 'object' ? parent._id : parent
    return parentIdValue === parentId || parentIdValue.toString() === parentId.toString()
  })
}

const getActiveChildDepartments = (parentId) => {
  return departments.value.filter(dept => {
    if (!dept.isActive) return false
    const parent = dept.parentDepartment || dept.parent
    if (!parent) return false
    const parentIdValue = typeof parent === 'object' ? parent._id : parent
    return parentIdValue === parentId || parentIdValue.toString() === parentId.toString()
  })
}

const getChildDepartments = (parentId) => {
  return departments.value.filter(dept => {
    const parent = dept.parentDepartment || dept.parent
    if (!parent) return false
    const parentIdValue = typeof parent === 'object' ? parent._id : parent
    return parentIdValue === parentId || parentIdValue.toString() === parentId.toString()
  })
}

const availableParents = computed(() => {
  if (editingDepartment.value) {
    return departments.value.filter(dept => {
      const parent = dept.parentDepartment || dept.parent
      return dept._id !== editingDepartment.value._id &&
        (!parent || (typeof parent === 'object' ? parent._id : parent) !== editingDepartment.value._id)
    })
  }
  return departments.value
})

const availableWorkingHours = computed(() => {
  return workingHoursList.value
})

const availableEmployees = computed(() => {
  return employees.value
})

// Filtreleme fonksiyonu
const matchesSearch = (dept) => {
  if (!searchQuery.value) return true
  const search = searchQuery.value.toLowerCase()
  return dept.name?.toLowerCase().includes(search) ||
         dept.description?.toLowerCase().includes(search)
}

// Filtrelenmiş Merkez departmanları
const filteredMerkezDepartments = computed(() => {
  return getMerkezDepartments().filter(matchesSearch)
})

// Filtrelenmiş aktif parent departmanlar
const filteredActiveParentDepartments = computed(() => {
  return activeParentDepartments.value.filter(dept => {
    if (!dept.isDefault && matchesSearch(dept)) {
      return true
    }
    return false
  })
})

// Filtrelenmiş pasif departmanlar
const filteredInactiveDepartments = computed(() => {
  return inactiveDepartments.value.filter(matchesSearch)
})

// İstatistikler
const totalCount = computed(() => departments.value.length)
const activeCount = computed(() => departments.value.filter(d => d.isActive).length)
const inactiveCount = computed(() => departments.value.filter(d => !d.isActive).length)

const loadDepartments = async () => {
  try {
    const response = await api.get('/departments')
    departments.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error)
    departments.value = []
  }
}

const loadWorkplaces = async () => {
  try {
    const response = await api.get('/workplaces')
    workplaces.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('İşyerleri yüklenemedi:', error)
    workplaces.value = []
  }
}

const loadWorkingHours = async () => {
  try {
    const response = await api.get('/working-hours')
    workingHoursList.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Çalışma saatleri yüklenemedi:', error)
    workingHoursList.value = []
  }
}

const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    employees.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
    employees.value = []
  }
}

const saveDepartment = async () => {
  try {
    console.log('Form data:', form.value)

    // Boş string'leri null'a çevir
    const payload = {
      name: form.value.name,
      workplace: form.value.workplace || null,
      parent: form.value.parent || null,
      description: form.value.description || undefined,
      workingHours: form.value.workingHours || null,
      manager: form.value.manager || null
    }

    console.log('Sending payload:', payload)

    if (editingDepartment.value) {
      const response = await api.put(`/departments/${editingDepartment.value._id}`, payload)
      console.log('Update response:', response.data)
      toast.success('Kayıt başarıyla güncellendi')
    } else {
      const response = await api.post('/departments', payload)
      console.log('Create response:', response.data)
      toast.success('Kayıt başarıyla eklendi')
    }
    closeModal()
    await loadDepartments()
  } catch (error) {
    console.error('Save error:', error)
    console.error('Error response:', error.response?.data)
    console.error('Error status:', error.response?.status)

    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Bilinmeyen hata oluştu'
    toast.error(errorMsg)
  }
}

const editDepartment = (department) => {
  editingDepartment.value = department
  form.value = {
    name: department.name,
    workplace: department.workplace?._id || department.workplace || '',
    parent: department.parentDepartment?._id || department.parentDepartment || department.parent?._id || department.parent || '',
    description: department.description || '',
    workingHours: department.workingHours?._id || department.workingHours || '',
    manager: department.manager?._id || department.manager || ''
  }
  showModal.value = true
}

const deleteDepartment = async (id) => {
  const dept = departments.value.find(d => d._id === id)
  if (dept && dept.isDefault) {
    toast.warning('Merkez İşyeri silinemez.')
    return
  }

  const children = getChildDepartments(id)
  if (children.length > 0) {
    toast.warning('Bu kayda bağlı alt kayıtlar bulunmaktadır. Önce alt kayıtları kaldırın.')
    return
  }

  const confirmed = await confirmModal.show({
    title: 'Kaydı Sil',
    message: 'Bu kaydı silmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    await api.delete(`/departments/${id}`)
    toast.success('Kayıt başarıyla silindi')
    loadDepartments()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const activateDepartment = async (id) => {
  try {
    await api.post(`/departments/${id}/activate`)
    toast.success('Kayıt başarıyla aktifleştirildi')
    loadDepartments()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const closeModal = () => {
  showModal.value = false
  editingDepartment.value = null
  form.value = {
    name: '',
    workplace: '',
    parent: '',
    description: '',
    workingHours: '',
    manager: ''
  }
}

onMounted(() => {
  loadDepartments()
  loadWorkplaces()
  loadWorkingHours()
  loadEmployees()
})
</script>