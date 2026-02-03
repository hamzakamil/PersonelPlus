<template>
  <div>
    <!-- Bayi Admin için Şirket Seçimi -->
    <div v-if="isBayiAdmin" class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        İşlem Yapmak İstediğiniz Şirketi Seçiniz <span class="text-red-500">*</span>
      </label>
      <select
        v-model="selectedCompanyId"
        @change="loadPuantaj"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      >
        <option value="">Şirket Seçiniz</option>
        <option v-for="comp in companies" :key="comp._id" :value="comp._id">
          {{ comp.name }}
        </option>
      </select>
      <p v-if="!selectedCompanyId" class="mt-2 text-sm text-yellow-600">
        Lütfen işlem yapmak istediğiniz şirketi seçiniz.
      </p>
    </div>

    <div class="flex justify-end items-center mb-6">
      <div class="flex items-center gap-4">
        <!-- Ay/Yıl Seçimi -->
        <div class="flex items-center gap-2">
          <button @click="prevMonth" class="p-2 hover:bg-gray-100 rounded">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <select v-model="selectedMonth" class="px-3 py-2 border rounded-lg">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <select v-model="selectedYear" class="px-3 py-2 border rounded-lg">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <button @click="nextMonth" class="p-2 hover:bg-gray-100 rounded">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button @click="loadPuantaj" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Yükle
        </button>
        <button
          @click="downloadExcel"
          :disabled="excelLoading"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg v-if="excelLoading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel İndir
        </button>
        <button
          @click="regenerateAll"
          :disabled="regenerateLoading"
          class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title="Tüm çalışanların puantajını izin ve tatil bilgilerine göre yeniden hesapla"
        >
          <svg v-if="regenerateLoading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Yeniden Hesapla
        </button>
      </div>
    </div>

    <!-- Görünüm Ayarları Paneli -->
    <div class="bg-white rounded-lg shadow mb-4">
      <!-- Panel Header -->
      <button
        @click="isSettingsPanelOpen = !isSettingsPanelOpen"
        class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span class="font-medium text-gray-700">Görünüm Ayarları</span>
          <span class="text-xs text-gray-400">(Sütunları özelleştir)</span>
        </div>
        <svg
          class="w-5 h-5 text-gray-400 transition-transform"
          :class="{ 'rotate-180': isSettingsPanelOpen }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Panel Content -->
      <div v-show="isSettingsPanelOpen" class="border-t p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Çalışan Bilgileri -->
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Çalışan Bilgileri</h4>
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="displaySettings.showRetiredStatus" class="w-4 h-4 text-blue-600 rounded" />
                <span class="text-sm text-gray-700">Emekli Durumu</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="displaySettings.showDepartment" class="w-4 h-4 text-blue-600 rounded" />
                <span class="text-sm text-gray-700">Departman</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="displaySettings.showHireDate" class="w-4 h-4 text-blue-600 rounded" />
                <span class="text-sm text-gray-700">İşe Giriş Tarihi</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="displaySettings.showTcKimlik" class="w-4 h-4 text-blue-600 rounded" />
                <span class="text-sm text-gray-700">TC Kimlik</span>
              </label>
            </div>
          </div>

          <!-- Mesai & Kesintiler -->
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Mesai & Kesintiler</h4>
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="displaySettings.showDayOvertime" class="w-4 h-4 text-orange-600 rounded" />
                <span class="text-sm text-gray-700">Fazla Mesai (Gündüz)</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="displaySettings.showNightOvertime" class="w-4 h-4 text-gray-600 rounded" />
                <span class="text-sm text-gray-700">Gece Mesaisi</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="displaySettings.showAdvanceDeduction" class="w-4 h-4 text-red-600 rounded" />
                <span class="text-sm text-gray-700">Avans Kesintisi</span>
              </label>
            </div>
          </div>

          <!-- Ek Ödemeler -->
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Ek Ödemeler & Özet</h4>
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="displaySettings.showTotalDays" class="w-4 h-4 text-blue-600 rounded" />
                <span class="text-sm text-gray-700">Toplam Gün Özeti</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="displaySettings.showExtraPayments" class="w-4 h-4 text-green-600 rounded" />
                <span class="text-sm text-gray-700">Ek Ödemeler Sütunu</span>
              </label>
              <!-- Dinamik ödeme türleri -->
              <div v-if="companyPaymentTypes.length > 0" class="mt-3 pt-3 border-t">
                <p class="text-xs text-gray-500 mb-2">Ayrı sütunda göster:</p>
                <div class="space-y-1 max-h-32 overflow-y-auto">
                  <label
                    v-for="cpt in companyPaymentTypes"
                    :key="cpt._id"
                    class="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      :value="cpt._id"
                      v-model="displaySettings.selectedPaymentTypes"
                      class="w-4 h-4 text-green-600 rounded"
                    />
                    <span class="text-xs text-gray-600">{{ cpt.paymentType?.name || cpt.customName }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-lg shadow p-8 text-center">
      <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p class="text-gray-600">Puantaj yükleniyor...</p>
    </div>

    <!-- Puantaj Tablosu -->
    <div v-else-if="puantajList.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                Çalışan
              </th>
              <!-- Emekli Durumu -->
              <th v-if="displaySettings.showRetiredStatus" class="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-orange-50" title="Emekli Durumu">
                <span class="text-orange-600">Emk</span>
              </th>
              <!-- Departman -->
              <th v-if="displaySettings.showDepartment" class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-purple-50" title="Departman">
                Dept.
              </th>
              <!-- İşe Giriş Tarihi -->
              <th v-if="displaySettings.showHireDate" class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50" title="İşe Giriş Tarihi">
                Giriş
              </th>
              <!-- TC Kimlik -->
              <th v-if="displaySettings.showTcKimlik" class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-gray-100" title="TC Kimlik No">
                TC Kimlik
              </th>
              <th
                v-for="day in daysInMonth"
                :key="day"
                class="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                :class="{ 'bg-blue-50': isWeekend(day) }"
              >
                <div>{{ day }}</div>
                <div class="text-[10px] text-gray-400">{{ getDayName(day) }}</div>
              </th>
              <th v-if="displaySettings.showTotalDays" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-gray-100">Toplam</th>
              <th v-if="displaySettings.showDayOvertime" class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-orange-50" title="Fazla Mesai (Gündüz) - Saat">
                <div class="flex items-center justify-center gap-1">
                  <svg class="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke-width="2"/>
                    <path stroke-linecap="round" stroke-width="2" d="M12 6v6l4 2"/>
                  </svg>
                  <span>Fazla</span>
                </div>
                <div class="text-[10px]">Mesai (s)</div>
              </th>
              <th v-if="displaySettings.showNightOvertime" class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-gray-700 text-white" title="Gece Mesaisi - Saat">
                <div class="flex items-center justify-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
                  <span>Gece</span>
                </div>
                <div class="text-[10px]">Mesai (s)</div>
              </th>
              <th v-if="displaySettings.showAdvanceDeduction" class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-red-600 text-white" title="Avans Kesintisi (TL)">
                <div class="flex items-center justify-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Avans</span>
                </div>
                <div class="text-[10px]">Kesintisi</div>
              </th>
              <!-- Dinamik Ödeme Türü Sütunları -->
              <th
                v-for="cpt in selectedPaymentColumns"
                :key="cpt._id"
                class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-teal-50"
                :title="cpt.paymentType?.name || cpt.customName"
              >
                <div class="truncate max-w-[60px]">{{ getPaymentTypeShortName(cpt) }}</div>
              </th>
              <!-- Ek Ödemeler -->
              <th v-if="displaySettings.showExtraPayments" class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-green-600 text-white" title="Ek Ödemeler">
                <div>Ek</div>
                <div class="text-[10px]">Ödemeler</div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="item in puantajList" :key="item.employee._id" class="hover:bg-gray-50">
              <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                <div>{{ item.employee.firstName }} {{ item.employee.lastName }}</div>
                <div class="text-xs text-gray-500">{{ item.employee.personelNumarasi || item.employee.employeeNumber }}</div>
              </td>
              <!-- Emekli Durumu -->
              <td v-if="displaySettings.showRetiredStatus" class="px-2 py-2 text-center bg-orange-50">
                <span v-if="item.employee.isRetired" class="text-orange-600 font-medium" title="Emekli">E</span>
                <span v-else class="text-gray-300">-</span>
              </td>
              <!-- Departman -->
              <td v-if="displaySettings.showDepartment" class="px-3 py-2 text-xs bg-purple-50 max-w-[100px] truncate" :title="item.employee.department?.name">
                {{ item.employee.department?.name || '-' }}
              </td>
              <!-- İşe Giriş Tarihi -->
              <td v-if="displaySettings.showHireDate" class="px-3 py-2 text-center text-xs bg-blue-50">
                {{ item.employee.hireDate ? formatDate(item.employee.hireDate) : '-' }}
              </td>
              <!-- TC Kimlik -->
              <td v-if="displaySettings.showTcKimlik" class="px-3 py-2 text-center text-xs bg-gray-100 font-mono">
                {{ item.employee.tcKimlik || '-' }}
              </td>
              <td
                v-for="day in daysInMonth"
                :key="day"
                class="px-0 py-1 text-center cursor-pointer hover:opacity-80 transition-opacity"
                :style="getDayStyle(item.puantaj, day)"
                @click="openDayEditor(item, day)"
                :title="getDayTooltip(item.puantaj, day)"
              >
                <div class="text-xs font-bold">{{ getDayCode(item.puantaj, day) }}</div>
                <div v-if="getDayOvertime(item.puantaj, day)" class="text-[9px] opacity-75">
                  {{ getDayOvertime(item.puantaj, day) }}s
                </div>
              </td>
              <td v-if="displaySettings.showTotalDays" class="px-4 py-2 text-center bg-gray-50">
                <div class="text-xs">
                  <span class="text-green-600 font-medium">{{ formatDays(item.puantaj.summary?.normalDays) }}N</span>
                  <span class="text-blue-600 ml-1">{{ formatDays(item.puantaj.summary?.weekendDays) }}H</span>
                  <span class="text-purple-600 ml-1">{{ formatDays(item.puantaj.summary?.publicHolidays) }}T</span>
                  <span class="text-yellow-600 ml-1">{{ formatDays(item.puantaj.summary?.annualLeaveDays) }}S</span>
                  <span v-if="item.puantaj.summary?.halfDays > 0" class="text-orange-500 ml-1">{{ formatDays(item.puantaj.summary?.halfDays) }}Y</span>
                </div>
              </td>
              <!-- Fazla Mesai (Gündüz) -->
              <td
                v-if="displaySettings.showDayOvertime"
                class="px-3 py-2 text-center bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors"
                @click="openManualOvertimeEntry(item.employee, item.puantaj, 'DAY')"
                title="Fazla mesai girmek veya düzenlemek için tıklayın"
              >
                <div v-if="getTotalCombinedDayOvertime(item.puantaj) > 0" class="flex flex-col items-center justify-center">
                  <div class="flex items-center gap-1">
                    <svg class="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke-width="2"/>
                      <path stroke-linecap="round" stroke-width="2" d="M12 6v6l4 2"/>
                    </svg>
                    <span class="text-sm font-bold text-orange-700">{{ getTotalCombinedDayOvertime(item.puantaj) }}</span>
                  </div>
                  <div v-if="item.puantaj?.manualOvertime?.dayOvertimeHours > 0" class="text-[9px] text-orange-500">
                    ({{ item.puantaj.manualOvertime.dayOvertimeHours }} manuel)
                  </div>
                </div>
                <div v-else class="text-gray-400 text-xs hover:text-orange-500">
                  <span v-if="getPendingDayOvertimeCount(item.employee._id)" class="text-yellow-600">
                    {{ getPendingDayOvertimeCount(item.employee._id) }} bekliyor
                  </span>
                  <span v-else class="flex items-center justify-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Gir
                  </span>
                </div>
              </td>
              <!-- Gece Mesai -->
              <td
                v-if="displaySettings.showNightOvertime"
                class="px-3 py-2 text-center bg-gray-700 cursor-pointer hover:bg-gray-600 transition-colors"
                @click="openManualOvertimeEntry(item.employee, item.puantaj, 'NIGHT')"
                title="Gece mesaisi girmek veya düzenlemek için tıklayın"
              >
                <div v-if="getTotalCombinedNightOvertime(item.puantaj) > 0" class="flex flex-col items-center justify-center">
                  <div class="flex items-center gap-1">
                    <svg class="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                    </svg>
                    <span class="text-sm font-bold text-white">{{ getTotalCombinedNightOvertime(item.puantaj) }}</span>
                  </div>
                  <div v-if="item.puantaj?.manualOvertime?.nightOvertimeHours > 0" class="text-[9px] text-gray-400">
                    ({{ item.puantaj.manualOvertime.nightOvertimeHours }} manuel)
                  </div>
                </div>
                <div v-else class="text-gray-400 text-xs hover:text-gray-300">
                  <span v-if="getPendingNightOvertimeCount(item.employee._id)" class="text-yellow-400">
                    {{ getPendingNightOvertimeCount(item.employee._id) }} bekliyor
                  </span>
                  <span v-else class="flex items-center justify-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Gir
                  </span>
                </div>
              </td>
              <!-- Avans Kesintisi -->
              <td
                v-if="displaySettings.showAdvanceDeduction"
                class="px-3 py-2 text-center bg-red-50"
                :title="getAdvanceDeductionTooltip(item.puantaj)"
              >
                <div v-if="getEmployeeAdvanceDeduction(item.puantaj) > 0" class="flex items-center justify-center gap-1">
                  <svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-sm font-bold text-red-700">{{ formatCurrency(getEmployeeAdvanceDeduction(item.puantaj)) }}</span>
                </div>
                <div v-else class="text-gray-400 text-xs">-</div>
              </td>
              <!-- Dinamik Ödeme Türü Sütunları -->
              <td
                v-for="cpt in selectedPaymentColumns"
                :key="cpt._id"
                class="px-3 py-2 text-center bg-teal-50"
              >
                <span v-if="getEmployeePaymentAmount(item.employee._id, cpt._id)" class="text-sm font-medium text-teal-700">
                  {{ formatCurrency(getEmployeePaymentAmount(item.employee._id, cpt._id)) }}
                </span>
                <span v-else class="text-gray-400 text-xs">-</span>
              </td>
              <!-- Ek Ödemeler -->
              <td v-if="displaySettings.showExtraPayments" class="px-2 py-1 text-center bg-green-50">
                <button
                  @click="openEmployeePayments(item.employee)"
                  class="w-full px-2 py-1 text-xs rounded hover:bg-green-100 transition-colors"
                  :class="getEmployeePaymentClass(item.employee._id)"
                >
                  <div v-if="getEmployeePaymentSummary(item.employee._id)" class="flex flex-col items-center">
                    <span class="font-semibold text-green-700">
                      {{ formatCurrency(getEmployeePaymentSummary(item.employee._id).total) }}
                    </span>
                    <span class="text-[9px] text-green-600">
                      {{ getEmployeePaymentSummary(item.employee._id).count }} ödeme
                    </span>
                  </div>
                  <div v-else class="text-gray-400 text-[10px]">
                    + Ekle
                  </div>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Boş Durum -->
    <div v-else class="bg-white rounded-lg shadow p-8 text-center text-gray-500">
      Puantaj verisi bulunamadı. Lütfen ay seçin ve "Yükle" butonuna tıklayın.
    </div>

    <!-- Kod Açıklamaları (Legend) - Alta Taşındı -->
    <div v-if="codes.length > 0" class="mt-4 bg-white rounded-lg shadow">
      <button
        @click="isLegendCollapsed = !isLegendCollapsed"
        class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-medium text-gray-700">Kod Açıklamaları</span>
          <span class="text-xs text-gray-400">({{ codes.length }} kod)</span>
        </div>
        <svg
          class="w-4 h-4 text-gray-400 transition-transform"
          :class="{ 'rotate-180': !isLegendCollapsed }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="!isLegendCollapsed" class="border-t p-4">
        <div class="flex flex-wrap gap-3">
          <div
            v-for="code in codes"
            :key="code.code"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            :style="{ backgroundColor: code.color + '20', borderColor: code.color }"
          >
            <span
              class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
              :style="{ backgroundColor: code.color, color: code.textColor }"
            >
              {{ code.code }}
            </span>
            <span class="text-sm text-gray-700">{{ code.name }}</span>
          </div>
        </div>
        <!-- Özet Açıklamaları -->
        <div class="mt-4 pt-3 border-t text-xs text-gray-500">
          <div class="flex flex-wrap gap-4">
            <span><strong class="text-green-600">N</strong> = Normal gün</span>
            <span><strong class="text-blue-600">H</strong> = Hafta tatili</span>
            <span><strong class="text-purple-600">T</strong> = Resmi tatil</span>
            <span><strong class="text-yellow-600">S</strong> = Yıllık izin</span>
            <span><strong class="text-orange-500">Y</strong> = Yarım gün</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Çalışan Ek Ödemeleri Modal -->
    <div v-if="showEmployeePayments" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b bg-green-50">
          <div>
            <h3 class="text-sm font-semibold text-gray-800">
              {{ selectedEmployee?.firstName }} {{ selectedEmployee?.lastName }} - Ek Ödemeler
            </h3>
            <p class="text-xs text-gray-500">{{ getMonthName(selectedMonth) }} {{ selectedYear }}</p>
          </div>
          <button @click="showEmployeePayments = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Loading -->
          <div v-if="loadingEmployeePayments" class="flex items-center justify-center py-8">
            <svg class="animate-spin h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>

          <!-- Mevcut Ödemeler -->
          <div v-else>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-semibold text-gray-700">Atanmış Ödemeler</h4>
              <button
                @click="showAddPaymentForm = !showAddPaymentForm"
                class="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Ödeme Ekle
              </button>
            </div>

            <!-- Yeni Ödeme Ekleme Formu -->
            <div v-if="showAddPaymentForm" class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h5 class="text-xs font-semibold text-blue-800 mb-3">Yeni Ödeme Ekle</h5>
              <div class="space-y-3">
                <div>
                  <label class="block text-[10px] text-gray-600 mb-1">Ödeme Türü</label>
                  <select
                    v-model="newPaymentForm.companyPaymentTypeId"
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz...</option>
                    <option
                      v-for="cpt in availablePaymentTypes"
                      :key="cpt._id"
                      :value="cpt._id"
                    >
                      {{ cpt.paymentType?.name || cpt.displayName }} - {{ formatCurrency(cpt.defaultAmount) }}
                    </option>
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[10px] text-gray-600 mb-1">Tutar (Boş = Varsayılan)</label>
                    <input
                      v-model.number="newPaymentForm.amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Varsayılan"
                      class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-[10px] text-gray-600 mb-1">Başlangıç Tarihi</label>
                    <input
                      v-model="newPaymentForm.startDate"
                      type="date"
                      class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div class="flex justify-end gap-2">
                  <button
                    @click="showAddPaymentForm = false"
                    class="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                  >
                    İptal
                  </button>
                  <button
                    @click="addEmployeePayment"
                    :disabled="!newPaymentForm.companyPaymentTypeId || savingEmployeePayment"
                    class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {{ savingEmployeePayment ? 'Kaydediliyor...' : 'Ekle' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Ödemeler Listesi -->
            <div class="space-y-2">
              <div
                v-for="payment in employeePaymentsList"
                :key="payment._id"
                class="border rounded-lg p-3 transition-colors"
                :class="payment.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-800">
                        {{ payment.companyPaymentType?.paymentType?.name || 'Ödeme' }}
                      </span>
                      <span
                        class="text-[10px] px-1.5 py-0.5 rounded"
                        :class="payment.isActive ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'"
                      >
                        {{ payment.isActive ? 'Aktif' : 'Pasif' }}
                      </span>
                    </div>
                    <div class="text-xs text-gray-500 mt-0.5">
                      Başlangıç: {{ formatDate(payment.startDate) }}
                      <span v-if="payment.endDate"> - Bitiş: {{ formatDate(payment.endDate) }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <div class="text-sm font-semibold text-green-700">
                        {{ formatCurrency(payment.amount || payment.companyPaymentType?.defaultAmount) }}
                      </div>
                      <div v-if="payment.amount === null" class="text-[9px] text-gray-400">
                        (Varsayılan)
                      </div>
                    </div>
                    <button
                      v-if="payment.isActive"
                      @click="deactivatePayment(payment)"
                      class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Pasif Yap"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Boş Durum -->
              <div v-if="employeePaymentsList.length === 0" class="text-center py-6 text-gray-500">
                <svg class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-xs">Bu çalışana henüz ek ödeme atanmamış</p>
              </div>
            </div>

            <!-- Toplam -->
            <div v-if="employeePaymentsList.length > 0" class="mt-4 pt-3 border-t flex justify-between items-center">
              <span class="text-xs text-gray-600">Aylık Toplam Ek Ödeme:</span>
              <span class="text-sm font-bold text-green-700">{{ formatCurrency(employeePaymentsTotal) }}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-3 border-t bg-gray-50 flex justify-end">
          <button
            @click="showEmployeePayments = false"
            class="px-4 py-2 text-xs text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>

    <!-- Fazla Mesai Talepleri Modal -->
    <div v-if="showOvertimeRequests" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b"
          :class="selectedOvertimeType === 'DAY' ? 'bg-orange-50' : 'bg-gray-700'"
        >
          <div class="flex items-center gap-3">
            <!-- Icon -->
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="selectedOvertimeType === 'DAY' ? 'bg-orange-100' : 'bg-gray-600'"
            >
              <svg v-if="selectedOvertimeType === 'DAY'" class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="2"/>
                <path stroke-linecap="round" stroke-width="2" d="M12 6v6l4 2"/>
              </svg>
              <svg v-else class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            </div>
            <div>
              <h3
                class="text-sm font-semibold"
                :class="selectedOvertimeType === 'DAY' ? 'text-gray-800' : 'text-white'"
              >
                {{ selectedOvertimeEmployee?.firstName }} {{ selectedOvertimeEmployee?.lastName }}
              </h3>
              <p
                class="text-xs"
                :class="selectedOvertimeType === 'DAY' ? 'text-orange-600' : 'text-gray-300'"
              >
                {{ selectedOvertimeType === 'DAY' ? 'Fazla Mesai' : 'Gece Mesaisi' }} - {{ getMonthName(selectedMonth) }} {{ selectedYear }}
              </p>
            </div>
          </div>
          <button
            @click="showOvertimeRequests = false"
            :class="selectedOvertimeType === 'DAY' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-white'"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Loading -->
          <div v-if="loadingOvertimeRequests" class="flex items-center justify-center py-8">
            <svg
              class="animate-spin h-6 w-6"
              :class="selectedOvertimeType === 'DAY' ? 'text-orange-500' : 'text-gray-500'"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>

          <div v-else>
            <!-- Bilgi Notu -->
            <div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-700">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Fazla mesai talepleri çalışanlar tarafından oluşturulur. Yöneticiler burada talepleri onaylayabilir veya reddedebilir.</span>
              </div>
            </div>

            <!-- Talepler Listesi -->
            <h5 class="text-xs font-semibold text-gray-700 mb-2">
              {{ selectedOvertimeType === 'DAY' ? 'Fazla Mesai' : 'Gece Mesaisi' }} Talepleri
            </h5>
            <div class="space-y-2">
              <div
                v-for="req in filteredOvertimeRequests"
                :key="req._id"
                class="border rounded-lg p-3 transition-colors"
                :class="{
                  'bg-yellow-50 border-yellow-200': req.status === 'PENDING',
                  'bg-green-50 border-green-200': req.status === 'APPROVED',
                  'bg-red-50 border-red-200': req.status === 'REJECTED',
                  'bg-gray-50 border-gray-200': req.status === 'CANCELLED'
                }"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-800">
                        {{ formatDateShort(req.date) }}
                      </span>
                      <span
                        class="text-[10px] px-1.5 py-0.5 rounded"
                        :class="{
                          'bg-yellow-500 text-white': req.status === 'PENDING',
                          'bg-green-500 text-white': req.status === 'APPROVED',
                          'bg-red-500 text-white': req.status === 'REJECTED',
                          'bg-gray-400 text-white': req.status === 'CANCELLED'
                        }"
                      >
                        {{ req.statusName }}
                      </span>
                    </div>
                    <div class="text-xs text-gray-500 mt-0.5">{{ req.reason }}</div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <div class="text-sm font-semibold" :class="req.status === 'APPROVED' ? 'text-green-700' : 'text-gray-700'">
                        {{ req.status === 'APPROVED' && req.approvedHours ? req.approvedHours : req.requestedHours }} saat
                      </div>
                      <div v-if="req.status === 'APPROVED' && req.approvedHours !== req.requestedHours" class="text-[9px] text-gray-400">
                        (Talep: {{ req.requestedHours }}s)
                      </div>
                    </div>
                    <!-- Onay/Red butonları (PENDING için) -->
                    <div v-if="req.status === 'PENDING' && canApproveOvertime" class="flex gap-1">
                      <button
                        @click="approveOvertimeRequest(req)"
                        class="p-1 text-green-600 hover:bg-green-100 rounded"
                        title="Onayla"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        @click="rejectOvertimeRequest(req)"
                        class="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Reddet"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Boş Durum -->
              <div v-if="filteredOvertimeRequests.length === 0" class="text-center py-6 text-gray-500">
                <svg v-if="selectedOvertimeType === 'DAY'" class="w-10 h-10 mx-auto mb-2 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke-width="2"/>
                  <path stroke-linecap="round" stroke-width="2" d="M12 6v6l4 2"/>
                </svg>
                <svg v-else class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                </svg>
                <p class="text-xs">
                  Bu ay için {{ selectedOvertimeType === 'DAY' ? 'fazla mesai' : 'gece mesaisi' }} talebi yok
                </p>
              </div>
            </div>

            <!-- Toplam -->
            <div v-if="filteredApprovedTotal > 0" class="mt-4 pt-3 border-t">
              <div class="flex justify-between items-center text-xs">
                <span class="text-gray-600">Onaylı Toplam:</span>
                <span
                  class="font-semibold flex items-center gap-1"
                  :class="selectedOvertimeType === 'DAY' ? 'text-orange-700' : 'text-gray-700'"
                >
                  <svg v-if="selectedOvertimeType === 'DAY'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke-width="2"/>
                    <path stroke-linecap="round" stroke-width="2" d="M12 6v6l4 2"/>
                  </svg>
                  <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
                  {{ filteredApprovedTotal }} saat
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-3 border-t bg-gray-50 flex justify-end">
          <button
            @click="showOvertimeRequests = false"
            class="px-4 py-2 text-xs text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>

    <!-- Gün Düzenleme Modal -->
    <div v-if="showDayEditor" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-bold mb-4">
          {{ editingItem?.employee.firstName }} {{ editingItem?.employee.lastName }} - {{ editingDay }} {{ getMonthName(selectedMonth) }}
        </h3>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Puantaj Kodu</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="code in codes"
              :key="code.code"
              @click="selectedCode = code.code"
              class="p-3 rounded-lg border-2 transition-all"
              :class="selectedCode === code.code ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'"
              :style="{ backgroundColor: code.color, color: code.textColor }"
            >
              <div class="font-bold">{{ code.code }}</div>
              <div class="text-[10px]">{{ code.name }}</div>
            </button>
          </div>
        </div>

        <div v-if="['O', 'G'].includes(selectedCode)" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Mesai Saati</label>
          <input
            v-model.number="overtimeHours"
            type="number"
            min="0"
            max="24"
            step="0.5"
            class="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Not (Opsiyonel)</label>
          <input
            v-model="dayNote"
            type="text"
            class="w-full px-3 py-2 border rounded-lg"
            placeholder="Açıklama..."
          />
        </div>

        <div class="flex justify-end gap-2">
          <button @click="closeDayEditor" class="px-4 py-2 border rounded-lg hover:bg-gray-50">
            İptal
          </button>
          <button @click="saveDayChange" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Kaydet
          </button>
        </div>
      </div>
    </div>

    <!-- Manuel Mesai Girişi Modal -->
    <div v-if="showManualOvertimeModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b rounded-t-lg"
          :class="selectedOvertimeType === 'DAY' ? 'bg-orange-50' : 'bg-gray-700'"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="selectedOvertimeType === 'DAY' ? 'bg-orange-100' : 'bg-gray-600'"
            >
              <svg v-if="selectedOvertimeType === 'DAY'" class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="2"/>
                <path stroke-linecap="round" stroke-width="2" d="M12 6v6l4 2"/>
              </svg>
              <svg v-else class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            </div>
            <div>
              <h3
                class="text-sm font-semibold"
                :class="selectedOvertimeType === 'DAY' ? 'text-gray-800' : 'text-white'"
              >
                {{ selectedOvertimeEmployee?.firstName }} {{ selectedOvertimeEmployee?.lastName }}
              </h3>
              <p
                class="text-xs"
                :class="selectedOvertimeType === 'DAY' ? 'text-orange-600' : 'text-gray-300'"
              >
                {{ selectedOvertimeType === 'DAY' ? 'Fazla Mesai' : 'Gece Mesaisi' }} - {{ getMonthName(selectedMonth) }} {{ selectedYear }}
              </p>
            </div>
          </div>
          <button
            @click="showManualOvertimeModal = false"
            :class="selectedOvertimeType === 'DAY' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-white'"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-5">
          <!-- Bilgi Notu -->
          <div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-700">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Bu alana girilen mesai saatleri, belirli bir güne bağlı olmaksızın aylık toplam olarak kaydedilir. Puantaj hesaplamalarına eklenir.</span>
            </div>
          </div>

          <!-- Saat Girişi -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ selectedOvertimeType === 'DAY' ? 'Fazla Mesai' : 'Gece Mesaisi' }} Saati
            </label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="manualOvertimeForm.hours"
                type="number"
                min="0"
                max="999"
                step="0.5"
                class="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                :class="selectedOvertimeType === 'DAY' ? 'focus:ring-orange-500' : 'focus:ring-gray-500'"
                placeholder="0"
              />
              <span class="text-gray-500 font-medium">saat</span>
            </div>
            <p class="mt-1 text-xs text-gray-500">Yarım saat için 0.5 kullanabilirsiniz</p>
          </div>

          <!-- Not Girişi -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Açıklama (Opsiyonel)</label>
            <input
              v-model="manualOvertimeForm.note"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Örn: Proje teslimi için..."
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button
            @click="showManualOvertimeModal = false"
            class="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            İptal
          </button>
          <button
            @click="saveManualOvertime"
            :disabled="savingManualOvertime"
            class="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
            :class="selectedOvertimeType === 'DAY' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-700 hover:bg-gray-800'"
          >
            <svg v-if="savingManualOvertime" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ savingManualOvertime ? 'Kaydediliyor...' : 'Kaydet' }}
          </button>
        </div>
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

const authStore = useAuthStore()
const toast = useToastStore()
const confirmModal = useConfirmStore()

// ==================== GÖRÜNÜM AYARLARI ====================
const STORAGE_KEY = 'puantajDisplaySettings'
const displaySettings = ref({
  // Çalışan bilgileri sütunları
  showRetiredStatus: true,      // Emekli durumu
  showDepartment: false,        // Departman
  showHireDate: false,          // İşe giriş tarihi
  showTcKimlik: false,          // TC Kimlik

  // Mesai & kesinti sütunları (mevcut computed'larla entegre)
  showDayOvertime: true,        // Fazla mesai (gündüz)
  showNightOvertime: true,      // Gece mesaisi
  showAdvanceDeduction: true,   // Avans kesintisi

  // Ek ödemeler (şirket ödeme türlerinden seçilen ID'ler)
  selectedPaymentTypes: [],

  // Özet
  showTotalDays: true,          // Toplam gün özeti
  showExtraPayments: true,      // Ek ödemeler sütunu
})

// Panel durumları
const isSettingsPanelOpen = ref(false)
const isLegendCollapsed = ref(true)

const loading = ref(false)
const excelLoading = ref(false)
const regenerateLoading = ref(false)
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const puantajList = ref([])
const codes = ref([])
const template = ref(null)
const companies = ref([])
const selectedCompanyId = ref('')
const isBayiAdmin = computed(() => authStore.isBayiAdmin)

// Gün düzenleme
const showDayEditor = ref(false)
const editingItem = ref(null)
const editingDay = ref(null)
const selectedCode = ref('')
const overtimeHours = ref(0)
const dayNote = ref('')

// Çalışan Ek Ödemeleri
const showEmployeePayments = ref(false)
const selectedEmployee = ref(null)
const employeePaymentsList = ref([])
const loadingEmployeePayments = ref(false)
const savingEmployeePayment = ref(false)
const showAddPaymentForm = ref(false)
const companyPaymentTypes = ref([])
const employeePaymentsSummary = ref({}) // { employeeId: { total, count } }
const newPaymentForm = ref({
  companyPaymentTypeId: '',
  amount: null,
  startDate: new Date().toISOString().split('T')[0]
})

const months = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' }
]

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 1, currentYear, currentYear + 1]
})

const daysInMonth = computed(() => {
  return new Date(selectedYear.value, selectedMonth.value, 0).getDate()
})

const getMonthName = (month) => {
  return months.find(m => m.value === month)?.label || ''
}

const getDayName = (day) => {
  const date = new Date(selectedYear.value, selectedMonth.value - 1, day)
  const names = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct']
  return names[date.getDay()]
}

const isWeekend = (day) => {
  const date = new Date(selectedYear.value, selectedMonth.value - 1, day)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

const getDayCode = (puantaj, day) => {
  const dayData = puantaj.days?.find(d => new Date(d.date).getDate() === day)
  return dayData?.code || '-'
}

// Gün sayısını formatla (27.5 gibi yarım günler için)
const formatDays = (value) => {
  if (!value && value !== 0) return '0'
  // Tam sayı ise virgülsüz, değilse bir ondalık basamakla göster
  return Number.isInteger(value) ? value : value.toFixed(1)
}

// Gündüz mesai saatlerini topla (O kodlu günler)
const getTotalDayOvertime = (puantaj) => {
  if (!puantaj?.days) return null
  const total = puantaj.days
    .filter(d => d.code === 'O')
    .reduce((sum, d) => sum + (d.overtimeHours || 0), 0)
  return total > 0 ? total : null
}

// Gece mesai saatlerini topla (G kodlu günler)
const getTotalNightOvertime = (puantaj) => {
  if (!puantaj?.days) return null
  const total = puantaj.days
    .filter(d => d.code === 'G')
    .reduce((sum, d) => sum + (d.overtimeHours || 0), 0)
  return total > 0 ? total : null
}

// Belirli bir günün fazla mesai saatini al (O veya G kodu için)
const getDayOvertime = (puantaj, day) => {
  const dayData = puantaj.days?.find(d => new Date(d.date).getDate() === day)
  if (dayData && ['O', 'G'].includes(dayData.code) && dayData.overtimeHours > 0) {
    return dayData.overtimeHours
  }
  return null
}

// Günün tooltip bilgisini al
const getDayTooltip = (puantaj, day) => {
  const dayData = puantaj.days?.find(d => new Date(d.date).getDate() === day)
  if (!dayData) return ''

  const codeData = codes.value.find(c => c.code === dayData.code)
  let tooltip = codeData?.name || dayData.code

  if (['O', 'G'].includes(dayData.code) && dayData.overtimeHours > 0) {
    tooltip += ` - ${dayData.overtimeHours} saat`
  }

  if (dayData.note) {
    tooltip += ` - ${dayData.note}`
  }

  return tooltip
}

const getDayStyle = (puantaj, day) => {
  const code = getDayCode(puantaj, day)
  const codeData = codes.value.find(c => c.code === code)
  if (codeData) {
    return {
      backgroundColor: codeData.color,
      color: codeData.textColor
    }
  }
  return {}
}

const prevMonth = () => {
  if (selectedMonth.value === 1) {
    selectedMonth.value = 12
    selectedYear.value--
  } else {
    selectedMonth.value--
  }
  // watch otomatik olarak loadPuantaj() çağırır
}

const nextMonth = () => {
  if (selectedMonth.value === 12) {
    selectedMonth.value = 1
    selectedYear.value++
  } else {
    selectedMonth.value++
  }
  // watch otomatik olarak loadPuantaj() çağırır
}

const loadCompanies = async () => {
  if (isBayiAdmin.value) {
    try {
      const response = await api.get('/companies')
      companies.value = response.data?.data || response.data || []

      // Bayi'nin kendi şirketi varsa onu seç, yoksa ilk şirketi seç
      if (companies.value.length > 0) {
        if (authStore.companyId) {
          const userCompany = companies.value.find(c => c._id === authStore.companyId)
          if (userCompany) {
            selectedCompanyId.value = userCompany._id
          } else {
            selectedCompanyId.value = companies.value[0]._id
          }
        } else {
          selectedCompanyId.value = companies.value[0]._id
        }
      }
    } catch (error) {
      console.error('Şirketler yüklenemedi:', error)
      companies.value = []
    }
  }
}

const loadPuantaj = async () => {
  loading.value = true
  try {
    let companyId = null
    
    // Bayi admin için seçilen şirketi kullan
    if (isBayiAdmin.value) {
      if (!selectedCompanyId.value) {
        puantajList.value = []
        codes.value = []
        template.value = null
        loading.value = false
        return
      }
      companyId = selectedCompanyId.value
    } else {
      // Diğer roller için kullanıcının şirketini kullan
      // Company obje veya string ID olabilir
      const companyData = authStore.user?.company
      companyId = companyData?._id || companyData
    }

    if (!companyId) {
      toast.error('Şirket bilgisi bulunamadı')
      loading.value = false
      return
    }

    const response = await api.get(`/puantaj/company/${companyId}/${selectedYear.value}/${selectedMonth.value}`)
    const data = response.data?.data || response.data || {}
    puantajList.value = data.puantajList || []
    codes.value = data.codes || []
    template.value = data.template
  } catch (error) {
    console.error('Puantaj yüklenemedi:', error)
    toast.error(error.response?.data?.message || 'Puantaj yüklenemedi')
  } finally {
    loading.value = false
  }
}

const openDayEditor = (item, day) => {
  editingItem.value = item
  editingDay.value = day
  const dayData = item.puantaj.days?.find(d => new Date(d.date).getDate() === day)
  selectedCode.value = dayData?.code || 'N'
  overtimeHours.value = dayData?.overtimeHours || 0
  dayNote.value = dayData?.note || ''
  showDayEditor.value = true
}

const closeDayEditor = () => {
  showDayEditor.value = false
  editingItem.value = null
  editingDay.value = null
  selectedCode.value = ''
  overtimeHours.value = 0
  dayNote.value = ''
}

const saveDayChange = async () => {
  try {
    const response = await api.put(
      `/puantaj/employee/${editingItem.value.employee._id}/${selectedYear.value}/${selectedMonth.value}/day/${editingDay.value}`,
      {
        code: selectedCode.value,
        overtimeHours: overtimeHours.value,
        note: dayNote.value
      }
    )

    // Listeyi güncelle
    const index = puantajList.value.findIndex(p => p.employee._id === editingItem.value.employee._id)
    if (index !== -1) {
      puantajList.value[index].puantaj = response.data?.data || response.data
    }

    closeDayEditor()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Kaydetme hatası')
  }
}

const downloadExcel = async () => {
  excelLoading.value = true
  try {
    let companyId = null
    
    if (isBayiAdmin.value) {
      if (!selectedCompanyId.value) {
        toast.warning('Lütfen bir şirket seçiniz')
        excelLoading.value = false
        return
      }
      companyId = selectedCompanyId.value
    } else {
      // company object veya string olabilir
      const company = authStore.user?.company
      companyId = typeof company === 'object' ? company?._id : company
    }
    
    if (!companyId) {
      toast.error('Şirket bilgisi bulunamadı')
      excelLoading.value = false
      return
    }

    const response = await api.get(
      `/attendances/export-excel?month=${selectedMonth.value}&year=${selectedYear.value}&company=${companyId}`,
      { responseType: 'blob' }
    )

    // Dosya adını response header'dan al veya oluştur
    const contentDisposition = response.headers['content-disposition']
    let fileName = `Puantaj_${selectedMonth.value}_${selectedYear.value}.xlsx`
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''))
      }
    }

    // Blob'u indir
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Excel indirme hatası:', error)
    toast.error(error.response?.data?.message || 'Excel indirilemedi')
  } finally {
    excelLoading.value = false
  }
}

const regenerateAll = async () => {
  const confirmed = await confirmModal.show({
    title: 'Puantaj Yeniden Hesaplama',
    message: 'Tüm çalışanların puantajı yeniden hesaplanacak. Manuel yapılan değişiklikler korunacak. Devam etmek istiyor musunuz?',
    type: 'warning',
    confirmText: 'Hesapla'
  })
  if (!confirmed) return

  regenerateLoading.value = true
  try {
    let companyId = null
    
    if (isBayiAdmin.value) {
      if (!selectedCompanyId.value) {
        toast.warning('Lütfen bir şirket seçiniz')
        regenerateLoading.value = false
        return
      }
      companyId = selectedCompanyId.value
    } else {
      // company object veya string olabilir
      const company = authStore.user?.company
      companyId = typeof company === 'object' ? company?._id : company
    }
    
    if (!companyId) {
      toast.error('Şirket bilgisi bulunamadı')
      regenerateLoading.value = false
      return
    }

    const response = await api.post(
      `/puantaj/company/${companyId}/${selectedYear.value}/${selectedMonth.value}/regenerate`,
      { preserveManualOverrides: true }
    )
    const regenerateData = response.data?.data || response.data || {}

    puantajList.value = regenerateData.puantajList || []
    codes.value = regenerateData.codes || []
    template.value = regenerateData.template

    toast.success(regenerateData.message || response.data?.message || 'Puantajlar yeniden hesaplandı')
  } catch (error) {
    console.error('Yeniden hesaplama hatası:', error)
    toast.error(error.response?.data?.message || 'Yeniden hesaplama başarısız')
  } finally {
    regenerateLoading.value = false
  }
}

// ==================== EK ÖDEMELER ====================

// Şirket ödeme türlerini yükle
const loadCompanyPaymentTypes = async () => {
  try {
    let companyId
    if (isBayiAdmin.value) {
      companyId = selectedCompanyId.value
    } else {
      // company object veya string olabilir
      const company = authStore.user?.company
      companyId = typeof company === 'object' ? company?._id : company
    }
    if (!companyId) return

    const response = await api.get(`/companies/${companyId}/payment-types`)
    const paymentTypes = response.data?.data || response.data || []
    companyPaymentTypes.value = paymentTypes.filter(cpt => cpt.isActive)
  } catch (error) {
    console.error('Şirket ödeme türleri yüklenemedi:', error)
  }
}

// Tüm çalışanların ödeme özetlerini yükle
const loadAllEmployeePaymentsSummary = async () => {
  try {
    let companyId
    if (isBayiAdmin.value) {
      companyId = selectedCompanyId.value
    } else {
      // company object veya string olabilir
      const company = authStore.user?.company
      companyId = typeof company === 'object' ? company?._id : company
    }
    if (!companyId) return

    const response = await api.get(`/employee-payments/company/${companyId}/summary`)
    const summaryData = response.data?.data || response.data || {}
    employeePaymentsSummary.value = summaryData.byEmployee || {}
  } catch (error) {
    console.error('Ödeme özetleri yüklenemedi:', error)
    employeePaymentsSummary.value = {}
  }
}

// Çalışanın ödeme özeti
const getEmployeePaymentSummary = (employeeId) => {
  return employeePaymentsSummary.value[employeeId] || null
}

// Çalışan ödeme hücresi stili
const getEmployeePaymentClass = (employeeId) => {
  const summary = getEmployeePaymentSummary(employeeId)
  if (summary && summary.total > 0) {
    return 'text-green-700'
  }
  return 'text-gray-400'
}

// Çalışan ödemelerini aç
const openEmployeePayments = async (employee) => {
  selectedEmployee.value = employee
  showEmployeePayments.value = true
  showAddPaymentForm.value = false
  newPaymentForm.value = {
    companyPaymentTypeId: '',
    amount: null,
    startDate: new Date().toISOString().split('T')[0]
  }
  await loadEmployeePayments(employee._id)
}

// Çalışanın ödemelerini yükle
const loadEmployeePayments = async (employeeId) => {
  try {
    loadingEmployeePayments.value = true
    const response = await api.get(`/employees/${employeeId}/payments?active=true`)
    const paymentsData = response.data?.data || response.data || {}
    employeePaymentsList.value = paymentsData.payments || []
  } catch (error) {
    console.error('Çalışan ödemeleri yüklenemedi:', error)
    employeePaymentsList.value = []
  } finally {
    loadingEmployeePayments.value = false
  }
}

// ==================== DİNAMİK KOLON GÖSTERİMİ ====================

// Fazla mesai kolonu gösterilmeli mi?
const showOvertimeColumn = computed(() => {
  return puantajList.value.some(item => {
    const total = getTotalDayOvertime(item.puantaj)
    return total !== null && total > 0
  })
})

// Gece mesai kolonu gösterilmeli mi?
const showNightOvertimeColumn = computed(() => {
  return puantajList.value.some(item => {
    const total = getTotalNightOvertime(item.puantaj)
    return total !== null && total > 0
  })
})

// Avans kesintisi kolonu gösterilmeli mi?
const showAdvanceDeductionColumn = computed(() => {
  return puantajList.value.some(item => {
    return (item.puantaj?.totalAdvanceDeduction || 0) > 0
  })
})

// Çalışanın avans kesintisi
const getEmployeeAdvanceDeduction = (puantaj) => {
  return puantaj?.totalAdvanceDeduction || 0
}

// Avans kesintisi tooltip
const getAdvanceDeductionTooltip = (puantaj) => {
  if (!puantaj?.advanceDeductions?.length) return 'Avans kesintisi yok'

  const deductions = puantaj.advanceDeductions
  const lines = deductions.map(d => d.description || `Avans Kesintisi: ${formatCurrency(d.amount)}`)
  return lines.join('\n')
}

// Yeni ödeme ekle
const addEmployeePayment = async () => {
  if (!newPaymentForm.value.companyPaymentTypeId || !selectedEmployee.value) return
  try {
    savingEmployeePayment.value = true
    await api.post(`/employees/${selectedEmployee.value._id}/payments`, {
      companyPaymentTypeId: newPaymentForm.value.companyPaymentTypeId,
      amount: newPaymentForm.value.amount || null,
      startDate: newPaymentForm.value.startDate
    })
    showAddPaymentForm.value = false
    await loadEmployeePayments(selectedEmployee.value._id)
    await loadAllEmployeePaymentsSummary()
    toast.success('Ödeme başarıyla eklendi')
  } catch (error) {
    console.error('Ödeme eklenemedi:', error)
    toast.error(error.response?.data?.message || 'Ödeme eklenemedi')
  } finally {
    savingEmployeePayment.value = false
  }
}

// Ödemeyi pasif yap
const deactivatePayment = async (payment) => {
  const confirmed = await confirmModal.show({
    title: 'Ödemeyi Pasif Yap',
    message: 'Bu ödemeyi pasif yapmak istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Pasif Yap'
  })
  if (!confirmed) return
  try {
    await api.put(`/employees/${selectedEmployee.value._id}/payments/${payment._id}`, {
      isActive: false,
      endDate: new Date().toISOString().split('T')[0]
    })
    await loadEmployeePayments(selectedEmployee.value._id)
    await loadAllEmployeePaymentsSummary()
    toast.success('Ödeme pasif yapıldı')
  } catch (error) {
    console.error('Ödeme pasif yapılamadı:', error)
    toast.error('Ödeme pasif yapılamadı')
  }
}

// Mevcut ödeme türlerinden eklenmemiş olanları filtrele
const availablePaymentTypes = computed(() => {
  const assignedTypeIds = employeePaymentsList.value
    .filter(p => p.isActive)
    .map(p => p.companyPaymentType?._id)
  return companyPaymentTypes.value.filter(cpt => !assignedTypeIds.includes(cpt._id))
})

// Seçilen ödeme türlerinden sütun oluştur (Görünüm Ayarları panelinde seçilen)
const selectedPaymentColumns = computed(() => {
  return displaySettings.value.selectedPaymentTypes
    .map(id => companyPaymentTypes.value.find(cpt => cpt._id === id))
    .filter(Boolean)
})

// Ödeme türü kısa adını al
const getPaymentTypeShortName = (cpt) => {
  const name = cpt.paymentType?.name || cpt.customName || 'Ödeme'
  // Uzun isimleri kısalt (max 8 karakter)
  if (name.length > 8) {
    return name.slice(0, 7) + '.'
  }
  return name
}

// Çalışanın belirli ödeme türü için tutarını getir
const getEmployeePaymentAmount = (employeeId, paymentTypeId) => {
  const summary = employeePaymentsSummary.value[employeeId]
  if (!summary?.byType?.[paymentTypeId]) return null
  return summary.byType[paymentTypeId].amount
}

// Aylık toplam
const employeePaymentsTotal = computed(() => {
  return employeePaymentsList.value
    .filter(p => p.isActive && p.companyPaymentType?.paymentType?.paymentFrequency === 'MONTHLY')
    .reduce((sum, p) => sum + (p.amount || p.companyPaymentType?.defaultAmount || 0), 0)
})

// Para formatı
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value)
}

// Tarih formatı
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

// Kısa tarih formatı
const formatDateShort = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getDate()} ${getMonthName(d.getMonth() + 1)}`
}

// ==================== MANUEL MESAİ GİRİŞİ ====================

const showManualOvertimeModal = ref(false)
const manualOvertimeForm = ref({
  hours: 0,
  note: ''
})
const savingManualOvertime = ref(false)

// Manuel mesai girişi modalını aç
const openManualOvertimeEntry = (employee, puantaj, overtimeType = 'DAY') => {
  selectedOvertimeEmployee.value = employee
  selectedOvertimeType.value = overtimeType

  // Mevcut değerleri yükle
  const manualOvertime = puantaj?.manualOvertime || {}
  if (overtimeType === 'DAY') {
    manualOvertimeForm.value.hours = manualOvertime.dayOvertimeHours || 0
  } else {
    manualOvertimeForm.value.hours = manualOvertime.nightOvertimeHours || 0
  }
  manualOvertimeForm.value.note = manualOvertime.note || ''

  showManualOvertimeModal.value = true
}

// Manuel mesai kaydet
const saveManualOvertime = async () => {
  if (!selectedOvertimeEmployee.value) return

  try {
    savingManualOvertime.value = true

    const payload = {
      note: manualOvertimeForm.value.note
    }

    if (selectedOvertimeType.value === 'DAY') {
      payload.dayOvertimeHours = manualOvertimeForm.value.hours
    } else {
      payload.nightOvertimeHours = manualOvertimeForm.value.hours
    }

    await api.put(
      `/puantaj/employee/${selectedOvertimeEmployee.value._id}/${selectedYear.value}/${selectedMonth.value}/manual-overtime`,
      payload
    )

    showManualOvertimeModal.value = false
    toast.success('Manuel mesai kaydedildi')

    // Puantaj listesini yenile
    await loadPuantaj()
  } catch (error) {
    console.error('Manuel mesai kaydetme hatası:', error)
    toast.error(error.response?.data?.message || 'Manuel mesai kaydedilemedi')
  } finally {
    savingManualOvertime.value = false
  }
}

// Toplam fazla mesai (hesaplanan + manuel)
const getTotalCombinedDayOvertime = (puantaj) => {
  const calculated = getTotalDayOvertime(puantaj) || 0
  const manual = puantaj?.manualOvertime?.dayOvertimeHours || 0
  return calculated + manual
}

// Toplam gece mesai (hesaplanan + manuel)
const getTotalCombinedNightOvertime = (puantaj) => {
  const calculated = getTotalNightOvertime(puantaj) || 0
  const manual = puantaj?.manualOvertime?.nightOvertimeHours || 0
  return calculated + manual
}

// ==================== FAZLA MESAİ TALEPLERİ ====================

const showOvertimeRequests = ref(false)
const selectedOvertimeEmployee = ref(null)
const selectedOvertimeType = ref('DAY') // 'DAY' veya 'NIGHT'
const overtimeRequestsList = ref([])
const loadingOvertimeRequests = ref(false)
const overtimeSummary = ref({}) // { employeeId: { dayHours, nightHours, pendingDayCount, pendingNightCount } }

// Onay yetkisi kontrolü
const canApproveOvertime = computed(() => {
  const role = authStore.user?.role?.name || authStore.user?.role
  return ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'department_manager'].includes(role)
})

// Tüm çalışanların mesai özetlerini yükle
const loadAllOvertimeSummary = async () => {
  try {
    let companyId
    if (isBayiAdmin.value) {
      companyId = selectedCompanyId.value
    } else {
      // company object veya string olabilir
      const company = authStore.user?.company
      companyId = typeof company === 'object' ? company?._id : company
    }
    if (!companyId) return

    const response = await api.get(`/overtime-requests/summary/${companyId}/${selectedYear.value}/${selectedMonth.value}`)
    const overtimeData = response.data?.data || response.data || {}

    // Çalışan bazında özet oluştur
    const summaryByEmployee = {}
    for (const [empId, data] of Object.entries(overtimeData.summary || {})) {
      summaryByEmployee[empId] = {
        dayHours: data.dayHours || 0,
        nightHours: data.nightHours || 0,
        totalHours: data.totalHours || 0,
        pendingDayCount: data.pendingDayCount || 0,
        pendingNightCount: data.pendingNightCount || 0
      }
    }
    overtimeSummary.value = summaryByEmployee
  } catch (error) {
    console.error('Mesai özeti yüklenemedi:', error)
    overtimeSummary.value = {}
  }
}

// Seçili mesai türüne göre filtrelenmiş talepler
const filteredOvertimeRequests = computed(() => {
  return overtimeRequestsList.value.filter(r => r.overtimeType === selectedOvertimeType.value)
})

// Filtrelenmiş onaylı toplam saat
const filteredApprovedTotal = computed(() => {
  return filteredOvertimeRequests.value
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (r.approvedHours || r.requestedHours), 0)
})

// Bekleyen gündüz mesai talebi sayısı
const getPendingDayOvertimeCount = (employeeId) => {
  const summary = overtimeSummary.value[employeeId]
  return summary?.pendingDayCount || 0
}

// Bekleyen gece mesai talebi sayısı
const getPendingNightOvertimeCount = (employeeId) => {
  const summary = overtimeSummary.value[employeeId]
  return summary?.pendingNightCount || 0
}

// Çalışanın mesai taleplerini aç
const openOvertimeRequests = async (employee, overtimeType = 'DAY') => {
  selectedOvertimeEmployee.value = employee
  selectedOvertimeType.value = overtimeType
  showOvertimeRequests.value = true

  await loadOvertimeRequests(employee._id)
}

// Çalışanın mesai taleplerini yükle
const loadOvertimeRequests = async (employeeId) => {
  try {
    loadingOvertimeRequests.value = true
    const response = await api.get(`/overtime-requests/employee/${employeeId}?year=${selectedYear.value}&month=${selectedMonth.value}`)
    overtimeRequestsList.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Mesai talepleri yüklenemedi:', error)
    overtimeRequestsList.value = []
  } finally {
    loadingOvertimeRequests.value = false
  }
}

// Mesai talebini onayla
const approveOvertimeRequest = async (request) => {
  const hours = prompt('Onaylanacak saat miktarını girin:', request.requestedHours)
  if (hours === null) return

  try {
    await api.put(`/overtime-requests/${request._id}/approve`, {
      approvedHours: parseFloat(hours)
    })

    await loadOvertimeRequests(selectedOvertimeEmployee.value._id)
    await loadAllOvertimeSummary()
    await loadPuantaj() // Puantajı da güncelle
    toast.success('Talep onaylandı')
  } catch (error) {
    console.error('Onaylama başarısız:', error)
    toast.error(error.response?.data?.message || 'Onaylama başarısız')
  }
}

// Mesai talebini reddet
const rejectOvertimeRequest = async (request) => {
  const reason = prompt('Red nedeni:')
  if (reason === null) return

  try {
    await api.put(`/overtime-requests/${request._id}/reject`, {
      reason: reason || 'Talep reddedildi'
    })

    await loadOvertimeRequests(selectedOvertimeEmployee.value._id)
    await loadAllOvertimeSummary()
    toast.success('Talep reddedildi')
  } catch (error) {
    console.error('Reddetme başarısız:', error)
    toast.error(error.response?.data?.message || 'Reddetme başarısız')
  }
}

// Yıl, ay veya şirket seçimi değiştiğinde otomatik yükle
watch([selectedYear, selectedMonth, selectedCompanyId], () => {
  if (isBayiAdmin.value && !selectedCompanyId.value) {
    // Bayi admin için şirket seçilmediyse yükleme
    puantajList.value = []
    codes.value = []
    template.value = null
    return
  }
  loadPuantaj()
  loadCompanyPaymentTypes()
  loadAllEmployeePaymentsSummary()
  loadAllOvertimeSummary()
})

onMounted(async () => {
  // LocalStorage'dan görünüm ayarlarını yükle
  const savedSettings = localStorage.getItem(STORAGE_KEY)
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings)
      displaySettings.value = { ...displaySettings.value, ...parsed }
    } catch (e) {
      console.warn('Görünüm ayarları yüklenemedi:', e)
    }
  }

  await loadCompanies()
  loadPuantaj()
  loadCompanyPaymentTypes()
  loadAllEmployeePaymentsSummary()
  loadAllOvertimeSummary()
})

// Görünüm ayarları değiştiğinde localStorage'a kaydet
watch(displaySettings, (newVal) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
}, { deep: true })
</script>

<style scoped>
table {
  border-collapse: separate;
  border-spacing: 0;
}

td {
  min-width: 28px;
  height: 40px;
}

.sticky {
  position: sticky;
}
</style>
