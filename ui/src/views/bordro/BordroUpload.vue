<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Bordro Yükle</h1>
      <p class="text-gray-600 mt-1">Excel dosyası yükleyerek çalışanların bordrolarını sisteme aktarın</p>
    </div>

    <!-- Upload Form -->
    <div class="bg-white rounded-lg shadow p-6">
      <form @submit.prevent="handleUpload" class="space-y-6">
        <!-- Şirket Seçimi -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Şirket <span class="text-red-500">*</span>
          </label>
          <select
            v-model="form.company"
            required
            :disabled="loadingCompanies"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          >
            <option value="">{{ loadingCompanies ? 'Yükleniyor...' : 'Şirket seçiniz' }}</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }}
            </option>
          </select>
        </div>

        <!-- Dönem Seçimi -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Yıl <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.year"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Ay <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.month"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option v-for="(month, index) in months" :key="index" :value="index + 1">
                {{ month }}
              </option>
            </select>
          </div>
        </div>

        <!-- Dosya Yükleme -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Excel Dosyası <span class="text-red-500">*</span>
          </label>
          <div
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            :class="[
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
            ]"
            @click="$refs.fileInput.click()"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls"
              @change="handleFileSelect"
              class="hidden"
            />
            <div v-if="!selectedFile">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="mt-2 text-sm text-gray-600">
                Dosyayı sürükleyip bırakın veya <span class="text-indigo-600 font-medium">tıklayarak seçin</span>
              </p>
              <p class="mt-1 text-xs text-gray-500">Excel dosyası (.xlsx, .xls)</p>
            </div>
            <div v-else class="flex items-center justify-center gap-3">
              <svg class="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div class="text-left">
                <p class="text-sm font-medium text-gray-900">{{ selectedFile.name }}</p>
                <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
              <button
                type="button"
                @click.stop="clearFile"
                class="ml-4 text-red-500 hover:text-red-700"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Validation Messages -->
        <div v-if="!isFormValid && (form.company || selectedFile)" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p class="text-sm text-yellow-800 font-medium">Eksik alanlar:</p>
          <ul class="text-sm text-yellow-700 mt-1 list-disc list-inside">
            <li v-if="!form.company">Şirket seçilmedi</li>
            <li v-if="!form.year">Yıl seçilmedi</li>
            <li v-if="!form.month">Ay seçilmedi</li>
            <li v-if="!selectedFile">Dosya seçilmedi</li>
          </ul>
        </div>

        <!-- No companies warning -->
        <div v-if="companies.length === 0 && !loadingCompanies" class="bg-red-50 border border-red-200 rounded-lg p-3">
          <p class="text-sm text-red-700">Şirket bulunamadı. Lütfen önce bir şirket ekleyin veya sayfa yenileyin.</p>
        </div>

        <!-- Buttons -->
        <div class="flex justify-between items-center pt-4 border-t">
          <a
            :href="templateUrl"
            class="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Örnek Şablon İndir
          </a>
          <button
            type="submit"
            :disabled="!isFormValid || isUploading"
            class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg v-if="isUploading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isUploading ? 'Yükleniyor...' : 'Yükle' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Upload Result -->
    <div v-if="uploadResult && uploadResult.stats" class="mt-6 bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg v-if="uploadResult.stats?.errorCount === 0" class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Yükleme Sonucu
      </h2>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-gray-900">{{ uploadResult.stats?.totalRows || 0 }}</p>
          <p class="text-sm text-gray-600">Toplam Satır</p>
        </div>
        <div class="bg-green-50 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-green-600">{{ uploadResult.stats?.successCount || 0 }}</p>
          <p class="text-sm text-gray-600">Başarılı</p>
        </div>
        <div class="bg-amber-50 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-amber-600">{{ uploadResult.warnings?.length || 0 }}</p>
          <p class="text-sm text-gray-600">Uyarı</p>
        </div>
        <div class="bg-red-50 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-red-600">{{ uploadResult.stats?.errorCount || 0 }}</p>
          <p class="text-sm text-gray-600">Hata</p>
        </div>
      </div>

      <!-- Smart Update Stats -->
      <div v-if="uploadResult.stats?.skippedApproved > 0 || uploadResult.stats?.skippedCompanyApproved > 0 || uploadResult.stats?.updatedRejected > 0"
           class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div v-if="uploadResult.stats?.updatedRejected > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-blue-600">{{ uploadResult.stats.updatedRejected }}</p>
          <p class="text-sm text-blue-700">Reddedilmiş Güncellendi</p>
          <p class="text-xs text-blue-500 mt-1">İtiraz edilenler yeniden yüklendi</p>
        </div>
        <div v-if="uploadResult.stats?.skippedApproved > 0" class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-emerald-600">{{ uploadResult.stats.skippedApproved }}</p>
          <p class="text-sm text-emerald-700">Onaylı Korundu</p>
          <p class="text-xs text-emerald-500 mt-1">Çalışan onaylı bordrolar değiştirilmedi</p>
        </div>
        <div v-if="uploadResult.stats?.skippedCompanyApproved > 0" class="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-teal-600">{{ uploadResult.stats.skippedCompanyApproved }}</p>
          <p class="text-sm text-teal-700">Şirket Onaylı Korundu</p>
          <p class="text-xs text-teal-500 mt-1">Çalışan onayı bekleyenler değiştirilmedi</p>
        </div>
      </div>

      <!-- Errors -->
      <div v-if="uploadResult.errors && uploadResult.errors.length > 0" class="mb-4">
        <h3 class="text-sm font-medium text-red-700 mb-2">Hatalar ({{ uploadResult.errors.length }} adet):</h3>
        <div class="max-h-64 overflow-y-auto bg-red-50 rounded-lg divide-y divide-red-100">
          <div v-for="(error, index) in uploadResult.errors" :key="index" class="p-3 hover:bg-red-100/50">
            <div class="flex items-start gap-2">
              <span class="flex-shrink-0 w-6 h-6 bg-red-200 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">
                {{ index + 1 }}
              </span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 text-sm">
                  <span class="font-semibold text-red-800">Satır {{ error.row }}</span>
                  <span v-if="error.employeeName" class="text-red-600">• {{ error.employeeName }}</span>
                </div>
                <div v-if="error.tcKimlik" class="text-xs text-red-500 mt-0.5">
                  TC: {{ error.tcKimlik }}
                </div>
                <div class="mt-1 text-sm text-red-700 bg-red-100 rounded px-2 py-1">
                  <span class="font-medium">Sebep:</span> {{ formatErrorMessage(error.message) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Warnings (Net Ödenen Doğrulama) -->
      <div v-if="uploadResult.warnings && uploadResult.warnings.length > 0" class="mb-4">
        <h3 class="text-sm font-medium text-amber-700 mb-2">
          Net Ödenen Uyarıları ({{ uploadResult.warnings.length }} adet):
        </h3>
        <div class="max-h-64 overflow-y-auto bg-amber-50 rounded-lg divide-y divide-amber-100">
          <div v-for="(warning, index) in uploadResult.warnings" :key="index" class="p-3 hover:bg-amber-100/50">
            <div class="flex items-start gap-2">
              <span class="flex-shrink-0 w-6 h-6 bg-amber-200 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">
                {{ index + 1 }}
              </span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 text-sm">
                  <span class="font-semibold text-amber-800">Satır {{ warning.row }}</span>
                  <span v-if="warning.employeeName" class="text-amber-600">• {{ warning.employeeName }}</span>
                </div>
                <div v-if="warning.tcKimlik" class="text-xs text-amber-500 mt-0.5">
                  TC: {{ warning.tcKimlik }}
                </div>
                <div class="mt-1 text-sm text-amber-700 bg-amber-100 rounded px-2 py-1">
                  <div class="font-medium mb-1">{{ warning.message }}</div>
                  <div v-if="warning.details" class="text-xs space-y-0.5">
                    <div>Excel'deki Net Ödenen: <span class="font-semibold">{{ formatCurrency(warning.details.excelNetOdenen) }}</span></div>
                    <div>Hesaplanan Net Ödenen: <span class="font-semibold">{{ formatCurrency(warning.details.calculatedNetOdenen) }}</span></div>
                    <div class="text-amber-600">Fark: <span class="font-semibold">{{ formatCurrency(warning.details.difference) }}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          v-if="uploadResult.stats?.successCount > 0 && !uploadResult.bordrosAlreadyNotified"
          @click="sendNotifications"
          :disabled="isSendingNotifications"
          class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          <svg v-if="isSendingNotifications" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {{ isSendingNotifications ? 'Gönderiliyor...' : 'Bildirimleri Gönder' }}
        </button>
        <button
          @click="deleteUpload"
          :disabled="isDeleting"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          <svg v-if="isDeleting" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {{ isDeleting ? 'Siliniyor...' : 'Yüklemeyi Sil' }}
        </button>
        <button
          @click="resetForm"
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Yeni Yükleme
        </button>
      </div>
    </div>

    <!-- Conflict Modal - Mevcut Bordro Uyarısı -->
    <div v-if="showConflictModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        <div class="bg-amber-500 px-6 py-4">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Mevcut Bordro Kaydı Bulundu
          </h3>
        </div>

        <div class="px-6 py-4">
          <p class="text-gray-700 mb-4">
            {{ getSelectedCompanyName() }} şirketi için
            <span class="font-semibold">{{ months[form.month - 1] }} {{ form.year }}</span>
            dönemine ait bordro kayıtları mevcut.
          </p>

          <!-- Mevcut Durumlar -->
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 class="text-sm font-semibold text-gray-700 mb-3">Mevcut Bordro Durumları:</h4>
            <div class="grid grid-cols-2 gap-3">
              <div v-if="conflictData.existingStats?.rejected > 0" class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span class="flex-shrink-0 w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {{ conflictData.existingStats.rejected }}
                </span>
                <div>
                  <p class="text-sm font-medium text-red-800">Reddedilmiş</p>
                  <p class="text-xs text-red-600">Güncellenecek</p>
                </div>
              </div>

              <div v-if="conflictData.existingStats?.pending > 0" class="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
                <span class="flex-shrink-0 w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {{ conflictData.existingStats.pending }}
                </span>
                <div>
                  <p class="text-sm font-medium text-gray-800">Beklemede</p>
                  <p class="text-xs text-gray-600">Güncellenecek</p>
                </div>
              </div>

              <div v-if="conflictData.existingStats?.companyApproved > 0" class="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                <span class="flex-shrink-0 w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {{ conflictData.existingStats.companyApproved }}
                </span>
                <div>
                  <p class="text-sm font-medium text-teal-800">Şirket Onaylı</p>
                  <p class="text-xs text-teal-600">Korunacak</p>
                </div>
              </div>

              <div v-if="conflictData.existingStats?.approved > 0" class="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <span class="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {{ conflictData.existingStats.approved }}
                </span>
                <div>
                  <p class="text-sm font-medium text-emerald-800">Tam Onaylı</p>
                  <p class="text-xs text-emerald-600">Korunacak</p>
                </div>
              </div>
            </div>

            <div class="mt-3 text-sm text-gray-600">
              Toplam: <span class="font-semibold">{{ conflictData.existingStats?.total || 0 }}</span> bordro kaydı
            </div>
          </div>

          <!-- Hint / Bilgi Mesajı -->
          <div v-if="conflictData.hint"
               :class="[
                 'rounded-lg p-3 text-sm',
                 conflictData.existingStats?.rejected > 0
                   ? 'bg-blue-50 border border-blue-200 text-blue-800'
                   : 'bg-amber-50 border border-amber-200 text-amber-800'
               ]">
            <div class="flex items-start gap-2">
              <svg class="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ conflictData.hint }}</span>
            </div>
          </div>

          <!-- Önceki Yükleme Bilgisi -->
          <div v-if="conflictData.uploadDate" class="mt-3 text-xs text-gray-500">
            Önceki yükleme: {{ conflictData.uploadDate }}
          </div>
        </div>

        <div class="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
          <button
            @click="cancelConflict"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
          >
            İptal
          </button>
          <button
            @click="confirmConflict"
            class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Güncelle
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const authStore = useAuthStore()

const companies = ref([])
const loadingCompanies = ref(true)
const form = ref({
  company: '',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1
})
const selectedFile = ref(null)
const isDragging = ref(false)
const isUploading = ref(false)
const isSendingNotifications = ref(false)
const isDeleting = ref(false)
const uploadResult = ref(null)
const pendingReplace = ref(false)  // Önceki yüklemeyi değiştirme bekliyor

// Conflict modal state
const showConflictModal = ref(false)
const conflictData = ref({
  existingStats: null,
  hint: '',
  uploadDate: ''
})

const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 1, currentYear, currentYear + 1]
})

const isFormValid = computed(() => {
  return form.value.company && form.value.year && form.value.month && selectedFile.value
})

const templateUrl = computed(() => {
  return `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bordro/template`
})

onMounted(async () => {
  await loadCompanies()
})

const loadCompanies = async () => {
  loadingCompanies.value = true
  try {
    const response = await api.get('/companies')
    companies.value = response.data.data || response.data || []
    console.log('Loaded companies:', companies.value.length)
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  } finally {
    loadingCompanies.value = false
  }
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
  }
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
    selectedFile.value = file
  }
}

const clearFile = () => {
  selectedFile.value = null
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(value)
}

const formatErrorMessage = (message) => {
  // Hata mesajlarını daha açıklayıcı Türkçe'ye çevir
  const errorMappings = {
    'Çalışan bulunamadı': 'Bu TC Kimlik numarasına sahip aktif çalışan sistemde kayıtlı değil. Lütfen çalışanın sisteme eklendiğinden ve TC Kimlik numarasının doğru olduğundan emin olun.',
    'TC Kimlik No boş': 'Excel satırında TC Kimlik numarası boş. Lütfen TCKN kolonunu kontrol edin.',
    'Geçersiz TC Kimlik No (11 hane olmalı)': 'TC Kimlik numarası 11 haneli olmalıdır. Lütfen numaranın doğru girildiğinden emin olun.',
  }

  // Tam eşleşme varsa kullan
  if (errorMappings[message]) {
    return errorMappings[message]
  }

  // Validation hatalarını açıklayıcı hale getir
  if (message.includes('validation failed')) {
    if (message.includes('eksikGun')) {
      return 'Eksik gün alanı geçersiz format içeriyor. Bu alan metin veya sayı olabilir.'
    }
    if (message.includes('Cast to Number')) {
      const fieldMatch = message.match(/path "([^"]+)"/)
      const field = fieldMatch ? fieldMatch[1] : 'alan'
      return `"${field}" alanı sayısal değer bekliyor ancak metin girilmiş.`
    }
  }

  return message
}

const handleUpload = async () => {
  console.log('handleUpload called')
  console.log('isFormValid:', isFormValid.value)
  console.log('form:', form.value)
  console.log('selectedFile:', selectedFile.value)
  console.log('pendingReplace:', pendingReplace.value)

  if (!isFormValid.value) {
    console.log('Form is not valid, returning')
    return
  }

  // Eğer önceki yüklemeyi değiştirme modundaysak
  const shouldReplace = pendingReplace.value
  pendingReplace.value = false

  await doUpload(shouldReplace)
}

const doUpload = async (replaceExisting = false) => {
  isUploading.value = true
  uploadResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('company', form.value.company)
    formData.append('year', form.value.year)
    formData.append('month', form.value.month)
    if (replaceExisting) {
      formData.append('replaceExisting', 'true')
    }
    console.log('Sending upload request...', replaceExisting ? '(replacing existing)' : '')

    const response = await api.post('/bordro/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    console.log('Upload response:', response.data)
    uploadResult.value = response.data.data || response.data
    console.log('uploadResult set to:', uploadResult.value)
  } catch (error) {
    console.error('Yükleme hatası:', error)
    console.error('Error response:', error.response?.data)

    // Duplicate upload hatası kontrolü
    if (error.response?.status === 409 && error.response?.data?.code === 'DUPLICATE_UPLOAD') {
      const existingUpload = error.response.data.existingUpload
      const existingStats = error.response.data.existingStats
      const hint = error.response.data.hint

      // Set conflict data for modal
      conflictData.value = {
        existingStats: existingStats || {
          total: existingUpload?.stats?.successCount || 0,
          pending: 0,
          companyApproved: 0,
          approved: 0,
          rejected: 0
        },
        hint: hint || '',
        uploadDate: existingUpload?.uploadedAt
          ? new Date(existingUpload.uploadedAt).toLocaleString('tr-TR')
          : ''
      }

      // Show custom modal instead of browser confirm
      showConflictModal.value = true
      return
    } else {
      alert(error.response?.data?.message || 'Yükleme sırasında hata oluştu')
    }
  } finally {
    isUploading.value = false
  }
}

const sendNotifications = async () => {
  if (!uploadResult.value?.uploadId) return

  isSendingNotifications.value = true

  try {
    const response = await api.post(`/bordro/uploads/${uploadResult.value.uploadId}/notify`)
    alert(response.data.message || 'Bildirimler gönderildi')
  } catch (error) {
    console.error('Bildirim hatası:', error)
    alert(error.response?.data?.message || 'Bildirim gönderilirken hata oluştu')
  } finally {
    isSendingNotifications.value = false
  }
}

const resetForm = () => {
  selectedFile.value = null
  uploadResult.value = null
  pendingReplace.value = false
  showConflictModal.value = false
  conflictData.value = { existingStats: null, hint: '', uploadDate: '' }
}

const deleteUpload = async () => {
  if (!uploadResult.value?.uploadId) return

  if (!confirm('Bu yüklemeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
    return
  }

  isDeleting.value = true

  try {
    const response = await api.delete(`/bordro/uploads/${uploadResult.value.uploadId}`)
    alert(response.data.message || 'Yükleme başarıyla silindi')
    resetForm()
  } catch (error) {
    alert(error.response?.data?.message || 'Silme işlemi başarısız oldu')
  } finally {
    isDeleting.value = false
  }
}

// Conflict modal helpers
const getSelectedCompanyName = () => {
  const company = companies.value.find(c => c._id === form.value.company)
  return company?.name || 'Seçili şirket'
}

const cancelConflict = () => {
  showConflictModal.value = false
  conflictData.value = { existingStats: null, hint: '', uploadDate: '' }
}

const confirmConflict = () => {
  showConflictModal.value = false
  pendingReplace.value = true
  // Modal kapatıldıktan sonra kullanıcıya bilgi ver ve dosyayı tekrar seçmesini iste
  alert('Lütfen dosyayı tekrar seçin ve yükleyin. Sistem sadece güncellenebilir bordroları (reddedilenler ve bekleyenler) güncelleyecek, onaylı olanları koruyacaktır.')
}
</script>
