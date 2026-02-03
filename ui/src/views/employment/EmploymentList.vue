<template>
  <div class="p-6">
    <div class="flex justify-end items-center mb-6">
      <div class="flex gap-2">
        <button
          @click="$router.push('/employment/hire')"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + İşe Giriş İşlemi Başlat
        </button>
        <button
          @click="$router.push('/employment/terminate')"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          - İşten Çıkış İşlemi Başlat
        </button>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Filtreler</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <!-- Şirket Filtresi (Bayi için) -->
        <div v-if="!isCompanyAdmin">
          <label class="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
          <select
            v-model="filters.companyId"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option v-for="company in uniqueCompanies" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
        </div>
        <!-- İşyeri Filtresi (Şirket Admini için) -->
        <div v-if="isCompanyAdmin && uniqueWorkplaces.length > 1">
          <label class="block text-sm font-medium text-gray-700 mb-1">İşyeri</label>
          <select
            v-model="filters.workplaceId"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option v-for="workplace in uniqueWorkplaces" :key="workplace.id" :value="workplace.id">
              {{ workplace.name }}
            </option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">İşlem Türü</label>
          <select
            v-model="filters.processType"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="hire">İşe Giriş</option>
            <option value="termination">İşten Çıkış</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="PENDING">Bekliyor</option>
            <option value="REVISION_REQUESTED">Düzeltme Bekleniyor</option>
            <option value="CANCELLATION_REQUESTED">İptal Onayı Bekliyor</option>
            <option value="APPROVED">ONAYLANDI</option>
            <option value="CANCELLED">İPTAL</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Arama (Ad, Soyad, TCKN)</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Ara..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="flex items-end">
          <button
            @click="resetFilters"
            class="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>
    </div>

    <!-- Bayi için Filtresiz Düz Tablo (Talep tarihine göre sıralı) -->
    <div v-if="!isCompanyAdmin && !hasActiveFilters && ungroupedRecords.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 table-fixed">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-[4%] px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th
                @click="toggleSort('name')"
                class="w-[14%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Ad Soyad
                  <span v-if="getSortIcon('name') === 'asc'" class="text-blue-600">↑</span>
                  <span v-else-if="getSortIcon('name') === 'desc'" class="text-blue-600">↓</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th
                @click="toggleSort('tckn')"
                class="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  TCKN
                  <span v-if="getSortIcon('tckn') === 'asc'" class="text-blue-600">↑</span>
                  <span v-else-if="getSortIcon('tckn') === 'desc'" class="text-blue-600">↓</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th
                @click="toggleSort('date')"
                class="w-[8%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Tarih
                  <span v-if="getSortIcon('date') === 'asc'" class="text-blue-600">↑</span>
                  <span v-else-if="getSortIcon('date') === 'desc'" class="text-blue-600">↓</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th
                @click="toggleSort('jobReason')"
                class="w-[12%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Görev/Neden
                  <span v-if="getSortIcon('jobReason') === 'asc'" class="text-blue-600">↑</span>
                  <span v-else-if="getSortIcon('jobReason') === 'desc'" class="text-blue-600">↓</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th
                @click="toggleSort('createdAt')"
                class="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Talep
                  <span v-if="getSortIcon('createdAt') === 'asc'" class="text-blue-600">↑</span>
                  <span v-else-if="getSortIcon('createdAt') === 'desc'" class="text-blue-600">↓</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th
                @click="toggleSort('approvedAt')"
                class="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Onay
                  <span v-if="getSortIcon('approvedAt') === 'asc'" class="text-blue-600">↑</span>
                  <span v-else-if="getSortIcon('approvedAt') === 'desc'" class="text-blue-600">↓</span>
                  <span v-else class="text-gray-300">↕</span>
                </div>
              </th>
              <th class="w-[8%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bekleme
              </th>
              <th class="w-[7%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Emeklilik
              </th>
              <th class="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durum
              </th>
              <th class="w-[14%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="(record, index) in ungroupedRecords"
              :key="record._id"
              :class="{
                'bg-green-50 hover:bg-green-100': record.processType === 'hire',
                'bg-red-50 hover:bg-red-100': record.processType === 'termination'
              }"
            >
              <!-- Sıra No -->
              <td class="px-2 py-3 text-center text-xs font-medium text-gray-500">
                {{ index + 1 }}
              </td>
              <!-- Ad Soyad + Şirket -->
              <td class="px-3 py-3">
                <div class="text-sm font-medium text-gray-900 truncate" :title="getEmployeeName(record)">
                  {{ getEmployeeName(record) }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ record.processType === 'hire' ? '🟢 Giriş' : '🔴 Çıkış' }}
                  <span class="text-blue-600 ml-1">• {{ getCompanyName(record) }}</span>
                </div>
              </td>
              <!-- TCKN -->
              <td class="px-3 py-3">
                <div class="text-sm text-gray-900 font-mono">
                  {{ getTCKN(record) }}
                </div>
              </td>
              <!-- Tarih -->
              <td class="px-3 py-3">
                <div class="text-sm text-gray-900">
                  {{ formatDate(record.processType === 'hire' ? record.hireDate : record.terminationDate) }}
                </div>
              </td>
              <!-- Görev/Neden -->
              <td class="px-3 py-3">
                <div class="text-sm text-gray-900 truncate" :title="getJobOrReason(record)">
                  {{ getJobOrReason(record) }}
                </div>
              </td>
              <!-- Talep -->
              <td class="px-3 py-3">
                <div class="text-xs text-gray-900">
                  {{ formatDateTime(record.createdAt) }}
                </div>
              </td>
              <!-- Onay -->
              <td class="px-3 py-3">
                <div class="text-xs text-gray-900">
                  {{ record.approvedAt ? formatDateTime(record.approvedAt) : '—' }}
                </div>
              </td>
              <!-- Bekleme -->
              <td class="px-3 py-3">
                <div
                  :class="{
                    'text-green-600': getWaitingTime(record.createdAt).hours < 24,
                    'text-yellow-600': getWaitingTime(record.createdAt).hours >= 24 && getWaitingTime(record.createdAt).hours < 72,
                    'text-red-600': getWaitingTime(record.createdAt).hours >= 72
                  }"
                  class="text-xs font-semibold"
                >
                  {{ formatWaitingTime(record.createdAt, record.status) }}
                </div>
              </td>
              <!-- Emeklilik -->
              <td class="px-3 py-3">
                <span :class="record.isRetired ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'" class="px-2 py-0.5 text-xs font-medium rounded">
                  {{ record.isRetired ? 'Emekli' : 'Normal' }}
                </span>
              </td>
              <!-- Durum -->
              <td class="px-3 py-3">
                <span :class="getStatusClass(record.status)" class="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap">
                  {{ getStatusLabelShort(record.status) }}
                </span>
              </td>
              <!-- İşlem Butonları -->
              <td class="px-3 py-3 text-xs font-medium">
                <div class="flex gap-1 flex-wrap">
                  <button
                    @click="viewRecord(record._id)"
                    class="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Görüntüle"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <!-- Onay/Red butonları - Bekleyenler için -->
                  <template v-if="record.status === 'PENDING'">
                    <button
                      @click="approveRecord(record._id)"
                      class="px-2 py-1 text-green-600 hover:bg-green-50 rounded"
                      title="Onayla"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      @click="openRejectDialog(record._id)"
                      class="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      title="Reddet"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      @click="openRevisionDialog(record._id)"
                      class="px-2 py-1 text-yellow-600 hover:bg-yellow-50 rounded"
                      title="Düzeltme İste"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </template>
                  <!-- İptal onayı bekleyenler için -->
                  <template v-if="record.status === 'CANCELLATION_REQUESTED'">
                    <button
                      @click="approveCancellation(record._id)"
                      class="px-2 py-1 text-orange-600 hover:bg-orange-50 rounded"
                      title="İptali Onayla"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      @click="openRejectCancellationDialog(record._id)"
                      class="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                      title="İptali Reddet"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </template>
                  <!-- Düzeltme bekleyenler için -->
                  <template v-if="record.status === 'REVISION_REQUESTED'">
                    <span class="px-2 py-1 text-yellow-600 text-xs">Düzeltme Bekleniyor</span>
                  </template>
                  <!-- Onayı Geri Al Butonu (Bayi için - 12 saat içinde) -->
                  <button
                    v-if="canRevertApproval(record)"
                    @click="confirmRevertApproval(record)"
                    class="px-2 py-1 text-amber-600 hover:bg-amber-50 rounded"
                    :title="`Onayı Geri Al (${getRevertTimeRemaining(record)} kaldı)`"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <!-- Mesaj Butonu -->
                  <button
                    v-if="canSendMessage(record)"
                    @click="openMessageModal(record)"
                    class="px-2 py-1 rounded relative"
                    :class="record.messageCount > 0 ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-50'"
                    :title="record.messageCount > 0 ? `${record.messageCount} mesaj` : 'Mesaj Gönder'"
                  >
                    <svg v-if="record.messageCount > 0" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Şirkete Göre Gruplu Tablo (Filtreli veya Şirket Admin için) -->
    <div v-if="(isCompanyAdmin || hasActiveFilters) && groupedRecords.length > 0" class="space-y-6">
      <div
        v-for="group in groupedRecords"
        :key="group.companyId"
        class="bg-white rounded-lg shadow overflow-hidden"
      >
        <!-- Şirket Başlığı -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 border-b border-blue-800">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-white flex items-center">
                <span class="w-3 h-3 bg-white rounded-full mr-3"></span>
                {{ group.companyName }}
              </h2>
              <p v-if="group.dealerDisplayName" class="text-sm text-blue-100 mt-1 ml-6">
                <span class="text-blue-200">İK:</span> {{ group.dealerDisplayName }}
              </p>
            </div>
            <span class="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">
              {{ group.records.length }} kayıt
            </span>
          </div>
        </div>

        <!-- Tablo -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-[4%] px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th
                  @click="toggleSort('name')"
                  class="w-[14%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div class="flex items-center gap-1">
                    Ad Soyad
                    <span v-if="getSortIcon('name') === 'asc'" class="text-blue-600">↑</span>
                    <span v-else-if="getSortIcon('name') === 'desc'" class="text-blue-600">↓</span>
                    <span v-else class="text-gray-300">↕</span>
                  </div>
                </th>
                <th
                  @click="toggleSort('tckn')"
                  class="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div class="flex items-center gap-1">
                    TCKN
                    <span v-if="getSortIcon('tckn') === 'asc'" class="text-blue-600">↑</span>
                    <span v-else-if="getSortIcon('tckn') === 'desc'" class="text-blue-600">↓</span>
                    <span v-else class="text-gray-300">↕</span>
                  </div>
                </th>
                <th
                  @click="toggleSort('date')"
                  class="w-[8%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div class="flex items-center gap-1">
                    Tarih
                    <span v-if="getSortIcon('date') === 'asc'" class="text-blue-600">↑</span>
                    <span v-else-if="getSortIcon('date') === 'desc'" class="text-blue-600">↓</span>
                    <span v-else class="text-gray-300">↕</span>
                  </div>
                </th>
                <th
                  @click="toggleSort('jobReason')"
                  class="w-[12%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div class="flex items-center gap-1">
                    Görev/Neden
                    <span v-if="getSortIcon('jobReason') === 'asc'" class="text-blue-600">↑</span>
                    <span v-else-if="getSortIcon('jobReason') === 'desc'" class="text-blue-600">↓</span>
                    <span v-else class="text-gray-300">↕</span>
                  </div>
                </th>
                <th
                  @click="toggleSort('createdAt')"
                  class="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div class="flex items-center gap-1">
                    Talep
                    <span v-if="getSortIcon('createdAt') === 'asc'" class="text-blue-600">↑</span>
                    <span v-else-if="getSortIcon('createdAt') === 'desc'" class="text-blue-600">↓</span>
                    <span v-else class="text-gray-300">↕</span>
                  </div>
                </th>
                <th
                  @click="toggleSort('approvedAt')"
                  class="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div class="flex items-center gap-1">
                    Onay
                    <span v-if="getSortIcon('approvedAt') === 'asc'" class="text-blue-600">↑</span>
                    <span v-else-if="getSortIcon('approvedAt') === 'desc'" class="text-blue-600">↓</span>
                    <span v-else class="text-gray-300">↕</span>
                  </div>
                </th>
                <th class="w-[8%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bekleme
                </th>
                <th class="w-[7%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emeklilik
                </th>
                <th class="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th class="w-[14%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="(record, index) in group.records"
                :key="record._id"
                :class="{
                  'bg-green-50 hover:bg-green-100': record.processType === 'hire',
                  'bg-red-50 hover:bg-red-100': record.processType === 'termination'
                }"
              >
                <!-- Sıra No -->
                <td class="px-2 py-3 text-center text-xs font-medium text-gray-500">
                  {{ index + 1 }}
                </td>
                <!-- Ad Soyad -->
                <td class="px-3 py-3">
                  <div class="text-sm font-medium text-gray-900 truncate" :title="getEmployeeName(record)">
                    {{ getEmployeeName(record) }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ record.processType === 'hire' ? '🟢 Giriş' : '🔴 Çıkış' }}
                  </div>
                </td>

                <!-- TCKN -->
                <td class="px-3 py-3">
                  <div class="text-sm text-gray-900 font-mono">
                    {{ getTCKN(record) }}
                  </div>
                </td>

                <!-- Tarih -->
                <td class="px-3 py-3">
                  <div class="text-sm text-gray-900">
                    {{ formatDate(record.processType === 'hire' ? record.hireDate : record.terminationDate) }}
                  </div>
                </td>

                <!-- Görev/Neden -->
                <td class="px-3 py-3">
                  <div class="text-sm text-gray-900 truncate" :title="getJobOrReason(record)">
                    {{ getJobOrReason(record) }}
                  </div>
                </td>

                <!-- Talep -->
                <td class="px-3 py-3">
                  <div class="text-xs text-gray-900">
                    {{ formatDateTime(record.createdAt) }}
                  </div>
                </td>

                <!-- Onay -->
                <td class="px-3 py-3">
                  <div class="text-xs text-gray-900">
                    {{ record.approvedAt ? formatDateTime(record.approvedAt) : '—' }}
                  </div>
                </td>

                <!-- Bekleme -->
                <td class="px-3 py-3">
                  <div
                    :class="{
                      'text-green-600': getWaitingTime(record.createdAt).hours < 24,
                      'text-yellow-600': getWaitingTime(record.createdAt).hours >= 24 && getWaitingTime(record.createdAt).hours < 72,
                      'text-red-600': getWaitingTime(record.createdAt).hours >= 72
                    }"
                    class="text-xs font-semibold"
                  >
                    {{ formatWaitingTime(record.createdAt, record.status) }}
                  </div>
                </td>

                <!-- Emeklilik -->
                <td class="px-3 py-3">
                  <span :class="record.isRetired ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'" class="px-2 py-0.5 text-xs font-medium rounded">
                    {{ record.isRetired ? 'Emekli' : 'Normal' }}
                  </span>
                </td>

                <!-- Durum -->
                <td class="px-3 py-3">
                  <span :class="getStatusClass(record.status)" class="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap">
                    {{ getStatusLabelShort(record.status) }}
                  </span>
                </td>

                <!-- İşlem Butonları -->
                <td class="px-3 py-3 text-xs font-medium">
                  <div class="flex gap-1 flex-wrap">
                    <button
                      @click="viewRecord(record._id)"
                      class="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Görüntüle"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      v-if="canEdit(record)"
                      @click="editRecord(record._id)"
                      class="px-2 py-1 text-green-600 hover:bg-green-50 rounded"
                      title="Düzenle"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      v-if="canApproveRecord(record)"
                      @click="approveRecord(record._id)"
                      class="px-2 py-1 text-green-600 hover:bg-green-50 rounded"
                      title="Onayla"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      v-if="canRequestRevision(record)"
                      @click="showRevisionModal(record)"
                      class="px-2 py-1 text-orange-600 hover:bg-orange-50 rounded"
                      title="Düzeltme İste"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      v-if="canResubmit(record)"
                      @click="resubmitRecord(record)"
                      class="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Tekrar Gönder"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                    <button
                      v-if="canCreateEmployee(record)"
                      @click="createEmployeeFromRecord(record)"
                      class="px-2 py-1 text-purple-600 hover:bg-purple-50 rounded"
                      title="Çalışan Ekle"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </button>
                    <button
                      v-if="record.status === 'PENDING' && canReject && !isCreatedByMe(record)"
                      @click="showRejectModal(record)"
                      class="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      title="İptal Et"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      v-if="isCreatedByMe(record) && (record.status === 'PENDING' || record.status === 'REVISION_REQUESTED' || canCancelApprovedRecord(record))"
                      @click="showCancelModal(record)"
                      class="px-2 py-1 text-orange-600 hover:bg-orange-50 rounded"
                      title="İptal Talebi"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                    <!-- İptal Onay Butonu (Bayi için) -->
                    <button
                      v-if="record.status === 'CANCELLATION_REQUESTED' && canApproveCancellation"
                      @click="approveCancellation(record)"
                      class="px-2 py-1 text-green-600 hover:bg-green-50 rounded"
                      title="İptal Talebini Onayla"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <!-- İptal Red Butonu (Bayi için) -->
                    <button
                      v-if="record.status === 'CANCELLATION_REQUESTED' && canApproveCancellation"
                      @click="showRejectCancellationModal(record)"
                      class="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      title="İptal Talebini Reddet"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <!-- Onayı Geri Al Butonu (Bayi için - 12 saat içinde) -->
                    <button
                      v-if="canRevertApproval(record)"
                      @click="confirmRevertApproval(record)"
                      class="px-2 py-1 text-amber-600 hover:bg-amber-50 rounded"
                      :title="`Onayı Geri Al (${getRevertTimeRemaining(record)} kaldı)`"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                    <!-- Mesaj Butonu - Onay bekleyen kayıtlar için -->
                    <button
                      v-if="canSendMessage(record)"
                      @click="openMessageModal(record)"
                      class="px-2 py-1 rounded relative"
                      :class="record.messageCount > 0 ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-50'"
                      :title="record.messageCount > 0 ? `${record.messageCount} mesaj` : 'Mesaj Gönder'"
                    >
                      <!-- Mesaj varsa dolu ikon -->
                      <svg v-if="record.messageCount > 0" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                      </svg>
                      <!-- Mesaj yoksa boş ikon -->
                      <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <!-- Okunmamış mesaj badge'i -->
                      <span v-if="record.unreadMessageCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                        {{ record.unreadMessageCount > 9 ? '9+' : record.unreadMessageCount }}
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Boş Durum -->
    <div v-if="groupedRecords.length === 0" class="bg-white rounded-lg shadow text-center py-12">
      <p class="text-gray-500">Henüz işe giriş/çıkış işlem kaydı bulunmamaktadır.</p>
    </div>

    <!-- Görüntüle Modal -->
    <div v-if="showViewDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto print-view">
        <div class="flex justify-between items-center mb-4 print:hidden">
          <div class="flex items-center gap-4">
            <h2 class="text-xl font-bold">{{ selectedRecord?.processType === 'hire' ? 'İşe Giriş Bilgileri Özeti' : 'İşten Çıkış Bilgileri Özeti' }}</h2>
            <span class="text-sm text-gray-500 no-uppercase">- {{ companyTitle }}</span>
          </div>
          <button
            @click="showViewDialog = false"
            class="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <!-- Print başlığı -->
        <div class="hidden print:block mb-3 border-b border-gray-300 pb-2">
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-bold">{{ selectedRecord?.processType === 'hire' ? 'İşe Giriş Bilgileri Özeti' : 'İşten Çıkış Bilgileri Özeti' }}</h2>
            <span class="text-sm text-gray-600 font-medium no-uppercase">{{ companyTitle }}</span>
          </div>
        </div>
        <div v-if="selectedRecord" class="space-y-3 print:space-y-2">
          <!-- A5 Kağıt Çıktısı İçin Özel Düzen - Tablo Yapısı -->
          <div class="print-content">
            <!-- 1. En üstte: İşlem tipi ve durum -->
            <table class="w-full mb-3 print:mb-2 border-b border-gray-300">
              <tr>
                <td class="py-2 pr-4">
                  <span class="text-xs text-gray-500 print:text-[10px]">İşlem Tipi:</span>
                  <span class="ml-2 font-semibold text-base print:text-sm">{{ selectedRecord.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış' }}</span>
                </td>
                <td class="py-2 text-right">
                  <span class="text-xs text-gray-500 print:text-[10px]">Durum:</span>
                  <span :class="getStatusClass(selectedRecord.status)" class="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full print:text-[10px]">
                    {{ getStatusLabel(selectedRecord.status) }}
                  </span>
                </td>
              </tr>
            </table>

            <!-- Tablo Yapısı ile Bilgiler -->
            <table class="w-full border-collapse">
              <!-- 2. Şirket ve İşyeri -->
              <tr class="border-b border-gray-100">
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Şirket:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  {{ selectedRecord.companyId?.name || '-' }}
                </td>
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">İşyeri:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  {{ selectedRecord.workplaceId?.name || '-' }}
                </td>
              </tr>

              <!-- 3. Adı Soyadı ve TC Kimlik -->
              <tr class="border-b border-gray-100">
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Adı Soyadı:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  {{ getEmployeeName(selectedRecord) }}
                </td>
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">TC Kimlik:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  {{ getTCKN(selectedRecord) }}
                </td>
              </tr>

              <!-- 4. Giriş Tarihi ve Görevi/Mesleği -->
              <tr v-if="selectedRecord.processType === 'hire'" class="border-b border-gray-100">
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Giriş Tarihi:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  {{ formatDate(selectedRecord.hireDate) }}
                </td>
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Görevi/Mesleği:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  {{ getJobOrReason(selectedRecord) }}
                </td>
              </tr>
              <tr v-else class="border-b border-gray-100">
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Çıkış Tarihi:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  {{ formatDate(selectedRecord.terminationDate) }}
                </td>
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Çıkış Nedeni:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  {{ getJobOrReason(selectedRecord) }}
                </td>
              </tr>

              <!-- 5. Sözleşme Türü ve Ücreti -->
              <tr v-if="selectedRecord.processType === 'hire'" class="border-b border-gray-100">
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Sözleşme Türü:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  {{ selectedRecord.contractType || '-' }}
                </td>
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Ücreti:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  <span v-if="selectedRecord.ucret">
                    {{ (selectedRecord.companyId?.payrollCalculationType || 'NET') === 'NET' ? 'Net' : 'Brüt' }} 
                    {{ new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(selectedRecord.ucret) }}
                  </span>
                  <span v-else>-</span>
                </td>
              </tr>

              <!-- 6. Cep Telefonu ve Talep Tarihi -->
              <tr v-if="selectedRecord.processType === 'hire' && selectedRecord.phone" class="border-b border-gray-100">
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Cep Telefonu:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  {{ selectedRecord.phone || '-' }}
                </td>
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Talep Tarihi:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell">
                  {{ formatDateTime(selectedRecord.createdAt) }}
                </td>
              </tr>
              <tr v-else class="border-b border-gray-100">
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Talep Tarihi:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell" colspan="3">
                  {{ formatDateTime(selectedRecord.createdAt) }}
                </td>
              </tr>

              <!-- 7. E-posta (varsa) -->
              <tr v-if="selectedRecord.processType === 'hire' && selectedRecord.email" class="border-b border-gray-100">
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">E-posta:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell" colspan="3">
                  {{ selectedRecord.email }}
                </td>
              </tr>
              <!-- İşten çıkış için ek bilgiler -->
              <tr v-if="selectedRecord.processType === 'termination' && selectedRecord.terminationReason" class="border-b border-gray-100">
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Çıkış Nedeni (Türü):</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell" colspan="3">
                  {{ selectedRecord.terminationReason === 'istifa' ? 'İstifa' : 'İşten Çıkarma' }}
                </td>
              </tr>
              <tr v-if="selectedRecord.processType === 'termination' && selectedRecord.severancePayApply !== undefined" class="border-b border-gray-100">
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Kıdem Tazminatı Yansıtılacak mı?:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell" :class="selectedRecord.severancePayApply ? 'text-green-600' : 'text-red-600'" colspan="3">
                  {{ selectedRecord.severancePayApply ? 'Evet' : 'Hayır' }}
                </td>
              </tr>
              <tr v-if="selectedRecord.processType === 'termination' && selectedRecord.noticePayApply !== undefined" class="border-b border-gray-100">
                <td class="py-2 label-cell">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">İhbar Tazminatı Yansıtılacak mı?:</span>
                </td>
                <td class="py-2 text-sm print:text-xs text-left value-cell" :class="selectedRecord.noticePayApply ? 'text-green-600' : 'text-red-600'" colspan="3">
                  {{ selectedRecord.noticePayApply ? 'Evet' : 'Hayır' }}
                </td>
              </tr>
              <tr v-if="selectedRecord.description" class="border-b border-gray-100">
                <td class="py-2 label-cell align-top">
                  <span class="text-xs text-gray-700 print:text-[10px] font-semibold">Detaylı Açıklama:</span>
                </td>
                <td class="py-2 text-sm text-gray-900 whitespace-pre-wrap print:text-xs text-left value-cell" colspan="3">
                  {{ selectedRecord.description }}
                </td>
              </tr>
            </table>
          </div>
          <!-- Diğer Dosyalar (Word belgeleri hariç) -->
          <div v-if="getOtherDocuments(selectedRecord).length > 0" class="mt-4 print:hidden">
            <label class="block text-sm font-medium text-gray-700 mb-2">Dosyalar</label>
            <ul class="list-disc list-inside space-y-1">
              <li v-for="(doc, index) in getOtherDocuments(selectedRecord)" :key="index" class="text-sm text-gray-900">
                {{ getDocumentTypeName(doc.type) }} - <a :href="'http://localhost:3000' + doc.fileUrl" target="_blank" class="text-blue-600 hover:underline">Görüntüle</a>
              </li>
            </ul>
          </div>

          <!-- İş Belgeleri İndirme Butonları (Sadece işe giriş kayıtları için) -->
          <div v-if="selectedRecord.processType === 'hire' && (getContractUrl(selectedRecord) || getApplicationFormUrl(selectedRecord))" class="mt-4 print:hidden">
            <label class="block text-sm font-medium text-gray-700 mb-2">İş Belgeleri</label>
            <div class="flex flex-wrap gap-2">
              <a
                v-if="getContractUrl(selectedRecord)"
                :href="'http://localhost:3000' + getContractUrl(selectedRecord)"
                download
                class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                İş Sözleşmesi İndir
              </a>
              <a
                v-if="getApplicationFormUrl(selectedRecord)"
                :href="'http://localhost:3000' + getApplicationFormUrl(selectedRecord)"
                download
                class="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                İş Başvuru Formu İndir
              </a>
            </div>
          </div>

          <!-- Çalışan Kontrolü Uyarısı (Sadece onaylanmış işe giriş kayıtları için) -->
          <div v-if="selectedRecord.processType === 'hire' && selectedRecord.status === 'APPROVED'" class="mt-4 print:hidden">
            <div v-if="checkingEmployee" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-center">
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <p class="text-sm text-blue-800">Çalışan kontrolü yapılıyor...</p>
              </div>
            </div>
            <div v-else-if="employeeCheck && !employeeCheck.hasEmployee" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3 flex-1">
                  <h3 class="text-sm font-medium text-yellow-800 mb-2">
                    ⚠️ Çalışanlar Listesinde Görünmüyor
                  </h3>
                  <p class="text-sm text-yellow-700 mb-3">
                    Bu işe giriş talebi onaylanmış ancak çalışan kaydı henüz oluşturulmamış. 
                    Çalışanı listeye eklemek için aşağıdaki butona tıklayın.
                  </p>
                  <div class="flex gap-2">
                    <button
                      @click="addMissingEmployee"
                      :disabled="addingEmployee"
                      class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <span v-if="addingEmployee" class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Ekleniyor...
                      </span>
                      <span v-else>Çalışanı Ekle</span>
                    </button>
                    <button
                      @click="deleteApprovedRecord"
                      :disabled="deletingRecord"
                      class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <span v-if="deletingRecord" class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Siliniyor...
                      </span>
                      <span v-else>İşlemi Sil</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="employeeCheck && employeeCheck.hasEmployee" class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="flex items-center">
                <svg class="h-5 w-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-green-800">
                    ✓ Çalışan listesinde mevcut
                  </p>
                  <p v-if="employeeCheck.employee" class="text-xs text-green-700 mt-1">
                    Çalışan No: {{ employeeCheck.employee.employeeNumber }} |
                    Durum: {{ employeeCheck.employee.status === 'active' ? 'Aktif' : employeeCheck.employee.status }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Bildirge İndirme (Onaylı kayıtlar için - hem işe giriş hem işten çıkış) -->
          <div
            v-if="getDeclarationDocument(selectedRecord)"
            class="bg-blue-50 border border-blue-200 rounded-lg p-4 print:hidden"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <svg class="h-8 w-8 text-red-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10.92,12.31C10.68,11.54 10.15,9.08 11.55,9.04C12.95,9 12.03,12.16 12.03,12.16C12.42,13.65 14.05,14.72 14.05,14.72C14.55,14.57 17.4,14.24 17,15.72C16.57,17.2 13.5,15.81 13.5,15.81C11.55,15.95 10.09,16.47 10.09,16.47C8.96,18.58 7.64,19.5 7.1,18.61C6.43,17.5 9.23,16.07 9.23,16.07C10.68,13.72 10.9,12.35 10.92,12.31Z" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-blue-800">SGK {{ selectedRecord.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış' }} Bildirge</p>
                  <p class="text-xs text-blue-600">
                    Yüklenme: {{ formatDateTime(getDeclarationDocument(selectedRecord).createdAt) }}
                  </p>
                </div>
              </div>
              <a
                :href="getDeclarationDownloadUrl(getDeclarationDocument(selectedRecord))"
                target="_blank"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                İndir
              </a>
            </div>
          </div>

          <!-- Bildirge Yükleme Alanı (Bayi için bekleyen kayıtlar - hem işe giriş hem işten çıkış) -->
          <div
            v-if="isDealerRole && selectedRecord?.status === 'PENDING'"
            class="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4 print:hidden"
          >
            <h4 class="text-sm font-semibold text-orange-800 mb-3">SGK {{ selectedRecord.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış' }} Bildirge Yükle</h4>
            <p class="text-xs text-orange-600 mb-3">
              {{ selectedRecord.processType === 'hire' ? 'İşe girişi' : 'İşten çıkışı' }} onaylamak için bildirge PDF dosyasını yükleyin.
            </p>

            <!-- Drag & Drop Alanı -->
            <div
              @dragover.prevent="isDraggingDeclaration = true"
              @dragleave.prevent="isDraggingDeclaration = false"
              @drop.prevent="handleDeclarationDrop"
              :class="[
                'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
                isDraggingDeclaration ? 'border-orange-500 bg-orange-100' : 'border-orange-300 hover:border-orange-400 hover:bg-orange-100'
              ]"
              @click="$refs.viewDeclarationInput.click()"
            >
              <input
                ref="viewDeclarationInput"
                type="file"
                accept=".pdf"
                class="hidden"
                @change="handleDeclarationSelect"
              />

              <div v-if="!declarationFile">
                <svg class="mx-auto h-8 w-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="mt-1 text-xs text-orange-600">
                  <span class="font-semibold">Dosya seçin</span> veya sürükleyin (PDF, max 10MB)
                </p>
              </div>

              <div v-else class="flex items-center justify-center gap-2">
                <svg class="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10.92,12.31C10.68,11.54 10.15,9.08 11.55,9.04C12.95,9 12.03,12.16 12.03,12.16C12.42,13.65 14.05,14.72 14.05,14.72C14.55,14.57 17.4,14.24 17,15.72C16.57,17.2 13.5,15.81 13.5,15.81C11.55,15.95 10.09,16.47 10.09,16.47C8.96,18.58 7.64,19.5 7.1,18.61C6.43,17.5 9.23,16.07 9.23,16.07C10.68,13.72 10.9,12.35 10.92,12.31Z" />
                </svg>
                <span class="text-sm text-orange-800">{{ declarationFile.name }}</span>
                <button
                  @click.stop="declarationFile = null"
                  class="text-red-500 hover:text-red-700"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              @click="submitDeclarationFromView"
              :disabled="!declarationFile || uploadingDeclaration"
              class="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
            >
              <div v-if="uploadingDeclaration" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ uploadingDeclaration ? 'Yükleniyor...' : 'Bildirge Yükle ve Onayla' }}
            </button>
          </div>

          <div class="flex justify-end mt-6 print:hidden gap-2">
            <button
              @click="handlePrint"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
              </svg>
              Yazdır
            </button>
            <button
              v-if="showWhatsAppButton"
              @click="sendViaWhatsApp"
              :disabled="sendingWhatsApp"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg v-if="!sendingWhatsApp" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <div v-else class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {{ sendingWhatsApp ? 'Gönderiliyor...' : (dealerIkName ? `${dealerIkName}'a WhatsApp Gönder` : 'WhatsApp ile Gönder') }}
            </button>
            <button
              @click="showViewDialog = false"
              class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reddetme Modal -->
    <div v-if="showRejectDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">İşlemi İptal Et</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              İptal Nedeni <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="rejectReason"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="İptal nedenini açıklayınız..."
              required
            ></textarea>
          </div>
          <div class="flex gap-2 justify-end">
            <button
              @click="showRejectDialog = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Vazgeç
            </button>
            <button
              @click="submitReject"
              :disabled="!rejectReason || rejectReason.trim() === ''"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              İptal Et
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- İptal Talebi Modal (Talebi Gönderen İçin) -->
    <div v-if="showCancelDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">İptal Talebi Gönder</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              İptal Nedeni <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="cancelReason"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="İptal talebi nedenini açıklayınız..."
              required
            ></textarea>
          </div>
          <div class="flex gap-2 justify-end">
            <button
              @click="showCancelDialog = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Vazgeç
            </button>
            <button
              @click="submitCancel"
              :disabled="!cancelReason || cancelReason.trim() === ''"
              class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              İptal Talebi Gönder
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Düzeltme Talebi Modal (Bayi İçin) -->
    <div v-if="showRevisionDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Düzeltme Talebi</h2>
        <div class="space-y-4">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p class="text-sm text-yellow-800">
              Bu talep için şirketten düzeltme isteyebilirsiniz. Şirket belirttiğiniz düzeltmeleri yaparak talebi tekrar gönderebilir.
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Düzeltme Nedeni <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="revisionReason"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Hangi bilgilerin düzeltilmesi gerektiğini açıklayınız..."
              required
            ></textarea>
          </div>
          <div class="flex gap-2 justify-end">
            <button
              @click="showRevisionDialog = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Vazgeç
            </button>
            <button
              @click="submitRevision"
              :disabled="!revisionReason || revisionReason.trim() === '' || submittingRevision"
              class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {{ submittingRevision ? 'Gönderiliyor...' : 'Düzeltme Talep Et' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- İptal Talebi Red Modal (Bayi İçin) -->
    <div v-if="showRejectCancellationDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">İptal Talebini Reddet</h2>
        <div class="space-y-4">
          <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p class="text-sm text-purple-800 font-medium mb-1">İptal Nedeni:</p>
            <p class="text-sm text-purple-700">{{ selectedRecord?.cancellationRequest?.reason || 'Belirtilmemiş' }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Red Nedeni <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="rejectCancellationReason"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="İptal talebinin reddedilme nedenini açıklayınız..."
              required
            ></textarea>
          </div>
          <div class="flex gap-2 justify-end">
            <button
              @click="showRejectCancellationDialog = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Vazgeç
            </button>
            <button
              @click="submitRejectCancellation"
              :disabled="!rejectCancellationReason || rejectCancellationReason.trim() === ''"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              İptal Talebini Reddet
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bildirge Yükleme Modal (Bayi Onay İçin) -->
    <div v-if="showDeclarationModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 class="text-xl font-bold mb-4 text-gray-800">{{ declarationTypeText }} Bildirgesini Yükle</h2>
        <p class="text-sm text-gray-600 mb-4">
          {{ declarationTypeText }} işlemini onaylamak için SGK {{ declarationTypeText.toLowerCase() }} bildirgesini (PDF) yüklemeniz gerekmektedir.
        </p>

        <!-- Drag & Drop Alanı -->
        <div
          @dragover.prevent="isDraggingDeclaration = true"
          @dragleave.prevent="isDraggingDeclaration = false"
          @drop.prevent="handleDeclarationDrop"
          :class="[
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            isDraggingDeclaration ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          ]"
          @click="$refs.declarationInput.click()"
        >
          <input
            ref="declarationInput"
            type="file"
            accept=".pdf"
            class="hidden"
            @change="handleDeclarationSelect"
          />

          <div v-if="!declarationFile">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="mt-2 text-sm text-gray-600">
              <span class="font-semibold text-blue-600">Dosya seçmek için tıklayın</span> veya sürükleyip bırakın
            </p>
            <p class="mt-1 text-xs text-gray-500">Sadece PDF dosyaları (max. 10MB)</p>
          </div>

          <div v-else class="flex items-center justify-center gap-3">
            <svg class="h-10 w-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10.92,12.31C10.68,11.54 10.15,9.08 11.55,9.04C12.95,9 12.03,12.16 12.03,12.16C12.42,13.65 14.05,14.72 14.05,14.72C14.55,14.57 17.4,14.24 17,15.72C16.57,17.2 13.5,15.81 13.5,15.81C11.55,15.95 10.09,16.47 10.09,16.47C8.96,18.58 7.64,19.5 7.1,18.61C6.43,17.5 9.23,16.07 9.23,16.07C10.68,13.72 10.9,12.35 10.92,12.31Z" />
            </svg>
            <div class="text-left">
              <p class="text-sm font-medium text-gray-900">{{ declarationFile.name }}</p>
              <p class="text-xs text-gray-500">{{ formatFileSize(declarationFile.size) }}</p>
            </div>
            <button
              @click.stop="declarationFile = null"
              class="ml-2 text-red-500 hover:text-red-700"
              title="Kaldır"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex gap-2 justify-end mt-6">
          <button
            @click="closeDeclarationModal"
            :disabled="uploadingDeclaration"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            @click="submitDeclarationAndApprove"
            :disabled="!declarationFile || uploadingDeclaration"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <div v-if="uploadingDeclaration" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            {{ uploadingDeclaration ? 'Yükleniyor...' : 'Bildirge Yükle ve Onayla' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Mesaj Modal -->
    <EmploymentMessageModal
      v-if="showMessageModal && messageRecord"
      :record="messageRecord"
      @close="closeMessageModal"
      @messageSent="onMessageSent"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import api from '@/services/api'
import EmploymentMessageModal from '@/components/EmploymentMessageModal.vue'

const authStore = useAuthStore()
const toast = useToastStore()
const confirmModal = useConfirmStore()
const preRecords = ref([])
const showRejectDialog = ref(false)
const showViewDialog = ref(false)
const showCancelDialog = ref(false)
const showRevisionDialog = ref(false)
const showMessageModal = ref(false)
const showRejectCancellationDialog = ref(false)
const messageRecord = ref(null)
const rejectReason = ref('')
const cancelReason = ref('')
const revisionReason = ref('')
const rejectCancellationReason = ref('')
const submittingRevision = ref(false)

// Bildirge yükleme modalı için state
const showDeclarationModal = ref(false)
const declarationFile = ref(null)
const uploadingDeclaration = ref(false)
const declarationRecordId = ref(null)
const isDraggingDeclaration = ref(false)

// Bildirge modalı için kayıt bilgisi
const declarationRecord = computed(() => {
  if (!declarationRecordId.value) return null
  return preRecords.value.find(r => r._id === declarationRecordId.value)
})

// Bildirge türü metni
const declarationTypeText = computed(() => {
  if (!declarationRecord.value) return 'İşlem'
  return declarationRecord.value.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış'
})
const creatingEmployee = ref(false)
const selectedRecord = ref(null)
const employeeCheck = ref(null)
const checkingEmployee = ref(false)
const addingEmployee = ref(false)
const deletingRecord = ref(false)
const companyTitle = ref('temmuz C|A|P Payroll Suite')
const sendingWhatsApp = ref(false)

// Bayi İK görüntüleme adı (WhatsApp butonu için)
const dealerIkName = computed(() => {
  if (!selectedRecord.value?.companyId?.dealer) return null
  const dealer = selectedRecord.value.companyId.dealer
  return dealer.ikDisplayName || dealer.name || null
})

// WhatsApp butonu sadece şirket admini için görünür (bayi için gizli)
const showWhatsAppButton = computed(() => {
  const role = authStore.user?.role
  // Bayi rolleri için WhatsApp butonu gizlenir
  return !['bayi_admin', 'resmi_muhasebe_ik'].includes(role)
})

// Bayi rolü kontrolü (bildirge yükleme için)
const isDealerRole = computed(() => {
  const role = authStore.user?.role
  return ['bayi_admin', 'resmi_muhasebe_ik', 'super_admin'].includes(role)
})

// Filtreler
const filters = ref({
  companyId: '',
  workplaceId: '',
  processType: '',
  status: '',
  search: ''
})

// Şirket admini mi?
const isCompanyAdmin = computed(() => {
  return authStore.user?.role === 'company_admin'
})

// Herhangi bir filtre aktif mi? (bayi için)
const hasActiveFilters = computed(() => {
  return filters.value.companyId !== '' ||
    filters.value.workplaceId !== '' ||
    filters.value.processType !== '' ||
    filters.value.status !== '' ||
    filters.value.search !== ''
})

// Sıralama
const sortColumn = ref('createdAt')
const sortDirection = ref('desc') // 'asc' veya 'desc'

const toggleSort = (column) => {
  if (sortColumn.value === column) {
    // Aynı sütuna tıklandıysa yönü değiştir
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // Farklı sütuna tıklandıysa yeni sütunu seç ve varsayılan yön
    sortColumn.value = column
    // Ad Soyad için A-Z (asc), tarihler için yeni→eski (desc)
    sortDirection.value = ['name', 'tckn', 'jobReason'].includes(column) ? 'asc' : 'desc'
  }
}

const getSortIcon = (column) => {
  if (sortColumn.value !== column) return 'none'
  return sortDirection.value
}

const canApprove = computed(() => {
  const role = authStore.user?.role
  // Onayla butonu sadece bayiler görebilir (şirket admini onaylayamaz)
  if (!['resmi_muhasebe_ik', 'super_admin', 'bayi_admin'].includes(role)) {
    return false
  }
  // Super admin her zaman onaylayabilir
  if (role === 'super_admin') {
    return true
  }
  // Bayi admin ve resmi_muhasebe_ik için şirket-bayi kontrolü yapılacak (backend'de)
  return true
})

// Şirket-bayi kontrolü (frontend'de görüntüleme için)
const canApproveRecord = (record) => {
  if (!canApprove.value) return false
  if (record.status !== 'PENDING') return false
  if (isCreatedByMe(record)) return false

  const role = authStore.user?.role
  // Super admin her zaman onaylayabilir
  if (role === 'super_admin') return true

  // Bayi admin ve resmi_muhasebe_ik için şirket-bayi kontrolü
  if (['bayi_admin', 'resmi_muhasebe_ik'].includes(role)) {
    // Dealer bilgisi çeşitli formatlarda gelebilir
    const userDealerId = authStore.user?.dealer?._id || authStore.user?.dealer
    const companyDealer = record.companyId?.dealer
    const companyDealerId = companyDealer?._id || companyDealer

    // Dealer bilgisi yoksa backend'de kontrol edilecek - görüntüleme için izin ver
    if (!userDealerId || !companyDealerId) {
      console.warn('Dealer bilgisi eksik, backend kontrolüne bırakılıyor:', { userDealerId, companyDealerId })
      return true // Backend'de kontrol edilecek
    }

    return userDealerId.toString() === companyDealerId.toString()
  }

  return false
}

const canReject = computed(() => {
  const role = authStore.user?.role
  return ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'].includes(role)
})

// İptal talebini onaylayabilir mi? (sadece bayi_admin ve super_admin)
const canApproveCancellation = computed(() => {
  const role = authStore.user?.role
  return ['super_admin', 'bayi_admin'].includes(role)
})

// Onayı geri alabilir mi? (bayi rolleri, APPROVED durumunda, 12 saat içinde)
const canRevertApproval = (record) => {
  if (!record || record.status !== 'APPROVED') return false
  if (!record.approvedAt) return false

  const role = authStore.user?.role
  // Sadece bayiler geri alabilir
  if (!['bayi_admin', 'resmi_muhasebe_ik', 'super_admin'].includes(role)) {
    return false
  }

  // 12 saat kontrolü
  const approvedAt = new Date(record.approvedAt)
  const now = new Date()
  const hoursDiff = (now - approvedAt) / (1000 * 60 * 60)

  if (hoursDiff > 12) return false

  // Bayi-şirket eşleşmesi kontrolü
  if (['bayi_admin', 'resmi_muhasebe_ik'].includes(role)) {
    const userDealerId = authStore.user?.dealer?._id || authStore.user?.dealer
    const companyDealer = record.companyId?.dealer
    const companyDealerId = companyDealer?._id || companyDealer
    if (userDealerId && companyDealerId && userDealerId.toString() !== companyDealerId.toString()) {
      return false
    }
  }

  return true
}

// Geri alma için kalan süreyi hesapla
const getRevertTimeRemaining = (record) => {
  if (!record?.approvedAt) return ''

  const approvedAt = new Date(record.approvedAt)
  const deadline = new Date(approvedAt.getTime() + 12 * 60 * 60 * 1000) // 12 saat sonra
  const now = new Date()
  const remainingMs = deadline - now

  if (remainingMs <= 0) return 'Süre doldu'

  const hours = Math.floor(remainingMs / (1000 * 60 * 60))
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours} saat ${minutes} dk`
  }
  return `${minutes} dakika`
}

// Onay geri alma onay modalı
const confirmRevertApproval = async (record) => {
  const remaining = getRevertTimeRemaining(record)
  const candidateName = record.candidateFullName || record.employeeId?.firstName + ' ' + record.employeeId?.lastName || 'Bilinmiyor'
  const processType = record.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış'

  if (!confirm(
    `${candidateName} - ${processType} kaydının onayını geri almak istediğinize emin misiniz?\n\n` +
    `⏰ Geri alma için kalan süre: ${remaining}\n\n` +
    `⚠️ Bu işlem:\n` +
    `- Kaydı "Onay Bekliyor" durumuna geri getirir\n` +
    `- Oluşturulan çalışan kaydı pasif yapılır\n` +
    `- Yeniden onay gerektirir`
  )) {
    return
  }

  await revertApproval(record._id)
}

// Onayı geri al
const revertApproval = async (id) => {
  try {
    loading.value = true
    const response = await api.post(`/employment/${id}/revert-approval`)

    if (response.data.success) {
      // Listeyi güncelle
      const index = preRecords.value.findIndex(r => r._id === id)
      if (index !== -1) {
        preRecords.value[index] = response.data.data.preRecord
      }

      const deactivatedMsg = response.data.data.employeeDeactivated
        ? ' Çalışan kaydı pasif yapıldı.'
        : ''

      alert(`✅ Onay geri alındı.${deactivatedMsg} Kayıt tekrar onay bekliyor.`)
    }
  } catch (error) {
    console.error('Onay geri alma hatası:', error)
    alert(error.response?.data?.message || 'Onay geri alınırken bir hata oluştu')
  } finally {
    loading.value = false
  }
}

// Benzersiz şirketleri al
const uniqueCompanies = computed(() => {
  const companies = new Map()
  preRecords.value.forEach(record => {
    const companyId = record.companyId?._id || record.companyId
    const companyName = record.companyId?.name || 'Bilinmeyen Şirket'
    if (companyId && !companies.has(companyId)) {
      companies.set(companyId, { id: companyId, name: companyName })
    }
  })
  return Array.from(companies.values()).sort((a, b) => a.name.localeCompare(b.name))
})

// Benzersiz işyerlerini al (şirket admini için)
const uniqueWorkplaces = computed(() => {
  const workplaces = new Map()
  preRecords.value.forEach(record => {
    const workplaceId = record.workplaceId?._id || record.workplaceId
    const workplaceName = record.workplaceId?.name || 'Bilinmeyen İşyeri'
    if (workplaceId && !workplaces.has(workplaceId)) {
      workplaces.set(workplaceId, { id: workplaceId, name: workplaceName })
    }
  })
  return Array.from(workplaces.values()).sort((a, b) => a.name.localeCompare(b.name))
})

// Filtrelenmiş kayıtlar
const filteredRecords = computed(() => {
  let result = [...preRecords.value]

  // Şirket filtresi (bayi için)
  if (filters.value.companyId) {
    result = result.filter(r => {
      const companyId = r.companyId?._id || r.companyId
      return companyId === filters.value.companyId
    })
  }

  // İşyeri filtresi (şirket admini için)
  if (filters.value.workplaceId) {
    result = result.filter(r => {
      const workplaceId = r.workplaceId?._id || r.workplaceId
      return workplaceId === filters.value.workplaceId
    })
  }

  // İşlem türü filtresi
  if (filters.value.processType) {
    result = result.filter(r => r.processType === filters.value.processType)
  }

  // Durum filtresi
  if (filters.value.status) {
    result = result.filter(r => r.status === filters.value.status)
  }

  // Arama filtresi
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(r => {
      const name = getEmployeeName(r).toLowerCase()
      const tckn = getTCKN(r)
      return name.includes(search) || tckn.includes(search)
    })
  }

  return result
})

// Sıralama karşılaştırma fonksiyonu
const sortRecords = (a, b) => {
  const dir = sortDirection.value === 'asc' ? 1 : -1

  let valueA, valueB

  switch (sortColumn.value) {
    case 'name':
      valueA = getEmployeeName(a).toLowerCase()
      valueB = getEmployeeName(b).toLowerCase()
      return valueA.localeCompare(valueB, 'tr') * dir

    case 'tckn':
      valueA = getTCKN(a)
      valueB = getTCKN(b)
      return valueA.localeCompare(valueB) * dir

    case 'date':
      valueA = new Date(a.processType === 'hire' ? a.hireDate : a.terminationDate)
      valueB = new Date(b.processType === 'hire' ? b.hireDate : b.terminationDate)
      return (valueA - valueB) * dir

    case 'jobReason':
      valueA = getJobOrReason(a).toLowerCase()
      valueB = getJobOrReason(b).toLowerCase()
      return valueA.localeCompare(valueB, 'tr') * dir

    case 'createdAt':
      valueA = new Date(a.createdAt)
      valueB = new Date(b.createdAt)
      return (valueA - valueB) * dir

    case 'approvedAt':
      // Onay tarihi yoksa en sona at
      valueA = a.approvedAt ? new Date(a.approvedAt) : new Date(0)
      valueB = b.approvedAt ? new Date(b.approvedAt) : new Date(0)
      return (valueA - valueB) * dir

    default:
      return 0
  }
}

// Şirkete göre gruplama
const groupedRecords = computed(() => {
  const groups = new Map()

  filteredRecords.value.forEach(record => {
    const companyId = record.companyId?._id || record.companyId || 'unknown'
    const companyName = record.companyId?.name || 'Bilinmeyen Şirket'
    const dealer = record.companyId?.dealer
    const dealerDisplayName = dealer?.ikDisplayName || dealer?.name || null

    if (!groups.has(companyId)) {
      groups.set(companyId, {
        companyId,
        companyName,
        dealerDisplayName,
        records: []
      })
    }

    groups.get(companyId).records.push(record)
  })

  // Her grubu seçilen sıralamaya göre sırala
  const sortedGroups = Array.from(groups.values())
    .map(group => ({
      ...group,
      records: [...group.records].sort(sortRecords)
    }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName, 'tr'))

  return sortedGroups
})

// Gruplamadan düz liste (filtresiz görünüm için - talep tarihine göre sıralı)
const ungroupedRecords = computed(() => {
  return [...filteredRecords.value].sort(sortRecords)
})

// Şirket adını getir
const getCompanyName = (record) => {
  return record.companyId?.name || 'Bilinmeyen Şirket'
}

const getEmployeeName = (record) => {
  if (record.processType === 'hire') {
    return record.candidateFullName || '-'
  } else {
    const emp = record.employeeId
    if (!emp) return '-'
    return `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '-'
  }
}

const getTCKN = (record) => {
  if (record.processType === 'hire') {
    return record.tcKimlikNo || '-'
  } else {
    return record.employeeId?.tcKimlik || '-'
  }
}

const getJobOrReason = (record) => {
  if (record.processType === 'hire') {
    return record.jobName || record.sgkMeslekKodu || '-'
  } else {
    return record.terminationReason || '-'
  }
}

const formatDate = (date) => {
  if (!date) return '—'
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

const formatDateTime = (date) => {
  if (!date) return '—'
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}`
}

const getWaitingTime = (createdAt) => {
  if (!createdAt) return { hours: 0, days: 0, displayText: '—' }
  const now = new Date()
  const created = new Date(createdAt)
  const diffMs = now - created
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  return { hours, days, remainingHours }
}

const formatWaitingTime = (createdAt, status) => {
  // Onaylanmış veya reddedilmiş kayıtlar için bekleme süresi gösterme
  if (['APPROVED', 'CANCELLED'].includes(status)) {
    return '—'
  }

  const { days, remainingHours } = getWaitingTime(createdAt)
  
  if (days === 0) {
    return `${remainingHours} saat`
  } else if (days === 1) {
    return `1 gün ${remainingHours} saat`
  } else {
    return `${days} gün ${remainingHours} saat`
  }
}

const getStatusLabel = (status) => {
  const labels = {
    'PENDING': 'Bekliyor',
    'PENDING_DEALER_APPROVAL': 'Bayi Onayı Bekliyor',
    'PENDING_COMPANY_APPROVAL': 'Şirket Onayı Bekliyor',
    'REVISION_REQUESTED': 'Düzeltme Bekleniyor',
    'APPROVED': 'ONAYLANDI',
    'CANCELLED': 'İPTAL',
    'CANCELLATION_PENDING': 'İptal Talebi Bekliyor',
    'CANCELLATION_REQUESTED': 'İptal Onayı Bekliyor'
  }
  return labels[status] || status
}

const getStatusLabelShort = (status) => {
  const labels = {
    'PENDING': 'Bekliyor',
    'PENDING_DEALER_APPROVAL': 'Bayi Onayı',
    'PENDING_COMPANY_APPROVAL': 'Şirket Onayı',
    'REVISION_REQUESTED': 'Düzeltme',
    'APPROVED': 'Onaylı',
    'CANCELLED': 'İptal',
    'CANCELLATION_PENDING': 'İptal Talep',
    'CANCELLATION_REQUESTED': 'İptal Onayı'
  }
  return labels[status] || status
}

const getStatusClass = (status) => {
  const classes = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'PENDING_DEALER_APPROVAL': 'bg-yellow-100 text-yellow-800',
    'PENDING_COMPANY_APPROVAL': 'bg-yellow-100 text-yellow-800',
    'REVISION_REQUESTED': 'bg-orange-100 text-orange-800',
    'APPROVED': 'bg-green-100 text-green-800',
    'CANCELLED': 'bg-red-100 text-red-800',
    'CANCELLATION_PENDING': 'bg-orange-100 text-orange-800',
    'CANCELLATION_REQUESTED': 'bg-purple-100 text-purple-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

// İş sözleşmesi URL'sini döndürür
const getContractUrl = (record) => {
  if (!record?.documents || record.documents.length === 0) return null
  const contractDoc = record.documents.find(d => d.type === 'iş_sözleşmesi_word' || d.fileUrl?.includes('sozlesme_'))
  return contractDoc?.fileUrl || null
}

// İş başvuru formu URL'sini döndürür
const getApplicationFormUrl = (record) => {
  if (!record?.documents || record.documents.length === 0) return null
  // Başvuru formu - type veya dosya adından bul
  const appFormDoc = record.documents.find(d =>
    d.type === 'iş_başvuru_formu' || d.fileUrl?.includes('basvuru_formu_')
  )
  return appFormDoc?.fileUrl || null
}

// Word belgeleri hariç diğer dosyaları döndürür
const getOtherDocuments = (record) => {
  if (!record?.documents || record.documents.length === 0) return []
  return record.documents.filter(d =>
    d.type !== 'iş_sözleşmesi_word' &&
    d.type !== 'iş_başvuru_formu' &&
    !d.fileUrl?.includes('sozlesme_') &&
    !d.fileUrl?.includes('basvuru_formu_')
  )
}

// Belge tipi adını Türkçe olarak döndürür
const getDocumentTypeName = (type) => {
  const names = {
    'sözleşme': 'Sözleşme',
    'istifa_dilekçesi': 'İstifa Dilekçesi',
    'ihbar_kıdem_hesap': 'İhbar/Kıdem Hesabı',
    'işe_giriş_bildirgesi': 'İşe Giriş Bildirgesi',
    'iş_sözleşmesi_word': 'İş Sözleşmesi',
    'iş_başvuru_formu': 'İş Başvuru Formu'
  }
  return names[type] || type
}

const canEdit = (record) => {
  const role = authStore.user?.role
  return ['company_admin', 'super_admin', 'bayi_admin'].includes(role) && 
         record.status === 'PENDING'
}

const isCreatedByMe = (record) => {
  const userId = authStore.user?._id
  const createdById = record.createdBy?._id || record.createdBy
  return userId && createdById && userId.toString() === createdById.toString()
}

// Onaylanmış kayıt için aynı gün kontrolü
const canCancelApprovedRecord = (record) => {
  if (record.status !== 'APPROVED') return false

  if (!record.approvedAt) return false

  const approvedDate = new Date(record.approvedAt)
  const today = new Date()

  // Tarihleri sadece gün/ay/yıl olarak karşılaştır
  const approvedDay = approvedDate.getDate()
  const approvedMonth = approvedDate.getMonth()
  const approvedYear = approvedDate.getFullYear()

  const todayDay = today.getDate()
  const todayMonth = today.getMonth()
  const todayYear = today.getFullYear()

  return approvedDay === todayDay &&
         approvedMonth === todayMonth &&
         approvedYear === todayYear
}

// Düzeltme talep edebilir mi? (bayi_admin, resmi_muhasebe_ik)
const canRequestRevision = (record) => {
  if (record.status !== 'PENDING') return false
  const role = authStore.user?.role
  if (!['bayi_admin', 'resmi_muhasebe_ik', 'super_admin'].includes(role)) return false
  if (isCreatedByMe(record)) return false
  return true
}

// Tekrar gönderebilir mi? (company_admin, REVISION_REQUESTED durumunda)
const canResubmit = (record) => {
  if (record.status !== 'REVISION_REQUESTED') return false
  const role = authStore.user?.role
  // Sadece şirket admini veya talep oluşturan kişi tekrar gönderebilir
  if (role === 'company_admin' || role === 'super_admin') return true
  if (isCreatedByMe(record)) return true
  return false
}

// Çalışan oluşturabilir mi? (APPROVED + employeeCreated=false, hire işlemi)
const canCreateEmployee = (record) => {
  if (record.processType !== 'hire') return false
  if (record.status !== 'APPROVED') return false
  if (record.employeeCreated !== false) return false
  const role = authStore.user?.role
  return ['company_admin', 'bayi_admin', 'resmi_muhasebe_ik', 'super_admin'].includes(role)
}

// Mesaj görüntüleyebilir/gönderebilir mi?
const canSendMessage = (record) => {
  const role = authStore.user?.role
  // Şirket admin, bayi admin, resmi_muhasebe_ik ve super_admin mesaj gönderebilir/görüntüleyebilir
  return ['company_admin', 'bayi_admin', 'resmi_muhasebe_ik', 'super_admin'].includes(role)
}

// Mesaj modal fonksiyonları
const openMessageModal = (record) => {
  messageRecord.value = record
  showMessageModal.value = true
}

const closeMessageModal = () => {
  showMessageModal.value = false
  messageRecord.value = null
}

const onMessageSent = () => {
  // Mesaj gönderildiğinde yapılacak işlemler (örn: badge güncelleme)
  toast.success('Mesaj gönderildi')
}

const showRevisionModal = (record) => {
  selectedRecord.value = record
  revisionReason.value = ''
  showRevisionDialog.value = true
}

const submitRevision = async () => {
  if (!revisionReason.value || revisionReason.value.trim() === '') {
    toast.warning('Lütfen düzeltme nedenini giriniz')
    return
  }
  try {
    submittingRevision.value = true
    await api.post(`/employment/${selectedRecord.value._id}/request-revision`, {
      reason: revisionReason.value
    })
    toast.success('Düzeltme talebi gönderildi')
    showRevisionDialog.value = false
    revisionReason.value = ''
    selectedRecord.value = null
    await loadPreRecords()
  } catch (error) {
    console.error('Düzeltme talebi hatası:', error)
    toast.error(error.response?.data?.message || 'Düzeltme talebi gönderilemedi')
  } finally {
    submittingRevision.value = false
  }
}

const resubmitRecord = async (record) => {
  const confirmed = await confirmModal.show({
    title: 'Tekrar Gönder',
    message: 'Bu talebi tekrar onaya göndermek istediğinize emin misiniz?',
    type: 'warning'
  })
  if (!confirmed) return
  try {
    await api.post(`/employment/${record._id}/resubmit`)
    toast.success('Talep tekrar onaya gönderildi')
    await loadPreRecords()
  } catch (error) {
    console.error('Tekrar gönderme hatası:', error)
    toast.error(error.response?.data?.message || 'Talep tekrar gönderilemedi')
  }
}

const createEmployeeFromRecord = async (record) => {
  const confirmed = await confirmModal.show({
    title: 'Çalışan Oluştur',
    message: 'Bu talep için çalışan kaydı oluşturmak istediğinize emin misiniz?',
    type: 'info',
    confirmText: 'Oluştur'
  })
  if (!confirmed) return
  try {
    creatingEmployee.value = true
    const response = await api.post(`/employment/${record._id}/create-employee`)
    if (response.data.success) {
      toast.success('Çalışan başarıyla oluşturuldu!')
      await loadPreRecords()
    } else {
      toast.error('Hata: ' + (response.data.message || 'Çalışan oluşturulamadı'))
    }
  } catch (error) {
    console.error('Çalışan oluşturma hatası:', error)
    toast.error(error.response?.data?.message || 'Çalışan oluşturma hatası')
  } finally {
    creatingEmployee.value = false
  }
}

const viewRecord = async (id) => {
  const record = preRecords.value.find(r => r._id === id)
  if (record) {
    selectedRecord.value = record
    showViewDialog.value = true
    employeeCheck.value = null
    
    // Eğer onaylanmış işe giriş kaydı ise çalışan kontrolü yap
    if (record.processType === 'hire' && record.status === 'APPROVED') {
      await checkEmployeeExists(record._id)
    }
  }
}

const checkEmployeeExists = async (preRecordId) => {
  try {
    checkingEmployee.value = true
    const response = await api.get(`/employment/check-employee/${preRecordId}`)
    if (response.data.success) {
      employeeCheck.value = response.data
    }
  } catch (error) {
    console.error('Çalışan kontrol hatası:', error)
    employeeCheck.value = { hasEmployee: false, error: error.message }
  } finally {
    checkingEmployee.value = false
  }
}

const addMissingEmployee = async () => {
  if (!selectedRecord.value || !employeeCheck.value) return

  const confirmed = await confirmModal.show({
    title: 'Çalışan Ekle',
    message: 'Bu çalışanı çalışanlar listesine eklemek istediğinize emin misiniz?',
    type: 'info',
    confirmText: 'Ekle'
  })
  if (!confirmed) return

  try {
    addingEmployee.value = true
    const response = await api.post(`/employment/fix-missing-employee/${selectedRecord.value._id}`)
    
    if (response.data.success) {
      toast.success('Çalışan başarıyla eklendi!')
      // Çalışan kontrolünü yenile
      await checkEmployeeExists(selectedRecord.value._id)
      // Kayıtları yenile
      await loadPreRecords()
    } else {
      toast.error('Hata: ' + (response.data.message || 'Çalışan eklenirken bir hata oluştu'))
    }
  } catch (error) {
    console.error('Çalışan ekleme hatası:', error)
    console.error('Hata detayları:', {
      message: error.response?.data?.message,
      error: error.response?.data?.error,
      details: error.response?.data?.details,
      status: error.response?.status,
      data: error.response?.data
    })

    const errorMessage = error.response?.data?.message ||
                        error.response?.data?.error ||
                        error.message ||
                        'Çalışan eklenirken bir hata oluştu'

    toast.error(`Hata: ${errorMessage}`)
  } finally {
    addingEmployee.value = false
  }
}

const deleteApprovedRecord = async () => {
  if (!selectedRecord.value) return

  const candidateName = getEmployeeName(selectedRecord.value)
  const confirmed = await confirmModal.show({
    title: 'Kaydı Sil',
    message: `Bu onaylı işe giriş işlemini silmek istediğinize emin misiniz?\n\nÇalışan: ${candidateName}\n\nBu işlem geri alınamaz.`,
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    deletingRecord.value = true
    const response = await api.delete(`/employment/pre-record/${selectedRecord.value._id}`)
    
    if (response.data.success) {
      toast.success('İşe giriş kaydı başarıyla silindi!')
      // Modal'ı kapat
      showViewDialog.value = false
      selectedRecord.value = null
      employeeCheck.value = null
      // Kayıtları yenile
      await loadPreRecords()
    } else {
      toast.error('Hata: ' + (response.data.message || 'İşlem silinirken bir hata oluştu'))
    }
  } catch (error) {
    console.error('İşlem silme hatası:', error)
    const errorMessage = error.response?.data?.message ||
                        error.response?.data?.error ||
                        error.message ||
                        'İşlem silinirken bir hata oluştu'

    toast.error(`Hata: ${errorMessage}`)
  } finally {
    deletingRecord.value = false
  }
}

const editRecord = (id) => {
  console.log('Düzenle:', id)
}

const loadPreRecords = async () => {
  try {
    const response = await api.get('/employment/list')
    
    if (response.data) {
      // Backend response format: { success: true, data: [...] }
      if (response.data.success !== undefined) {
        preRecords.value = response.data.data || []
      } else if (Array.isArray(response.data)) {
        // Direkt array dönüyorsa (geriye uyumluluk)
        preRecords.value = response.data
      } else {
        preRecords.value = []
        console.error('İşlem kayıtları yüklenemedi: Geçersiz yanıt formatı', response.data)
      }
    } else {
      preRecords.value = []
      console.error('İşlem kayıtları yüklenemedi: Boş yanıt')
    }
  } catch (error) {
    console.error('İşlem kayıtları yüklenemedi:', error)
    // Sadece console'da logla, alert gösterme (onay işlemi sonrası gereksiz uyarı vermemek için)
    preRecords.value = []
  }
}

const approveRecord = async (id) => {
  // İşe giriş kaydını bul (preRecords düz array)
  const record = preRecords.value.find(r => r._id === id)

  // Bayi rolü ise bildirge yükleme modalı aç (hem işe giriş hem işten çıkış)
  const role = authStore.user?.role
  const isDealerApprover = ['bayi_admin', 'resmi_muhasebe_ik', 'super_admin'].includes(role)

  if (isDealerApprover) {
    // Bildirge yükleme modalını aç
    declarationRecordId.value = id
    declarationFile.value = null
    showDeclarationModal.value = true
    return
  }

  // Diğer durumlar için normal onay akışı
  const confirmed = await confirmModal.show({
    title: 'İşlemi Onayla',
    message: 'Bu işlemi onaylamak istediğinize emin misiniz?',
    type: 'info',
    confirmText: 'Onayla'
  })
  if (!confirmed) return
  try {
    const response = await api.post(`/employment/${id}/approve`)
    // Backend'den başarılı response geldiğinde listeyi güncelle
    const successMessage = response.data?.message || 'İşlem onaylandı'
    toast.success(successMessage)
    // Liste güncellemesi - başarısız olsa bile sessizce devam et
    try {
      await loadPreRecords()
    } catch (loadError) {
      console.error('Liste güncelleme hatası (sessizce yok sayılıyor):', loadError)
    }
  } catch (error) {
    console.error('Onay hatası:', error)
    const errorMessage = error.response?.data?.message || error.message || 'Onay işlemi başarısız oldu'
    toast.error(errorMessage)
  }
}

// Bildirge yükleme fonksiyonları
const handleDeclarationDrop = (event) => {
  isDraggingDeclaration.value = false
  const files = event.dataTransfer.files
  if (files.length > 0) {
    validateAndSetDeclarationFile(files[0])
  }
}

const handleDeclarationSelect = (event) => {
  const files = event.target.files
  if (files.length > 0) {
    validateAndSetDeclarationFile(files[0])
  }
}

const validateAndSetDeclarationFile = (file) => {
  // Sadece PDF kabul et
  if (file.type !== 'application/pdf') {
    toast.error('Sadece PDF dosyaları yüklenebilir')
    return
  }
  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    toast.error('Dosya boyutu 10MB\'dan büyük olamaz')
    return
  }
  declarationFile.value = file
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// İşe giriş bildirgesini bul
const getHireDeclaration = (record) => {
  if (!record?.documents || !Array.isArray(record.documents)) return null
  return record.documents.find(d => d.type === 'işe_giriş_bildirgesi')
}

// Bildirge dökümanını al (hem işe giriş hem işten çıkış için)
const getDeclarationDocument = (record) => {
  if (!record?.documents || !Array.isArray(record.documents)) return null
  if (record.processType === 'hire') {
    return record.documents.find(d => d.type === 'işe_giriş_bildirgesi')
  } else {
    return record.documents.find(d => d.type === 'işten_çıkış_bildirgesi')
  }
}

// Bildirge indirme URL'si
const getDeclarationDownloadUrl = (declaration) => {
  if (!declaration?.fileUrl) return '#'
  // Backend API base URL
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return `${baseUrl}${declaration.fileUrl}`
}

const closeDeclarationModal = () => {
  showDeclarationModal.value = false
  declarationFile.value = null
  declarationRecordId.value = null
  isDraggingDeclaration.value = false
}

const submitDeclarationAndApprove = async () => {
  if (!declarationFile.value || !declarationRecordId.value) {
    toast.error('Lütfen bildirge dosyası seçin')
    return
  }

  uploadingDeclaration.value = true

  try {
    // FormData oluştur
    const formData = new FormData()
    formData.append('declaration', declarationFile.value)

    // Bildirge ile birlikte onay endpoint'ine gönder
    const response = await api.post(
      `/employment/${declarationRecordId.value}/approve-with-declaration`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    const successMessage = response.data?.message || 'İşe giriş onaylandı ve bildirge yüklendi'
    toast.success(successMessage)

    // Modalı kapat ve listeyi güncelle
    closeDeclarationModal()

    try {
      await loadPreRecords()
    } catch (loadError) {
      console.error('Liste güncelleme hatası:', loadError)
    }
  } catch (error) {
    console.error('Onay hatası:', error)
    const errorMessage = error.response?.data?.message || error.message || 'Onay işlemi başarısız oldu'
    toast.error(errorMessage)
  } finally {
    uploadingDeclaration.value = false
  }
}

// Görüntüleme modalından bildirge yükle ve onayla
const submitDeclarationFromView = async () => {
  if (!declarationFile.value || !selectedRecord.value?._id) {
    toast.error('Lütfen bildirge dosyası seçin')
    return
  }

  uploadingDeclaration.value = true

  try {
    const formData = new FormData()
    formData.append('declaration', declarationFile.value)

    const response = await api.post(
      `/employment/${selectedRecord.value._id}/approve-with-declaration`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    const successMessage = response.data?.message || 'İşe giriş onaylandı ve bildirge yüklendi'
    toast.success(successMessage)

    // Görüntüleme modalını kapat ve listeyi güncelle
    showViewDialog.value = false
    declarationFile.value = null
    selectedRecord.value = null

    try {
      await loadPreRecords()
    } catch (loadError) {
      console.error('Liste güncelleme hatası:', loadError)
    }
  } catch (error) {
    console.error('Onay hatası:', error)
    const errorMessage = error.response?.data?.message || error.message || 'Onay işlemi başarısız oldu'
    toast.error(errorMessage)
  } finally {
    uploadingDeclaration.value = false
  }
}

const showRejectModal = (record) => {
  selectedRecord.value = record
  rejectReason.value = ''
  showRejectDialog.value = true
}

const submitReject = async () => {
  if (!rejectReason.value || rejectReason.value.trim() === '') {
    toast.warning('Lütfen iptal nedenini giriniz')
    return
  }
  try {
    await api.post(`/employment/${selectedRecord.value._id}/reject`, {
      reason: rejectReason.value
    })
    toast.success('İşlem iptal edildi')
    showRejectDialog.value = false
    rejectReason.value = ''
    selectedRecord.value = null
    await loadPreRecords()
  } catch (error) {
    console.error('İptal hatası:', error)
    toast.error(error.response?.data?.message || 'İptal işlemi başarısız oldu')
  }
}

const showCancelModal = (record) => {
  selectedRecord.value = record
  cancelReason.value = ''
  showCancelDialog.value = true
}

const submitCancel = async () => {
  if (!cancelReason.value || cancelReason.value.trim() === '') {
    toast.warning('Lütfen iptal nedenini giriniz')
    return
  }
  try {
    await api.post(`/employment/pre-record/${selectedRecord.value._id}/cancel`, {
      reason: cancelReason.value
    })
    toast.success('İptal talebi gönderildi')
    showCancelDialog.value = false
    cancelReason.value = ''
    selectedRecord.value = null
    await loadPreRecords()
  } catch (error) {
    console.error('İptal talebi hatası:', error)
    toast.error(error.response?.data?.message || 'İptal talebi gönderilemedi')
  }
}

// İptal talebini onayla (Bayi için)
const approveCancellation = async (record) => {
  const confirmed = await confirmModal.show({
    title: 'İptal Talebini Onayla',
    message: `${getEmployeeName(record)} için iptal talebini onaylamak istediğinize emin misiniz?\n\nİptal Nedeni: ${record.cancellationRequest?.reason || 'Belirtilmemiş'}`,
    type: 'warning',
    confirmText: 'Onayla'
  })
  if (!confirmed) return
  try {
    await api.post(`/employment/pre-record/${record._id}/approve-cancellation`)
    toast.success('İptal talebi onaylandı')
    await loadPreRecords()
  } catch (error) {
    console.error('İptal onay hatası:', error)
    toast.error(error.response?.data?.message || 'İptal onayı başarısız oldu')
  }
}

// İptal talebini reddet modalı aç
const showRejectCancellationModal = (record) => {
  selectedRecord.value = record
  rejectCancellationReason.value = ''
  showRejectCancellationDialog.value = true
}

// İptal talebini reddet (Bayi için)
const submitRejectCancellation = async () => {
  if (!rejectCancellationReason.value || rejectCancellationReason.value.trim() === '') {
    toast.warning('Lütfen red nedenini giriniz')
    return
  }
  try {
    await api.post(`/employment/pre-record/${selectedRecord.value._id}/reject-cancellation`, {
      reason: rejectCancellationReason.value
    })
    toast.success('İptal talebi reddedildi')
    showRejectCancellationDialog.value = false
    rejectCancellationReason.value = ''
    selectedRecord.value = null
    await loadPreRecords()
  } catch (error) {
    console.error('İptal red hatası:', error)
    toast.error(error.response?.data?.message || 'İptal reddi başarısız oldu')
  }
}

const resetFilters = () => {
  filters.value = {
    companyId: '',
    workplaceId: '',
    processType: '',
    status: '',
    search: ''
  }
}

const handlePrint = () => {
  // Print için özel işlem
  const printContent = document.querySelector('.print-view')
  if (!printContent) {
    toast.warning('Yazdırılacak içerik bulunamadı')
    return
  }
  
  // Orijinal içeriği sakla
  const originalContent = document.body.innerHTML
  
  // Sadece print içeriğini al - butonları ve print:hidden class'larını filtrele
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = printContent.innerHTML
  
  // print:hidden class'ına sahip tüm elementleri kaldır (butonlar dahil)
  const hiddenElements = tempDiv.querySelectorAll('[class*="print:hidden"], [class*="print\\:hidden"]')
  hiddenElements.forEach(el => el.remove())
  
  // Tüm butonları kaldır (eğer hala varsa)
  const buttons = tempDiv.querySelectorAll('button')
  buttons.forEach(btn => btn.remove())
  
  // Butonların bulunduğu div'leri de kaldır (eğer boş kaldıysa)
  const buttonContainers = tempDiv.querySelectorAll('div')
  buttonContainers.forEach(container => {
    const hasButtons = container.querySelector('button')
    if (hasButtons) {
      container.remove()
    }
  })
  
  const printHTML = tempDiv.innerHTML
  
  // Yeni bir window aç ve yazdır
  const printWindow = window.open('', '_blank')
  const titleText = selectedRecord.value?.processType === 'hire' ? 'İşe Giriş Bilgileri Özeti' : 'İşten Çıkış Bilgileri Özeti'
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${titleText}</title>
        <style>
          @page {
            size: A5;
            margin: 8mm 10mm 10mm 10mm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: black;
            background: white;
            margin: 0;
            padding: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
          }
          td {
            padding: 6px 0;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
          }
          .label-cell {
            width: 1%;
            text-align: left;
            padding-right: 3px;
            white-space: nowrap;
          }
          .value-cell {
            text-align: left;
            padding-left: 0;
          }
          .text-xs { font-size: 10px; }
          .text-sm { font-size: 11pt; }
          .font-medium { font-weight: 500; }
          .font-semibold { font-weight: 600; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-900 { color: #111827; }
          .text-green-600 { color: #16a34a; }
          .text-red-600 { color: #dc2626; }
          .border-b { border-bottom: 1px solid #e5e7eb; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .pb-2 { padding-bottom: 8px; }
          .px-2 { padding-left: 8px; padding-right: 8px; }
          .py-2 { padding-top: 8px; padding-bottom: 8px; }
          .pr-4 { padding-right: 16px; }
          .pl-8 { padding-left: 32px; }
          .align-top { vertical-align: top; }
          .whitespace-pre-wrap { white-space: pre-wrap; }
          .rounded-full {
            border-radius: 9999px;
            padding: 2px 8px;
            font-size: 10px;
          }
          .bg-yellow-100 { background-color: #fef3c7; }
          .text-yellow-800 { color: #92400e; }
          .bg-green-100 { background-color: #d1fae5; }
          .text-green-800 { color: #065f46; }
          .bg-red-100 { background-color: #fee2e2; }
          .text-red-800 { color: #991b1b; }
          button, .print\\:hidden, [class*="print:hidden"], [class*="print\\:hidden"] {
            display: none !important;
            visibility: hidden !important;
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; padding-top: 0;">
        ${printHTML}
      </body>
    </html>
  `)
  printWindow.document.close()
  
  // Yazdırma işlemini başlat
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 250)
}

const sendViaWhatsApp = () => {
  if (!selectedRecord.value) return

  // Bayi admin telefon numarası kontrolü
  const dealerPhone = selectedRecord.value.companyId?.dealer?.contactPhone
  if (!dealerPhone) {
    const ikName = dealerIkName.value || 'Bayi İK'
    toast.warning(`${ikName} telefon numarası bulunamadı. WhatsApp ile göndermek için telefon numarası gereklidir.`)
    return
  }

  // Özet bilgileri oluştur
  const summaryTitle = selectedRecord.value.processType === 'hire' ? 'İşe Giriş Bilgileri Özeti' : 'İşten Çıkış Bilgileri Özeti'
  const summaryText = `*${summaryTitle}*

*İşlem Tipi:* ${selectedRecord.value.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış'}
*Durum:* ${getStatusLabel(selectedRecord.value.status)}
*Şirket:* ${selectedRecord.value.companyId?.name || '-'}
*İşyeri:* ${selectedRecord.value.workplaceId?.name || '-'}
*Adı Soyadı:* ${getEmployeeName(selectedRecord.value)}
*TC Kimlik:* ${getTCKN(selectedRecord.value)}
${selectedRecord.value.processType === 'hire' ? `*Giriş Tarihi:* ${formatDate(selectedRecord.value.hireDate)}` : `*Çıkış Tarihi:* ${formatDate(selectedRecord.value.terminationDate)}`}
*Görevi/Mesleği:* ${getJobOrReason(selectedRecord.value)}
${selectedRecord.value.processType === 'hire' ? `*Sözleşme Türü:* ${selectedRecord.value.contractType || '-'}` : ''}
${selectedRecord.value.ucret ? `*Ücreti:* ${(selectedRecord.value.companyId?.payrollCalculationType || 'NET') === 'NET' ? 'Net' : 'Brüt'} ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(selectedRecord.value.ucret)}` : ''}
*Talep Tarihi:* ${formatDateTime(selectedRecord.value.createdAt)}
${selectedRecord.value.email ? `*E-posta:* ${selectedRecord.value.email}` : ''}`

  // Telefon numarasını temizle (sadece rakamlar)
  const cleanPhone = dealerPhone.replace(/[^0-9]/g, '')
  
  // Türkiye için +90 ekle (yoksa)
  const phoneWithCountry = cleanPhone.startsWith('90') ? cleanPhone : (cleanPhone.startsWith('0') ? '90' + cleanPhone.substring(1) : '90' + cleanPhone)
  
  // WhatsApp Web linki oluştur
  const message = encodeURIComponent(summaryText)
  const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${message}`
  
  // Yeni sekmede aç
  window.open(whatsappUrl, '_blank')
}

const loadCompanyTitle = async () => {
  try {
    if (authStore.user?.company) {
      // company object veya string olabilir
      const companyId = typeof authStore.user.company === 'object' ? authStore.user.company._id : authStore.user.company
      const response = await api.get(`/companies/${companyId}`)
      const data = response.data?.data || response.data
      if (data && data.title) {
        companyTitle.value = data.title
      }
    }
    // Şirket yoksa varsayılan başlık kullanılır
  } catch (error) {
    console.error('Şirket başlığı yüklenemedi:', error)
  }
}

onMounted(() => {
  loadPreRecords()
  loadCompanyTitle()
})
</script>

<style scoped>
/* A5 Kağıt Çıktısı İçin Özel Stiller */
@media print {
  @page {
    size: A5;
    margin: 8mm 10mm 10mm 10mm;
  }

  body * {
    visibility: hidden;
  }

  .print-view,
  .print-view * {
    visibility: visible;
  }

  .print-view {
    position: absolute;
    left: 0;
    top: 0;
    width: 148mm;
    max-width: 148mm;
    padding: 8mm 10mm 10mm 10mm;
    background: white;
    box-shadow: none;
    margin: 0;
  }

  .print-content {
    font-size: 11pt;
    line-height: 1.4;
  }

  .print-content table {
    width: 100%;
    border-collapse: collapse;
  }

  .print-content td {
    padding: 6px 4px;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
  }

  .print-view .print-content * {
    color: black !important;
    background: white !important;
  }

  .print-view button,
  .print-view .print\:hidden {
    display: none !important;
  }

  .print-view .border,
  .print-view .rounded-lg {
    border: none !important;
    border-radius: 0 !important;
  }
}

/* Tablo hizalama için - ekran görünümü */
.print-content table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

.print-content table td {
  padding: 8px 0;
  vertical-align: top;
}

/* Başlık sütunları - en uzun başlığa göre sabit genişlik (sola hizalı) */
.print-content table .label-cell {
  width: 1%;
  text-align: left;
  padding-right: 4px;
  white-space: nowrap;
  vertical-align: top;
}

/* Veri sütunları - başlıktan hemen sonra başlar */
.print-content table .value-cell {
  text-align: left;
  padding-left: 0;
  vertical-align: top;
}

/* Print için tablo hizalama */
@media print {

  .print-content table {
    table-layout: auto;
  }

  .print-content table td {
    padding: 6px 0;
  }

  .print-content table .label-cell {
    width: 1%;
    text-align: left;
    padding-right: 3px;
    white-space: nowrap;
  }

  .print-content table .value-cell {
    text-align: left;
    padding-left: 0;
  }
}
</style>