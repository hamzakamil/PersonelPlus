<template>
  <div class="p-4">
    <!-- Üst Bar: Yıl/Ay Filtreleri + Butonlar -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center gap-3">
        <select
          v-model="filters.year"
          class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tüm Yıllar</option>
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
        <select
          v-model="filters.month"
          :disabled="!filters.year"
          class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Tüm Aylar</option>
          <option v-for="(name, idx) in monthNames" :key="idx" :value="idx + 1">{{ name }}</option>
        </select>
      </div>
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" @click="openImportModal">Excel'den İçe Aktar</Button>
        <Button size="sm" @click="showModal = true">Yeni Çalışan Ekle</Button>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-3 mb-3">
      <div class="flex flex-wrap items-end gap-3">
        <!-- Şirket Filtresi (Bayi Admin için) -->
        <div v-if="isBayiAdmin" class="min-w-[160px]">
          <label class="block text-xs font-medium text-gray-600 mb-1">Şirket</label>
          <select
            v-model="filters.company"
            class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tüm Şirketler</option>
            <option v-for="comp in sortedCompanies" :key="comp._id" :value="comp._id">
              {{ comp.name }}{{ comp.isDealerSelfCompany ? ' (Kendi)' : '' }}
            </option>
          </select>
        </div>
        <div class="min-w-[180px]">
          <label class="block text-xs font-medium text-gray-600 mb-1">Ara</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Ad, TC, email..."
            class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div class="min-w-[140px]">
          <label class="block text-xs font-medium text-gray-600 mb-1">Departman</label>
          <select
            v-model="filters.department"
            class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option v-for="dept in allDepartments" :key="dept._id" :value="dept._id">
              {{ dept.name }}
            </option>
          </select>
        </div>
        <div class="min-w-[100px]">
          <label class="block text-xs font-medium text-gray-600 mb-1">Durum</label>
          <select
            v-model="filters.status"
            class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="active">Aktif</option>
            <option value="separated">Ayrılmış</option>
          </select>
        </div>
        <button
          @click="resetFilters"
          class="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
        >
          Temizle
        </button>
        <!-- Sütun Görünürlük Ayarları -->
        <div class="relative">
          <button
            @click="showColumnMenu = !showColumnMenu"
            class="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
            title="Sütunları Ayarla"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Sütunlar
          </button>
          <div
            v-if="showColumnMenu"
            class="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]"
          >
            <label
              v-for="(label, key) in columnLabels"
              :key="key"
              class="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs text-gray-700"
            >
              <input
                type="checkbox"
                v-model="columnVisibility[key]"
                class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              {{ label }}
            </label>
          </div>
        </div>
      </div>
    </div>
    <!-- Sütun menü dışı tıklama -->
    <div v-if="showColumnMenu" class="fixed inset-0 z-10" @click="showColumnMenu = false"></div>

    <!-- Seçili İşlemler Toolbar -->
    <div
      v-if="selectedEmployees.length > 0"
      class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4"
    >
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium text-blue-800">
          {{ selectedEmployees.length }} çalışan seçildi
        </span>
        <div class="flex gap-2">
          <button
            @click="manualActivateSelected"
            :disabled="manualActivating"
            class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            title="Email göndermeden manuel aktif et"
          >
            {{ manualActivating ? 'Aktif Ediliyor...' : 'Manuel Aktif Et' }}
          </button>
          <button
            v-if="activationMode === 'email' || activationMode === 'both'"
            @click="sendActivationToSelected"
            :disabled="sendingBulkActivation"
            class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            title="Email ile aktivasyon linki gönder"
          >
            {{ sendingBulkActivation ? 'Gönderiliyor...' : 'Email Gönder' }}
          </button>
          <button
            v-if="activationMode === 'sms' || activationMode === 'both'"
            @click="sendSmsActivationToSelected"
            :disabled="sendingBulkSmsActivation"
            class="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            title="SMS ile aktivasyon kodu gönder"
          >
            {{ sendingBulkSmsActivation ? 'Gönderiliyor...' : 'SMS Gönder' }}
          </button>
          <button
            @click="openBulkSalaryModal"
            class="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            title="Seçili çalışanların ücretini toplu değiştir"
          >
            Toplu Ücret Değiştir
          </button>
          <button
            @click="deleteSelectedEmployees"
            class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Seçilenleri Sil
          </button>
          <button
            @click="clearSelection"
            class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Seçimi Temizle
          </button>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-8 px-1 py-2 text-left bg-gray-50">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                  class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th class="w-10 px-1 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                #
              </th>
              <th
                @click="toggleSort('name')"
                class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Ad Soyad
                  <svg
                    class="w-3 h-3"
                    :class="sortField === 'name' ? 'text-blue-600' : 'text-gray-400'"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      v-if="sortField === 'name' && sortDirection === 'asc'"
                      d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414l-3.293 3.293a1 1 0 01-1.414 0z"
                    />
                    <path
                      v-else-if="sortField === 'name' && sortDirection === 'desc'"
                      d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 0z"
                    />
                    <path v-else d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" />
                  </svg>
                </div>
              </th>
              <th v-if="columnVisibility.tcKimlik" class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                TCKN
              </th>
              <th
                v-if="columnVisibility.position"
                @click="toggleSort('position')"
                class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Görev
                  <svg
                    class="w-3 h-3"
                    :class="sortField === 'position' ? 'text-blue-600' : 'text-gray-400'"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      v-if="sortField === 'position' && sortDirection === 'asc'"
                      d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414l-3.293 3.293a1 1 0 01-1.414 0z"
                    />
                    <path
                      v-else-if="sortField === 'position' && sortDirection === 'desc'"
                      d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 0z"
                    />
                    <path v-else d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" />
                  </svg>
                </div>
              </th>
              <th
                v-if="columnVisibility.department"
                @click="toggleSort('department')"
                class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  Departman
                  <svg
                    class="w-3 h-3"
                    :class="sortField === 'department' ? 'text-blue-600' : 'text-gray-400'"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      v-if="sortField === 'department' && sortDirection === 'asc'"
                      d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414l-3.293 3.293a1 1 0 01-1.414 0z"
                    />
                    <path
                      v-else-if="sortField === 'department' && sortDirection === 'desc'"
                      d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 0z"
                    />
                    <path v-else d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" />
                  </svg>
                </div>
              </th>
              <th v-if="columnVisibility.phone" class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                Telefon
              </th>
              <th v-if="columnVisibility.email" class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                Email
              </th>
              <th
                v-if="columnVisibility.hireDate"
                @click="toggleSort('hireDate')"
                class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-1">
                  İşe Giriş
                  <svg
                    class="w-3 h-3"
                    :class="sortField === 'hireDate' ? 'text-blue-600' : 'text-gray-400'"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      v-if="sortField === 'hireDate' && sortDirection === 'asc'"
                      d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414l-3.293 3.293a1 1 0 01-1.414 0z"
                    />
                    <path
                      v-else-if="sortField === 'hireDate' && sortDirection === 'desc'"
                      d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 0z"
                    />
                    <path v-else d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" />
                  </svg>
                </div>
              </th>
              <th v-if="columnVisibility.salary" class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                Ücret
              </th>
              <th v-if="columnVisibility.contractType" class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                Sözleşme
              </th>
              <th v-if="columnVisibility.retirement" class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                Emeklilik
              </th>
              <th v-if="columnVisibility.status" class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                Durum
              </th>
              <th class="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <!-- Bayi Admin: Şirket bazlı gruplandırma -->
            <template v-if="isBayiAdmin">
              <template v-for="group in groupedEmployees" :key="group.companyId">
                <!-- Şirket Başlık Satırı -->
                <tr class="bg-gradient-to-r from-slate-100 to-slate-50 sticky">
                  <td :colspan="visibleColumnCount" class="px-3 py-1.5">
                    <div class="flex items-center gap-2">
                      <svg
                        class="w-4 h-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      <span class="text-xs font-semibold text-slate-700">{{
                        group.companyName
                      }}</span>
                      <span
                        class="px-1.5 py-0.5 text-[10px] bg-slate-200 text-slate-600 rounded-full"
                        >{{ group.employees.length }} kişi</span
                      >
                      <span
                        v-if="group.isDealerSelfCompany"
                        class="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded-full"
                        >Kendi Şirketim</span
                      >
                    </div>
                  </td>
                </tr>
                <!-- Çalışan Satırları -->
                <tr
                  v-for="(employee, index) in group.employees"
                  :key="employee._id"
                  @click="showPreview(employee, $event)"
                  @dblclick="handleRowDblClick(employee, $event)"
                  class="cursor-pointer"
                  :class="rowClass(employee)"
                >
                  <td class="px-1 py-1.5">
                    <input
                      type="checkbox"
                      :checked="isSelected(employee._id)"
                      @change="toggleSelect(employee._id)"
                      class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td class="px-1 py-1.5 text-[10px] text-gray-500">{{ index + 1 }}</td>
                  <td class="px-2 py-1.5">
                    <div
                      class="text-xs font-medium text-gray-900 truncate max-w-[140px]"
                      :title="`${employee.firstName} ${employee.lastName}`"
                    >
                      {{ employee.firstName }} {{ employee.lastName }}
                    </div>
                  </td>
                  <td v-if="columnVisibility.tcKimlik" class="px-2 py-1.5 text-[10px] text-gray-600 font-mono">
                    {{ employee.tcKimlik || '-' }}
                  </td>
                  <td v-if="columnVisibility.position" class="px-2 py-1.5">
                    <div
                      class="text-[10px] text-gray-600 truncate max-w-[100px]"
                      :title="employee.position"
                    >
                      {{ employee.position || '-' }}
                    </div>
                  </td>
                  <td v-if="columnVisibility.department" class="px-2 py-1.5">
                    <div
                      class="text-[10px] text-gray-600 truncate max-w-[90px]"
                      :title="employee.department?.name"
                    >
                      {{ employee.department?.name || '-' }}
                    </div>
                  </td>
                  <td v-if="columnVisibility.phone" class="px-2 py-1.5 text-[10px] text-gray-600">{{ employee.phone || '-' }}</td>
                  <td v-if="columnVisibility.email" class="px-2 py-1.5">
                    <div
                      class="text-[10px] text-gray-600 truncate max-w-[120px] lowercase"
                      :title="employee.email"
                    >
                      {{ employee.email || '-' }}
                    </div>
                  </td>
                  <td v-if="columnVisibility.hireDate" class="px-2 py-1.5 text-[10px] text-gray-600">
                    {{ employee.hireDate ? formatDate(employee.hireDate) : '-' }}
                  </td>
                  <td v-if="columnVisibility.salary" class="px-2 py-1.5 text-[10px] text-gray-600" @dblclick.stop="startSalaryEdit(employee, $event)">
                    <template v-if="editingSalaryId === employee._id">
                      <input
                        v-model="editingSalaryValue"
                        class="salary-inline-input w-20 px-1 py-0.5 text-[10px] border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        @keyup.enter="saveSalaryEdit(employee)"
                        @keyup.escape="cancelSalaryEdit"
                        @blur="saveSalaryEdit(employee)"
                        @click.stop
                      />
                    </template>
                    <template v-else>
                      <span class="cursor-pointer hover:text-blue-600" :title="'Çift tıkla düzenle'">
                        {{ employee.salary ? new Intl.NumberFormat('tr-TR').format(employee.salary) + ' ₺' : '-' }}
                      </span>
                    </template>
                  </td>
                  <td v-if="columnVisibility.contractType" class="px-2 py-1.5 text-[10px]" :class="employee.contractType === 'BELİRLİ_SÜRELİ' ? 'text-amber-700 font-medium' : 'text-gray-600'">
                    {{ contractTypeLabel(employee.contractType) }}
                    <span v-if="employee.contractType === 'BELİRLİ_SÜRELİ' && employee.contractEndDate" class="block text-[9px] text-amber-600">
                      {{ formatDate(employee.contractEndDate) }}
                    </span>
                  </td>
                  <td v-if="columnVisibility.retirement" class="px-2 py-1.5">
                    <span
                      :class="
                        employee.isRetired
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600'
                      "
                      class="px-1 py-0.5 text-[9px] font-medium rounded"
                    >
                      {{ employee.isRetired ? 'Emekli' : 'Normal' }}
                    </span>
                  </td>
                  <td v-if="columnVisibility.status" class="px-2 py-1.5">
                    <span
                      v-if="employee.status === 'separated'"
                      class="px-1 py-0.5 text-[9px] font-medium rounded bg-red-100 text-red-700"
                      >Ayrılmış</span
                    >
                    <span
                      v-else-if="employee.isActivated"
                      class="px-1 py-0.5 text-[9px] font-medium rounded bg-green-100 text-green-700"
                      >Aktif</span
                    >
                    <span
                      v-else
                      class="px-1 py-0.5 text-[9px] font-medium rounded bg-yellow-100 text-yellow-700"
                      >Bekliyor</span
                    >
                  </td>
                  <td class="px-2 py-1.5">
                    <div class="flex gap-0.5">
                      <button
                        @click="editEmployee(employee)"
                        class="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Düzenle"
                      >
                        <svg
                          class="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        v-if="!employee.isActivated && employee.status !== 'separated' && (activationMode === 'email' || activationMode === 'both')"
                        @click="sendActivationLink(employee._id)"
                        :disabled="sendingActivation === employee._id"
                        class="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Aktivasyon Emaili Gönder"
                      >
                        <svg
                          v-if="sendingActivation === employee._id"
                          class="w-3.5 h-3.5 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                          ></circle>
                          <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          ></path>
                        </svg>
                        <svg
                          v-else
                          class="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        v-if="!employee.isActivated && employee.status !== 'separated' && employee.phone && (activationMode === 'sms' || activationMode === 'both')"
                        @click="sendSmsActivation(employee._id)"
                        :disabled="sendingSmsActivation === employee._id"
                        class="p-1 text-teal-600 hover:bg-teal-50 rounded"
                        title="SMS ile Aktivasyon Kodu Gönder"
                      >
                        <svg
                          v-if="sendingSmsActivation === employee._id"
                          class="w-3.5 h-3.5 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        v-if="employee.status === 'separated'"
                        @click="rehireEmployee(employee)"
                        class="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Tekrar İşe Al"
                      >
                        <svg
                          class="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                      <button
                        @click="deleteEmployee(employee._id)"
                        class="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Sil"
                      >
                        <svg
                          class="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
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
              </template>
            </template>
            <!-- Company Admin: Normal liste -->
            <template v-else>
              <tr
                v-for="(employee, index) in sortedEmployees"
                :key="employee._id"
                @click="showPreview(employee, $event)"
                @dblclick="handleRowDblClick(employee, $event)"
                class="cursor-pointer"
                :class="rowClass(employee)"
              >
                <td class="px-1 py-1.5">
                  <input
                    type="checkbox"
                    :checked="isSelected(employee._id)"
                    @change="toggleSelect(employee._id)"
                    class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td class="px-1 py-1.5 text-[10px] text-gray-500">{{ index + 1 }}</td>
                <td class="px-2 py-1.5">
                  <div
                    class="text-xs font-medium text-gray-900 truncate max-w-[140px]"
                    :title="`${employee.firstName} ${employee.lastName}`"
                  >
                    {{ employee.firstName }} {{ employee.lastName }}
                  </div>
                </td>
                <td v-if="columnVisibility.tcKimlik" class="px-2 py-1.5 text-[10px] text-gray-600 font-mono">
                  {{ employee.tcKimlik || '-' }}
                </td>
                <td v-if="columnVisibility.position" class="px-2 py-1.5">
                  <div
                    class="text-[10px] text-gray-600 truncate max-w-[100px]"
                    :title="employee.position"
                  >
                    {{ employee.position || '-' }}
                  </div>
                </td>
                <td v-if="columnVisibility.department" class="px-2 py-1.5">
                  <div
                    class="text-[10px] text-gray-600 truncate max-w-[90px]"
                    :title="employee.department?.name"
                  >
                    {{ employee.department?.name || '-' }}
                  </div>
                </td>
                <td v-if="columnVisibility.phone" class="px-2 py-1.5 text-[10px] text-gray-600">{{ employee.phone || '-' }}</td>
                <td v-if="columnVisibility.email" class="px-2 py-1.5">
                  <div
                    class="text-[10px] text-gray-600 truncate max-w-[120px] lowercase"
                    :title="employee.email"
                  >
                    {{ employee.email || '-' }}
                  </div>
                </td>
                <td v-if="columnVisibility.hireDate" class="px-2 py-1.5 text-[10px] text-gray-600">
                  {{ employee.hireDate ? formatDate(employee.hireDate) : '-' }}
                </td>
                <td v-if="columnVisibility.salary" class="px-2 py-1.5 text-[10px] text-gray-600" @dblclick.stop="startSalaryEdit(employee, $event)">
                  <template v-if="editingSalaryId === employee._id">
                    <input
                      v-model="editingSalaryValue"
                      class="salary-inline-input w-20 px-1 py-0.5 text-[10px] border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      @keyup.enter="saveSalaryEdit(employee)"
                      @keyup.escape="cancelSalaryEdit"
                      @blur="saveSalaryEdit(employee)"
                      @click.stop
                    />
                  </template>
                  <template v-else>
                    <span class="cursor-pointer hover:text-blue-600" :title="'Çift tıkla düzenle'">
                      {{ employee.salary ? new Intl.NumberFormat('tr-TR').format(employee.salary) + ' ₺' : '-' }}
                    </span>
                  </template>
                </td>
                <td v-if="columnVisibility.contractType" class="px-2 py-1.5 text-[10px] text-gray-600">
                  {{ contractTypeLabel(employee.contractType) }}
                </td>
                <td v-if="columnVisibility.retirement" class="px-2 py-1.5">
                  <span
                    :class="
                      employee.isRetired
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                    "
                    class="px-1 py-0.5 text-[9px] font-medium rounded"
                  >
                    {{ employee.isRetired ? 'Emekli' : 'Normal' }}
                  </span>
                </td>
                <td v-if="columnVisibility.status" class="px-2 py-1.5">
                  <span
                    v-if="employee.status === 'separated'"
                    class="px-1 py-0.5 text-[9px] font-medium rounded bg-red-100 text-red-700"
                    >Ayrılmış</span
                  >
                  <span
                    v-else-if="employee.isActivated"
                    class="px-1 py-0.5 text-[9px] font-medium rounded bg-green-100 text-green-700"
                    >Aktif</span
                  >
                  <span
                    v-else
                    class="px-1 py-0.5 text-[9px] font-medium rounded bg-yellow-100 text-yellow-700"
                    >Bekliyor</span
                  >
                </td>
                <td class="px-2 py-1.5">
                  <div class="flex gap-0.5">
                    <button
                      @click="editEmployee(employee)"
                      class="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                      title="Düzenle"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      @click="showLeaveRequestModal(employee)"
                      class="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="İzin Talebi"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                    <button
                      v-if="!employee.isActivated && employee.status !== 'separated' && (activationMode === 'email' || activationMode === 'both')"
                      @click="sendActivationLink(employee._id)"
                      :disabled="sendingActivation === employee._id"
                      class="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Aktivasyon Emaili Gonder"
                    >
                      <svg
                        v-if="sendingActivation === employee._id"
                        class="w-3.5 h-3.5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          class="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          stroke-width="4"
                        ></circle>
                        <path
                          class="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        ></path>
                      </svg>
                      <svg
                        v-else
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                    <button
                      v-if="!employee.isActivated && employee.status !== 'separated' && employee.phone && (activationMode === 'sms' || activationMode === 'both')"
                      @click="sendSmsActivation(employee._id)"
                      :disabled="sendingSmsActivation === employee._id"
                      class="p-1 text-teal-600 hover:bg-teal-50 rounded"
                      title="SMS ile Aktivasyon Kodu Gönder"
                    >
                      <svg
                        v-if="sendingSmsActivation === employee._id"
                        class="w-3.5 h-3.5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      v-if="employee.status === 'separated'"
                      @click="rehireEmployee(employee)"
                      class="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      title="Tekrar İşe Al"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                    <button
                      @click="deleteEmployee(employee._id)"
                      class="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Sil"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
            </template>
            <!-- Boş durum -->
            <tr v-if="isBayiAdmin ? groupedEmployees.length === 0 : sortedEmployees.length === 0">
              <td colspan="11" class="px-4 py-6 text-center text-gray-500">
                <svg
                  class="mx-auto h-10 w-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p class="mt-2 text-sm font-medium text-gray-900">Çalışan bulunamadı</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Alt Bilgi -->
      <div class="px-3 py-2 bg-gray-50 border-t flex justify-between items-center">
        <p class="text-xs text-gray-600">
          Toplam
          {{
            isBayiAdmin
              ? groupedEmployees.reduce((acc, g) => acc + g.employees.length, 0)
              : sortedEmployees.length
          }}
          çalışan
        </p>
        <button
          @click="exportToExcel"
          class="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel'e Aktar
        </button>
      </div>
    </div>

    <!-- Employee Modal - Modern Design -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <!-- Modal Header -->
        <div
          class="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-white">
                {{ editingEmployee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle' }}
              </h2>
              <p class="text-xs text-blue-100">Personel bilgilerini eksiksiz doldurun</p>
            </div>
          </div>
          <button @click="closeModal" class="text-white/80 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Modal Body -->
        <form @submit.prevent="saveEmployee" class="flex-1 flex flex-col overflow-hidden">
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- Profil Fotoğrafı (düzenleme modunda) -->
            <div v-if="editingEmployee" class="flex items-center gap-4">
              <div class="relative group">
                <div
                  v-if="editPhotoPreview || editingEmployee.profilePhoto"
                  class="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer"
                  @click="$refs.adminPhotoInput.click()"
                >
                  <img :src="editPhotoPreview || editingEmployee.profilePhoto" alt="Profil" class="w-full h-full object-cover" />
                </div>
                <div
                  v-else
                  class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg font-bold border-2 border-gray-200 cursor-pointer"
                  @click="$refs.adminPhotoInput.click()"
                >
                  {{ editingEmployee.firstName?.charAt(0) }}{{ editingEmployee.lastName?.charAt(0) }}
                </div>
                <div
                  class="absolute inset-0 w-16 h-16 rounded-full bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  @click="$refs.adminPhotoInput.click()"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input
                  ref="adminPhotoInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="handleAdminPhotoChange"
                />
              </div>
              <div>
                <div class="flex gap-2">
                  <button type="button" @click="$refs.adminPhotoInput.click()" class="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    {{ adminPhotoUploading ? 'Yükleniyor...' : 'Fotoğraf Yükle' }}
                  </button>
                  <button
                    v-if="editingEmployee.profilePhoto"
                    type="button"
                    @click="deleteAdminPhoto"
                    class="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Sil
                  </button>
                </div>
                <p class="text-[10px] text-gray-400 mt-0.5">Maks. 2MB (JPEG, PNG, WebP)</p>
              </div>
            </div>

            <!-- Şirket Seçimi (bayi_admin için) -->
            <div
              v-if="isSuperAdmin || isBayiAdmin"
              class="bg-purple-50 border border-purple-200 rounded-xl p-4"
            >
              <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    class="w-4 h-4 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div>
                  <label class="text-sm font-semibold text-gray-900"
                    >Şirket Seçimi <span class="text-red-500">*</span></label
                  >
                  <p class="text-xs text-gray-500">Çalışanın ekleneceği şirket</p>
                </div>
              </div>
              <select
                v-model="form.company"
                @change="loadDepartmentsForCompany"
                class="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
              >
                <option value="">Şirket seçiniz...</option>
                <option v-for="comp in sortedCompanies" :key="comp._id" :value="comp._id">
                  {{ comp.name }}{{ comp.isDealerSelfCompany ? ' (Kendi Şirketim)' : '' }}
                </option>
              </select>
            </div>

            <!-- Kişisel Bilgiler -->
            <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5">
                <h3 class="text-white font-medium text-sm flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Kişisel Bilgiler
                </h3>
              </div>
              <div class="p-4 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Ad -->
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                      >Ad <span class="text-red-500">*</span></label
                    >
                    <div class="relative">
                      <div
                        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      >
                        <svg
                          class="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <input
                        v-model="form.firstName"
                        type="text"
                        required
                        @input="form.firstName = $event.target.value.toLocaleUpperCase('tr-TR')"
                        class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder="Adı giriniz"
                      />
                    </div>
                  </div>

                  <!-- Soyad -->
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                      >Soyad <span class="text-red-500">*</span></label
                    >
                    <div class="relative">
                      <div
                        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      >
                        <svg
                          class="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <input
                        v-model="form.lastName"
                        type="text"
                        required
                        @input="form.lastName = $event.target.value.toLocaleUpperCase('tr-TR')"
                        class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder="Soyadı giriniz"
                      />
                    </div>
                  </div>

                  <!-- TC Kimlik No -->
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                      >TC Kimlik No <span class="text-red-500">*</span></label
                    >
                    <div class="relative">
                      <div
                        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      >
                        <svg
                          class="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                          />
                        </svg>
                      </div>
                      <input
                        v-model="form.tcKimlik"
                        @input="formatTCKimlik"
                        type="text"
                        maxlength="11"
                        required
                        class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder="11 haneli TC Kimlik No"
                      />
                    </div>
                    <p
                      v-if="form.tcKimlik && form.tcKimlik.replace(/\D/g, '').length !== 11"
                      class="text-[10px] text-amber-600"
                    >
                      {{ 11 - form.tcKimlik.replace(/\D/g, '').length }} hane daha giriniz
                    </p>
                  </div>

                  <!-- Email -->
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                      >E-posta</label
                    >
                    <div class="relative">
                      <div
                        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      >
                        <svg
                          class="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <input
                        v-model="form.email"
                        type="email"
                        class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder="ornek@email.com (opsiyonel)"
                      />
                    </div>
                  </div>

                  <!-- Telefon -->
                  <div class="space-y-1.5">
                    <PhoneInput
                      v-model="form.phone"
                      label="Cep Numarası"
                      placeholder="5XX XXX XX XX"
                      :error="
                        form.phone && form.phone.length > 0 && form.phone.length !== 11
                          ? 'Cep numarası 11 haneli olmalıdır'
                          : ''
                      "
                    />
                  </div>

                  <!-- Personel Numarası -->
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                      >Personel No (Opsiyonel)</label
                    >
                    <div class="relative">
                      <div
                        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      >
                        <svg
                          class="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                          />
                        </svg>
                      </div>
                      <input
                        v-model="form.personelNumarasi"
                        type="text"
                        class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder="A100, 2025-01..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- İş Bilgileri -->
            <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div class="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5">
                <h3 class="text-white font-medium text-sm flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  İş Bilgileri
                </h3>
              </div>
              <div class="p-4 space-y-4">
                <!-- Görevi (SGK Meslek Kodu) - Autocomplete -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Görevi (SGK Meslek Kodu) <span class="text-red-500">*</span>
                    </label>
                    <span v-if="sgkJobCodesCount > 0" class="text-[10px] text-gray-500">
                      {{ sgkJobCodesCount }} meslek kodu yüklü
                    </span>
                  </div>
                  <div class="relative" ref="jobCodeDropdownRef">
                    <div
                      class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                    >
                      <svg
                        class="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      v-model="jobCodeSearch"
                      @input="searchJobCodes"
                      @focus="showJobCodeDropdown = true"
                      @keydown.down.prevent="navigateJobCodes(1)"
                      @keydown.up.prevent="navigateJobCodes(-1)"
                      @keydown.enter.prevent="selectHighlightedJobCode"
                      @keydown.escape="showJobCodeDropdown = false"
                      type="text"
                      class="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder="Meslek adı veya kodu yazarak arayın..."
                      autocomplete="off"
                    />
                    <!-- Loading indicator -->
                    <div
                      v-if="jobCodeSearching"
                      class="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <div
                        class="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"
                      ></div>
                    </div>
                    <!-- Clear button -->
                    <button
                      v-else-if="jobCodeSearch"
                      type="button"
                      @click="clearJobCode"
                      class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>

                    <!-- Dropdown -->
                    <div
                      v-if="
                        showJobCodeDropdown &&
                        (jobCodeSuggestions.length > 0 || jobCodeSearch.length >= 2)
                      "
                      class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                    >
                      <div
                        v-if="
                          jobCodeSuggestions.length === 0 &&
                          jobCodeSearch.length >= 2 &&
                          !jobCodeSearching
                        "
                        class="px-4 py-3 text-sm text-gray-500 text-center"
                      >
                        <svg
                          class="w-8 h-8 mx-auto mb-2 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        "{{ jobCodeSearch }}" için sonuç bulunamadı
                      </div>
                      <div
                        v-else-if="jobCodeSearch.length < 2 && !selectedJobCode"
                        class="px-4 py-3 text-sm text-gray-500 text-center"
                      >
                        En az 2 karakter yazın...
                      </div>
                      <button
                        v-for="(job, index) in jobCodeSuggestions"
                        :key="job.kod"
                        type="button"
                        @click="selectJobCode(job)"
                        @mouseenter="highlightedJobCodeIndex = index"
                        class="w-full px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                        :class="highlightedJobCodeIndex === index ? 'bg-emerald-50' : ''"
                      >
                        <span
                          class="flex-shrink-0 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-mono rounded"
                        >
                          {{ job.kod }}
                        </span>
                        <span class="text-sm text-gray-700 truncate">{{ job.ad }}</span>
                      </button>
                    </div>
                  </div>

                  <!-- Seçilen meslek kodu -->
                  <div
                    v-if="selectedJobCode"
                    class="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg"
                  >
                    <svg
                      class="w-4 h-4 text-emerald-600 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span class="text-xs font-mono text-emerald-700">{{
                      selectedJobCode.kod
                    }}</span>
                    <span class="text-xs text-emerald-800 flex-1 truncate">{{
                      selectedJobCode.ad
                    }}</span>
                    <button
                      type="button"
                      @click="clearJobCode"
                      class="text-emerald-600 hover:text-emerald-800"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <p v-else class="text-[10px] text-gray-400">
                    Meslek adı veya kodu yazarak arayın, listeden seçin
                  </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- SGK İşyeri -->
                  <div v-if="form.company && workplaces.length > 0" class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      SGK İşyeri <span class="text-red-500">*</span>
                    </label>
                    <select
                      v-model="form.workplace"
                      @change="loadSectionsForWorkplace"
                      class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      required
                    >
                      <option value="">İşyeri seçiniz...</option>
                      <option v-for="wp in workplaces" :key="wp._id" :value="wp._id">
                        {{ wp.name }}
                      </option>
                    </select>
                    <p
                      v-if="workplaces.length > 1 && !form.workplace"
                      class="text-[10px] text-amber-600"
                    >
                      Birden fazla işyeri var, lütfen seçim yapın
                    </p>
                  </div>

                  <!-- Bölüm -->
                  <div v-if="form.workplace && workplaceSections.length > 0" class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Bölüm / Kısım
                      <span v-if="workplaceSections.length > 1" class="text-red-500">*</span>
                    </label>
                    <select
                      v-model="form.workplaceSection"
                      class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      :required="workplaceSections.length > 1"
                    >
                      <option value="">Bölüm seçiniz...</option>
                      <option
                        v-for="section in workplaceSections"
                        :key="section._id"
                        :value="section._id"
                      >
                        {{ section.name }}
                      </option>
                    </select>
                  </div>

                  <!-- Departman -->
                  <div v-if="showDepartmentField" class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                      >Departman</label
                    >
                    <select
                      v-model="form.department"
                      class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    >
                      <option value="">Seçiniz (Opsiyonel)</option>
                      <option v-for="dept in departments" :key="dept._id" :value="dept._id">
                        {{ dept.name }}
                      </option>
                    </select>
                  </div>

                  <!-- Üst Yönetici -->
                  <div v-if="form.company" class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                      >Üst Yönetici</label
                    >
                    <select
                      v-model="form.manager"
                      class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    >
                      <option value="">Seçiniz (Opsiyonel)</option>
                      <option v-for="emp in availableManagers" :key="emp._id" :value="emp._id">
                        {{ emp.firstName }} {{ emp.lastName }}
                        {{ emp.position ? `(${emp.position})` : '' }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tarih Bilgileri -->
            <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div class="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5">
                <h3 class="text-white font-medium text-sm flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Tarih Bilgileri
                </h3>
              </div>
              <div class="p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- İşe Başlama Tarihi -->
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      İşe Başlama Tarihi <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                      <div
                        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      >
                        <svg
                          class="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <input
                        v-model="form.hireDate"
                        type="date"
                        required
                        class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                      />
                    </div>
                    <p v-if="!form.hireDate" class="text-[10px] text-amber-600">
                      Bu bilgi olmadan yıllık izin gün sayıları hesaplanamaz
                    </p>
                  </div>

                  <!-- Doğum Tarihi -->
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Doğum Tarihi <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                      <div
                        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      >
                        <svg
                          class="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
                          />
                        </svg>
                      </div>
                      <input
                        v-model="form.birthDate"
                        type="date"
                        required
                        class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                      />
                    </div>
                    <p v-if="!form.birthDate" class="text-[10px] text-amber-600">
                      Bu bilgi olmadan yıllık izin gün sayıları hesaplanamaz
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Çalışan No (Düzenleme modunda) -->
            <div v-if="editingEmployee" class="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                  <svg
                    class="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                    />
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Çalışan Sıra No</p>
                  <p class="text-sm font-semibold text-gray-900 font-mono">
                    {{ editingEmployee.employeeNumber || '-' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer - Inside Form -->
          <div
            class="bg-gray-50 border-t px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0"
          >
            <button
              type="button"
              @click="closeModal"
              class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
            >
              İptal
            </button>
            <button
              type="submit"
              class="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Leave Request Modal -->
    <div
      v-if="showLeaveRequestModalFlag"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">
          İzin Talebi Ekle -
          {{
            selectedEmployeeForLeave
              ? `${selectedEmployeeForLeave.firstName} ${selectedEmployeeForLeave.lastName}`
              : ''
          }}
        </h2>
        <form @submit.prevent="saveLeaveRequest">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >İzin Türü <span class="text-red-500">*</span></label
              >
              <select
                v-model="leaveRequestForm.companyLeaveType"
                @change="handleLeaveTypeChange"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçiniz</option>
                <option v-for="type in leaveTypes" :key="type._id" :value="type._id">
                  {{ type.name }}
                </option>
              </select>
            </div>

            <!-- Alt izin türü -->
            <div v-if="selectedLeaveType?.isOtherCategory && filteredLeaveSubTypes.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Alt İzin Türü <span class="text-red-500">*</span></label
              >
              <select
                v-model="leaveRequestForm.leaveSubType"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçiniz</option>
                <option
                  v-for="subType in filteredLeaveSubTypes"
                  :key="subType._id"
                  :value="subType._id"
                >
                  {{ subType.name }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Başlangıç Tarihi <span class="text-red-500">*</span></label
                >
                <input
                  v-model="leaveRequestForm.startDate"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Bitiş Tarihi <span class="text-red-500">*</span></label
                >
                <input
                  v-model="leaveRequestForm.endDate"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                v-model="leaveRequestForm.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <div class="flex gap-2 justify-end">
              <Button type="button" variant="secondary" @click="closeLeaveRequestModal"
                >İptal</Button
              >
              <Button type="submit" :disabled="savingLeaveRequest">
                {{ savingLeaveRequest ? 'Kaydediliyor...' : 'Kaydet' }}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Import Modal -->
    <div
      v-if="showImportModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">Excel'den İçe Aktar</h2>
        <div class="space-y-4">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-blue-800 mb-2">Şablon Excel Dosyası İndir</h3>
            <Button @click="downloadTemplate" variant="secondary" class="w-full">
              📥 Şablon Excel Dosyasını İndir
            </Button>
          </div>

          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-yellow-800 mb-2">Zorunlu Alanlar:</h3>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-yellow-700">
              <div>• Adı Soyadı</div>
              <div>• TC Kimlik No <span class="text-xs text-yellow-600">(11 hane)</span></div>
              <div>• Görevi</div>
              <div>
                • İşe Giriş Tarihi <span class="text-xs text-yellow-600">(GG.AA.YYYY)</span>
              </div>
            </div>
            <p class="text-xs text-yellow-600 mt-2">
              ⚠️ Bu alanlar eksik ise satır içeri aktarılmaz.
            </p>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p class="text-xs text-blue-700">
              💡 Email/telefon girilmezse TC Kimlik No ile giriş yapılır (varsayılan şifre: 123456). İlk girişte email, telefon ve şifre değişikliği zorunludur.
            </p>
          </div>

          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Opsiyonel Alanlar:</h3>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
              <div>• Doğum Tarihi <span class="text-xs">(GG.AA.YYYY)</span></div>
              <div>• Email Adresi</div>
              <div>• Telefon Numarası</div>
              <div>• Personel Numarası</div>
              <div>• Departman</div>
              <div>• SGK İşyeri</div>
              <div>• İşyeri Bölümü</div>
              <div>• Doğum Yeri</div>
              <div>• Pasaport No</div>
              <div>• Kan Grubu</div>
              <div>• Askerlik Durumu</div>
              <div>• Sabıka Kaydı Var mı? <span class="text-xs">(Evet/Hayır)</span></div>
              <div>• Ehliyet Var mı? <span class="text-xs">(Evet/Hayır)</span></div>
              <div>• Emekli Mi? <span class="text-xs">(Evet/Hayır)</span></div>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              💡 SGK İşyeri ve Departman Excel'deki isimlerle eşleşmelidir.
            </p>
          </div>

          <!-- İsim Onay Adımı -->
          <div v-if="importStep === 'confirm' && previewData" class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p class="text-sm text-blue-800">
                <strong>{{ previewData.totalRows }}</strong> satırdan
                <strong>{{ previewData.autoResolvedCount }}</strong> tanesi otomatik ayrıldı.
                <strong>{{ previewData.ambiguousNames.length }}</strong> isim için onayınız gerekiyor:
              </p>
            </div>

            <div class="max-h-96 overflow-y-auto space-y-3">
              <div
                v-for="item in previewData.ambiguousNames"
                :key="item.row"
                class="bg-gray-50 border border-gray-200 rounded-lg p-3"
              >
                <p class="text-sm font-medium text-gray-800 mb-2">
                  Satır {{ item.row }}: <strong>{{ item.fullName }}</strong>
                </p>
                <div class="space-y-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      :name="'name-' + item.row"
                      value="A"
                      v-model="nameResolutions[item.row]"
                      class="text-blue-600"
                    />
                    <span class="text-sm">
                      Ad: <strong class="text-green-700">{{ item.optionA.firstName }}</strong>
                      — Soyad: <strong class="text-blue-700">{{ item.optionA.lastName }}</strong>
                    </span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      :name="'name-' + item.row"
                      value="B"
                      v-model="nameResolutions[item.row]"
                      class="text-blue-600"
                    />
                    <span class="text-sm">
                      Ad: <strong class="text-green-700">{{ item.optionB.firstName }}</strong>
                      — Soyad: <strong class="text-blue-700">{{ item.optionB.lastName }}</strong>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeImportModal">İptal</Button>
              <Button @click="confirmImport" :disabled="importing">
                {{ importing ? 'İçe Aktarılıyor...' : 'Onayla ve İçe Aktar' }}
              </Button>
            </div>
          </div>

          <!-- İçe aktarma sonucu -->
          <div v-if="importStep !== 'confirm'">
            <div v-if="importResult" class="mb-4">
              <div
                :class="[
                  'rounded-lg p-4 border',
                  importResult.errorCount > 0
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200',
                ]"
              >
                <div class="flex items-center gap-2">
                  <span v-if="importResult.errorCount > 0" class="text-yellow-600 text-xl">⚠️</span>
                  <span v-else class="text-green-600 text-xl">✅</span>
                  <span
                    :class="importResult.errorCount > 0 ? 'text-yellow-800' : 'text-green-800'"
                    class="font-semibold"
                  >
                    {{ importResult.added }} çalışan başarıyla eklendi
                    <span v-if="importResult.errorCount > 0"
                      >, {{ importResult.errorCount }} hata oluştu</span
                    >
                  </span>
                </div>
              </div>
            </div>

            <!-- Hatalar listesi -->
            <div v-if="importErrors.length > 0" class="mb-4">
              <h3 class="text-sm font-semibold text-red-800 mb-2">Hatalar:</h3>
              <div class="bg-red-50 border border-red-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                <ul class="text-sm text-red-700 space-y-1">
                  <li
                    v-for="(error, index) in importErrors"
                    :key="index"
                    class="flex items-start gap-2"
                  >
                    <span class="text-red-500 mt-0.5">•</span>
                    <span>{{ error }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <form @submit.prevent="importEmployees">
              <div class="space-y-4">
                <div v-if="isSuperAdmin || isBayiAdmin">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
                  <select
                    v-model="importCompany"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option v-for="comp in companies" :key="comp._id" :value="comp._id">
                      {{ comp.name }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Excel Dosyası</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    @change="handleFileChange"
                    class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                </div>
                <div class="flex gap-2 justify-end">
                  <Button variant="secondary" @click="closeImportModal">{{
                    importErrors.length > 0 ? 'Kapat' : 'İptal'
                  }}</Button>
                  <Button
                    v-if="!importResult || importErrors.length > 0"
                    type="submit"
                    :disabled="importing"
                  >
                    {{
                      importing ? 'İçe Aktarılıyor...' : importResult ? 'Tekrar Dene' : 'İçe Aktar'
                    }}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    <!-- Toplu Ücret Değiştirme Modalı -->
    <Teleport to="body">
      <div v-if="showBulkSalaryModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" @click="showBulkSalaryModal = false">
        <div class="bg-white rounded-xl shadow-2xl p-6 w-[400px] max-w-[90vw]" @click.stop>
          <h3 class="text-lg font-semibold text-gray-900 mb-1">Toplu Ücret Değiştir</h3>
          <p class="text-xs text-gray-500 mb-4">{{ selectedEmployees.length }} çalışanın ücreti güncellenecek</p>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Yeni Ücret</label>
              <input
                v-model="bulkSalaryValue"
                type="text"
                inputmode="numeric"
                placeholder="Örn: 30000"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="bulkSalaryIsNet" id="bulkIsNet" class="w-4 h-4 text-blue-600 border-gray-300 rounded" />
              <label for="bulkIsNet" class="text-sm text-gray-700">Net ücret</label>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button @click="showBulkSalaryModal = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">İptal</button>
            <button @click="saveBulkSalary" :disabled="savingBulkSalary" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {{ savingBulkSalary ? 'Kaydediliyor...' : 'Uygula' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Hızlı Önizleme Modalı -->
    <Teleport to="body">
      <div v-if="previewEmployee" class="fixed inset-0 z-50" @click="closePreview">
        <div
          class="fixed left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gray-200 p-4 cursor-pointer"
          :style="{ top: modalTopPosition }"
          @click.stop
          @dblclick="editEmployee(previewEmployee); closePreview()"
        >
          <div class="flex items-center gap-4">
            <!-- Fotoğraf -->
            <div class="flex-shrink-0">
              <img
                v-if="previewEmployee.profilePhoto"
                :src="previewEmployee.profilePhoto"
                alt="Profil"
                class="w-20 h-20 rounded-full object-cover border-2 border-gray-100"
              />
              <div
                v-else
                class="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold border-2 border-gray-100"
              >
                {{ previewEmployee.firstName?.charAt(0) }}{{ previewEmployee.lastName?.charAt(0) }}
              </div>
            </div>
            <!-- Bilgiler -->
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-semibold text-gray-900">
                {{ previewEmployee.firstName }} {{ previewEmployee.lastName }}
              </h3>
              <p class="text-sm text-gray-500">{{ previewEmployee.position || '-' }}</p>
              <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <div><span class="text-gray-400">Departman:</span> {{ previewEmployee.department?.name || '-' }}</div>
                <div><span class="text-gray-400">Telefon:</span> {{ previewEmployee.phone || '-' }}</div>
                <div><span class="text-gray-400">Email:</span> {{ previewEmployee.email || '-' }}</div>
                <div><span class="text-gray-400">İşe Giriş:</span> {{ previewEmployee.hireDate ? formatDate(previewEmployee.hireDate) : '-' }}</div>
                <div><span class="text-gray-400">TCKN:</span> {{ previewEmployee.tcKimlik || '-' }}</div>
                <div><span class="text-gray-400">Ücret:</span> {{ previewEmployee.salary ? new Intl.NumberFormat('tr-TR').format(previewEmployee.salary) + ' ₺' + (previewEmployee.isNetSalary ? ' (Net)' : ' (Brüt)') : '-' }}</div>
                <div>
                  <span class="text-gray-400">Sözleşme:</span>
                  <span :class="previewEmployee.contractType === 'BELİRLİ_SÜRELİ' ? 'text-amber-700 font-medium' : ''">
                    {{ contractTypeLabel(previewEmployee.contractType) }}
                  </span>
                </div>
                <div v-if="previewEmployee.contractType === 'BELİRLİ_SÜRELİ'">
                  <span class="text-gray-400">Bitiş Tarihi:</span>
                  <span class="text-amber-700 font-medium">{{ previewEmployee.contractEndDate ? formatDate(previewEmployee.contractEndDate) : '-' }}</span>
                </div>
                <div>
                  <span class="text-gray-400">Durum:</span>
                  <span
                    class="ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded"
                    :class="previewEmployee.status === 'separated' ? 'bg-red-100 text-red-700' : previewEmployee.isActivated ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
                  >
                    {{ previewEmployee.status === 'separated' ? 'Ayrılmış' : previewEmployee.isActivated ? 'Aktif' : 'Bekliyor' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- SMS OTP Doğrulama Modalı -->
    <Teleport to="body">
      <div v-if="smsOtpModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="smsOtpModal = false">
        <div class="bg-white rounded-xl shadow-2xl w-[420px] max-w-[90vw] p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">SMS Aktivasyon Doğrulama</h3>
          <p class="text-sm text-gray-500 mb-4">
            <span class="font-medium text-gray-700">{{ smsOtpData?.employeeName }}</span> için
            <span class="font-medium text-teal-600">{{ smsOtpData?.maskedPhone }}</span> numarasına gönderilen
            6 haneli kodu girin.
          </p>

          <div class="mb-4">
            <input
              v-model="smsOtpCode"
              type="text"
              maxlength="6"
              inputmode="numeric"
              pattern="[0-9]*"
              class="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="______"
              @keyup.enter="verifySmsOtp"
              autofocus
            />
          </div>

          <div class="flex items-center justify-between mb-4">
            <button
              @click="resendSmsOtp"
              class="text-sm text-teal-600 hover:text-teal-800 underline"
            >
              Tekrar Gönder
            </button>
            <span class="text-xs text-gray-400">
              Kod 5 dakika geçerlidir
            </span>
          </div>

          <div class="flex gap-3">
            <button
              @click="smsOtpModal = false; smsOtpData = null; smsOtpCode = ''"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              @click="verifySmsOtp"
              :disabled="verifyingSmsOtp || smsOtpCode.length !== 6"
              class="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {{ verifyingSmsOtp ? 'Doğrulanıyor...' : 'Doğrula' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import api from '@/services/api';
import Button from '@/components/Button.vue';
import Input from '@/components/Input.vue';
import PhoneInput from '@/components/PhoneInput.vue';
import * as XLSX from 'xlsx';

const router = useRouter();

const authStore = useAuthStore();
const toast = useToastStore();
const confirmModal = useConfirmStore();
const employees = ref([]);
const departments = ref([]);
const companies = ref([]);
const workplaces = ref([]);
const workplaceSections = ref([]);
const allEmployees = ref([]); // Tüm çalışanlar (manager seçimi için)
const showModal = ref(false);
const showImportModal = ref(false);
const editingEmployee = ref(null);
const editPhotoPreview = ref(null);
const adminPhotoUploading = ref(false);
const previewEmployee = ref(null);
const previewPosition = ref({ top: 0 });
const showColumnMenu = ref(false);
const columnVisibility = ref({
  tcKimlik: true,
  position: true,
  department: true,
  phone: true,
  email: true,
  hireDate: true,
  salary: true,
  contractType: false,
  retirement: true,
  status: true,
});
const columnLabels = {
  tcKimlik: 'TCKN',
  position: 'Görev',
  department: 'Departman',
  phone: 'Telefon',
  email: 'Email',
  hireDate: 'İşe Giriş',
  salary: 'Ücret',
  contractType: 'Sözleşme',
  retirement: 'Emeklilik',
  status: 'Durum',
};
const contractTypeLabel = (type) => {
  const labels = {
    'BELİRSİZ_SÜRELİ': 'Normal',
    'BELİRLİ_SÜRELİ': 'Belirli Süreli',
    'KISMİ_SÜRELİ': 'Part Time',
    'UZAKTAN_ÇALIŞMA': 'Uzaktan',
  };
  return labels[type] || 'Normal';
};

// Satır renk sınıfı (öncelik sırası: seçili > ayrılmış > emekli > belirli süreli > SGK müdahale > normal)
const rowClass = (employee) => {
  const selected = isSelected(employee._id);
  if (selected) return 'bg-blue-50';
  if (employee.status === 'separated') return 'bg-red-50';
  if (employee.isRetired) return 'bg-orange-50';
  if (employee.contractType === 'BELİRLİ_SÜRELİ') return 'bg-amber-50';
  if (employee.hasSgkGunOverride) return 'bg-purple-50';
  return 'hover:bg-gray-50';
};
const editingSalaryId = ref(null);
const editingSalaryValue = ref('');
const showBulkSalaryModal = ref(false);
const bulkSalaryValue = ref('');
const bulkSalaryIsNet = ref(true);
const savingBulkSalary = ref(false);
const importing = ref(false);
const importFile = ref(null);
const importCompany = ref('');
const importErrors = ref([]);
const importResult = ref(null);
const importStep = ref('upload'); // 'upload' | 'confirm' | 'result'
const previewData = ref(null);
const nameResolutions = ref({});
const sendingActivation = ref(null);
const sendingBulkActivation = ref(false);
const manualActivatingId = ref(null);
const manualActivating = ref(false);
// SMS aktivasyon
const activationMode = ref('email'); // 'email' | 'sms' | 'both'
const sendingSmsActivation = ref(null); // employee._id
const sendingBulkSmsActivation = ref(false);
const smsOtpModal = ref(false);
const smsOtpData = ref(null); // { verificationId, employeeId, employeeName, maskedPhone, expiresAt }
const smsOtpCode = ref('');
const verifyingSmsOtp = ref(false);
const showLeaveRequestModalFlag = ref(false);
const selectedEmployeeForLeave = ref(null);
const savingLeaveRequest = ref(false);
const leaveTypes = ref([]);
const leaveSubTypes = ref([]);
const leaveRequestForm = ref({
  companyLeaveType: '',
  leaveSubType: '',
  startDate: '',
  endDate: '',
  description: '',
});
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  tcKimlik: '',
  position: '',
  workplace: '',
  workplaceSection: '',
  department: '',
  company: '',
  manager: '',
  hireDate: '',
  birthDate: '',
  personelNumarasi: '',
});

// SGK Meslek Kodu autocomplete
const jobCodeSearch = ref('');
const jobCodeSuggestions = ref([]);
const jobCodeSearching = ref(false);
const showJobCodeDropdown = ref(false);
const selectedJobCode = ref(null);
const highlightedJobCodeIndex = ref(-1);
const jobCodeDropdownRef = ref(null);
const sgkJobCodesCount = ref(0);
let jobCodeSearchTimeout = null;

const userRole = computed(() => authStore.user?.role?.name || authStore.user?.role);
const isSuperAdmin = computed(() => userRole.value === 'super_admin');
const isBayiAdmin = computed(() => userRole.value === 'bayi_admin');
const inactiveEmployees = computed(() => employees.value.filter(emp => !emp.isActivated));

// Filtreler
const filters = ref({
  search: '',
  department: '',
  status: '',
  activation: '',
  company: '', // Şirket filtresi (bayi_admin için)
  year: '', // Yıl filtresi
  month: '', // Ay filtresi
});

// Yıl seçenekleri (2020'den günümüze)
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 2020; y--) {
    years.push(y);
  }
  return years;
});

// Ay isimleri
const monthNames = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

// Sıralama durumu
const sortField = ref('name');
const sortDirection = ref('asc');

const toggleSort = field => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'asc';
  }
};

// Bayi'nin kendi şirketi (selfCompany)
const dealerSelfCompany = ref(null);

// Seçili çalışanlar
const selectedEmployees = ref([]);

// Tüm departmanlar (filtreleme için)
const allDepartments = ref([]);

// Şirketleri sıralı listele (selfCompany en üstte)
const sortedCompanies = computed(() => {
  return [...companies.value].sort((a, b) => {
    // Kendi şirketi en üstte
    if (a.isDealerSelfCompany && !b.isDealerSelfCompany) return -1;
    if (!a.isDealerSelfCompany && b.isDealerSelfCompany) return 1;
    // Diğerleri alfabetik
    return (a.name || '').localeCompare(b.name || '', 'tr');
  });
});

// Filtrelenmiş ve sıralanmış çalışanlar
const filteredEmployees = computed(() => {
  let result = [...employees.value];

  // Şirket filtresi (bayi_admin için)
  if (filters.value.company) {
    result = result.filter(emp => {
      const empCompanyId = emp.company?._id || emp.company;
      return empCompanyId === filters.value.company;
    });
  }

  // Arama filtresi
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    result = result.filter(
      emp =>
        emp.firstName?.toLowerCase().includes(search) ||
        emp.lastName?.toLowerCase().includes(search) ||
        emp.tcKimlik?.includes(search) ||
        emp.email?.toLowerCase().includes(search) ||
        emp.phone?.includes(search) ||
        emp.personelNumarasi?.toLowerCase().includes(search)
    );
  }

  // Departman filtresi
  if (filters.value.department) {
    result = result.filter(emp => emp.department?._id === filters.value.department);
  }

  // Durum filtresi
  if (filters.value.status) {
    result = result.filter(emp => emp.status === filters.value.status);
  }

  // Aktivasyon filtresi
  if (filters.value.activation) {
    if (filters.value.activation === 'activated') {
      result = result.filter(emp => emp.isActivated);
    } else if (filters.value.activation === 'not_activated') {
      result = result.filter(emp => !emp.isActivated);
    }
  }

  // Sıralama - selfCompany çalışanları önce, sonra şirket adına göre, sonra employeeNumber'a göre
  return result.sort((a, b) => {
    // Bayi admin için: Kendi şirketinin çalışanları önce
    if (isBayiAdmin.value && dealerSelfCompany.value) {
      const aIsSelf = (a.company?._id || a.company) === dealerSelfCompany.value;
      const bIsSelf = (b.company?._id || b.company) === dealerSelfCompany.value;
      if (aIsSelf && !bIsSelf) return -1;
      if (!aIsSelf && bIsSelf) return 1;
    }

    // Şirket bazlı gruplama (aynı şirketin çalışanları bir arada)
    if (isBayiAdmin.value && !filters.value.company) {
      const compA = a.company?.name || '';
      const compB = b.company?.name || '';
      if (compA !== compB) {
        return compA.localeCompare(compB, 'tr');
      }
    }

    // Aynı şirket içinde employeeNumber'a göre sırala
    if (a.employeeNumber && b.employeeNumber) {
      return a.employeeNumber.localeCompare(b.employeeNumber, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    }
    if (a.employeeNumber) return -1;
    if (b.employeeNumber) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
});

// Sıralanmış çalışanlar (kullanıcı sıralaması ile)
const sortedEmployees = computed(() => {
  const list = [...filteredEmployees.value];

  return list.sort((a, b) => {
    let valA, valB;
    switch (sortField.value) {
      case 'name':
        valA = `${a.firstName} ${a.lastName}`.toLowerCase();
        valB = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case 'position':
        valA = (a.position || '').toLowerCase();
        valB = (b.position || '').toLowerCase();
        break;
      case 'department':
        valA = (a.department?.name || '').toLowerCase();
        valB = (b.department?.name || '').toLowerCase();
        break;
      case 'hireDate':
        valA = a.hireDate ? new Date(a.hireDate).getTime() : 0;
        valB = b.hireDate ? new Date(b.hireDate).getTime() : 0;
        break;
      default:
        valA = `${a.firstName} ${a.lastName}`.toLowerCase();
        valB = `${b.firstName} ${b.lastName}`.toLowerCase();
    }

    if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1;
    return 0;
  });
});

// Şirket bazlı gruplandırılmış çalışanlar (Bayi Admin için)
const groupedEmployees = computed(() => {
  if (!isBayiAdmin.value) return [];

  const groups = {};
  const sorted = sortedEmployees.value;

  sorted.forEach(emp => {
    const companyId = emp.company?._id || emp.company || 'unknown';
    const companyName = emp.company?.name || 'Bilinmeyen Şirket';
    const isDealerSelfCompany = emp.company?.isDealerSelfCompany || false;

    if (!groups[companyId]) {
      groups[companyId] = {
        companyId,
        companyName,
        isDealerSelfCompany,
        employees: [],
      };
    }
    groups[companyId].employees.push(emp);
  });

  // Sırala: Kendi şirketi önce, sonra alfabetik
  return Object.values(groups).sort((a, b) => {
    if (a.isDealerSelfCompany && !b.isDealerSelfCompany) return -1;
    if (!a.isDealerSelfCompany && b.isDealerSelfCompany) return 1;
    return a.companyName.localeCompare(b.companyName, 'tr');
  });
});

// Seçim computed'ları
const isAllSelected = computed(() => {
  return (
    filteredEmployees.value.length > 0 &&
    selectedEmployees.value.length === filteredEmployees.value.length
  );
});

const isIndeterminate = computed(() => {
  return (
    selectedEmployees.value.length > 0 &&
    selectedEmployees.value.length < filteredEmployees.value.length
  );
});

// Seçim fonksiyonları
const isSelected = id => selectedEmployees.value.includes(id);

const toggleSelect = id => {
  const index = selectedEmployees.value.indexOf(id);
  if (index === -1) {
    selectedEmployees.value.push(id);
  } else {
    selectedEmployees.value.splice(index, 1);
  }
};

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedEmployees.value = [];
  } else {
    selectedEmployees.value = filteredEmployees.value.map(emp => emp._id);
  }
};

const clearSelection = () => {
  selectedEmployees.value = [];
};

// Filtre sıfırlama
const resetFilters = () => {
  filters.value = {
    search: '',
    department: '',
    status: '',
    activation: '',
    company: '',
    year: '',
    month: '',
  };
};

const formatDate = date => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const updatePersonelNumarasi = async employee => {
  try {
    await api.put(`/employees/${employee._id}`, {
      personelNumarasi: employee.personelNumarasi || undefined,
    });
    // Başarılı güncelleme için liste yenilenmez, sadece local state güncellenir
  } catch (error) {
    console.error('Personel numarası güncellenemedi:', error);
    toast.error(error.response?.data?.message || 'Personel numarası güncellenemedi');
    // Hata durumunda listeyi yeniden yükle
    loadEmployees();
  }
};

const loadActivationMode = async () => {
  try {
    const response = await api.get('/global-settings/activation-mode');
    if (response.data.success) {
      activationMode.value = response.data.data.activationMode || 'email';
    }
  } catch (error) {
    console.error('Aktivasyon modu yüklenemedi:', error);
  }
};

const loadEmployees = async () => {
  try {
    // Query parametrelerini oluştur
    const params = new URLSearchParams();
    if (filters.value.status) params.append('status', filters.value.status);
    if (filters.value.year) params.append('year', filters.value.year);
    if (filters.value.month) params.append('month', filters.value.month);

    const queryString = params.toString();
    const url = queryString ? `/employees?${queryString}` : '/employees';

    const response = await api.get(url);
    const data = response.data?.data || response.data || [];
    employees.value = data;
    // Manager seçimi için de kullanılacak
    allEmployees.value = data;
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error);
    employees.value = [];
    allEmployees.value = [];
  }
};

const loadDepartments = async () => {
  try {
    const response = await api.get('/departments');
    departments.value = response.data?.data || response.data || [];
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error);
    departments.value = [];
  }
};

const loadDepartmentsForCompany = async () => {
  if (form.value.company) {
    try {
      const response = await api.get(`/departments?company=${form.value.company}`);
      departments.value = response.data?.data || response.data || [];
    } catch (error) {
      console.error('Departmanlar yüklenemedi:', error);
      departments.value = [];
    }
    // Workplace'leri yükle
    await loadWorkplacesForCompany();
    // Çalışanları yükle (manager seçimi için)
    await loadEmployeesForCompany();
  } else {
    departments.value = [];
    workplaces.value = [];
    workplaceSections.value = [];
    allEmployees.value = [];
  }
  form.value.department = ''; // Reset department when company changes
  form.value.workplace = ''; // Reset workplace when company changes
  form.value.workplaceSection = ''; // Reset section when company changes
  form.value.manager = ''; // Reset manager when company changes
};

const loadEmployeesForCompany = async () => {
  if (form.value.company) {
    try {
      const response = await api.get(`/employees?company=${form.value.company}`);
      allEmployees.value = response.data?.data || response.data || [];
    } catch (error) {
      console.error('Çalışanlar yüklenemedi:', error);
      allEmployees.value = [];
    }
  }
};

const loadWorkplacesForCompany = async () => {
  if (form.value.company) {
    try {
      const response = await api.get(`/workplaces?company=${form.value.company}`);
      workplaces.value = response.data?.data || response.data || [];

      // Eğer sadece 1 workplace varsa otomatik seç
      if (workplaces.value.length === 1) {
        form.value.workplace = workplaces.value[0]._id;
        await loadSectionsForWorkplace();
      } else {
        form.value.workplace = '';
        workplaceSections.value = [];
        form.value.workplaceSection = '';
      }
    } catch (error) {
      console.error('İşyerleri yüklenemedi:', error);
      workplaces.value = [];
    }
  }
};

const loadSectionsForWorkplace = async () => {
  if (form.value.workplace) {
    try {
      const response = await api.get(`/workplaces/${form.value.workplace}/sections`);
      workplaceSections.value = response.data?.data || response.data || [];

      // Eğer sadece 1 section varsa otomatik seç
      if (workplaceSections.value.length === 1) {
        form.value.workplaceSection = workplaceSections.value[0]._id;
      } else {
        form.value.workplaceSection = '';
      }
    } catch (error) {
      console.error('İşyeri bölümleri yüklenemedi:', error);
      workplaceSections.value = [];
    }
  } else {
    workplaceSections.value = [];
    form.value.workplaceSection = '';
  }
};

// Computed properties for form visibility
const showWorkplaceField = computed(() => {
  // Bayi admin veya super admin için şirket seçilmişse ve birden fazla workplace varsa göster
  if ((isSuperAdmin.value || isBayiAdmin.value) && form.value.company) {
    return workplaces.value.length > 1;
  }
  // Company admin için her zaman göster (tek olsa bile)
  return workplaces.value.length > 0;
});

const showWorkplaceSectionField = computed(() => {
  // İşyeri seçilmişse ve birden fazla bölüm varsa göster
  if (form.value.workplace) {
    return workplaceSections.value.length > 1;
  }
  return false;
});

const showDepartmentField = computed(() => {
  return departments.value.length > 0;
});

// Manager seçimi için mevcut çalışanlar (düzenleme sırasında kendisi hariç)
const availableManagers = computed(() => {
  if (!form.value.company) return [];
  return allEmployees.value.filter(emp => {
    // Aynı şirkette olmalı
    if (emp.company?._id !== form.value.company && emp.company !== form.value.company) return false;
    // Düzenleme sırasında kendisi hariç
    if (editingEmployee.value && emp._id === editingEmployee.value._id) return false;
    return true;
  });
});

// İzin talebi için computed properties
const selectedLeaveType = computed(() => {
  return leaveTypes.value.find(t => t._id === leaveRequestForm.value.companyLeaveType);
});

const filteredLeaveSubTypes = computed(() => {
  if (!selectedLeaveType.value?.isOtherCategory) {
    return [];
  }
  return leaveSubTypes.value.filter(
    st =>
      st.parentLeaveType && st.parentLeaveType.toString() === selectedLeaveType.value._id.toString()
  );
});

// SGK Meslek Kodu arama fonksiyonları
const searchJobCodes = async () => {
  // Debounce
  if (jobCodeSearchTimeout) {
    clearTimeout(jobCodeSearchTimeout);
  }

  const searchTerm = jobCodeSearch.value.trim();

  if (searchTerm.length < 2) {
    jobCodeSuggestions.value = [];
    return;
  }

  jobCodeSearchTimeout = setTimeout(async () => {
    jobCodeSearching.value = true;
    highlightedJobCodeIndex.value = -1;

    try {
      const response = await api.get('/sgk-meslek-kodlari', {
        params: { search: searchTerm, limit: 20 },
      });

      jobCodeSuggestions.value = response.data?.data || response.data || [];
    } catch (error) {
      console.error('Meslek kodu arama hatası:', error);
      jobCodeSuggestions.value = [];
    } finally {
      jobCodeSearching.value = false;
    }
  }, 300);
};

const selectJobCode = job => {
  selectedJobCode.value = job;
  form.value.position = `${job.kod} - ${job.ad}`;
  jobCodeSearch.value = `${job.kod} - ${job.ad}`;
  showJobCodeDropdown.value = false;
  jobCodeSuggestions.value = [];
};

const clearJobCode = () => {
  selectedJobCode.value = null;
  form.value.position = '';
  jobCodeSearch.value = '';
  jobCodeSuggestions.value = [];
  highlightedJobCodeIndex.value = -1;
};

const navigateJobCodes = direction => {
  if (jobCodeSuggestions.value.length === 0) return;

  highlightedJobCodeIndex.value += direction;

  if (highlightedJobCodeIndex.value < 0) {
    highlightedJobCodeIndex.value = jobCodeSuggestions.value.length - 1;
  } else if (highlightedJobCodeIndex.value >= jobCodeSuggestions.value.length) {
    highlightedJobCodeIndex.value = 0;
  }
};

const selectHighlightedJobCode = () => {
  if (
    highlightedJobCodeIndex.value >= 0 &&
    highlightedJobCodeIndex.value < jobCodeSuggestions.value.length
  ) {
    selectJobCode(jobCodeSuggestions.value[highlightedJobCodeIndex.value]);
  }
};

const loadSgkJobCodesCount = async () => {
  try {
    const response = await api.get('/sgk-meslek-kodlari/stats/count');
    if (response.data.success) {
      sgkJobCodesCount.value = response.data.count;
    }
  } catch (error) {
    // Sessizce devam et - meslek kodları henüz yüklenmemiş olabilir
    sgkJobCodesCount.value = 0;
  }
};

// Dropdown dışına tıklandığında kapat
const handleClickOutside = event => {
  if (jobCodeDropdownRef.value && !jobCodeDropdownRef.value.contains(event.target)) {
    showJobCodeDropdown.value = false;
  }
};

const loadCompanies = async () => {
  if (isSuperAdmin.value || isBayiAdmin.value) {
    try {
      const response = await api.get('/companies');
      companies.value = response.data?.data || response.data || [];

      // Bayi admin için selfCompany'yi bul ve şirket filtresi için otomatik seç
      if (isBayiAdmin.value) {
        const selfComp = companies.value.find(c => c.isDealerSelfCompany);
        if (selfComp) {
          dealerSelfCompany.value = selfComp._id;
        }

        // Bayi'nin kendi şirketi varsa onu seç, yoksa ilk şirketi seç
        if (companies.value.length > 0) {
          if (authStore.companyId) {
            const userCompany = companies.value.find(c => c._id === authStore.companyId);
            if (userCompany) {
              filters.value.company = userCompany._id;
            } else {
              filters.value.company = companies.value[0]._id;
            }
          } else {
            filters.value.company = companies.value[0]._id;
          }
        }
      }
    } catch (error) {
      console.error('Şirketler yüklenemedi:', error);
      companies.value = [];
    }
  }
};

const saveEmployee = async () => {
  try {
    // Validation
    if (!form.value.firstName || form.value.firstName.trim() === '') {
      toast.warning('Ad gereklidir');
      return;
    }
    if (!form.value.lastName || form.value.lastName.trim() === '') {
      toast.warning('Soyad gereklidir');
      return;
    }
    if (!form.value.tcKimlik || form.value.tcKimlik.trim() === '') {
      toast.warning('TC Kimlik Numarası gereklidir');
      return;
    }
    if (!selectedJobCode.value && (!form.value.position || form.value.position.trim() === '')) {
      toast.warning('Görevi (SGK Meslek Kodu) seçiniz. Listeden bir meslek seçin.');
      return;
    }

    // Bayi admin için şirket kontrolü
    if (isBayiAdmin.value && !form.value.company) {
      toast.warning('Lütfen işlem yapmak istediğiniz şirketi seçiniz.');
      return;
    }

    // Workplace zorunlu kontrolü
    let finalWorkplace = form.value.workplace;
    if (!finalWorkplace) {
      // Eğer tek workplace varsa otomatik seçilmiş olmalı, kontrol et
      if (workplaces.value.length === 1) {
        finalWorkplace = workplaces.value[0]._id;
      } else if (workplaces.value.length > 1) {
        if (isBayiAdmin.value) {
          toast.warning(
            'Bu şirket birden fazla SGK işyerine sahiptir. Lütfen SGK işyerini seçiniz.'
          );
        } else {
          toast.warning('SGK İşyeri seçilmelidir');
        }
        return;
      } else {
        toast.warning('SGK İşyeri seçilmelidir');
        return;
      }
    }

    // WorkplaceSection kontrolü - birden fazla bölüm varsa zorunlu
    if (
      form.value.workplace &&
      workplaceSections.value.length > 1 &&
      !form.value.workplaceSection
    ) {
      if (isBayiAdmin.value) {
        toast.warning('Bu SGK işyerinde birden fazla bölüm bulunmaktadır. Lütfen bölüm seçiniz.');
      } else {
        toast.warning('İşyeri bölümü seçilmelidir');
      }
      return;
    }

    if ((isSuperAdmin.value || isBayiAdmin.value) && !form.value.company) {
      toast.warning('Şirket seçilmelidir');
      return;
    }
    if (!form.value.hireDate) {
      const confirmed = await confirmModal.show({
        title: 'Eksik Bilgi',
        message:
          'İşe başlama tarihi girilmedi. Bu bilgi olmadan yıllık izin gün sayıları hesaplanamaz. Devam etmek istiyor musunuz?',
        type: 'warning',
        confirmText: 'Devam Et',
      });
      if (!confirmed) return;
    }
    if (!form.value.birthDate) {
      const confirmed = await confirmModal.show({
        title: 'Eksik Bilgi',
        message:
          'Doğum tarihi girilmedi. Bu bilgi olmadan yıllık izin gün sayıları hesaplanamaz. Devam etmek istiyor musunuz?',
        type: 'warning',
        confirmText: 'Devam Et',
      });
      if (!confirmed) return;
    }

    const positionValue = form.value.position ? form.value.position.trim() : '';
    const payload = {
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      email: form.value.email.trim() || undefined,
      phone: form.value.phone || '', // PhoneInput already normalizes to 05XXXXXXXXX
      tcKimlik: form.value.tcKimlik?.replace(/\D/g, ''), // Sadece rakam
      position: positionValue,
      workplace: finalWorkplace, // Zorunlu
      workplaceSection: form.value.workplaceSection || undefined, // Opsiyonel
      department: form.value.department || undefined, // Opsiyonel
      manager: form.value.manager || undefined, // Opsiyonel
      hireDate: form.value.hireDate || undefined,
      birthDate: form.value.birthDate || undefined,
      personelNumarasi: form.value.personelNumarasi?.trim() || undefined, // Personel numarası (opsiyonel)
    };

    if (isSuperAdmin.value || isBayiAdmin.value) {
      payload.company = form.value.company;
    }

    if (editingEmployee.value) {
      await api.put(`/employees/${editingEmployee.value._id}`, payload);
      toast.success('Çalışan başarıyla güncellendi');
    } else {
      await api.post('/employees', payload);
      toast.success('Çalışan başarıyla eklendi');
    }
    closeModal();
    loadEmployees();
  } catch (error) {
    console.error('Çalışan kaydetme hatası:', error);

    // Detaylı hata mesajı göster
    let errorMessage = 'Çalışan kaydedilirken hata oluştu';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Hata detayını konsola yaz
    if (error.response?.data) {
      console.error('API Hatası:', error.response.data);
    }

    toast.error(errorMessage, 8000); // 8 saniye göster
  }
};

const editEmployee = employee => {
  // Personel ayarları sayfasına yönlendir
  router.push(`/employee-settings/${employee._id}`);
};

const showLeaveRequestModal = async employee => {
  selectedEmployeeForLeave.value = employee;
  showLeaveRequestModalFlag.value = true;
  await loadLeaveTypes();
  // Şirket seçilmişse alt izin türlerini yükle
  if (employee.company?._id || employee.company) {
    await loadLeaveSubTypes(employee.company?._id || employee.company);
  }
};

const closeLeaveRequestModal = () => {
  showLeaveRequestModalFlag.value = false;
  selectedEmployeeForLeave.value = null;
  leaveRequestForm.value = {
    companyLeaveType: '',
    leaveSubType: '',
    startDate: '',
    endDate: '',
    description: '',
  };
};

const loadLeaveTypes = async () => {
  try {
    const response = await api.get('/leave-types');
    if (response.data.success) {
      leaveTypes.value = response.data.data || [];
    }
  } catch (error) {
    console.error('İzin türleri yüklenemedi:', error);
  }
};

const loadLeaveSubTypes = async companyId => {
  try {
    const params = {};
    if (selectedLeaveType.value?.isOtherCategory && selectedLeaveType.value._id) {
      params.parentLeaveType = selectedLeaveType.value._id;
    }
    if (companyId) {
      params.companyId = companyId;
    } else if (authStore.user?.company) {
      // company object veya string olabilir
      params.companyId =
        typeof authStore.user.company === 'object'
          ? authStore.user.company._id
          : authStore.user.company;
    }
    const response = await api.get('/leave-types/sub-types', { params });
    if (response.data.success) {
      leaveSubTypes.value = response.data.data || [];
    }
  } catch (error) {
    console.error('Alt izin türleri yüklenemedi:', error);
  }
};

const handleLeaveTypeChange = async () => {
  if (!selectedLeaveType.value?.isOtherCategory) {
    leaveRequestForm.value.leaveSubType = '';
    leaveSubTypes.value = [];
  } else {
    const companyId =
      selectedEmployeeForLeave.value?.company?._id || selectedEmployeeForLeave.value?.company;
    await loadLeaveSubTypes(companyId);
  }
};

const saveLeaveRequest = async () => {
  if (!selectedEmployeeForLeave.value) {
    toast.warning('Çalışan seçilmedi');
    return;
  }

  // Diğer kategorisi seçildiyse alt izin türü zorunlu
  if (selectedLeaveType.value?.isOtherCategory && !leaveRequestForm.value.leaveSubType) {
    toast.warning('Alt izin türü seçilmelidir');
    return;
  }

  savingLeaveRequest.value = true;
  try {
    const formData = new FormData();
    formData.append('employee', selectedEmployeeForLeave.value._id);
    formData.append('companyLeaveType', leaveRequestForm.value.companyLeaveType);
    if (leaveRequestForm.value.leaveSubType) {
      formData.append('leaveSubType', leaveRequestForm.value.leaveSubType);
    }
    formData.append('startDate', leaveRequestForm.value.startDate);
    formData.append('endDate', leaveRequestForm.value.endDate);
    if (leaveRequestForm.value.description) {
      formData.append('description', leaveRequestForm.value.description);
    }

    await api.post('/leave-requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    toast.success('İzin talebi başarıyla oluşturuldu');
    closeLeaveRequestModal();
  } catch (error) {
    console.error('İzin talebi oluşturma hatası:', error);
    toast.error(error.response?.data?.message || 'İzin talebi oluşturulamadı');
  } finally {
    savingLeaveRequest.value = false;
  }
};

const deleteEmployee = async id => {
  const confirmed = await confirmModal.show({
    title: 'Çalışan Silme',
    message: 'Bu çalışanı silmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Sil',
  });
  if (!confirmed) return;

  try {
    await api.delete(`/employees/${id}`);
    loadEmployees();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  }
};

// Tekrar işe alma
const rehireEmployee = async employee => {
  const confirmed = await confirmModal.show({
    title: 'Tekrar İşe Al',
    message: `${employee.firstName} ${employee.lastName} çalışanını tekrar işe almak istiyor musunuz? İşe giriş formuna yönlendirileceksiniz.`,
    type: 'info',
    confirmText: 'İşe Al',
  });
  if (!confirmed) return;

  // İşe giriş formuna yönlendir, çalışan bilgileri query ile gönderilir
  router.push({
    path: '/employment/hire',
    query: {
      rehire: employee._id,
      fullName: `${employee.firstName} ${employee.lastName}`,
      tcKimlik: employee.tcKimlik,
    },
  });
};

// Seçili çalışanları toplu silme
const deleteSelectedEmployees = async () => {
  if (selectedEmployees.value.length === 0) {
    toast.warning('Lütfen silinecek çalışanları seçin');
    return;
  }

  const confirmed = await confirmModal.show({
    title: 'Toplu Çalışan Silme',
    message: `${selectedEmployees.value.length} çalışanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
    type: 'danger',
    confirmText: 'Sil',
  });
  if (!confirmed) return;

  try {
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedEmployees.value) {
      try {
        await api.delete(`/employees/${id}`);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Çalışan silinemedi (${id}):`, error);
      }
    }

    if (errorCount > 0) {
      toast.warning(`${successCount} çalışan silindi, ${errorCount} çalışan silinemedi.`);
    } else {
      toast.success(`${successCount} çalışan başarıyla silindi.`);
    }

    selectedEmployees.value = [];
    loadEmployees();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Toplu silme işlemi sırasında hata oluştu');
  }
};

// Seçili çalışanlara aktivasyon gönderme
const sendActivationToSelected = async () => {
  const notActivatedSelected = selectedEmployees.value.filter(id => {
    const emp = employees.value.find(e => e._id === id);
    return emp && !emp.isActivated;
  });

  if (notActivatedSelected.length === 0) {
    toast.info('Seçili çalışanların tamamı zaten aktive edilmiş.');
    return;
  }

  const confirmed = await confirmModal.show({
    title: 'Aktivasyon Linki Gönder',
    message: `${notActivatedSelected.length} çalışana aktivasyon linki gönderilecek. Devam etmek istiyor musunuz?`,
    type: 'info',
    confirmText: 'Gönder',
  });
  if (!confirmed) return;

  sendingBulkActivation.value = true;
  try {
    await api.post('/employees/bulk-send-activation-links', { employeeIds: notActivatedSelected });
    toast.success(`${notActivatedSelected.length} çalışana aktivasyon linki gönderildi.`);
    selectedEmployees.value = [];
    loadEmployees();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Aktivasyon linkleri gönderilemedi');
  } finally {
    sendingBulkActivation.value = false;
  }
};

const handleFileChange = event => {
  importFile.value = event.target.files[0];
};

const downloadTemplate = async () => {
  try {
    const response = await api.get('/employees/template', {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'personel_sablon.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Şablon indirme hatası:', error);
    toast.error('Şablon indirilemedi: ' + (error.response?.data?.message || error.message));
  }
};

const importEmployees = async () => {
  if (!importFile.value) {
    toast.warning('Lütfen bir dosya seçin');
    return;
  }

  if ((isSuperAdmin.value || isBayiAdmin.value) && !importCompany.value) {
    toast.warning('Lütfen bir şirket seçin');
    return;
  }

  importing.value = true;
  importErrors.value = [];
  importResult.value = null;
  previewData.value = null;
  importStep.value = 'upload';

  try {
    const formData = new FormData();
    formData.append('file', importFile.value);
    if (importCompany.value) {
      formData.append('company', importCompany.value);
    }

    const response = await api.post('/employees/bulk-import-preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = response.data.data;

    if (data.needsConfirmation) {
      // 3+ kelimeli isimler var - onay adımına geç
      previewData.value = data;
      importStep.value = 'confirm';
      // Varsayılan olarak hepsini Seçenek A olarak ayarla
      const resolutions = {};
      data.ambiguousNames.forEach(item => {
        resolutions[item.row] = 'A';
      });
      nameResolutions.value = resolutions;
    } else {
      // Tüm isimler otomatik çözüldü - direkt sonuç göster
      const added = data.added || 0;
      const errors = data.errors || [];

      importResult.value = { added, errorCount: errors.length };
      importErrors.value = errors;

      if (errors.length > 0) {
        toast.warning(`${added} çalışan eklendi, ${errors.length} hata oluştu`);
      } else {
        toast.success(`${added} çalışan başarıyla eklendi`);
        closeImportModal();
      }

      loadEmployees();
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  } finally {
    importing.value = false;
  }
};

const confirmImport = async () => {
  if (!previewData.value?.previewId) return;

  importing.value = true;
  importErrors.value = [];
  importResult.value = null;

  try {
    const response = await api.post('/employees/bulk-import-confirm', {
      previewId: previewData.value.previewId,
      company: previewData.value.companyId || importCompany.value,
      nameResolutions: nameResolutions.value
    });

    const added = response.data.data.added || 0;
    const errors = response.data.data.errors || [];

    importResult.value = { added, errorCount: errors.length };
    importErrors.value = errors;
    importStep.value = 'result';

    if (errors.length > 0) {
      toast.warning(`${added} çalışan eklendi, ${errors.length} hata oluştu`);
    } else {
      toast.success(`${added} çalışan başarıyla eklendi`);
      closeImportModal();
    }

    loadEmployees();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
    importStep.value = 'upload';
  } finally {
    importing.value = false;
  }
};

const openImportModal = () => {
  importFile.value = null;
  importCompany.value = '';
  importErrors.value = [];
  importResult.value = null;
  importStep.value = 'upload';
  previewData.value = null;
  nameResolutions.value = {};
  showImportModal.value = true;
};

const closeImportModal = () => {
  showImportModal.value = false;
  importFile.value = null;
  importCompany.value = '';
  importErrors.value = [];
  importResult.value = null;
  importStep.value = 'upload';
  previewData.value = null;
  nameResolutions.value = {};
};

const sendActivationLink = async employeeId => {
  sendingActivation.value = employeeId;
  try {
    await api.post(`/employees/${employeeId}/send-activation-link`);
    toast.success('Aktivasyon linki gönderildi');
    loadEmployees();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Link gönderilemedi');
  } finally {
    sendingActivation.value = null;
  }
};

const sendBulkActivationLinks = async () => {
  if (inactiveEmployees.value.length === 0) {
    toast.info('Aktivasyon linki gönderilecek çalışan bulunamadı');
    return;
  }

  const confirmed = await confirmModal.show({
    title: 'Toplu Aktivasyon Linki Gönder',
    message: `${inactiveEmployees.value.length} çalışan için aktivasyon linki gönderilecek. Devam etmek istiyor musunuz?`,
    type: 'info',
    confirmText: 'Gönder',
  });
  if (!confirmed) return;

  sendingBulkActivation.value = true;
  try {
    const employeeIds = inactiveEmployees.value.map(emp => emp._id);
    await api.post('/employees/bulk-send-activation-links', { employeeIds });
    toast.success('Aktivasyon linkleri gönderildi');
    loadEmployees();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Linkler gönderilemedi');
  } finally {
    sendingBulkActivation.value = false;
  }
};

// Manuel aktivasyon - tek çalışan
const manualActivate = async employeeId => {
  const confirmed = await confirmModal.show({
    title: 'Manuel Aktivasyon',
    message:
      'Bu çalışanı manuel olarak aktif etmek istediğinize emin misiniz?\n\nVarsayılan şifre: 123456\n(İlk girişte şifre değiştirmesi gerekecektir)',
    type: 'info',
    confirmText: 'Aktif Et',
  });
  if (!confirmed) return;

  manualActivatingId.value = employeeId;
  try {
    const response = await api.post(`/employees/${employeeId}/manual-activate`);
    const data = response.data.data;
    toast.success(`${data.fullName} başarıyla aktif edildi! Şifre: 123456`);
    loadEmployees();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Aktivasyon yapılamadı');
  } finally {
    manualActivatingId.value = null;
  }
};

// Manuel aktivasyon - toplu
const manualActivateSelected = async () => {
  const notActivatedSelected = selectedEmployees.value.filter(id => {
    const emp = employees.value.find(e => e._id === id);
    return emp && !emp.isActivated;
  });

  if (notActivatedSelected.length === 0) {
    toast.info('Seçili çalışanların tamamı zaten aktive edilmiş.');
    return;
  }

  const confirmed = await confirmModal.show({
    title: 'Toplu Manuel Aktivasyon',
    message: `${notActivatedSelected.length} çalışan manuel olarak aktif edilecek.\n\nVarsayılan şifre: 123456\n(İlk girişte şifre değiştirmeleri gerekecektir)\n\nDevam etmek istiyor musunuz?`,
    type: 'info',
    confirmText: 'Aktif Et',
  });
  if (!confirmed) return;

  manualActivating.value = true;
  try {
    const response = await api.post('/employees/bulk-manual-activate', {
      employeeIds: notActivatedSelected,
    });
    const data = response.data.data;
    if (data.errorCount > 0) {
      toast.warning(`${data.successCount} çalışan aktif edildi, ${data.errorCount} hata oluştu`);
    } else {
      toast.success(`${data.successCount} çalışan başarıyla aktif edildi! Şifre: 123456`);
    }
    selectedEmployees.value = [];
    loadEmployees();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Toplu aktivasyon yapılamadı');
  } finally {
    manualActivating.value = false;
  }
};

// SMS ile aktivasyon gönder (tek çalışan)
const sendSmsActivation = async (employeeId) => {
  sendingSmsActivation.value = employeeId;
  try {
    const response = await api.post(`/employees/${employeeId}/send-sms-activation`);
    if (response.data.success) {
      const data = response.data.data;
      smsOtpData.value = {
        verificationId: data.verificationId,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        maskedPhone: data.maskedPhone,
        expiresAt: data.expiresAt,
      };
      smsOtpCode.value = '';
      smsOtpModal.value = true;
      toast.success(response.data.message);
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'SMS gönderilemedi');
  } finally {
    sendingSmsActivation.value = null;
  }
};

// SMS OTP doğrula
const verifySmsOtp = async () => {
  if (!smsOtpCode.value || smsOtpCode.value.length !== 6) {
    toast.warning('Lütfen 6 haneli doğrulama kodunu girin');
    return;
  }

  verifyingSmsOtp.value = true;
  try {
    const response = await api.post('/employees/verify-sms-activation', {
      verificationId: smsOtpData.value.verificationId,
      code: smsOtpCode.value,
      employeeId: smsOtpData.value.employeeId,
    });
    if (response.data.success) {
      const data = response.data.data;
      const msg = data.userCreated
        ? `${data.fullName} aktif edildi! Varsayılan şifre: 123456`
        : response.data.message;
      toast.success(msg);
      smsOtpModal.value = false;
      smsOtpData.value = null;
      smsOtpCode.value = '';
      loadEmployees();
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Doğrulama başarısız');
  } finally {
    verifyingSmsOtp.value = false;
  }
};

// SMS OTP tekrar gönder
const resendSmsOtp = async () => {
  if (!smsOtpData.value) return;
  try {
    const response = await api.post(`/employees/${smsOtpData.value.employeeId}/send-sms-activation`);
    if (response.data.success) {
      const data = response.data.data;
      smsOtpData.value.verificationId = data.verificationId;
      smsOtpData.value.expiresAt = data.expiresAt;
      smsOtpCode.value = '';
      toast.success('Yeni kod gönderildi');
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Kod tekrar gönderilemedi');
  }
};

// Toplu SMS aktivasyon
const sendSmsActivationToSelected = async () => {
  const notActivatedSelected = selectedEmployees.value.filter(id => {
    const emp = employees.value.find(e => e._id === id);
    return emp && !emp.isActivated;
  });

  if (notActivatedSelected.length === 0) {
    toast.info('Seçili çalışanların tamamı zaten aktive edilmiş.');
    return;
  }

  const confirmed = await confirmModal.show({
    title: 'Toplu SMS Aktivasyon',
    message: `${notActivatedSelected.length} çalışana SMS ile aktivasyon kodu gönderilecek.\nTelefon numarası olmayan çalışanlara SMS gönderilemez.\n\nDevam etmek istiyor musunuz?`,
    type: 'info',
    confirmText: 'Gönder',
  });
  if (!confirmed) return;

  sendingBulkSmsActivation.value = true;
  try {
    const response = await api.post('/employees/bulk-send-sms-activation', {
      employeeIds: notActivatedSelected,
    });
    const data = response.data.data;
    if (data.noPhoneCount > 0) {
      toast.warning(`${data.successCount} SMS gönderildi, ${data.noPhoneCount} çalışanın telefonu yok`);
    } else if (data.errorCount > 0) {
      toast.warning(`${data.successCount} SMS gönderildi, ${data.errorCount} hata`);
    } else {
      toast.success(`${data.successCount} çalışana SMS gönderildi`);
    }
    selectedEmployees.value = [];
  } catch (error) {
    toast.error(error.response?.data?.message || 'Toplu SMS gönderilemedi');
  } finally {
    sendingBulkSmsActivation.value = false;
  }
};

const handleAdminPhotoChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !editingEmployee.value) return;

  const reader = new FileReader();
  reader.onload = (ev) => { editPhotoPreview.value = ev.target.result; };
  reader.readAsDataURL(file);

  adminPhotoUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await api.put(`/employees/${editingEmployee.value._id}/profile-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    editingEmployee.value.profilePhoto = res.data?.data?.profilePhoto;
    editPhotoPreview.value = null;
  } catch (err) {
    alert(err.response?.data?.message || 'Fotoğraf yüklenemedi');
    editPhotoPreview.value = null;
  }
  adminPhotoUploading.value = false;
  e.target.value = '';
};

const deleteAdminPhoto = async () => {
  if (!editingEmployee.value || !confirm('Fotoğrafı silmek istediğinize emin misiniz?')) return;
  try {
    await api.delete(`/employees/${editingEmployee.value._id}/profile-photo`);
    editingEmployee.value.profilePhoto = null;
    editPhotoPreview.value = null;
  } catch (err) {
    alert(err.response?.data?.message || 'Fotoğraf silinemedi');
  }
};

const visibleColumnCount = computed(() => {
  // checkbox + # + ad soyad + işlem = 4 sabit sütun + görünür sütunlar
  return 4 + Object.values(columnVisibility.value).filter(Boolean).length;
});

const exportToExcel = () => {
  const companyName = authStore.user?.company?.name || authStore.user?.company || 'Şirket';
  const employees = isBayiAdmin.value
    ? groupedEmployees.value.flatMap(g => g.employees)
    : sortedEmployees.value;

  if (!employees.length) {
    toast.warning('Aktarılacak çalışan bulunamadı');
    return;
  }

  // Görünür sütun tanımları
  const allCols = [
    { key: 'index', label: '#', always: true },
    { key: 'name', label: 'Ad Soyad', always: true },
    { key: 'tcKimlik', label: 'TCKN' },
    { key: 'position', label: 'Görev' },
    { key: 'department', label: 'Departman' },
    { key: 'phone', label: 'Telefon' },
    { key: 'email', label: 'Email' },
    { key: 'hireDate', label: 'İşe Giriş' },
    { key: 'salary', label: 'Ücret' },
    { key: 'contractType', label: 'Sözleşme' },
    { key: 'retirement', label: 'Emeklilik' },
    { key: 'status', label: 'Durum' },
  ];
  const cols = allCols.filter(c => c.always || columnVisibility.value[c.key]);

  // Veri satırları
  const rows = employees.map((emp, idx) => {
    const row = {};
    cols.forEach(c => {
      switch (c.key) {
        case 'index': row[c.label] = idx + 1; break;
        case 'name': row[c.label] = `${emp.firstName} ${emp.lastName}`; break;
        case 'tcKimlik': row[c.label] = emp.tcKimlik || ''; break;
        case 'position': row[c.label] = emp.position || ''; break;
        case 'department': row[c.label] = emp.department?.name || ''; break;
        case 'phone': row[c.label] = emp.phone || ''; break;
        case 'email': row[c.label] = emp.email || ''; break;
        case 'hireDate': row[c.label] = emp.hireDate ? formatDate(emp.hireDate) : ''; break;
        case 'salary': row[c.label] = emp.salary ? new Intl.NumberFormat('tr-TR').format(emp.salary) + ' ₺' : ''; break;
        case 'contractType': row[c.label] = contractTypeLabel(emp.contractType) + (emp.contractType === 'BELİRLİ_SÜRELİ' && emp.contractEndDate ? ' (' + formatDate(emp.contractEndDate) + ')' : ''); break;
        case 'retirement': row[c.label] = emp.isRetired ? 'Emekli' : 'Normal'; break;
        case 'status': row[c.label] = emp.status === 'separated' ? 'Ayrılmış' : emp.isActivated ? 'Aktif' : 'Bekliyor'; break;
      }
    });
    return row;
  });

  const wb = XLSX.utils.book_new();
  const colCount = cols.length;

  // Başlık satırı (firma adı)
  const headerRow = Array(colCount).fill('');
  headerRow[0] = companyName;
  // Boş satır
  const emptyRow = Array(colCount).fill('');
  // Alt satır (powered by)
  const footerRow = Array(colCount).fill('');
  footerRow[0] = 'Powered by personelplus.com';

  // Tablo başlıkları
  const tableHeaders = cols.map(c => c.label);

  // Veri dizileri
  const dataArrays = rows.map(r => cols.map(c => r[c.label]));

  // Tüm satırları birleştir
  const allRows = [headerRow, emptyRow, tableHeaders, ...dataArrays, emptyRow, footerRow];

  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Sütun genişlikleri
  ws['!cols'] = cols.map(c => ({
    wch: c.key === 'name' ? 25 : c.key === 'email' ? 28 : c.key === 'tcKimlik' ? 14 : c.key === 'position' ? 22 : c.key === 'phone' ? 15 : 14
  }));

  // Firma adı hücresini merge et
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: allRows.length - 1, c: 0 }, e: { r: allRows.length - 1, c: colCount - 1 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Çalışanlar');

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  XLSX.writeFile(wb, `Calisanlar_${dateStr}.xlsx`);
  toast.success('Excel dosyası indirildi');
};

// Inline ücret düzenleme
const startSalaryEdit = (employee, event) => {
  event.stopPropagation();
  editingSalaryId.value = employee._id;
  editingSalaryValue.value = employee.salary ? String(employee.salary) : '';
  nextTick(() => {
    const input = document.querySelector('.salary-inline-input');
    if (input) input.focus();
  });
};

const saveSalaryEdit = async (employee) => {
  const newSalary = editingSalaryValue.value ? Number(editingSalaryValue.value.replace(/\D/g, '')) : null;
  if (newSalary === employee.salary) {
    editingSalaryId.value = null;
    return;
  }
  try {
    await api.put(`/employees/${employee._id}`, { salary: newSalary });
    employee.salary = newSalary;
    toast.success('Ücret güncellendi');
  } catch (err) {
    toast.error(err.response?.data?.message || 'Ücret güncellenemedi');
  }
  editingSalaryId.value = null;
};

const cancelSalaryEdit = () => {
  editingSalaryId.value = null;
};

// Toplu ücret güncelleme
const openBulkSalaryModal = () => {
  bulkSalaryValue.value = '';
  bulkSalaryIsNet.value = true;
  showBulkSalaryModal.value = true;
};

const saveBulkSalary = async () => {
  const salary = bulkSalaryValue.value ? Number(String(bulkSalaryValue.value).replace(/\D/g, '')) : null;
  if (!salary || salary <= 0) {
    toast.error('Geçerli bir ücret giriniz');
    return;
  }
  savingBulkSalary.value = true;
  let successCount = 0;
  let failCount = 0;
  for (const empId of selectedEmployees.value) {
    try {
      await api.put(`/employees/${empId}`, { salary, isNetSalary: bulkSalaryIsNet.value });
      // Listedeki veriyi güncelle
      const allEmps = isBayiAdmin.value
        ? groupedEmployees.value.flatMap(g => g.employees)
        : sortedEmployees.value;
      const emp = allEmps.find(e => e._id === empId);
      if (emp) {
        emp.salary = salary;
        emp.isNetSalary = bulkSalaryIsNet.value;
      }
      successCount++;
    } catch {
      failCount++;
    }
  }
  savingBulkSalary.value = false;
  showBulkSalaryModal.value = false;
  if (failCount > 0) {
    toast.warning(`${successCount} çalışan güncellendi, ${failCount} başarısız`);
  } else {
    toast.success(`${successCount} çalışanın ücreti güncellendi`);
  }
};

// Hızlı önizleme (tek tıklama gecikmeli, çift tıklama iptal eder)
let clickTimer = null;

const showPreview = (employee, event) => {
  if (event.target.closest('input, button')) return;
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
  const row = event.currentTarget;
  const rect = row.getBoundingClientRect();
  clickTimer = setTimeout(() => {
    previewEmployee.value = employee;
    previewPosition.value = { top: rect.top + rect.height / 2 };
    clickTimer = null;
  }, 250);
};

const handleRowDblClick = (employee, event) => {
  if (event.target.closest('input, button')) return;
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
  editEmployee(employee);
};

const closePreview = () => {
  previewEmployee.value = null;
};

const modalTopPosition = computed(() => {
  const modalHeight = 140;
  const viewportHeight = window.innerHeight;
  let top = previewPosition.value.top - modalHeight / 2;
  top = Math.max(16, Math.min(top, viewportHeight - modalHeight - 16));
  return top + 'px';
});

const closeModal = () => {
  showModal.value = false;
  editingEmployee.value = null;
  editPhotoPreview.value = null;
  form.value = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    tcKimlik: '',
    position: '',
    workplace: '',
    workplaceSection: '',
    department: '',
    company: '',
    manager: '',
    hireDate: '',
    birthDate: '',
    personelNumarasi: '',
  };
  // Job code autocomplete reset
  selectedJobCode.value = null;
  jobCodeSearch.value = '';
  jobCodeSuggestions.value = [];
  highlightedJobCodeIndex.value = -1;
  showJobCodeDropdown.value = false;

  workplaces.value = [];
  workplaceSections.value = [];
  departments.value = [];
};

// Tüm departmanları yükle (filtreleme için)
const loadAllDepartments = async () => {
  try {
    const response = await api.get('/departments');
    allDepartments.value = response.data?.data || response.data || [];
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error);
    allDepartments.value = [];
  }
};

// Yıl, ay ve durum filtresi değiştiğinde verileri yeniden yükle
watch(
  () => [filters.value.status, filters.value.year, filters.value.month],
  () => {
    loadEmployees();
  }
);

onMounted(async () => {
  // Click outside listener for job code dropdown
  document.addEventListener('click', handleClickOutside);

  // SGK meslek kodları sayısını yükle
  await loadSgkJobCodesCount();

  // Aktivasyon modunu yükle
  loadActivationMode();

  await loadEmployees();
  await loadAllDepartments(); // Filtreleme için tüm departmanları yükle
  if (isSuperAdmin.value || isBayiAdmin.value) {
    await loadCompanies();
  } else {
    await loadDepartments();
    // Eğer company_admin veya resmi_muhasebe_ik ise, şirket için workplace'leri yükle
    if (authStore.companyId) {
      form.value.company = authStore.companyId;
      await loadWorkplacesForCompany();
    }
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  if (jobCodeSearchTimeout) {
    clearTimeout(jobCodeSearchTimeout);
  }
});
</script>
