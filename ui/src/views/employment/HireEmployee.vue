<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
    <!-- Sticky Header -->
    <div class="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm border-b">
      <div class="max-w-5xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h1 class="text-lg font-bold text-gray-900">
                {{ isRehireMode ? 'Tekrar İşe Alma' : 'İşe Giriş İşlemi' }}
              </h1>
              <p class="text-xs text-gray-500">
                {{ isRehireMode ? 'Eski personeli yeniden işe al' : 'Yeni personel kaydı oluştur' }}
              </p>
            </div>
          </div>

          <!-- Stepper -->
          <div class="hidden md:flex items-center gap-2">
            <template v-for="(step, index) in steps" :key="index">
              <button
                @click="currentStep >= index ? currentStep = index : null"
                :disabled="currentStep < index"
                class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                :class="currentStep === index
                  ? 'bg-blue-600 text-white shadow-md'
                  : currentStep > index
                    ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
              >
                <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  :class="currentStep > index ? 'bg-green-500 text-white' : currentStep === index ? 'bg-white/20' : 'bg-gray-300'">
                  <svg v-if="currentStep > index" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span v-else>{{ index + 1 }}</span>
                </span>
                {{ step.title }}
              </button>
              <svg v-if="index < steps.length - 1" class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </template>
          </div>

          <!-- Mobile Step Indicator -->
          <div class="md:hidden flex items-center gap-2">
            <span class="text-xs font-medium text-gray-500">Adım {{ currentStep + 1 }}/{{ steps.length }}</span>
            <div class="flex gap-1">
              <div v-for="(_, index) in steps" :key="index"
                class="w-2 h-2 rounded-full transition-all"
                :class="currentStep >= index ? 'bg-blue-600' : 'bg-gray-300'" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-5xl mx-auto px-6 py-4">
      <!-- Rehire Bilgi Bandı -->
      <div v-if="isRehireMode" class="mb-4">
        <div class="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-emerald-800">Tekrar İşe Alma</h3>
              <p class="text-xs text-emerald-600">Bu çalışan daha önce işten ayrılmıştı.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Şirket Seçimi (bayi_admin için - her zaman görünür) -->
      <div v-if="isBayiAdmin" class="mb-4">
        <div class="bg-white rounded-xl shadow-sm border p-3">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <label class="text-sm font-semibold text-gray-900">Şirket Seçimi</label>
          </div>
          <select
            v-model="form.companyId"
            @change="handleCompanyChange"
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            required
          >
            <option value="">Şirket seçiniz...</option>
            <option v-for="comp in companies" :key="comp._id" :value="comp._id">
              {{ comp.name }}
            </option>
          </select>
        </div>
      </div>

      <form @submit.prevent="handleSubmit">
        <!-- Step 1: Kişisel ve İş Bilgileri -->
        <div v-show="currentStep === 0" class="space-y-3">
          <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2">
              <h2 class="text-white font-semibold text-sm flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Kişisel ve İş Bilgileri
              </h2>
            </div>
            <div class="p-4">
              <div class="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-2">
                <!-- İşe Giriş Tarihi + Uyarı -->
                <div class="space-y-1">
                  <label class="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                    İşe Giriş Tarihi <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.startDate"
                    @change="checkWarnings"
                    type="date"
                    class="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    required
                  />
                  <!-- Tarih Uyarısı -->
                  <div v-if="warnings.length > 0" class="bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-center gap-1">
                    <svg class="w-3 h-3 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    <span class="text-[10px] text-amber-700 leading-tight">{{ warnings.join(' | ') }}</span>
                  </div>
                  <div v-else-if="isExceptionSector" class="bg-blue-50 border border-blue-200 rounded px-2 py-1 flex items-center gap-1">
                    <svg class="w-3 h-3 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                    </svg>
                    <span class="text-[10px] text-blue-700">İstisna sektör</span>
                  </div>
                </div>
                <!-- Ad Soyad -->
                <div class="space-y-1">
                  <label class="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                    Adı Soyadı <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.fullName"
                    @keyup="formatFullName"
                    type="text"
                    class="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="Ad Soyad"
                    required
                  />
                </div>
                <!-- TC Kimlik No -->
                <div class="space-y-1">
                  <label class="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                    TC Kimlik No <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <input
                      v-model="form.tckn"
                      @input="formatTCKimlik"
                      @blur="checkTCKN"
                      type="text"
                      maxlength="11"
                      class="w-full px-2.5 py-1.5 bg-gray-50 border rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      :class="tcknWarning ? 'border-red-300 bg-red-50' : 'border-gray-200'"
                      placeholder="11 haneli"
                      required
                    />
                    <div v-if="tcknChecking" class="absolute inset-y-0 right-0 pr-2 flex items-center">
                      <div class="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                  </div>
                  <p v-if="tcknWarning" class="text-[10px] text-red-600 font-medium">{{ tcknWarning }}</p>
                </div>
                <!-- E-posta -->
                <div class="space-y-1">
                  <label class="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                    E-posta
                  </label>
                  <input
                    v-model="form.email"
                    type="email"
                    class="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="ornek@email.com"
                  />
                </div>
                <!-- Telefon -->
                <div class="space-y-1">
                  <PhoneInput
                    v-model="form.phone"
                    label="Telefon"
                    :required="true"
                    placeholder="5XX XXX XX XX"
                    hint=""
                    :compact="true"
                  />
                </div>
                <!-- Belgeler Butonu -->
                <div class="space-y-1">
                  <label class="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">&nbsp;</label>
                  <button
                    type="button"
                    @click="showDocumentsModal = true"
                    class="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-50 text-blue-700 border border-or200 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                    title="Gerekli Belgeler"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Gerekli Belgeler
                  </button>
                </div>
              </div>

              <!-- Eski Çalışan Uyarısı -->
              <div v-if="previousEmployee && !previousEmployee.isActive" class="mt-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-3">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-semibold text-amber-900 text-sm">Bu kişi daha önce çalışmış</h4>
                    <p class="text-xs text-amber-700 mt-1">
                      {{ previousEmployee.fullName }} - Son çıkış: {{ formatDate(previousEmployee.lastTerminationDate) }}
                    </p>
                    <div class="flex gap-2 mt-3">
                      <button type="button" @click="reactivateExisting = true"
                        class="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                        :class="reactivateExisting ? 'bg-blue-600 text-white' : 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-50'">
                        ✓ Mevcut kaydı aktifleştir
                      </button>
                      <button type="button" @click="reactivateExisting = false"
                        class="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                        :class="!reactivateExisting ? 'bg-gray-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'">
                        + Yeni kayıt oluştur
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- İş Bilgileri Bölümü -->
              <div class="mt-4 pt-4 border-t border-gray-200 pb-2">
                <h3 class="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  İş Bilgileri
                </h3>
                <div class="space-y-3 min-h-[200px]">
                  <!-- Görevi (SGK Meslek Kodu) - Üstte -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Görevi (SGK Meslek Kodu) <span class="text-red-500">*</span>
                      </label>
                      <span v-if="sgkJobCodesCount > 0" class="text-[10px] text-gray-500">
                        {{ sgkJobCodesCount }} meslek kodu yüklü
                      </span>
                    </div>
                    <div class="relative" ref="jobCodeDropdownRef">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                        class="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder="Meslek adı veya kodu yazarak arayın..."
                        autocomplete="off"
                      />
                      <!-- Loading indicator -->
                      <div v-if="jobCodeSearching" class="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <div class="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      </div>
                      <!-- Clear button -->
                      <button
                        v-else-if="jobCodeSearch"
                        type="button"
                        @click="clearJobCode"
                        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      <!-- Dropdown - Aşağı açılır -->
                      <div
                        v-if="showJobCodeDropdown && (jobCodeSuggestions.length > 0 || jobCodeSearch.length >= 2)"
                        class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      >
                        <div v-if="jobCodeSuggestions.length === 0 && jobCodeSearch.length >= 2 && !jobCodeSearching" class="px-4 py-3 text-sm text-gray-500 text-center">
                          <svg class="w-6 h-6 mx-auto mb-1 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          "{{ jobCodeSearch }}" için sonuç bulunamadı
                        </div>
                        <div v-else-if="jobCodeSearch.length < 2 && !selectedJobCode" class="px-4 py-2 text-sm text-gray-500 text-center">
                          En az 2 karakter yazın...
                        </div>
                        <button
                          v-for="(job, index) in jobCodeSuggestions"
                          :key="job.kod"
                          type="button"
                          @click="selectJobCode(job)"
                          @mouseenter="highlightedJobCodeIndex = index"
                          class="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                          :class="highlightedJobCodeIndex === index ? 'bg-blue-50' : ''"
                        >
                          <span class="flex-shrink-0 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded">
                            {{ job.kod }}
                          </span>
                          <span class="text-sm text-gray-700 truncate">{{ job.ad }}</span>
                        </button>
                      </div>
                    </div>

                    <!-- Seçilen meslek kodu -->
                    <div v-if="selectedJobCode" class="flex items-center gap-2 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <svg class="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span class="text-xs font-mono text-blue-700">{{ selectedJobCode.kod }}</span>
                      <span class="text-xs text-blue-800 flex-1 truncate">{{ selectedJobCode.ad }}</span>
                      <button type="button" @click="clearJobCode" class="text-blue-600 hover:text-blue-800">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <!-- Stajyer Uyarısı -->
                    <div v-if="internWarning" class="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-300 rounded-lg">
                      <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                      <div>
                        <p class="text-sm font-semibold text-amber-800">DİKKAT</p>
                        <p class="text-xs text-amber-700 mt-0.5">{{ internWarning }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- SGK İşyeri ve Bölüm - Alt satırda yan yana -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <!-- SGK İşyeri -->
                    <div class="space-y-1">
                      <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        SGK İşyeri <span class="text-red-500">*</span>
                      </label>
                      <div v-if="sgkWorkplaces.length > 1">
                        <select
                          v-model="form.workplaceId"
                          @change="loadSections"
                          class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        >
                          <option value="">İşyeri seçiniz...</option>
                          <option v-for="wp in sgkWorkplaces" :key="wp._id" :value="wp._id">
                            {{ wp.name }} {{ wp.sgkRegisterNumber ? `(${wp.sgkRegisterNumber})` : '' }}
                          </option>
                        </select>
                        <p class="text-[10px] text-amber-600 mt-0.5">Birden fazla işyeri var</p>
                      </div>
                      <div v-else-if="sgkWorkplaces.length === 1" class="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p class="text-sm text-emerald-800 font-medium">{{ sgkWorkplaces[0]?.name }}</p>
                        <p v-if="sgkWorkplaces[0]?.sgkRegisterNumber" class="text-xs text-emerald-600">{{ sgkWorkplaces[0].sgkRegisterNumber }}</p>
                      </div>
                      <div v-else-if="form.companyId" class="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                        <p class="text-xs text-red-700">SGK işyeri tanımlanmamış</p>
                      </div>
                    </div>

                    <!-- Bölüm -->
                    <div v-if="sections.length > 0" class="space-y-1">
                      <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Bölüm / Kısım
                      </label>
                      <select
                        v-model="form.sectionId"
                        class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="">Bölüm seçiniz (opsiyonel)</option>
                        <option v-for="section in sections" :key="section._id" :value="section._id">
                          {{ section.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Ücret ve Sözleşme -->
        <div v-show="currentStep === 1" class="space-y-3">
          <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div class="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2">
              <h2 class="text-white font-semibold text-sm flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ücret ve Sözleşme
              </h2>
            </div>
            <div class="p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- Ücret Miktarı -->
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Ücret Miktarı
                    <span v-if="companyPayrollType" class="font-normal text-gray-500 normal-case">
                      ({{ companyPayrollType === 'BRUT' ? 'Brüt' : 'Net' }})
                    </span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span class="text-gray-400 text-sm font-medium">₺</span>
                    </div>
                    <input
                      v-model="form.salaryAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                      :placeholder="formattedMinimumWage"
                    />
                  </div>
                  <p class="text-[10px] text-amber-600">Boş = asgari ücret ({{ formattedMinimumWage }} ₺)</p>
                </div>

                <!-- Sözleşme Tipi -->
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Sözleşme Tipi <span class="text-red-500">*</span>
                  </label>
                  <div class="grid grid-cols-4 gap-2">
                    <button type="button" @click="form.employmentType = 'BELİRSİZ_SÜRELİ'"
                      class="px-2 py-2 rounded-lg text-xs font-medium transition-all border"
                      :class="form.employmentType === 'BELİRSİZ_SÜRELİ'
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300'"
                      title="Normal / Daimi">
                      Belirsiz Süreli
                    </button>
                    <button type="button" @click="form.employmentType = 'BELİRLİ_SÜRELİ'"
                      class="px-2 py-2 rounded-lg text-xs font-medium transition-all border"
                      :class="form.employmentType === 'BELİRLİ_SÜRELİ'
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300'"
                      title="Proje bazlı, Süreli İş">
                      Belirli Süreli
                    </button>
                    <button type="button" @click="selectContractType('KISMİ_SÜRELİ')"
                      class="px-2 py-2 rounded-lg text-xs font-medium transition-all border"
                      :class="form.employmentType === 'KISMİ_SÜRELİ'
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300'"
                      title="Part Time">
                      Kısmi Süreli
                    </button>
                    <button type="button" @click="form.employmentType = 'UZAKTAN_ÇALIŞMA'"
                      class="px-2 py-2 rounded-lg text-xs font-medium transition-all border"
                      :class="form.employmentType === 'UZAKTAN_ÇALIŞMA'
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300'"
                      title="Freelance">
                      Uzaktan Çalışma
                    </button>
                  </div>
                </div>

                <!-- Belirli Süreli Sözleşme Bitiş Tarihi -->
                <div v-if="form.employmentType === 'BELİRLİ_SÜRELİ'" class="mt-3">
                  <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Sözleşme Bitiş Tarihi <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.contractEndDate"
                    type="date"
                    class="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                    :min="form.startDate || undefined"
                  />
                  <p class="text-[10px] text-amber-600 mt-1">Belirli süreli sözleşmenin sona ereceği tarih</p>
                </div>
              </div>

              <!-- Emeklilik Durumu -->
              <div class="mt-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.isRetired"
                    class="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                  />
                  <span class="text-sm font-medium text-gray-700">Emekli mi?</span>
                </label>
                <p class="mt-1 text-xs text-gray-500 ml-6">Çalışan emekli ise işaretleyiniz</p>
              </div>

              <!-- Uyarılar -->
              <div v-if="warnings.length > 0" class="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  <div>
                    <ul class="space-y-0.5">
                      <li v-for="(warning, index) in warnings" :key="index" class="text-xs text-amber-700">• {{ warning }}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- İstisna Sektör -->
              <div v-if="isExceptionSector" class="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <p class="text-xs text-blue-800 flex items-center gap-2">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                  </svg>
                  İstisna sektör (İnşaat/Balıkçılık)
                </p>
              </div>

              <!-- Özet Bilgiler -->
              <div class="mt-3 bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 class="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">İşlem Özeti</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <p class="text-gray-500">Ad Soyad</p>
                    <p class="font-medium text-gray-900">{{ form.fullName || '-' }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">TC Kimlik</p>
                    <p class="font-medium text-gray-900 font-mono">{{ form.tckn || '-' }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Görevi</p>
                    <p class="font-medium text-gray-900">{{ selectedJobCode ? `${selectedJobCode.kod} - ${selectedJobCode.ad}` : (form.sgkJobCode || '-') }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Başlangıç</p>
                    <p class="font-medium text-gray-900">{{ form.startDate ? new Date(form.startDate).toLocaleDateString('tr-TR') : '-' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Footer -->
        <div class="sticky bottom-0 mt-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-3">
          <div class="flex items-center justify-between">
            <button
              type="button"
              @click="currentStep > 0 ? currentStep-- : $router.go(-1)"
              class="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              {{ currentStep === 0 ? 'İptal' : 'Geri' }}
            </button>

            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-500 hidden md:block">
                {{ currentStep + 1 }} / {{ steps.length }} adım tamamlandı
              </span>

              <button
                v-if="currentStep < steps.length - 1"
                type="button"
                @click="nextStep"
                class="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all"
              >
                Devam Et
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                v-else
                type="submit"
                :disabled="saving"
                class="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="!saving" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div v-else class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                {{ saving ? 'Gönderiliyor...' : 'Onaya Gönder' }}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>

    <!-- Gerekli Belgeler Modal -->
    <Teleport to="body">
      <div v-if="showDocumentsModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showDocumentsModal = false"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">

          <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4">
            <h3 class="text-white font-semibold flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              İşe Giriş İçin Gerekli Belgeler
            </h3>
          </div>
          <div class="p-5">
            <ul class="space-y-2 text-sm text-gray-700">
              <li v-for="(doc, index) in requiredDocuments" :key="index" class="flex items-start gap-2">
                <span class="text-blue-500 mt-0.5">•</span>
                {{ doc }}
              </li>
            </ul>

            <div class="mt-6 flex gap-3">
              <button
                type="button"
                @click="printDocumentsList"
                class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Yazdır
              </button>
              <button
                type="button"
                @click="sendViaWhatsApp"
                :disabled="!form.phone || form.phone.length < 10"
                class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp Gönder
              </button>
            </div>
          </div>
          <button
            type="button"
            @click="showDocumentsModal = false"
            class="absolute top-3 right-3 text-white/80 hover:text-white"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Başarı Modal - İş Sözleşmesi ve Başvuru Formu İndirme -->
    <Teleport to="body">
      <div v-if="showSuccessModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 text-center">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">İşe Giriş Kaydı Oluşturuldu</h3>
          <p class="text-sm text-gray-600 mb-4">Kayıt onay bekliyor. Aşağıdaki belgeleri indirebilirsiniz.</p>

          <!-- Belge İndirme Butonları -->
          <div class="space-y-2 mb-4">
            <a
              v-if="contractDownloadUrl"
              :href="'http://localhost:3333' + contractDownloadUrl"
              download
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              İş Sözleşmesi İndir
            </a>
            <a
              v-if="applicationFormUrl"
              :href="'http://localhost:3333' + applicationFormUrl"
              download
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              İş Başvuru Formu İndir
            </a>
          </div>

          <button
            @click="router.push('/employment/list')"
            class="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Listeye Dön
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Part-Time Detay Modal -->
    <Teleport to="body">
      <div v-if="showPartTimeModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="cancelPartTime"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Kısmi Süreli Çalışma Detayları</h3>

          <!-- Haftalık Saat -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Haftalık Toplam Çalışma Saati</label>
            <input
              type="number"
              v-model.number="partTimeDetails.weeklyHours"
              @input="validateWeeklyHours"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Örn: 20"
              min="1"
              max="44"
            />
            <p v-if="partTimeWarning" class="text-amber-600 text-sm mt-1 flex items-center gap-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              {{ partTimeWarning }}
            </p>
            <p class="text-gray-500 text-xs mt-1">Tam zamanlı: 45 saat | Part-time: Max 30 saat</p>
          </div>

          <!-- Çalışma Günleri -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Çalışma Günleri</label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="day in weekDays"
                :key="day"
                class="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg cursor-pointer transition-colors"
                :class="partTimeDetails.workDays.includes(day)
                  ? 'bg-violet-100 border-violet-500 text-violet-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-violet-300'"
              >
                <input type="checkbox" :value="day" v-model="partTimeDetails.workDays" class="sr-only" />
                <span class="text-sm font-medium">{{ day.slice(0, 3) }}</span>
              </label>
            </div>
            <p class="text-gray-500 text-xs mt-1">Seçili: {{ partTimeDetails.workDays.length }} gün</p>
          </div>

          <!-- Günlük Saat -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Günlük Çalışma Saati</label>
            <input
              type="number"
              v-model.number="partTimeDetails.dailyHours"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Örn: 4"
              min="1"
              max="11"
            />
          </div>

          <!-- Ücret Türü -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Ücretlendirme Tercihi</label>
            <div class="flex gap-3">
              <label
                class="flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors"
                :class="partTimeDetails.paymentType === 'monthly'
                  ? 'bg-violet-100 border-violet-500 text-violet-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-violet-300'"
              >
                <input type="radio" value="monthly" v-model="partTimeDetails.paymentType" class="sr-only" />
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="font-medium">Aylık Sabit</span>
              </label>
              <label
                class="flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors"
                :class="partTimeDetails.paymentType === 'hourly'
                  ? 'bg-violet-100 border-violet-500 text-violet-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-violet-300'"
              >
                <input type="radio" value="hourly" v-model="partTimeDetails.paymentType" class="sr-only" />
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="font-medium">Saatlik</span>
              </label>
            </div>
          </div>

          <!-- Özet -->
          <div
            v-if="partTimeDetails.weeklyHours && partTimeDetails.workDays.length && partTimeDetails.dailyHours"
            class="bg-gray-50 rounded-lg p-4 mb-4"
          >
            <h4 class="font-medium text-gray-900 mb-2">Özet</h4>
            <ul class="text-sm text-gray-700 space-y-1">
              <li class="flex justify-between">
                <span>Haftalık Çalışma:</span>
                <span class="font-medium">{{ partTimeDetails.weeklyHours }} saat</span>
              </li>
              <li class="flex justify-between">
                <span>Çalışma Günleri:</span>
                <span class="font-medium">{{ partTimeDetails.workDays.map(d => d.slice(0,3)).join(', ') }}</span>
              </li>
              <li class="flex justify-between">
                <span>Günlük Çalışma:</span>
                <span class="font-medium">{{ partTimeDetails.dailyHours }} saat</span>
              </li>
              <li class="flex justify-between">
                <span>Ödeme Şekli:</span>
                <span class="font-medium">{{ partTimeDetails.paymentType === 'monthly' ? 'Aylık Sabit' : 'Saatlik' }}</span>
              </li>
            </ul>
          </div>

          <!-- Butonlar -->
          <div class="flex gap-3">
            <button
              @click="cancelPartTime"
              class="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              @click="confirmPartTime"
              :disabled="!isPartTimeValid"
              class="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl font-medium text-sm hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Onayla
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import PhoneInput from '@/components/PhoneInput.vue'

const router = useRouter()
const route = useRoute()
const toast = useToastStore()
const authStore = useAuthStore()
const companies = ref([])

// Rehire modu
const isRehireMode = ref(false)
const rehireEmployeeId = ref(null)
const workplaces = ref([])
const sections = ref([])
const warnings = ref([])
const isExceptionSector = ref(false)
const saving = ref(false)
const currentStep = ref(0)
const minimumWage = ref({ net: 0, brut: 0 })
const showDocumentsModal = ref(false)
const showSuccessModal = ref(false)
const contractDownloadUrl = ref('')
const applicationFormUrl = ref('')

// Part-time detayları
const partTimeDetails = ref({
  weeklyHours: null,
  workDays: [],
  dailyHours: null,
  paymentType: 'monthly'
})
const showPartTimeModal = ref(false)
const partTimeWarning = ref('')
const weekDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

// Gerekli belgeler listesi
const requiredDocuments = [
  'T.C. Kimlik Kartı Fotokopisi',
  'İkametgâh Belgesi (e-Devlet)',
  'Adli Sicil Kaydı (e-Devlet)',
  'Diploma Fotokopisi (varsa)',
  'Sağlık Raporu-Kan grubu kartı dahil (OSGB/İşyeri Hekimi)',
  'Askerlik Durum Belgesi (erkek adaylar için)',
  '2 Adet Vesikalık Fotoğraf'
]

const steps = [
  { title: 'Bilgiler', description: 'Kişisel ve iş bilgileri' },
  { title: 'Ücret', description: 'Ücret ve sözleşme' }
]

const isBayiAdmin = computed(() => authStore.isBayiAdmin)

const currentMinimumWage = computed(() => {
  const type = companyPayrollType.value || 'NET'
  return type === 'BRUT' ? minimumWage.value.brut : minimumWage.value.net
})

const formattedMinimumWage = computed(() => {
  return currentMinimumWage.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

const form = ref({
  companyId: '',
  fullName: '',
  tckn: '',
  sgkJobCode: '',
  email: '',
  phone: '',
  workplaceId: '',
  sectionId: '',
  salaryAmount: '',
  employmentType: 'BELİRSİZ_SÜRELİ',
  contractEndDate: '',
  startDate: '',
  isRetired: false
})

const companyPayrollType = ref(null)
const tcknWarning = ref('')
const tcknChecking = ref(false)
const previousEmployee = ref(null)
const reactivateExisting = ref(false)

// SGK Meslek Kodu autocomplete
const jobCodeSearch = ref('')
const jobCodeSuggestions = ref([])
const jobCodeSearching = ref(false)
const showJobCodeDropdown = ref(false)
const selectedJobCode = ref(null)
const highlightedJobCodeIndex = ref(-1)
const jobCodeDropdownRef = ref(null)
const sgkJobCodesCount = ref(0)
const internWarning = ref('') // Stajyer uyarısı
let jobCodeSearchTimeout = null

// Step validation
const nextStep = () => {
  if (currentStep.value === 0) {
    // İşe giriş tarihi kontrolü
    if (!form.value.startDate) {
      toast.error('İşe giriş tarihi zorunludur')
      return
    }

    // Kişisel bilgiler kontrolü
    if (!form.value.fullName?.trim()) {
      toast.error('Adı Soyadı zorunludur')
      return
    }
    const cleanTCKN = (form.value.tckn || '').replace(/\D/g, '')
    if (cleanTCKN.length !== 11) {
      toast.error('TC Kimlik No 11 haneli olmalıdır')
      return
    }
    if (tcknWarning.value) {
      toast.error(tcknWarning.value)
      return
    }
    // PhoneInput component normalizes to 05XXXXXXXXX format
    const phone = form.value.phone || ''
    if (phone.length !== 11 || !phone.startsWith('05')) {
      toast.error('Telefon numarası zorunludur ve 05 ile başlayan 11 haneli olmalıdır')
      return
    }

    // İş bilgileri kontrolü
    if (sgkWorkplaces.value.length === 0) {
      toast.error('Bu şirket için SGK işyeri tanımlanmamış')
      return
    }
    if (sgkWorkplaces.value.length > 1 && !form.value.workplaceId) {
      toast.error('SGK İşyeri seçimi zorunludur')
      return
    }
    if (!selectedJobCode.value && !form.value.sgkJobCode?.trim()) {
      toast.error('Görevi (SGK Meslek Kodu) zorunludur. Listeden bir meslek seçin.')
      return
    }
  }

  currentStep.value++
}

const formatTCKimlik = (event) => {
  let value = event.target.value.replace(/\D/g, '')
  if (value.length > 11) value = value.substring(0, 11)
  form.value.tckn = value
  if (value.length !== 11) {
    tcknWarning.value = ''
  }
}

const checkTCKN = async () => {
  const tckn = form.value.tckn?.replace(/\D/g, '')
  if (!tckn || tckn.length !== 11) {
    tcknWarning.value = ''
    previousEmployee.value = null
    reactivateExisting.value = false
    return
  }

  const companyId = form.value.companyId || authStore.user?.company
  if (!companyId) return

  tcknChecking.value = true
  previousEmployee.value = null
  reactivateExisting.value = false

  try {
    const response = await api.post('/employment/check-tc', {
      tcKimlikNo: tckn,
      companyId: companyId._id || companyId
    })

    if (response.data.success && response.data.hasHistory) {
      previousEmployee.value = response.data.previousEmployee
      tcknWarning.value = ''
      if (response.data.previousEmployee.isActive) {
        tcknWarning.value = 'Bu TC Kimlik No ile aktif bir çalışan zaten mevcut'
      }
    } else {
      previousEmployee.value = null
      tcknWarning.value = ''
    }

    try {
      const oldResponse = await api.get('/employment/check-tckn', {
        params: { tckn, companyId }
      })
      if (oldResponse.data.exists) {
        tcknWarning.value = oldResponse.data.message
        previousEmployee.value = null
      }
    } catch (oldError) {
      console.error('Eski TCKN kontrolü hatası:', oldError)
    }
  } catch (error) {
    console.error('TC kontrol hatası:', error)
    tcknWarning.value = ''
    previousEmployee.value = null
  } finally {
    tcknChecking.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })
}

// formatPhone function removed - PhoneInput component handles formatting

const formatFullName = () => {
  if (form.value.fullName) {
    form.value.fullName = form.value.fullName.toLocaleUpperCase('tr-TR')
  }
}

// SGK Meslek Kodu arama fonksiyonları
const searchJobCodes = async () => {
  // Debounce
  if (jobCodeSearchTimeout) {
    clearTimeout(jobCodeSearchTimeout)
  }

  const searchTerm = jobCodeSearch.value.trim()

  if (searchTerm.length < 2) {
    jobCodeSuggestions.value = []
    return
  }

  jobCodeSearchTimeout = setTimeout(async () => {
    jobCodeSearching.value = true
    highlightedJobCodeIndex.value = -1

    try {
      const response = await api.get('/sgk-meslek-kodlari', {
        params: { search: searchTerm, limit: 20 }
      })

      // api.js interceptor array'i unwrap eder, response.data direkt array olur
      if (Array.isArray(response.data)) {
        jobCodeSuggestions.value = response.data
      } else if (response.data?.success) {
        jobCodeSuggestions.value = response.data.data || []
      }
    } catch (error) {
      console.error('Meslek kodu arama hatası:', error)
      jobCodeSuggestions.value = []
    } finally {
      jobCodeSearching.value = false
    }
  }, 300)
}

const selectJobCode = (job) => {
  selectedJobCode.value = job
  form.value.sgkJobCode = `${job.kod} - ${job.ad}`
  jobCodeSearch.value = `${job.kod} - ${job.ad}`
  showJobCodeDropdown.value = false
  jobCodeSuggestions.value = []

  // Stajyer (Öğrenci) kontrolü - 9901.02
  if (job.kod === '9901.02') {
    internWarning.value = 'Meslek Lisesi öğrencilerinin staj kapsamındaki SGK işlemleri okul tarafından yapılmaktadır (3308 sayılı Mesleki Eğitim Kanunu). Çalışanın bu kapsamda olup olmadığını mutlaka teyit ediniz.'
  } else {
    internWarning.value = ''
  }
}

const clearJobCode = () => {
  selectedJobCode.value = null
  form.value.sgkJobCode = ''
  jobCodeSearch.value = ''
  jobCodeSuggestions.value = []
  highlightedJobCodeIndex.value = -1
  internWarning.value = ''
}

const navigateJobCodes = (direction) => {
  if (jobCodeSuggestions.value.length === 0) return

  highlightedJobCodeIndex.value += direction

  if (highlightedJobCodeIndex.value < 0) {
    highlightedJobCodeIndex.value = jobCodeSuggestions.value.length - 1
  } else if (highlightedJobCodeIndex.value >= jobCodeSuggestions.value.length) {
    highlightedJobCodeIndex.value = 0
  }
}

const selectHighlightedJobCode = () => {
  if (highlightedJobCodeIndex.value >= 0 && highlightedJobCodeIndex.value < jobCodeSuggestions.value.length) {
    selectJobCode(jobCodeSuggestions.value[highlightedJobCodeIndex.value])
  }
}

const loadSgkJobCodesCount = async () => {
  try {
    const response = await api.get('/sgk-meslek-kodlari/stats/count')
    if (response.data.success) {
      sgkJobCodesCount.value = response.data.count
    }
  } catch (error) {
    // Sessizce devam et - meslek kodları henüz yüklenmemiş olabilir
    sgkJobCodesCount.value = 0
  }
}

// Dropdown dışına tıklandığında kapat
const handleClickOutside = (event) => {
  if (jobCodeDropdownRef.value && !jobCodeDropdownRef.value.contains(event.target)) {
    showJobCodeDropdown.value = false
  }
}

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data?.data || response.data
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  }
}

const loadCompanySettings = async (companyId) => {
  if (!companyId) {
    companyPayrollType.value = null
    return
  }
  // companyId obje veya string olabilir, güvenli şekilde ID'yi al
  const id = companyId?._id || companyId
  try {
    const response = await api.get(`/companies/${id}`)
    companyPayrollType.value = response.data.payrollCalculationType || 'NET'
    console.log('Şirket ücret tipi yüklendi:', companyPayrollType.value)
  } catch (error) {
    console.error('Şirket ayarları yüklenemedi:', error)
    companyPayrollType.value = 'NET'
  }
}

const loadMinimumWage = async () => {
  try {
    const response = await api.get('/global-settings/minimum-wage')
    if (response.data.success) {
      minimumWage.value = response.data.data
    }
  } catch (error) {
    console.error('Asgari ücret yüklenemedi:', error)
    // Varsayılan değerler (2026)
    minimumWage.value = { net: 28007.50, brut: 33030.00 }
  }
}

const handleCompanyChange = async () => {
  await loadWorkplaces()
  await loadCompanySettings(form.value.companyId)
}

const sgkWorkplaces = computed(() => workplaces.value)

const loadWorkplaces = async () => {
  if (!form.value.companyId) {
    workplaces.value = []
    form.value.workplaceId = ''
    return
  }
  try {
    const params = { company: form.value.companyId }
    const response = await api.get('/workplaces', { params })
    const data = response.data?.data || response.data
    workplaces.value = Array.isArray(data) ? data : []
    form.value.workplaceId = ''

    if (workplaces.value.length === 1) {
      form.value.workplaceId = workplaces.value[0]._id
      loadSections()
    }
  } catch (error) {
    console.error('İşyerleri yüklenemedi:', error)
  }
}

const loadSections = async () => {
  if (!form.value.workplaceId) {
    sections.value = []
    return
  }
  try {
    const response = await api.get(`/workplaces/${form.value.workplaceId}/sections`)
    const data = response.data?.data || response.data
    sections.value = Array.isArray(data) ? data.filter(s => s.isActive !== false) : []

    if (sections.value.length === 1) {
      form.value.sectionId = sections.value[0]._id
    } else {
      form.value.sectionId = ''
    }
  } catch (error) {
    console.error('Bölümler yüklenemedi:', error)
    sections.value = []
  }
}

const checkWarnings = async () => {
  warnings.value = []
  isExceptionSector.value = false

  if (!form.value.startDate || !form.value.companyId) {
    return
  }

  try {
    const response = await api.post('/employment/validate-hire-date', {
      hireDate: form.value.startDate,
      companyId: form.value.companyId
    })

    if (response.data.success) {
      warnings.value = response.data.warnings || []
      isExceptionSector.value = response.data.isExceptionSector || false
    }

    const company = companies.value.find(c => c._id === form.value.companyId)
    if (company?.naceCode) {
      const nacePrefix = company.naceCode.substring(0, 2)
      const constructionCodes = ['41', '42', '43']
      const fishingCodes = ['03']
      isExceptionSector.value = constructionCodes.includes(nacePrefix) || fishingCodes.includes(nacePrefix)
    }
  } catch (error) {
    console.error('Uyarı kontrolü hatası:', error)
  }
}

// Part-time işlemleri
const isPartTimeValid = computed(() => {
  const pt = partTimeDetails.value
  return pt.weeklyHours && pt.weeklyHours < 30 && pt.workDays.length > 0 && pt.dailyHours
})

const selectContractType = (type) => {
  form.value.employmentType = type
  if (type === 'KISMİ_SÜRELİ') {
    showPartTimeModal.value = true
  }
}

const validateWeeklyHours = () => {
  const hours = partTimeDetails.value.weeklyHours
  if (hours >= 30) {
    partTimeWarning.value = 'Part-time için haftalık süre 30 saatten az olmalıdır. 30 saat ve üzeri tam zamanlı kabul edilir.'
    return false
  }
  partTimeWarning.value = ''
  return true
}

const cancelPartTime = () => {
  showPartTimeModal.value = false
  form.value.employmentType = 'BELİRSİZ_SÜRELİ'
  partTimeDetails.value = { weeklyHours: null, workDays: [], dailyHours: null, paymentType: 'monthly' }
  partTimeWarning.value = ''
}

const confirmPartTime = () => {
  if (isPartTimeValid.value) {
    showPartTimeModal.value = false
  }
}

const handleSubmit = async () => {
  try {
    if (form.value.fullName) {
      form.value.fullName = form.value.fullName.trim().toLocaleUpperCase('tr-TR')
    }
    if (form.value.sgkJobCode) {
      form.value.sgkJobCode = form.value.sgkJobCode.trim().toLocaleUpperCase('tr-TR')
    }

    if (!form.value.companyId) {
      toast.error('Şirket seçimi zorunludur')
      return
    }

    if (!form.value.startDate) {
      toast.error('İşe giriş tarihi zorunludur')
      return
    }

    if (!form.value.fullName?.trim()) {
      toast.error('Adı Soyadı zorunludur')
      currentStep.value = 0
      return
    }

    const cleanTCKN = (form.value.tckn || '').replace(/\D/g, '')
    if (cleanTCKN.length !== 11) {
      toast.error('TC Kimlik No 11 haneli olmalıdır')
      currentStep.value = 0
      return
    }

    if (tcknWarning.value) {
      toast.error(tcknWarning.value)
      currentStep.value = 0
      return
    }

    if (!selectedJobCode.value && !form.value.sgkJobCode?.trim()) {
      toast.error('Görevi (SGK Meslek Kodu) zorunludur. Listeden bir meslek seçin.')
      currentStep.value = 0
      return
    }

    // PhoneInput component normalizes to 05XXXXXXXXX format
    const normalizedPhone = form.value.phone || ''
    if (normalizedPhone.length !== 11 || !normalizedPhone.startsWith('05')) {
      toast.error('Telefon numarası 05 ile başlayan 11 haneli olmalıdır')
      currentStep.value = 0
      return
    }

    if (sgkWorkplaces.value.length === 0) {
      toast.error('Bu şirket için SGK işyeri tanımlanmamış')
      currentStep.value = 0
      return
    }

    if (sgkWorkplaces.value.length > 1 && !form.value.workplaceId) {
      toast.error('SGK İşyeri seçimi zorunludur')
      currentStep.value = 0
      return
    }

    // Belirli süreli sözleşme bitiş tarihi kontrolü
    if (form.value.employmentType === 'BELİRLİ_SÜRELİ' && !form.value.contractEndDate) {
      toast.error('Belirli süreli sözleşme için bitiş tarihi zorunludur')
      currentStep.value = 0
      return
    }

    saving.value = true

    const selectedWorkplaceId = form.value.workplaceId ||
      (sgkWorkplaces.value.length === 1 ? sgkWorkplaces.value[0]._id : null)

    const employmentData = {
      type: 'GIRIS',
      fullName: (form.value.fullName || '').trim().toLocaleUpperCase('tr-TR'),
      tckn: cleanTCKN,
      sgkJobCode: (form.value.sgkJobCode || '').trim().toLocaleUpperCase('tr-TR'),
      jobName: null,
      email: (form.value.email || '').trim() || null,
      phone: normalizedPhone,
      salaryAmount: form.value.salaryAmount ? parseFloat(form.value.salaryAmount) : null,
      salaryType: companyPayrollType.value || 'NET',
      employmentType: form.value.employmentType || 'BELİRSİZ_SÜRELİ',
      contractEndDate: form.value.employmentType === 'BELİRLİ_SÜRELİ' ? form.value.contractEndDate : null,
      startDate: form.value.startDate,
      exitDate: null,
      companyId: form.value.companyId,
      workplaceId: selectedWorkplaceId,
      sectionId: form.value.sectionId || null,
      reactivateExisting: reactivateExisting.value,
      isRetired: form.value.isRetired || false,
      // Part-time detayları (sadece KISMİ_SÜRELİ seçildiğinde)
      partTimeDetails: form.value.employmentType === 'KISMİ_SÜRELİ' ? {
        weeklyHours: partTimeDetails.value.weeklyHours,
        workDays: partTimeDetails.value.workDays,
        dailyHours: partTimeDetails.value.dailyHours,
        paymentType: partTimeDetails.value.paymentType
      } : null
    }

    const response = await api.post('/employment/create', employmentData)

    if (response.data && response.data.success) {
      if (response.data.data?.warnings?.length > 0) {
        toast.error('Uyarılar:\n' + response.data.data.warnings.join('\n'))
      }

      // Belgeler varsa başarı modalını göster
      if (response.data.contractUrl || response.data.applicationFormUrl) {
        contractDownloadUrl.value = response.data.contractUrl || ''
        applicationFormUrl.value = response.data.applicationFormUrl || ''
        showSuccessModal.value = true
        toast.success('İşe giriş kaydı oluşturuldu')
      } else {
        toast.success('İşe giriş kaydı oluşturuldu')
        await router.push('/employment/list')
      }
    } else {
      toast.error('İşlem başarısız oldu')
    }
  } catch (error) {
    console.error('İşe giriş hatası:', error)

    let errorMessage = 'Hata oluştu'

    if (error.response?.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message
      }
      if (error.response.data.error) {
        errorMessage += '\n' + error.response.data.error
      }
    } else if (error.message) {
      errorMessage = error.message
    }

    if (!error.response) {
      errorMessage = 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.'
    }

    toast.error(errorMessage)
  } finally {
    saving.value = false
  }
}

// Yazdırma fonksiyonu
const printDocumentsList = () => {
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>İşe Giriş İçin Gerekli Belgeler</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { font-size: 18px; margin-bottom: 20px; }
        ul { list-style-type: disc; padding-left: 20px; }
        li { margin-bottom: 10px; font-size: 14px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <h1>İşe Giriş İçin Gerekli Belgeler</h1>
      <ul>
        ${requiredDocuments.map(doc => `<li>${doc}</li>`).join('')}
      </ul>
      <div class="footer">
        ${form.value.fullName ? `Aday: ${form.value.fullName}` : ''}
      </div>
    </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

// WhatsApp gönderme fonksiyonu
const sendViaWhatsApp = () => {
  if (!form.value.phone) {
    toast.error('Telefon numarası giriniz')
    return
  }

  // Telefon numarasını formatla (90 ile başlat)
  let phoneNumber = form.value.phone.replace(/\D/g, '')
  if (phoneNumber.startsWith('0')) {
    phoneNumber = '9' + phoneNumber
  } else if (!phoneNumber.startsWith('90')) {
    phoneNumber = '90' + phoneNumber
  }

  const message = `*İşe Giriş İçin Gerekli Belgeler*

${requiredDocuments.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

_Lütfen bu belgeleri işe giriş işleminiz için hazırlayınız._`

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank')
  showDocumentsModal.value = false
}

onMounted(async () => {
  // Click outside listener for job code dropdown
  document.addEventListener('click', handleClickOutside)

  // Load SGK job codes count and minimum wage
  await loadSgkJobCodesCount()
  await loadMinimumWage()

  if (isBayiAdmin.value) {
    await loadCompanies()
  } else if (authStore.user?.company) {
    // company obje veya string olabilir, güvenli şekilde ID'yi al
    form.value.companyId = authStore.user.company?._id || authStore.user.company
    await loadWorkplaces()
    await loadCompanySettings(form.value.companyId)
  }

  // Rehire modu kontrolü
  if (route.query.rehire) {
    isRehireMode.value = true
    rehireEmployeeId.value = route.query.rehire

    // Eski çalışan bilgilerini forma doldur
    if (route.query.fullName) {
      form.value.fullName = route.query.fullName
    }
    if (route.query.tcKimlik) {
      form.value.tckn = route.query.tcKimlik
    }

    toast.info(`${route.query.fullName || 'Çalışan'} tekrar işe alınıyor. Lütfen bilgileri güncelleyip işlemi tamamlayın.`)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (jobCodeSearchTimeout) {
    clearTimeout(jobCodeSearchTimeout)
  }
})
</script>
