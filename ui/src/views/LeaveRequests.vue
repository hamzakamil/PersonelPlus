<template>
  <div class="p-6">
    <!-- Tabs -->
    <div class="mb-4 border-b border-gray-200">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 'active'; loadRequests()"
          :class="[
            activeTab === 'active'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          ]"
        >
          İzin Talepleri
          <span v-if="pagination.total > 0" class="ml-2 bg-blue-100 text-blue-800 py-0.5 px-2.5 rounded-full text-xs">
            {{ pagination.total }}
          </span>
        </button>
        <button
          @click="activeTab = 'deleted'; loadDeletedRequests()"
          :class="[
            activeTab === 'deleted'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          ]"
        >
          Silinenler
          <span v-if="deletedPagination.total > 0" class="ml-2 bg-red-100 text-red-800 py-0.5 px-2.5 rounded-full text-xs">
            {{ deletedPagination.total }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Filtreler (sadece aktif tab'da göster) -->
    <div v-if="activeTab === 'active'" class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-sm font-semibold text-gray-700">Filtreler</h3>
        <Button v-if="canCreate" @click="showModal = true">Yeni İzin Talebi</Button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select
            v-model="filters.status"
            @change="loadRequests"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="PENDING">Bekliyor</option>
            <option value="IN_PROGRESS">Onay Sürecinde</option>
            <option value="APPROVED">Onaylanan</option>
            <option value="REJECTED">Reddedilen</option>
            <option value="CANCELLED">İptal Edilen</option>
            <option value="CANCELLATION_REQUESTED">İptal Talebi</option>
            <option value="SUSPENDED">Askıda</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">İzin Türü</label>
          <select
            v-model="filters.leaveType"
            @change="loadRequests"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option v-for="type in leaveTypes" :key="type._id" :value="type._id">
              {{ type.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Çalışan Ara</label>
          <input
            v-model="filters.employeeName"
            @input="debounceLoadRequests"
            type="text"
            placeholder="Ad, soyad..."
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
          <input
            v-model="filters.startDate"
            type="date"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="loadRequests"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
          <input
            v-model="filters.endDate"
            type="date"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="loadRequests"
          />
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

    <!-- Tablo (Aktif Tab) -->
    <div v-if="activeTab === 'active'" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 table-fixed">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-16 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
              <th
                @click="toggleSort('employee')"
                class="w-[13%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Çalışan
                  <span v-if="sortField === 'employee'" class="text-blue-600">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th
                @click="toggleSort('leaveType')"
                class="w-[13%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  İzin Türü
                  <span v-if="sortField === 'leaveType'" class="text-blue-600">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th
                @click="toggleSort('startDate')"
                class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Başlangıç
                  <span v-if="sortField === 'startDate'" class="text-blue-600">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th
                @click="toggleSort('endDate')"
                class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Bitiş
                  <span v-if="sortField === 'endDate'" class="text-blue-600">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th
                @click="toggleSort('totalDays')"
                class="w-[8%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Süre
                  <span v-if="sortField === 'totalDays'" class="text-blue-600">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th
                @click="toggleSort('status')"
                class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Durum
                  <span v-if="sortField === 'status'" class="text-blue-600">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th class="w-[13%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onaylayıcı</th>
              <th class="w-[13%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(request, index) in sortedRequests" :key="request._id" :class="{ 'bg-gray-50': index % 2 === 1, 'bg-white': index % 2 === 0 }">
              <td class="px-2 py-3 text-sm text-gray-900 font-medium">
                {{ ((pagination.page - 1) * pagination.limit) + index + 1 }}
              </td>
              <td class="px-2 py-3">
                <div class="text-sm font-medium text-gray-900 truncate" :title="`${request.employee?.firstName} ${request.employee?.lastName}`">
                  {{ request.employee?.firstName }} {{ request.employee?.lastName }}
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600 truncate" :title="request.leaveSubType?.name || request.companyLeaveType?.name || request.type">
                  {{ request.leaveSubType?.name || request.companyLeaveType?.name || request.type }}
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600">
                  {{ formatDate(request.startDate) }}
                  <span v-if="request.startTime" class="text-sm text-gray-400 block">{{ request.startTime }}</span>
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600">
                  {{ formatDate(request.endDate) }}
                  <span v-if="request.endTime" class="text-sm text-gray-400 block">{{ request.endTime }}</span>
                </div>
              </td>
              <td class="px-2 py-3 text-sm text-gray-600">
                {{ request.totalDays }} {{ request.isHourly ? 'sa' : 'gn' }}
              </td>
              <td class="px-2 py-3">
                <span
                  :class="{
                    'bg-yellow-100 text-yellow-800': request.status === 'PENDING' || request.status === 'IN_PROGRESS',
                    'bg-green-100 text-green-800': request.status === 'APPROVED',
                    'bg-red-100 text-red-800': request.status === 'REJECTED',
                    'bg-gray-100 text-gray-800': request.status === 'CANCELLED',
                    'bg-orange-100 text-orange-800': request.status === 'CANCELLATION_REQUESTED',
                    'bg-purple-100 text-purple-800': request.status === 'SUSPENDED'
                  }"
                  class="px-1.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap"
                >
                  {{ getStatusTextShort(request.status) }}
                </span>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600 truncate" :title="getApproverTitle(request)">
                  <span v-if="request.currentApprover">
                    {{ request.currentApprover.firstName }} {{ request.currentApprover.lastName }}
                  </span>
                  <span v-else-if="request.status === 'APPROVED'" class="text-green-600">Onaylandı</span>
                  <span v-else-if="request.status === 'REJECTED'" class="text-red-600">Reddedildi</span>
                  <span v-else-if="request.status === 'CANCELLED'" class="text-gray-500">İptal</span>
                  <span v-else-if="request.status === 'PENDING' || request.status === 'IN_PROGRESS'" class="text-blue-600">
                    Şirket Admin
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="flex gap-1">
                  <button
                    v-if="canReview && (request.status === 'PENDING' || request.status === 'IN_PROGRESS') && !request.isAdminCreated"
                    @click="reviewRequest(request, 'approved')"
                    class="p-1.5 text-green-600 hover:bg-green-50 rounded"
                    title="Onayla"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    v-if="canReview && (request.status === 'PENDING' || request.status === 'IN_PROGRESS') && !request.isAdminCreated"
                    @click="openRejectModal(request)"
                    class="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Reddet"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button
                    v-if="canReview && (request.status === 'PENDING' || request.status === 'IN_PROGRESS') && !request.isAdminCreated"
                    @click="suspendRequest(request)"
                    class="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                    title="Askıya Al"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    v-if="canReview && request.status === 'SUSPENDED'"
                    @click="resumeRequest(request)"
                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="Devam Ettir"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    v-if="canReview && request.status === 'CANCELLATION_REQUESTED'"
                    @click="approveCancellation(request)"
                    class="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                    title="İptal Talebini Onayla"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button @click="viewDetails(request)" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Detay">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    v-if="canReview"
                    @click="openDeleteModal(request)"
                    class="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Sil"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="sortedRequests.length === 0">
              <td colspan="9" class="px-4 py-8 text-center text-gray-500">
                Kayıt bulunamadı
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- İstatistikler -->
      <div class="p-4 bg-gray-50 border-t">
        <div class="flex justify-between items-center">
          <p class="text-sm text-gray-600">
            Toplam {{ requests.length }} izin talebi gösteriliyor
            <span v-if="pagination.total > pagination.limit" class="text-gray-500">
              ({{ pagination.total }} kayıttan {{ ((pagination.page - 1) * pagination.limit) + 1 }}-{{ Math.min(pagination.page * pagination.limit, pagination.total) }})
            </span>
          </p>
          <div class="flex gap-4 text-sm text-gray-600">
            <span>Bekliyor: <strong class="text-yellow-600">{{ statusCounts.pending }}</strong></span>
            <span>Onaylı: <strong class="text-green-600">{{ statusCounts.approved }}</strong></span>
            <span>Reddedilen: <strong class="text-red-600">{{ statusCounts.rejected }}</strong></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Silinmiş Kayıtlar Tablosu -->
    <div v-if="activeTab === 'deleted'" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 table-fixed">
          <thead class="bg-red-50">
            <tr>
              <th class="w-16 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
              <th class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan</th>
              <th class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İzin Türü</th>
              <th class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlangıç</th>
              <th class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bitiş</th>
              <th class="w-[8%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Silinme Tarihi</th>
              <th class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Silen</th>
              <th class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(request, index) in deletedRequests" :key="request._id" class="bg-red-50/30">
              <td class="px-2 py-3 text-sm text-gray-900 font-medium">
                {{ ((deletedPagination.page - 1) * deletedPagination.limit) + index + 1 }}
              </td>
              <td class="px-2 py-3">
                <div class="text-sm font-medium text-gray-900 truncate">
                  {{ request.employee?.firstName }} {{ request.employee?.lastName }}
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600 truncate">
                  {{ request.leaveSubType?.name || request.companyLeaveType?.name || request.type }}
                </div>
              </td>
              <td class="px-2 py-3 text-sm text-gray-600">
                {{ formatDate(request.startDate) }}
              </td>
              <td class="px-2 py-3 text-sm text-gray-600">
                {{ formatDate(request.endDate) }}
              </td>
              <td class="px-2 py-3">
                <span
                  :class="{
                    'bg-yellow-100 text-yellow-800': request.status === 'PENDING' || request.status === 'IN_PROGRESS',
                    'bg-green-100 text-green-800': request.status === 'APPROVED',
                    'bg-red-100 text-red-800': request.status === 'REJECTED',
                    'bg-gray-100 text-gray-800': request.status === 'CANCELLED'
                  }"
                  class="px-1.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap"
                >
                  {{ getStatusTextShort(request.status) }}
                </span>
              </td>
              <td class="px-2 py-3 text-sm text-gray-600">
                {{ formatDate(request.deletedAt) }}
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600 truncate">
                  {{ request.deletedBy?.firstName || request.deletedBy?.email || '-' }}
                </div>
                <div v-if="request.deleteReason" class="text-xs text-gray-400 truncate" :title="request.deleteReason">
                  {{ request.deleteReason }}
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="flex gap-1">
                  <button @click="viewDetails(request)" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Detay">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    @click="restoreRequest(request)"
                    class="p-1.5 text-green-600 hover:bg-green-50 rounded"
                    title="Geri Al"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="deletedRequests.length === 0">
              <td colspan="9" class="px-4 py-8 text-center text-gray-500">
                Silinmiş kayıt bulunamadı
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="deletedPagination.totalPages > 1" class="p-4 bg-gray-50 border-t flex justify-center gap-2">
        <button
          @click="deletedPagination.page > 1 && (deletedPagination.page--, loadDeletedRequests())"
          :disabled="deletedPagination.page <= 1"
          class="px-3 py-1 text-sm border rounded disabled:opacity-50"
        >
          Önceki
        </button>
        <span class="px-3 py-1 text-sm">
          {{ deletedPagination.page }} / {{ deletedPagination.totalPages }}
        </span>
        <button
          @click="deletedPagination.page < deletedPagination.totalPages && (deletedPagination.page++, loadDeletedRequests())"
          :disabled="deletedPagination.page >= deletedPagination.totalPages"
          class="px-3 py-1 text-sm border rounded disabled:opacity-50"
        >
          Sonraki
        </button>
      </div>
    </div>

    <!-- Delete Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4 text-red-800">İzin Talebini Sil</h2>
        <div v-if="deletingRequest" class="mb-4 p-3 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600">
            <strong>Çalışan:</strong> {{ deletingRequest.employee?.firstName }} {{ deletingRequest.employee?.lastName }}
          </p>
          <p class="text-sm text-gray-600">
            <strong>İzin:</strong> {{ deletingRequest.leaveSubType?.name || deletingRequest.companyLeaveType?.name || deletingRequest.type }}
          </p>
          <p class="text-sm text-gray-600">
            <strong>Tarih:</strong> {{ formatDate(deletingRequest.startDate) }} - {{ formatDate(deletingRequest.endDate) }}
          </p>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Silme Nedeni (Opsiyonel)</label>
          <textarea
            v-model="deleteReason"
            rows="3"
            placeholder="Silme nedenini belirtebilirsiniz..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          ></textarea>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p class="text-sm text-yellow-800">
            <strong>Not:</strong> Bu kayıt silinecek ancak "Silinenler" sekmesinden geri alınabilir.
          </p>
        </div>
        <div class="flex gap-2 justify-end">
          <Button type="button" variant="secondary" @click="closeDeleteModal">Vazgeç</Button>
          <Button type="button" variant="danger" @click="confirmDelete" :disabled="deleting">
            {{ deleting ? 'Siliniyor...' : 'Sil' }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">Yeni İzin Talebi</h2>
        <form @submit.prevent="saveRequest">
          <div class="space-y-4">
            <!-- Şirket seçimi (bayi_admin için) -->
            <div v-if="isBayiAdmin">
              <label class="block text-sm font-medium text-gray-700 mb-1">Şirket <span class="text-red-500">*</span></label>
              <select
                v-model="form.company"
                @change="loadEmployeesForCompany"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seçiniz</option>
                <option v-for="comp in companies" :key="comp._id" :value="comp._id">{{ comp.name }}</option>
              </select>
            </div>
            
            <!-- Çalışan seçimi (admin için) -->
            <div v-if="isAdmin">
              <label class="block text-sm font-medium text-gray-700 mb-1">Çalışan <span class="text-red-500">*</span></label>
              <select
                v-model="form.employee"
                @change="onEmployeeChange"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                :disabled="!form.company && isBayiAdmin"
              >
                <option value="">Seçiniz</option>
                <option v-for="emp in filteredEmployees" :key="emp._id" :value="emp._id">
                  {{ emp.firstName }} {{ emp.lastName }} {{ emp.employeeNumber ? `(${emp.employeeNumber})` : '' }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">İzin Türü <span class="text-red-500">*</span></label>
              <select
                v-model="form.companyLeaveType"
                @change="handleLeaveTypeChange"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seçiniz</option>
                <option
                  v-for="type in leaveTypes"
                  :key="type._id"
                  :value="type._id"
                >
                  {{ type.name }}
                </option>
              </select>
            </div>
            
            <!-- Alt izin türü -->
            <div v-if="selectedLeaveType?.name === 'Diğer izinler' && filteredSubTypes.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-1">Alt İzin Türü *</label>
              <select
                v-model="form.leaveSubType"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçiniz</option>
                <option v-for="subType in filteredSubTypes" :key="subType._id" :value="subType._id">
                  {{ subType.name }}
                </option>
              </select>
            </div>
            
            <!-- Basitleştirilmiş İzin Süresi Girişi -->
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">İzin Başlangıç Tarihi <span class="text-red-500">*</span></label>
                <input
                  v-model="form.startDate"
                  type="date"
                  required
                  @input="onStartDateChange"
                  :max="isSameDayRequired ? form.startDate : undefined"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Kaç Gün İzin <span class="text-red-500">*</span></label>
                <input
                  v-model.number="manualDaysInput"
                  type="number"
                  min="1"
                  required
                  @input="onDaysInputChange"
                  placeholder="Örn: 5"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p class="text-xs text-gray-500 mt-1">İş günü sayısı</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">İzin Bitiş Tarihi <span class="text-red-500">*</span></label>
                <input
                  v-model="form.endDate"
                  type="date"
                  required
                  @input="onEndDateChange"
                  :min="form.startDate"
                  :max="isSameDayRequired ? form.startDate : undefined"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p class="text-xs text-gray-500 mt-1">Bitiş tarihi</p>
              </div>
            </div>

            <!-- Hesaplanan Bilgiler -->
            <div v-if="form.startDate && form.endDate && calculatedDays > 0" class="border border-green-300 bg-green-50 rounded-lg p-4">
              <h4 class="font-semibold text-green-800 mb-3 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                İzin Detayları
              </h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between items-center py-2 border-b border-green-200">
                  <span class="text-gray-700">İzin Başlangıç:</span>
                  <span class="font-semibold text-gray-900">{{ formatDate(form.startDate) }}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-green-200">
                  <span class="text-gray-700">İzin Bitiş:</span>
                  <span class="font-semibold text-gray-900">{{ formatDate(form.endDate) }}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-green-200">
                  <span class="text-gray-700">İş Başı Tarihi:</span>
                  <span class="font-semibold text-green-700">{{ returnDateFormatted }}</span>
                </div>
                <div v-if="!form.isHourly" class="flex justify-between items-center py-2 border-b border-green-200">
                  <span class="text-gray-700">İzin Süresi:</span>
                  <span class="font-semibold text-gray-900">{{ calculatedDays }} iş günü</span>
                </div>
                <div v-if="weekendDaysInRange > 0 && isAnnualLeave" class="flex justify-between items-center py-2">
                  <span class="text-gray-700">Hafta Tatili ({{ weekendDayNames }}):</span>
                  <span class="font-medium text-orange-700">{{ weekendDaysInRange }} gün (hesaplamaya dahil değil)</span>
                </div>
                <div v-if="totalCalendarDays > calculatedDays" class="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                  <p class="text-xs text-blue-800">
                    <strong>Toplam takvim günü:</strong> {{ totalCalendarDays }} gün
                    <br />
                    <strong>Kullanılan izin:</strong> {{ calculatedDays }} iş günü
                    <span v-if="weekendDaysInRange > 0">({{ weekendDaysInRange }} hafta tatili hariç)</span>
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Yarım Gün Seçeneği -->
            <div v-if="showHalfDayOption" class="flex items-center gap-4">
              <label class="flex items-center">
                <input type="checkbox" v-model="form.isHalfDay" class="mr-2" @change="handleHalfDayChange" />
                <span class="text-sm text-gray-700">Yarım Gün</span>
              </label>
              <div v-if="form.isHalfDay">
                <label class="block text-sm font-medium text-gray-700 mb-1">Yarım Gün Dönemi</label>
                <select
                  v-model="form.halfDayPeriod"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="morning">Öğleden Önce</option>
                  <option value="afternoon">Öğleden Sonra</option>
                </select>
              </div>
            </div>
            
            <!-- Saatlik İzin Seçeneği -->
            <div v-if="showHourlyOption" class="flex items-center gap-4">
              <label class="flex items-center">
                <input type="checkbox" v-model="form.isHourly" class="mr-2" @change="handleHourlyChange" />
                <span class="text-sm text-gray-700">Saatlik İzin</span>
              </label>
              <div v-if="form.isHourly" class="grid grid-cols-2 gap-4 flex-1">
                <Input
                  v-model="form.startTime"
                  type="time"
                  label="Başlangıç Saati"
                  @input="calculateHours"
                />
                <Input
                  v-model="form.endTime"
                  type="time"
                  label="Bitiş Saati"
                  @input="calculateHours"
                />
                <div v-if="calculatedHours > 0" class="col-span-2 bg-blue-50 p-3 rounded-lg">
                  <p class="text-sm text-blue-800">
                    <strong>Toplam Saat:</strong> {{ calculatedHours }} saat
                  </p>
                </div>
              </div>
            </div>
            
            <Textarea
              v-model="form.description"
              label="Açıklama"
              :required="descriptionRequired"
            />
            <div v-if="isReportLeave">
              <label class="block text-sm font-medium text-gray-700 mb-2">Rapor Dosyası</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                @change="handleFileChange"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeModal">İptal</Button>
              <Button type="submit" :disabled="saving">{{ saving ? 'Kaydediliyor...' : 'Kaydet' }}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">İzin Talebi Detayları</h2>
        <div class="space-y-4" v-if="selectedRequest">
          <div>
            <strong>Çalışan:</strong> {{ selectedRequest.employee?.firstName }} {{ selectedRequest.employee?.lastName }}
          </div>
          <div>
            <strong>İzin Türü:</strong> {{ selectedRequest.leaveSubType?.name || selectedRequest.companyLeaveType?.name || selectedRequest.type }}
          </div>
          <div>
            <strong>Tarih:</strong> {{ formatDate(selectedRequest.startDate) }} - {{ formatDate(selectedRequest.endDate) }}
          </div>
          <div>
            <strong>Toplam:</strong> {{ selectedRequest.totalDays }} {{ selectedRequest.isHourly ? 'saat' : 'gün' }}
          </div>
          <div v-if="selectedRequest.description">
            <strong>Açıklama:</strong> {{ selectedRequest.description }}
          </div>
          <div v-if="selectedRequest.document">
            <strong>Rapor:</strong>
            <a :href="`http://localhost:3000${selectedRequest.document}`" target="_blank" class="text-blue-600 hover:underline ml-2">
              Dosyayı Görüntüle
            </a>
          </div>
          <div v-if="selectedRequest.rejectedReason">
            <strong>Red Nedeni:</strong> {{ selectedRequest.rejectedReason }}
          </div>

          <!-- Onay Akışı Bilgisi -->
          <div class="mt-4 pt-4 border-t">
            <strong class="block mb-2">Onay Akışı:</strong>
            <div v-if="selectedRequest.approvalChainDetails && selectedRequest.approvalChainDetails.length > 0" class="space-y-2">
              <div v-for="(approver, index) in selectedRequest.approvalChainDetails" :key="index"
                   class="flex items-center gap-2 text-sm">
                <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                  {{ index + 1 }}
                </span>
                <span v-if="approver.isDefault" class="text-blue-600 font-medium">
                  Şirket Admin (Varsayılan)
                </span>
                <span v-else>
                  {{ approver.firstName }} {{ approver.lastName }}
                </span>
                <span v-if="isApproverInHistory(approver._id)" class="text-green-600">
                  ✓ Onayladı
                </span>
              </div>
            </div>
            <div v-else class="text-sm text-gray-500">
              <span class="text-blue-600">Şirket Admin</span> onaylama yetkisine sahip (varsayılan)
            </div>
          </div>

          <!-- Onay Geçmişi -->
          <div v-if="selectedRequest.history && selectedRequest.history.length > 0" class="mt-4 pt-4 border-t">
            <strong class="block mb-2">Onay Geçmişi:</strong>
            <div class="space-y-2">
              <div v-for="(historyItem, index) in selectedRequest.history" :key="index"
                   class="text-sm p-2 rounded"
                   :class="{
                     'bg-green-50': historyItem.status === 'APPROVED',
                     'bg-red-50': historyItem.status === 'REJECTED',
                     'bg-yellow-50': historyItem.status === 'IN_PROGRESS' || historyItem.status === 'PENDING'
                   }">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="font-medium">
                      {{ historyItem.approver?.firstName }} {{ historyItem.approver?.lastName }}
                    </span>
                    <span class="ml-2" :class="{
                      'text-green-600': historyItem.status === 'APPROVED',
                      'text-red-600': historyItem.status === 'REJECTED',
                      'text-yellow-600': historyItem.status === 'IN_PROGRESS' || historyItem.status === 'PENDING'
                    }">
                      ({{ getStatusTextShort(historyItem.status) }})
                    </span>
                  </div>
                  <span class="text-gray-500 text-xs">
                    {{ historyItem.date ? new Date(historyItem.date).toLocaleDateString('tr-TR') : '' }}
                  </span>
                </div>
                <div v-if="historyItem.note" class="text-gray-600 mt-1">
                  {{ historyItem.note }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <Button variant="secondary" @click="showDetailModal = false">Kapat</Button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">İzin Talebini Reddet</h2>
        <form @submit.prevent="reviewRequest(rejectingRequest, 'rejected')">
          <div class="space-y-4">
            <Textarea
              v-model="rejectReason"
              label="Red Nedeni"
              required
              rows="4"
            />
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="showRejectModal = false">İptal</Button>
              <Button type="submit" variant="danger">Reddet</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Textarea from '@/components/Textarea.vue'

const authStore = useAuthStore()
const toast = useToastStore()
const confirmModal = useConfirmStore()
const requests = ref([])
const leaveTypes = ref([])
const leaveSubTypes = ref([])
const showModal = ref(false)
const showDetailModal = ref(false)
const showRejectModal = ref(false)
const selectedRequest = ref(null)
const rejectingRequest = ref(null)
const rejectReason = ref('')
const saving = ref(false)
const descriptionRequired = ref(false)

// Pagination ve filtreleme
const filters = ref({
  status: '',
  leaveType: '',
  employeeName: '',
  startDate: '',
  endDate: ''
})

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})

// Sıralama
const sortField = ref('startDate')
const sortOrder = ref('desc')

// Tab ve silme işlemleri
const activeTab = ref('active')
const deletedRequests = ref([])
const deletedPagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})
const showDeleteModal = ref(false)
const deletingRequest = ref(null)
const deleteReason = ref('')
const deleting = ref(false)

let debounceTimer = null

const form = ref({
  company: '',
  employee: '',
  companyLeaveType: '',
  leaveSubType: '',
  startDate: '',
  endDate: '',
  returnDate: '',
  startTime: '',
  endTime: '',
  isHalfDay: false,
  halfDayPeriod: 'morning',
  isHourly: false,
  hours: 0,
  description: ''
})

const employees = ref([])
const filteredEmployees = ref([])
const workplaces = ref([])
const filterWorkplace = ref(null)
const companies = ref([])

const selectedLeaveType = computed(() => {
  return leaveTypes.value.find(t => t._id === form.value.companyLeaveType)
})

const filteredSubTypes = computed(() => {
  if (!selectedLeaveType.value || selectedLeaveType.value.name !== 'Diğer izinler') {
    return []
  }
  return leaveSubTypes.value.filter(st => {
    // parentPermitId populate edilmiş olabilir (obje) veya sadece ID olabilir (string)
    const parentId = st.parentPermitId?._id || st.parentPermitId
    const selectedId = selectedLeaveType.value._id
    return parentId?.toString() === selectedId?.toString()
  })
})

const showHourlyOption = computed(() => {
  return selectedLeaveType.value?.name === 'Saatlik İzin'
})

const showHalfDayOption = computed(() => {
  return selectedLeaveType.value?.name === 'Saatlik İzin' || 
         selectedLeaveType.value?.name === 'Yıllık izin (Ücretli İzin)'
})

const isSameDayRequired = computed(() => {
  return form.value.isHourly || form.value.isHalfDay
})

const conflictWarning = ref(null)
const file = ref(null)
const calculatedDays = ref(0)
const calculatedHours = ref(0)
const manualDaysInput = ref(null)
const weekendDaysInRange = ref(0)
const totalCalendarDays = ref(0)
const employeeWeekendDays = ref([0]) // Default: Pazar

const canCreate = computed(() => {
  const roleName = authStore.user?.role?.name || authStore.user?.role
  return ['employee', 'company_admin', 'resmi_muhasebe_ik'].includes(roleName)
})

const canReview = computed(() => {
  const roleName = authStore.user?.role?.name || authStore.user?.role
  return ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'].includes(roleName)
})

const isReportLeave = computed(() => {
  return selectedLeaveType.value?.name?.toLowerCase().includes('rapor') || 
         selectedLeaveType.value?.name?.toLowerCase().includes('istirahat')
})

const isBayiAdmin = computed(() => {
  const roleName = authStore.user?.role?.name || authStore.user?.role
  return roleName === 'bayi_admin'
})
const isAdmin = computed(() => {
  const roleName = authStore.user?.role?.name || authStore.user?.role
  return ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'].includes(roleName)
})

const statusCounts = computed(() => ({
  pending: requests.value.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length,
  approved: requests.value.filter(r => r.status === 'APPROVED').length,
  rejected: requests.value.filter(r => r.status === 'REJECTED').length
}))

// İş başı tarihi
const returnDateFormatted = computed(() => {
  if (!form.value.endDate) return '-'
  const endDate = new Date(form.value.endDate)
  endDate.setDate(endDate.getDate() + 1)
  return formatDate(endDate.toISOString().split('T')[0])
})

// Yıllık izin mi?
const isAnnualLeave = computed(() => {
  return selectedLeaveType.value?.name?.toLowerCase().includes('yıllık')
})

// Hafta tatili günlerinin isimleri
const weekendDayNames = computed(() => {
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
  return employeeWeekendDays.value.map(d => dayNames[d]).join(', ')
})

const loadLeaveTypes = async () => {
  try {
    let companyId = null
    if (form.value.company) {
      companyId = typeof form.value.company === 'object' ? form.value.company._id : form.value.company
    } else if (authStore.user?.company) {
      // company object veya string olabilir
      companyId = typeof authStore.user.company === 'object' ? authStore.user.company._id : authStore.user.company
    }

    if (!companyId) {
      console.error('Şirket bilgisi bulunamadı')
      return
    }

    const response = await api.get('/working-permits', {
      params: { companyId }
    })

    if (response.data.success) {
      const allPermits = response.data.data || []
      leaveTypes.value = allPermits.filter(p => !p.parentPermitId)
      leaveSubTypes.value = allPermits.filter(p => p.parentPermitId)
    }
  } catch (error) {
    console.error('İzin türleri yüklenemedi:', error)
    leaveTypes.value = []
    leaveSubTypes.value = []
  }
}

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
    companies.value = []
  }
}

const loadEmployeesForCompany = async () => {
  if (!form.value.company) {
    employees.value = []
    filteredEmployees.value = []
    workplaces.value = []
    return
  }

  try {
    // company object veya string olabilir
    const companyIdForQuery = typeof form.value.company === 'object' ? form.value.company._id : form.value.company

    const empResponse = await api.get('/employees', { params: { company: companyIdForQuery } })
    employees.value = empResponse.data?.data || empResponse.data || []
    filteredEmployees.value = employees.value

    const wpResponse = await api.get('/workplaces', { params: { company: companyIdForQuery } })
    workplaces.value = wpResponse.data?.data || wpResponse.data || []

    filterEmployees()
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
    employees.value = []
    filteredEmployees.value = []
    workplaces.value = []
  }
}

const onEmployeeChange = async () => {
  if (form.value.employee) {
    await loadEmployeeWeekendDays(form.value.employee)
  }
}

const filterEmployees = () => {
  if (!filterWorkplace.value) {
    filteredEmployees.value = employees.value
  } else {
    filteredEmployees.value = employees.value.filter(emp => 
      emp.workplace && emp.workplace.toString() === filterWorkplace.value
    )
  }
}

const handleLeaveTypeChange = async () => {
  checkDescriptionRequired()
  if (selectedLeaveType.value?.name !== 'Diğer izinler') {
    form.value.leaveSubType = ''
  }
  
  if (!showHourlyOption.value) {
    form.value.isHourly = false
    form.value.startTime = ''
    form.value.endTime = ''
  }
  if (!showHalfDayOption.value) {
    form.value.isHalfDay = false
    form.value.halfDayPeriod = 'morning'
  }
  
  if (isSameDayRequired.value && form.value.startDate) {
    form.value.endDate = form.value.startDate
  }
}

const handleStartDateChange = () => {
  if (isSameDayRequired.value && form.value.startDate) {
    form.value.endDate = form.value.startDate
  }
  calculateDays()
}

// Başlangıç tarihi değiştiğinde
const onStartDateChange = () => {
  if (manualDaysInput.value && manualDaysInput.value > 0) {
    // Eğer gün sayısı varsa, bitiş tarihini yeniden hesapla
    calculateEndDateFromDays()
  } else {
    // Yoksa sadece calculateDays'i çağır
    calculateDays()
  }
}

// Gün sayısı değiştiğinde
const onDaysInputChange = () => {
  if (!form.value.startDate || !manualDaysInput.value || manualDaysInput.value < 1) {
    form.value.endDate = ''
    return
  }
  calculateEndDateFromDays()
}

// Bitiş tarihi manuel olarak değiştiğinde
const onEndDateChange = () => {
  if (!form.value.startDate || !form.value.endDate) {
    manualDaysInput.value = null
    return
  }

  // Başlangıç ve bitiş tarihi arasındaki iş günü sayısını hesapla
  const start = new Date(form.value.startDate)
  const end = new Date(form.value.endDate)
  let currentDate = new Date(start)
  let workDays = 0

  while (currentDate <= end) {
    if (!employeeWeekendDays.value.includes(currentDate.getDay())) {
      workDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  manualDaysInput.value = workDays
  calculateDays()
}

// Gün bazlı girişten bitiş tarihi hesaplama (yardımcı fonksiyon)
const calculateEndDateFromDays = () => {
  if (!form.value.startDate || !manualDaysInput.value || manualDaysInput.value < 1) {
    form.value.endDate = ''
    return
  }

  let currentDate = new Date(form.value.startDate)
  let daysAdded = 0

  // İş günü sayısını ekle (hafta tatilleri hariç)
  while (daysAdded < manualDaysInput.value) {
    if (!employeeWeekendDays.value.includes(currentDate.getDay())) {
      daysAdded++
    }
    if (daysAdded < manualDaysInput.value) {
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  form.value.endDate = currentDate.toISOString().split('T')[0]
  calculateDays()
}

// Çalışanın hafta tatili günlerini yükle
const loadEmployeeWeekendDays = async (employeeId) => {
  if (!employeeId) return

  try {
    const weekendResponse = await api.get(`/weekend-settings/employee/${employeeId}`)
    if (weekendResponse.data && weekendResponse.data.weekendDays) {
      employeeWeekendDays.value = weekendResponse.data.weekendDays
    } else {
      // Şirket default'unu al
      const companyWeekendResponse = await api.get('/weekend-settings')
      if (companyWeekendResponse.data && companyWeekendResponse.data.weekendDays) {
        employeeWeekendDays.value = companyWeekendResponse.data.weekendDays
      }
    }
  } catch (error) {
    console.error('Hafta tatili bilgisi alınamadı:', error)
  }
}

const loadRequests = async () => {
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    
    if (filters.value.status) {
      params.status = filters.value.status
    }
    
    if (filters.value.leaveType) {
      params.leaveType = filters.value.leaveType
    }
    
    if (filters.value.employeeName) {
      params.employeeName = filters.value.employeeName
    }
    
    if (filters.value.startDate) {
      params.startDate = filters.value.startDate
    }
    
    if (filters.value.endDate) {
      params.endDate = filters.value.endDate
    }
    
    const response = await api.get('/leave-requests', { params })

    if (response.data.success) {
      requests.value = response.data.data || []
      if (response.data.pagination) {
        pagination.value = {
          page: response.data.pagination.page || pagination.value.page,
          limit: response.data.pagination.limit || pagination.value.limit,
          total: response.data.pagination.total || 0,
          totalPages: response.data.pagination.totalPages || 1
        }
      }
    } else {
      requests.value = []
    }
  } catch (error) {
    console.error('Talepler yüklenemedi:', error)
    requests.value = []
  }
}

// Silinmiş talepleri yükle
const loadDeletedRequests = async () => {
  try {
    const params = {
      page: deletedPagination.value.page,
      limit: deletedPagination.value.limit
    }

    const response = await api.get('/leave-requests/deleted', { params })

    if (response.data.success) {
      deletedRequests.value = response.data.data || []
      if (response.data.pagination) {
        deletedPagination.value = {
          page: response.data.pagination.page || deletedPagination.value.page,
          limit: response.data.pagination.limit || deletedPagination.value.limit,
          total: response.data.pagination.total || 0,
          totalPages: response.data.pagination.totalPages || 1
        }
      }
    } else {
      deletedRequests.value = []
    }
  } catch (error) {
    console.error('Silinmiş talepler yüklenemedi:', error)
    deletedRequests.value = []
  }
}

// Silme modal işlemleri
const openDeleteModal = (request) => {
  deletingRequest.value = request
  deleteReason.value = ''
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deletingRequest.value = null
  deleteReason.value = ''
}

const confirmDelete = async () => {
  if (!deletingRequest.value) return

  deleting.value = true
  try {
    const response = await api.delete(`/leave-requests/${deletingRequest.value._id}`, {
      data: { reason: deleteReason.value }
    })

    if (response.data.success) {
      toast.success('İzin talebi silindi')
      closeDeleteModal()
      loadRequests()
    } else {
      toast.error(response.data.message || 'Silme işlemi başarısız')
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Silme işlemi başarısız')
  } finally {
    deleting.value = false
  }
}

// Geri alma işlemi
const restoreRequest = async (request) => {
  const confirmed = await confirmModal.show({
    title: 'Kaydı Geri Al',
    message: 'Bu izin talebini geri almak istediğinize emin misiniz?',
    type: 'info',
    confirmText: 'Geri Al'
  })

  if (!confirmed) return

  try {
    const response = await api.post(`/leave-requests/${request._id}/restore`)

    if (response.data.success) {
      toast.success('İzin talebi geri alındı')
      loadDeletedRequests()
    } else {
      toast.error(response.data.message || 'Geri alma işlemi başarısız')
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Geri alma işlemi başarısız')
  }
}

const debounceLoadRequests = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    pagination.value.page = 1
    loadRequests()
  }, 500)
}

const resetFilters = () => {
  filters.value = {
    status: '',
    leaveType: '',
    employeeName: '',
    startDate: '',
    endDate: ''
  }
  pagination.value.page = 1
  loadRequests()
}

const changePage = (page) => {
  pagination.value.page = page
  loadRequests()
}

const suspendRequest = async (request) => {
  const confirmed = await confirmModal.show({
    title: 'Askıya Al',
    message: 'Bu izin talebini askıya almak istediğinizden emin misiniz?',
    type: 'warning',
    confirmText: 'Askıya Al'
  })
  if (!confirmed) return

  try {
    await api.post(`/leave-requests/${request._id}/suspend`, {
      note: 'İzin talebi askıya alındı'
    })
    toast.success('İzin talebi askıya alındı')
    loadRequests()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const resumeRequest = async (request) => {
  const confirmed = await confirmModal.show({
    title: 'Devam Ettir',
    message: 'Bu izin talebini devam ettirmek istediğinizden emin misiniz?',
    type: 'info',
    confirmText: 'Devam Ettir'
  })
  if (!confirmed) return

  try {
    await api.post(`/leave-requests/${request._id}/resume`)
    toast.success('İzin talebi devam ettirildi')
    loadRequests()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  }
}

const calculateDays = async () => {
  if (!form.value.startDate || !form.value.endDate) {
    calculatedDays.value = 0
    weekendDaysInRange.value = 0
    totalCalendarDays.value = 0
    conflictWarning.value = null
    return
  }
  if (form.value.isHourly) {
    conflictWarning.value = null
    return
  }

  try {
    let employeeId = null
    if (authStore.hasRole('employee')) {
      const employeesResponse = await api.get('/employees')
      const employeesData = employeesResponse.data?.data || employeesResponse.data || []
      const employee = employeesData.find(e => e.email === authStore.user.email)
      if (employee) {
        employeeId = employee._id
      }
    } else if (form.value.employee) {
      employeeId = form.value.employee
    }

    // Hafta tatili günlerini say
    const start = new Date(form.value.startDate)
    const end = new Date(form.value.endDate)
    let currentDate = new Date(start)
    let weekendCount = 0
    let workDayCount = 0

    while (currentDate <= end) {
      if (employeeWeekendDays.value.includes(currentDate.getDay())) {
        weekendCount++
      } else {
        workDayCount++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    weekendDaysInRange.value = weekendCount
    const diffTime = Math.abs(end - start)
    totalCalendarDays.value = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    if (employeeId) {
      const returnDate = form.value.returnDate || form.value.endDate
      const params = {
        employeeId: employeeId,
        startDate: form.value.startDate,
        returnDate: returnDate,
        isHalfDay: form.value.isHalfDay,
        isHourly: form.value.isHourly,
        hours: form.value.hours
      }

      const response = await api.post('/leave-requests/calculate-days', params)
      calculatedDays.value = response.data.totalDays

      if (response.data.hasConflict && response.data.conflicts.length > 0) {
        const conflict = response.data.conflicts[0]
        conflictWarning.value = conflict.message
      } else {
        conflictWarning.value = null
      }
    } else {
      if (form.value.isHalfDay) {
        calculatedDays.value = 0.5
      } else {
        calculatedDays.value = workDayCount
      }
      conflictWarning.value = null
    }
  } catch (error) {
    console.error('Gün hesaplanamadı:', error)
    conflictWarning.value = null
  }
}

const calculateHours = () => {
  if (!form.value.startTime || !form.value.endTime) {
    calculatedHours.value = 0
    return
  }

  const start = new Date(`2000-01-01T${form.value.startTime}`)
  const end = new Date(`2000-01-01T${form.value.endTime}`)
  const diffMs = end - start
  const diffHours = diffMs / (1000 * 60 * 60)
  
  calculatedHours.value = Math.abs(diffHours)
  form.value.hours = calculatedHours.value
}

const handleHalfDayChange = () => {
  if (form.value.isHalfDay) {
    form.value.isHourly = false
    form.value.startTime = ''
    form.value.endTime = ''
    if (form.value.startDate) {
      form.value.endDate = form.value.startDate
    }
    calculatedDays.value = 0.5
    conflictWarning.value = null
  } else {
    calculateDays()
  }
}

const handleHourlyChange = () => {
  if (form.value.isHourly) {
    form.value.isHalfDay = false
    form.value.halfDayPeriod = 'morning'
    if (form.value.startDate) {
      form.value.endDate = form.value.startDate
    }
    calculatedDays.value = 0
    conflictWarning.value = null
  } else {
    calculateDays()
  }
}

const checkDescriptionRequired = () => {
  const isUnpaid = selectedLeaveType.value?.name?.toLowerCase().includes('ücretsiz') || 
                   selectedLeaveType.value?.name?.toLowerCase().includes('mazeret')
  descriptionRequired.value = isUnpaid || false
}

const handleFileChange = (event) => {
  file.value = event.target.files[0]
}

const saveRequest = async () => {
  if (selectedLeaveType.value?.name === 'Diğer izinler' && !form.value.leaveSubType) {
    toast.warning('Alt izin türü seçilmelidir')
    return
  }

  if ((form.value.isHourly || form.value.isHalfDay) && form.value.startDate !== form.value.endDate) {
    toast.warning('Saatlik ve yarım gün izinler için başlangıç ve bitiş tarihi aynı gün olmalıdır')
    return
  }

  if (form.value.isHourly && (!form.value.startTime || !form.value.endTime)) {
    toast.warning('Saatlik izin için başlangıç ve bitiş saati gereklidir')
    return
  }

  if (isAdmin.value && !form.value.employee) {
    toast.warning('Çalışan seçilmelidir')
    return
  }

  saving.value = true
  try {
    const formData = new FormData()
    if (form.value.employee) {
      formData.append('employee', form.value.employee)
    }
    formData.append('companyLeaveType', form.value.companyLeaveType)
    if (form.value.leaveSubType) {
      formData.append('leaveSubType', form.value.leaveSubType)
    }
    formData.append('startDate', form.value.startDate)
    formData.append('endDate', form.value.endDate || form.value.startDate)
    if (form.value.returnDate) formData.append('returnDate', form.value.returnDate)
    formData.append('isHalfDay', form.value.isHalfDay)
    formData.append('halfDayPeriod', form.value.halfDayPeriod)
    formData.append('isHourly', form.value.isHourly)
    if (form.value.startTime) formData.append('startTime', form.value.startTime)
    if (form.value.endTime) formData.append('endTime', form.value.endTime)
    if (form.value.hours) formData.append('hours', form.value.hours)
    if (form.value.description) formData.append('description', form.value.description)
    if (file.value) formData.append('document', file.value)

    await api.post('/leave-requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    closeModal()
    loadRequests()
    toast.success('İzin talebi oluşturuldu')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu')
  } finally {
    saving.value = false
  }
}

const reviewRequest = async (request, status) => {
  try {
    if (status === 'approved') {
      await api.post(`/leave-requests/${request._id}/approve`, {})
      toast.success('İzin talebi onaylandı')
    } else if (status === 'rejected') {
      await api.post(`/leave-requests/${request._id}/reject`, { note: rejectReason.value })
      showRejectModal.value = false
      rejectReason.value = ''
      toast.success('İzin talebi reddedildi')
    }
    loadRequests()
  } catch (error) {
    toast.error(error.response?.data?.message || error.response?.data?.error || 'Hata oluştu')
  }
}

const approveCancellation = async (request) => {
  try {
    await api.post(`/leave-requests/${request._id}/approve-cancellation`, {})
    loadRequests()
    toast.success('İptal talebi onaylandı')
  } catch (error) {
    toast.error(error.response?.data?.message || error.response?.data?.error || 'Hata oluştu')
  }
}

const openRejectModal = (request) => {
  rejectingRequest.value = request
  rejectReason.value = ''
  showRejectModal.value = true
}

const viewDetails = async (request) => {
  try {
    // Detaylı bilgileri API'den al (onay zinciri dahil)
    const response = await api.get(`/leave-requests/${request._id}`)
    selectedRequest.value = response.data
    showDetailModal.value = true
  } catch (error) {
    // Hata durumunda basit veriyle göster
    selectedRequest.value = request
    showDetailModal.value = true
  }
}

// Onay geçmişinde bu onaylayıcı var mı kontrol et
const isApproverInHistory = (approverId) => {
  if (!approverId || !selectedRequest.value?.history) return false
  return selectedRequest.value.history.some(h =>
    h.approver?._id === approverId && (h.status === 'APPROVED' || h.status === 'IN_PROGRESS')
  )
}

const closeModal = () => {
  showModal.value = false
  form.value = {
    company: '',
    employee: '',
    companyLeaveType: '',
    leaveSubType: '',
    startDate: '',
    endDate: '',
    returnDate: '',
    startTime: '',
    endTime: '',
    isHalfDay: false,
    halfDayPeriod: 'morning',
    isHourly: false,
    hours: 0,
    description: ''
  }
  filterWorkplace.value = ''
  file.value = null
  calculatedDays.value = 0
  calculatedHours.value = 0
  descriptionRequired.value = false
  conflictWarning.value = null
  employees.value = []
  filteredEmployees.value = []
  workplaces.value = []
}

// Sıralama fonksiyonları
const toggleSort = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
}

const sortedRequests = computed(() => {
  if (!requests.value || requests.value.length === 0) return []

  return [...requests.value].sort((a, b) => {
    let aVal, bVal

    switch (sortField.value) {
      case 'employee':
        aVal = `${a.employee?.firstName || ''} ${a.employee?.lastName || ''}`.toLowerCase()
        bVal = `${b.employee?.firstName || ''} ${b.employee?.lastName || ''}`.toLowerCase()
        break
      case 'leaveType':
        aVal = a.leaveSubType?.name || a.companyLeaveType?.name || a.type || ''
        bVal = b.leaveSubType?.name || b.companyLeaveType?.name || b.type || ''
        break
      case 'startDate':
        aVal = new Date(a.startDate)
        bVal = new Date(b.startDate)
        break
      case 'endDate':
        aVal = new Date(a.endDate)
        bVal = new Date(b.endDate)
        break
      case 'totalDays':
        aVal = a.totalDays || 0
        bVal = b.totalDays || 0
        break
      case 'status':
        aVal = a.status || ''
        bVal = b.status || ''
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR')
}

const getStatusText = (status) => {
  const statusMap = {
    'PENDING': 'Bekliyor',
    'IN_PROGRESS': 'Onay Sürecinde',
    'APPROVED': 'Onaylandı',
    'REJECTED': 'Reddedildi',
    'CANCELLED': 'İptal Edildi',
    'CANCELLATION_REQUESTED': 'İptal Talebi',
    'SUSPENDED': 'Askıda'
  }
  return statusMap[status] || status
}

const getStatusTextShort = (status) => {
  const statusMap = {
    'PENDING': 'Bekliyor',
    'IN_PROGRESS': 'Süreçte',
    'APPROVED': 'Onaylı',
    'REJECTED': 'Red',
    'CANCELLED': 'İptal',
    'CANCELLATION_REQUESTED': 'İptal T.',
    'SUSPENDED': 'Askıda'
  }
  return statusMap[status] || status
}

const getApproverTitle = (request) => {
  if (request.currentApprover) {
    return `${request.currentApprover.firstName} ${request.currentApprover.lastName}`
  }
  if (request.status === 'PENDING' || request.status === 'IN_PROGRESS') {
    return 'Onay bekliyor - Şirket Admin onaylayabilir'
  }
  return ''
}

onMounted(async () => {
  await loadRequests()

  const roleName = authStore.user?.role?.name || authStore.user?.role

  if (roleName === 'bayi_admin' || roleName === 'super_admin') {
    // bayi_admin ve super_admin için önce şirketleri yükle
    await loadCompanies()
    // İlk şirketi seç ve izin türlerini yükle
    if (companies.value.length > 0) {
      form.value.company = companies.value[0]._id
      await loadLeaveTypes()
      await loadEmployeesForCompany()
    }
  } else if (isAdmin.value && authStore.user?.company) {
    // company_admin için
    const company = authStore.user.company
    form.value.company = typeof company === 'object' ? company._id : company
    await loadLeaveTypes()
    await loadEmployeesForCompany()
  } else {
    // Çalışan için
    await loadLeaveTypes()
  }
})
</script>

<style scoped>
</style>
