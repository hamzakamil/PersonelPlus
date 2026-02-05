<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50">
    <!-- Sticky Header with Stepper -->
    <div class="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
      <div class="max-w-4xl mx-auto px-4 py-2">
        <!-- Title and Stepper in one row -->
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center shadow">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <h1 class="text-base font-bold text-gray-900">İşten Çıkış Talebi</h1>
            </div>
          </div>

          <!-- Stepper - Desktop -->
          <div class="hidden sm:flex items-center gap-2">
            <div
              v-for="(stepItem, index) in steps"
              :key="index"
              class="flex items-center"
            >
              <div
                class="flex items-center gap-1.5 px-3 py-1 rounded-full transition-all duration-300 text-xs"
                :class="getStepClass(index)"
              >
                <div
                  class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300"
                  :class="getStepNumberClass(index)"
                >
                  <svg v-if="step > index + 1" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span v-else>{{ index + 1 }}</span>
                </div>
                <span class="font-medium">{{ stepItem.title }}</span>
              </div>
              <svg v-if="index < steps.length - 1" class="w-4 h-4 mx-1 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          <!-- Stepper - Mobile -->
          <div class="sm:hidden flex items-center gap-2">
            <span class="text-xs font-medium text-gray-600">{{ step }}/{{ steps.length }}</span>
            <span class="text-xs font-medium text-red-600">{{ steps[step - 1].title }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-4 py-3 pb-16">
      <form @submit.prevent="handleSubmit">

        <!-- Step 1: Çalışan ve Çıkış Bilgileri -->
        <div v-show="step === 1" class="space-y-4">
          <!-- Çalışan Bilgileri Card -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div class="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2">
              <h2 class="text-sm font-semibold text-white flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Çalışan Seçimi
              </h2>
            </div>
            <div class="p-4 space-y-3">
              <!-- Şirket Seçimi (bayi_admin için) -->
              <div v-if="isBayiAdmin">
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Şirket <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <select
                    v-model="form.companyId"
                    @change="loadEmployees"
                    class="w-full pl-12 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white appearance-none cursor-pointer text-sm"
                    required
                  >
                    <option value="">Şirket Seçiniz</option>
                    <option v-for="comp in companies" :key="comp._id" :value="comp._id">
                      {{ comp.name }}
                    </option>
                  </select>
                  <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Çalışan Seçimi -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Çalışan <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <select
                    v-model="form.employeeId"
                    @change="loadEmployment"
                    class="w-full pl-12 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white appearance-none cursor-pointer text-sm"
                    required
                    :disabled="!form.companyId && isBayiAdmin"
                  >
                    <option value="">Çalışan Seçiniz</option>
                    <option v-for="emp in employees" :key="emp._id" :value="emp._id">
                      {{ emp.firstName }} {{ emp.lastName }} {{ emp.employeeNumber ? `(${emp.employeeNumber})` : '' }}
                    </option>
                  </select>
                  <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p v-if="employees.length === 0 && form.companyId" class="mt-2 text-sm text-amber-600 flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Bu şirkette aktif çalışan bulunmuyor
                </p>
              </div>

              <!-- Seçilen Çalışan Bilgisi -->
              <div v-if="selectedEmployee" class="p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
                    {{ selectedEmployee.firstName?.charAt(0) }}{{ selectedEmployee.lastName?.charAt(0) }}
                  </div>
                  <div class="flex-1">
                    <h4 class="text-sm font-semibold text-gray-900">{{ selectedEmployee.firstName }} {{ selectedEmployee.lastName }}</h4>
                    <p class="text-xs text-gray-500">{{ selectedEmployee.position || 'Pozisyon belirtilmemiş' }}</p>
                    <p v-if="employment" class="text-xs text-gray-400">
                      İşe Giriş: {{ formatDate(employment.hireDate) }} • Maaş: {{ employment.salaryAmount?.toLocaleString('tr-TR') }} TL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Çıkış Bilgileri Card -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div class="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2">
              <h2 class="text-sm font-semibold text-white flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Çıkış Bilgileri
              </h2>
            </div>
            <div class="p-4 space-y-3">
              <!-- Çıkış Tarihi -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Çıkış Tarihi <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    v-model="form.terminationDate"
                    @change="checkWarnings"
                    type="date"
                    class="w-full pl-12 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white text-sm"
                    required
                  />
                </div>
              </div>

              <!-- Çıkış Nedeni -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Çıkış Nedeni <span class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    class="relative flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-red-300"
                    :class="form.terminationReason === 'istifa' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'"
                  >
                    <input
                      type="radio"
                      v-model="form.terminationReason"
                      value="istifa"
                      @change="handleReasonChange"
                      class="sr-only"
                    />
                    <div
                      class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      :class="form.terminationReason === 'istifa' ? 'border-red-500 bg-red-500' : 'border-gray-300'"
                    >
                      <div v-if="form.terminationReason === 'istifa'" class="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <div>
                      <span class="font-medium text-gray-900">İstifa</span>
                      <p class="text-xs text-gray-500">Çalışan kendi isteğiyle ayrılıyor</p>
                    </div>
                  </label>

                  <label
                    class="relative flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-red-300"
                    :class="form.terminationReason === 'işten çıkarma' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'"
                  >
                    <input
                      type="radio"
                      v-model="form.terminationReason"
                      value="işten çıkarma"
                      @change="handleReasonChange"
                      class="sr-only"
                    />
                    <div
                      class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      :class="form.terminationReason === 'işten çıkarma' ? 'border-red-500 bg-red-500' : 'border-gray-300'"
                    >
                      <div v-if="form.terminationReason === 'işten çıkarma'" class="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <div>
                      <span class="font-medium text-gray-900">İşten Çıkarma</span>
                      <p class="text-xs text-gray-500">İşveren tarafından işten çıkarılıyor</p>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Detaylı Açıklama -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Detaylı Açıklama <span class="text-gray-400 font-normal">(Opsiyonel)</span>
                </label>
                <div class="relative">
                  <textarea
                    v-model="form.description"
                    rows="3"
                    class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none text-sm"
                    placeholder="Çıkış ile ilgili detaylı açıklama yazabilirsiniz..."
                  ></textarea>
                </div>
                <p class="mt-0.5 text-xs text-gray-400">
                  Ek bilgiler, özel durumlar veya notlar.
                </p>
              </div>

              <!-- Uyarılar -->
              <div v-if="warnings.length > 0" class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p class="text-xs font-semibold text-amber-800 mb-1">Dikkat Edilmesi Gerekenler:</p>
                    <ul class="list-disc list-inside text-sm text-amber-700 space-y-1">
                      <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Tazminat ve Belgeler -->
        <div v-show="step === 2" class="space-y-4">
          <!-- İstifa Dilekçesi (sadece istifa için) -->
          <div v-if="form.terminationReason === 'istifa'" class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div class="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2">
              <h2 class="text-sm font-semibold text-white flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                İstifa Dilekçesi
              </h2>
            </div>
            <div class="p-4">
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  @change="handleResignationFileChange"
                  class="hidden"
                  id="resignationFile"
                />
                <label for="resignationFile" class="cursor-pointer">
                  <div class="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p class="text-xs font-medium text-gray-700 mb-0.5">İstifa dilekçesini yükleyin</p>
                  <p class="text-xs text-gray-500">Dilekçenin fotoğrafı veya PDF dosyası</p>
                </label>

                <!-- Seçilen Dosya -->
                <div v-if="resignationFile" class="mt-2 p-2 bg-green-50 rounded border border-green-200 flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-xs text-green-700">{{ resignationFile.name }}</span>
                  </div>
                  <button
                    type="button"
                    @click="resignationFile = null"
                    class="text-red-500 hover:text-red-700"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <p class="mt-2 text-xs text-gray-400 text-center">
                Opsiyonel, yasal süreçler için önerilir.
              </p>
            </div>
          </div>

          <!-- Tazminat Hesaplama (sadece işten çıkarma için) -->
          <div v-if="form.terminationReason === 'işten çıkarma' && employment" class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div class="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2">
              <h2 class="text-sm font-semibold text-white flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Kıdem ve İhbar Tazminatı
              </h2>
            </div>
            <div class="p-4 space-y-3">
              <!-- Uyarı -->
              <div class="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <div class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-xs text-amber-700">
                    <span class="font-semibold">Önemli:</span> Bu hesaplama tahminidir. Hesaplamalar brüt ücret üzerinden yapılmaktadır.
                  </p>
                </div>
              </div>

              <!-- Çalışan Bilgileri Özeti -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div class="p-2 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500">İşe Giriş</p>
                  <p class="text-sm font-semibold text-gray-900">{{ formatDate(employment.hireDate) }}</p>
                </div>
                <div class="p-2 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500">Çıkış Tarihi</p>
                  <p class="text-sm font-semibold text-gray-900">{{ form.terminationDate ? formatDate(form.terminationDate) : '-' }}</p>
                </div>
                <div class="p-2 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500">Kayıtlı Maaş</p>
                  <p class="text-sm font-semibold text-gray-900">{{ employment.salaryAmount?.toLocaleString('tr-TR') }} TL</p>
                </div>
                <div class="p-2 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500">Maaş Tipi</p>
                  <p class="text-sm font-semibold text-gray-900">{{ employment.salaryType }}</p>
                </div>
              </div>

              <!-- Son Brüt Ücret -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Son Brüt Ücret (TL)
                  <span class="text-gray-400 font-normal ml-1">(Hesaplama için)</span>
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span class="text-gray-500 font-medium">₺</span>
                  </div>
                  <input
                    v-model="form.grossSalary"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Bordroda yazan brüt ücreti yazın"
                    class="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white text-sm"
                    @input="recalculateSeverance"
                  />
                </div>
                <p class="mt-0.5 text-xs text-gray-400">
                  Sadece yaklaşık hesaplama için kullanılır
                </p>
              </div>

              <!-- Tazminat Seçenekleri -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3">
                  Onaylayan Tarafından Yansıtılacak Tazminatlar:
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    class="flex items-center gap-2 p-2 border-2 rounded-lg cursor-pointer transition-all"
                    :class="form.severancePayApply ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:border-emerald-300'"
                  >
                    <input
                      v-model="form.severancePayApply"
                      type="checkbox"
                      class="sr-only"
                    />
                    <div
                      class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                      :class="form.severancePayApply ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'"
                    >
                      <svg v-if="form.severancePayApply" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span class="font-medium text-gray-900">Kıdem Tazminatı</span>
                      <p class="text-xs text-gray-500">Yansıtılsın</p>
                    </div>
                  </label>

                  <label
                    class="flex items-center gap-2 p-2 border-2 rounded-lg cursor-pointer transition-all"
                    :class="form.noticePayApply ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:border-emerald-300'"
                  >
                    <input
                      v-model="form.noticePayApply"
                      type="checkbox"
                      class="sr-only"
                    />
                    <div
                      class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                      :class="form.noticePayApply ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'"
                    >
                      <svg v-if="form.noticePayApply" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span class="font-medium text-gray-900">İhbar Tazminatı</span>
                      <p class="text-xs text-gray-500">Yansıtılsın</p>
                    </div>
                  </label>
                </div>
                <p class="mt-1 text-xs text-gray-400">
                  Onaylayan bu bilgiye göre tazminatı yansıtacaktır.
                </p>
              </div>

              <!-- Hesapla Butonu -->
              <button
                type="button"
                @click="calculateSeverance"
                :disabled="!form.grossSalary || form.grossSalary <= 0"
                class="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium text-sm rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Tahmini Hesapla
              </button>

              <!-- Hesaplama Sonuçları -->
              <div v-if="calculation" class="p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                <h4 class="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                  <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tahmini Hesaplama Sonuçları
                </h4>

                <!-- Kıdem Uyarısı -->
                <div v-if="calculation.severanceWarning" class="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p class="text-xs text-red-800 font-semibold flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {{ calculation.severanceWarning }}
                  </p>
                </div>

                <div class="space-y-1 text-xs">
                  <div class="flex justify-between py-1 border-b border-gray-200">
                    <span class="text-gray-600">Çalışma Süresi</span>
                    <span class="font-semibold text-gray-900">{{ calculation.yearsWorked }} yıl ({{ calculation.daysWorked }} gün)</span>
                  </div>
                  <div class="flex justify-between py-1 border-b border-gray-200">
                    <span class="text-gray-600">Tam Yıl Sayısı</span>
                    <span class="font-semibold text-gray-900">{{ calculation.fullYears }} yıl</span>
                  </div>
                  <div class="flex justify-between py-1 border-b border-gray-200">
                    <span class="text-gray-600">Brüt Ücret</span>
                    <span class="font-semibold text-gray-900">{{ calculation.grossSalary.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} TL</span>
                  </div>

                  <!-- Kıdem Tazminatı -->
                  <div class="py-1 border-b border-gray-200">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Kıdem Tazminatı <span class="text-gray-400">({{ calculation.fullYears }}×{{ calculation.grossSalary.toLocaleString('tr-TR') }})</span></span>
                      <span class="font-semibold" :class="calculation.severanceWarning ? 'text-red-500' : 'text-gray-900'">
                        {{ calculation.severanceWarning ? 'Hakedilmez' : (calculation.severancePay.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL') }}
                      </span>
                    </div>
                    <p class="text-xs" :class="form.severancePayApply ? 'text-emerald-600' : 'text-gray-400'">
                      → {{ form.severancePayApply ? 'Yansıtılacak' : 'Yansıtılmayacak' }}
                    </p>
                  </div>

                  <!-- İhbar Tazminatı -->
                  <div class="py-1 border-b border-gray-200">
                    <div class="flex justify-between">
                      <span class="text-gray-600">İhbar Tazminatı <span class="text-gray-400">({{ calculation.noticeWeeks }} hafta)</span></span>
                      <span class="font-semibold text-gray-900">
                        {{ calculation.noticePay.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} TL
                      </span>
                    </div>
                    <p class="text-xs" :class="form.noticePayApply ? 'text-emerald-600' : 'text-gray-400'">
                      → {{ form.noticePayApply ? 'Yansıtılacak' : 'Yansıtılmayacak' }}
                    </p>
                  </div>

                  <!-- Toplam -->
                  <div v-if="!calculation.severanceWarning" class="pt-2 flex justify-between items-center">
                    <span class="text-sm font-bold text-gray-900">TAHMİNİ TOPLAM</span>
                    <span class="text-lg font-bold text-emerald-600">
                      {{ calculation.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} TL
                    </span>
                  </div>
                </div>

                <p class="mt-2 text-xs text-gray-500 italic text-center">
                  * Bu hesaplama tahminidir.
                </p>
              </div>
            </div>
          </div>

          <!-- Özet Bilgiler -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div class="bg-gradient-to-r from-slate-600 to-gray-700 px-4 py-2">
              <h2 class="text-sm font-semibold text-white flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Özet Bilgiler
              </h2>
            </div>
            <div class="p-4">
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div class="p-2 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500">Çalışan</p>
                  <p class="text-sm font-semibold text-gray-900">{{ selectedEmployee?.firstName }} {{ selectedEmployee?.lastName }}</p>
                </div>
                <div class="p-2 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500">Çıkış Tarihi</p>
                  <p class="text-sm font-semibold text-gray-900">{{ form.terminationDate ? formatDate(form.terminationDate) : '-' }}</p>
                </div>
                <div class="p-2 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500">Çıkış Nedeni</p>
                  <p class="text-sm font-semibold text-gray-900 capitalize">{{ form.terminationReason || '-' }}</p>
                </div>
                <div class="p-2 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500">Açıklama</p>
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ form.description || 'Belirtilmedi' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </form>
    </div>

    <!-- Sticky Footer -->
    <div class="fixed bottom-0 left-[240px] right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 shadow-lg z-40">
      <div class="max-w-4xl mx-auto px-4 py-2 flex justify-between items-center">
        <button
          v-if="step > 1"
          type="button"
          @click="prevStep"
          class="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-all duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Geri
        </button>
        <button
          v-else
          type="button"
          @click="$router.go(-1)"
          class="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-all duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          İptal
        </button>

        <div class="flex items-center gap-2">
          <button
            v-if="step < totalSteps"
            type="button"
            @click="nextStep"
            class="flex items-center gap-1 px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 font-medium text-sm transition-all duration-200 shadow hover:shadow-md"
          >
            Devam Et
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            v-else
            type="button"
            @click="handleSubmit"
            :disabled="saving"
            class="flex items-center gap-1 px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 font-medium text-sm transition-all duration-200 shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="!saving" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ saving ? 'Gönderiliyor...' : 'Onaya Gönder' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const router = useRouter()
const toast = useToastStore()
const authStore = useAuthStore()

// Steps
const step = ref(1)
const totalSteps = 2
const steps = [
  { title: 'Çıkış Bilgileri' },
  { title: 'Tazminat ve Onay' }
]

// Data
const companies = ref([])
const employees = ref([])
const employment = ref(null)
const calculation = ref(null)
const warnings = ref([])
const saving = ref(false)
const resignationFile = ref(null)

const isBayiAdmin = computed(() => authStore.isBayiAdmin)

const form = ref({
  companyId: '',
  employeeId: '',
  terminationDate: '',
  terminationReason: '',
  description: '',
  grossSalary: '',
  severancePayApply: false,
  noticePayApply: false
})

const selectedEmployee = computed(() => {
  if (!form.value.employeeId) return null
  return employees.value.find(e => e._id === form.value.employeeId)
})

// Step navigation
const getStepClass = (index) => {
  if (step.value === index + 1) {
    return 'bg-red-100 text-red-700'
  } else if (step.value > index + 1) {
    return 'bg-green-100 text-green-700'
  }
  return 'bg-gray-100 text-gray-500'
}

const getStepNumberClass = (index) => {
  if (step.value === index + 1) {
    return 'bg-red-500 text-white'
  } else if (step.value > index + 1) {
    return 'bg-green-500 text-white'
  }
  return 'bg-gray-300 text-gray-600'
}

const validateStep = (stepNum) => {
  if (stepNum === 1) {
    if (!form.value.companyId) {
      toast.warning('Lütfen şirket seçiniz')
      return false
    }
    if (!form.value.employeeId) {
      toast.warning('Lütfen çalışan seçiniz')
      return false
    }
    if (!form.value.terminationDate) {
      toast.warning('Lütfen çıkış tarihini seçiniz')
      return false
    }
    if (!form.value.terminationReason) {
      toast.warning('Lütfen çıkış nedenini seçiniz')
      return false
    }
    return true
  }
  return true
}

const nextStep = () => {
  if (validateStep(step.value)) {
    if (step.value < totalSteps) {
      step.value++
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}

const prevStep = () => {
  if (step.value > 1) {
    step.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// API calls
const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data?.data || response.data
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  }
}

const loadEmployees = async () => {
  if (!form.value.companyId) {
    employees.value = []
    return
  }
  try {
    const response = await api.get('/employees', {
      params: { company: form.value.companyId }
    })
    const data = response.data?.data || response.data
    const employeeList = Array.isArray(data) ? data : []
    employees.value = employeeList.filter(emp => emp.status === 'active')
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
  }
}

const loadEmployment = () => {
  if (!form.value.employeeId) {
    employment.value = null
    return
  }
  const selectedEmp = employees.value.find(e => e._id === form.value.employeeId)
  if (selectedEmp) {
    employment.value = {
      hireDate: selectedEmp.hireDate,
      salaryAmount: selectedEmp.salary || 17002,
      salaryType: selectedEmp.isNetSalary ? 'net' : 'brüt'
    }
  } else {
    employment.value = null
  }
}

const handleReasonChange = () => {
  calculation.value = null
  resignationFile.value = null
  form.value.grossSalary = ''
  form.value.severancePayApply = false
  form.value.noticePayApply = false
}

const handleResignationFileChange = (event) => {
  resignationFile.value = event.target.files[0]
}

const calculateSeverance = async () => {
  if (!employment.value || !form.value.terminationDate) {
    toast.warning('Çıkış tarihi seçilmelidir')
    return
  }

  if (!form.value.grossSalary || parseFloat(form.value.grossSalary) <= 0) {
    toast.warning('Lütfen son brüt ücreti giriniz')
    return
  }

  try {
    const hire = new Date(employment.value.hireDate)
    const termination = new Date(form.value.terminationDate)
    const daysWorked = Math.floor((termination - hire) / (1000 * 60 * 60 * 24))
    const yearsWorked = daysWorked / 365.25

    const grossSalary = parseFloat(form.value.grossSalary)
    const fullYears = Math.floor(yearsWorked)

    let noticeWeeks = 0
    if (yearsWorked < 0.5) noticeWeeks = 2
    else if (yearsWorked < 1) noticeWeeks = 4
    else if (yearsWorked < 3) noticeWeeks = 6
    else noticeWeeks = 8

    let severancePay = 0
    let noticePay = 0
    let severanceWarning = null

    if (fullYears < 1) {
      severanceWarning = '1 yıl dolmadığı için kıdem tazminatı hakedilmez.'
      severancePay = 0
    } else {
      severancePay = fullYears * grossSalary
    }

    noticePay = noticeWeeks * (grossSalary / 30 * 7)

    calculation.value = {
      yearsWorked: yearsWorked.toFixed(2),
      daysWorked: daysWorked,
      fullYears: fullYears,
      severancePay: severancePay,
      severanceWarning: severanceWarning,
      noticeWeeks: noticeWeeks,
      noticePay: noticePay,
      grossSalary: grossSalary,
      severancePayApply: form.value.severancePayApply,
      noticePayApply: form.value.noticePayApply,
      total: severancePay + noticePay
    }
  } catch (error) {
    console.error('Hesaplama hatası:', error)
    toast.error('Hesaplama yapılırken bir hata oluştu')
  }
}

const recalculateSeverance = () => {
  if (calculation.value && form.value.grossSalary && parseFloat(form.value.grossSalary) > 0) {
    calculateSeverance()
  }
}

const checkWarnings = async () => {
  warnings.value = []

  if (!form.value.terminationDate) {
    return
  }

  try {
    const response = await api.post('/employment/validate-termination-date', {
      terminationDate: form.value.terminationDate
    })

    if (response.data.success) {
      warnings.value = response.data.warnings || []
    }
  } catch (error) {
    console.error('Uyarı kontrolü hatası:', error)
  }
}

const handleSubmit = async () => {
  saving.value = true
  try {
    if (!form.value.employeeId || !form.value.companyId || !form.value.terminationDate || !form.value.terminationReason) {
      toast.warning('Tüm zorunlu alanlar doldurulmalıdır')
      return
    }

    const formData = new FormData()
    formData.append('employeeId', form.value.employeeId)
    // companyId object veya string olabilir, her zaman string olarak gönder
    const companyIdStr = typeof form.value.companyId === 'object' ? form.value.companyId._id : form.value.companyId
    formData.append('companyId', companyIdStr)
    formData.append('terminationDate', form.value.terminationDate)
    formData.append('terminationReason', form.value.terminationReason)

    if (form.value.description && form.value.description.trim()) {
      formData.append('description', form.value.description.trim())
    }

    if (form.value.terminationReason === 'işten çıkarma') {
      formData.append('severancePayApply', form.value.severancePayApply ? 'true' : 'false')
      formData.append('noticePayApply', form.value.noticePayApply ? 'true' : 'false')
    }

    if (form.value.terminationReason === 'istifa' && resignationFile.value) {
      formData.append('resignationPhoto', resignationFile.value)
    }

    const response = await api.post('/employment/terminate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data && response.data.success) {
      if (response.data.data && response.data.data.warnings && response.data.data.warnings.length > 0) {
        toast.warning('Uyarılar: ' + response.data.data.warnings.join(', '))
      }
      toast.success('İşten çıkış talebi oluşturuldu')
      await router.push('/employment/list')
    } else {
      toast.error('İşlem başarısız oldu')
    }
  } catch (error) {
    console.error('İşten çıkış hatası:', error)
    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Hata Oluştu'
    toast.error(errorMessage)
  } finally {
    saving.value = false
  }
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR')
}

onMounted(async () => {
  if (isBayiAdmin.value) {
    await loadCompanies()
  } else if (authStore.user?.company) {
    // company object veya string olabilir
    const company = authStore.user.company
    form.value.companyId = typeof company === 'object' ? company._id : company
    await loadEmployees()
  }
})
</script>
