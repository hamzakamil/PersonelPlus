<template>
  <div class="p-4">
    <!-- Şifre Değiştirme Modal (İlk girişte zorunlu) -->
    <div
      v-if="showPasswordChangeModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-4 w-full max-w-sm">
        <h2 class="text-base font-bold mb-3">{{ isPlaceholderEmail ? 'Hesap Bilgilerini Tamamla' : 'Şifre Değiştirme Zorunlu' }}</h2>
        <p class="text-xs text-gray-600 mb-3">
          {{ isPlaceholderEmail
            ? 'İlk girişinizde email adresinizi, telefon numaranızı ve şifrenizi belirlemeniz gerekmektedir.'
            : 'İlk girişinizde şifrenizi değiştirmeniz gerekmektedir.'
          }}
        </p>
        <form @submit.prevent="changePassword">
          <div class="space-y-3">
            <template v-if="isPlaceholderEmail">
              <Input
                v-model="passwordForm.newEmail"
                type="email"
                label="Email Adresi"
                placeholder="ornek@email.com"
                required
              />
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Telefon Numarası</label>
                <PhoneInput
                  v-model="passwordForm.newPhone"
                  required
                />
              </div>
            </template>
            <Input
              v-model="passwordForm.newPassword"
              type="password"
              label="Yeni Şifre"
              required
              minlength="6"
            />
            <Input
              v-model="passwordForm.confirmPassword"
              type="password"
              label="Yeni Şifre Tekrar"
              required
            />
            <div
              v-if="
                passwordForm.newPassword &&
                passwordForm.confirmPassword &&
                passwordForm.newPassword !== passwordForm.confirmPassword
              "
              class="text-xs text-red-600"
            >
              Şifreler eşleşmiyor
            </div>
            <div class="flex gap-2 justify-end">
              <Button
                type="submit"
                size="sm"
                :disabled="
                  passwordForm.newPassword !== passwordForm.confirmPassword ||
                  passwordForm.newPassword.length < 6 ||
                  (isPlaceholderEmail && (!passwordForm.newEmail || !passwordForm.newPhone))
                "
              >
                {{ isPlaceholderEmail ? 'Kaydet' : 'Şifreyi Değiştir' }}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Bayi Admin için Şirket Seçici -->
    <div v-if="isDealer" class="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
      <div class="flex items-center gap-3">
        <label class="text-xs font-medium text-purple-700">Şirket Seçin:</label>
        <select
          v-model="selectedCompanyId"
          @change="onCompanyChange"
          class="flex-1 px-3 py-1.5 text-xs border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
        >
          <option value="">-- Şirket Seçiniz --</option>
          <option v-for="company in companies" :key="company._id" :value="company._id">
            {{ company.name }}
          </option>
        </select>
        <span v-if="!selectedCompanyId" class="text-xs text-purple-600">
          Ayarları görüntülemek için şirket seçin
        </span>
      </div>
    </div>

    <!-- Sekmeler -->
    <div
      class="mb-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-lg"
    >
      <nav class="flex flex-wrap gap-1 p-2" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
          :class="
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
          "
        >
          <span class="w-4 h-4 flex-shrink-0" v-html="tab.icon"></span>
          <span>{{ tab.name }}</span>
        </button>
      </nav>
    </div>

    <!-- Tema Ayarları -->
    <div v-show="activeTab === 'theme'">
      <ThemeSelector />
    </div>

    <!-- Bayi Ayarları (sadece bayi_admin için) -->
    <div v-show="activeTab === 'dealer'" class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold mb-6 text-gray-800 border-b pb-3">Bayi Ayarları</h3>
      <form @submit.prevent="saveDealerSettings" class="space-y-6">
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span class="w-1 h-5 bg-purple-600 rounded"></span>
            İK Görüntüleme Adı
          </h4>
          <p class="text-sm text-gray-500">
            İşe giriş/çıkış ekranlarında şirketlere görünecek isim. Boş bırakılırsa bayi adı
            kullanılır.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"> Bayi Adı </label>
              <input
                v-model="dealerForm.name"
                type="text"
                placeholder="Bayi adını girin..."
                @input="dealerForm.name = $event.target.value.toLocaleUpperCase('tr-TR')"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                İK Görüntüleme Adı
              </label>
              <input
                v-model="dealerForm.ikDisplayName"
                type="text"
                placeholder="Örn: ABC Muhasebe, XYZ İK Danışmanlık..."
                @input="dealerForm.ikDisplayName = $event.target.value.toLocaleUpperCase('tr-TR')"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p class="text-xs text-gray-500 mt-1">
                Bu isim işe giriş/çıkış taleplerinde "Onaylayan" olarak görünecektir.
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-4 border-t">
          <Button type="submit" :disabled="savingDealer">
            {{ savingDealer ? 'Kaydediliyor...' : 'Kaydet' }}
          </Button>
        </div>
      </form>
    </div>

    <!-- Şirket Bilgileri -->
    <div v-show="activeTab === 'company'" class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold mb-6 text-gray-800 border-b pb-3">
        İşletme / Şirket Bilgileri
      </h3>
      <form @submit.prevent="saveCompanyInfo" class="space-y-6">
        <!-- Şirket Temel Bilgileri -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span class="w-1 h-5 bg-blue-600 rounded"></span>
            Şirket Temel Bilgileri
          </h4>

          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Şirket Ünvanı <span class="text-red-500">*</span>
              </label>
              <input
                v-model="companyForm.name"
                type="text"
                required
                placeholder="Örn: ABC TEKSTİL SANAYİ VE TİCARET A.Ş."
                @input="companyForm.name = $event.target.value.toLocaleUpperCase('tr-TR')"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"> Vergi Dairesi </label>
              <input
                v-model="companyForm.taxOffice"
                type="text"
                placeholder="Örn: Kadıköy Vergi Dairesi"
                @input="companyForm.taxOffice = $event.target.value.toLocaleUpperCase('tr-TR')"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Vergi / TC Kimlik No
              </label>
              <input
                v-model="companyForm.taxNumber"
                type="text"
                maxlength="11"
                @input="formatTaxNumber"
                placeholder="11 haneli numara"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
              <p class="text-xs text-gray-500 mt-1">Vergi numarası veya TC Kimlik No (11 hane)</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"> Mersis No </label>
              <input
                v-model="companyForm.mersisNo"
                type="text"
                maxlength="16"
                @input="formatMersisNo"
                placeholder="16 haneli Mersis numarası"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
              <p class="text-xs text-gray-500 mt-1">Ticaret Sicil Gazetesi Mersis No</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Şirket Kuruluş Tarihi
              </label>
              <input
                v-model="companyForm.foundingDate"
                type="date"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"> Adres </label>
            <textarea
              v-model="companyForm.address"
              rows="3"
              placeholder="Tam adres bilgisi..."
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent no-uppercase resize-none"
            ></textarea>
          </div>
        </div>

        <!-- Yetkili Kişi Bilgileri -->
        <div class="space-y-4 border-t pt-6">
          <h4 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span class="w-1 h-5 bg-green-600 rounded"></span>
            Yetkili Kişi Bilgileri
          </h4>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad <span class="text-red-500">*</span>
              </label>
              <input
                v-model="companyForm.authorizedPersonFullName"
                type="text"
                required
                placeholder="Yetkili kişinin adı soyadı"
                @input="
                  companyForm.authorizedPersonFullName =
                    $event.target.value.toLocaleUpperCase('tr-TR')
                "
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"> Telefon </label>
              <input
                v-model="companyForm.authorizedPersonPhone"
                type="text"
                placeholder="0 555 555 55 55"
                @input="formatAuthorizedPhone"
                maxlength="15"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"> E-posta </label>
            <input
              v-model="companyForm.authorizedPersonEmail"
              type="email"
              disabled
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed no-uppercase"
            />
            <p class="text-xs text-gray-500 mt-1">
              <svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
              E-posta adresi sistem tarafından otomatik atanmıştır ve değiştirilemez
            </p>
          </div>
        </div>

        <!-- Kaydet Butonu -->
        <div class="flex justify-end pt-4 border-t">
          <Button type="submit" size="md" :disabled="savingCompany">
            <svg
              v-if="savingCompany"
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
              xmlns="http://www.w3.org/2000/svg"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ savingCompany ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet' }}
          </Button>
        </div>
      </form>
    </div>

    <!-- Genel Ayarlar -->
    <div v-show="activeTab === 'general'" class="bg-white rounded-lg shadow p-4">
      <h3 class="text-sm font-semibold mb-4 text-gray-800">Genel Ayarlar</h3>
      <form @submit.prevent="saveSettings" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Başlık</label>
            <Input v-model="form.title" placeholder="Şirket başlığı" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Ücret Hesaplama Tipi</label>
            <select
              v-model="form.payrollCalculationType"
              @change="savePayrollType"
              class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="NET">Net Ücret</option>
              <option value="BRUT">Brüt Ücret</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Logo</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            @change="handleFileChange"
            class="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p class="text-[10px] text-gray-500 mt-1">
            Maksimum 500KB, önerilen boyut: 200x50 piksel (JPEG, PNG, GIF)
          </p>
          <div v-if="form.logo" class="mt-2">
            <img :src="form.logo" alt="Logo" class="h-12 object-contain" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Aktif Puantaj Şablonu</label>
          <select
            v-model="form.activeAttendanceTemplate"
            @change="saveTemplateSetting"
            class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Şablon Seçiniz</option>
            <option
              v-for="template in attendanceTemplates"
              :key="template._id"
              :value="template._id"
            >
              {{ template.name }} {{ template.isDefault ? '(Varsayılan)' : '' }}
            </option>
          </select>
        </div>

        <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div>
            <label class="block text-xs font-medium text-gray-700">Otomatik Çalışan Ekleme</label>
            <p class="text-[10px] text-gray-500">
              Onaylanan işe giriş talepleri otomatik olarak çalışanlar listesine eklensin
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="form.autoAddApprovedEmployees"
              @change="saveAutoAddSetting"
              class="sr-only peer"
            />
            <div
              class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
            ></div>
          </label>
        </div>

        <div class="flex justify-end">
          <Button type="submit" size="sm" :disabled="loading">{{
            loading ? 'Kaydediliyor...' : 'Kaydet'
          }}</Button>
        </div>
      </form>
    </div>

    <!-- İşe Giriş/Çıkış Ayarları -->
    <div v-show="activeTab === 'checkin'" class="bg-white rounded-lg shadow p-4">
      <h3 class="text-sm font-semibold mb-4 text-gray-800">İşe Giriş/Çıkış Ayarları</h3>
      <div class="space-y-4">
        <label class="flex items-center">
          <input
            type="checkbox"
            v-model="form.checkInSettings.enabled"
            class="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span class="text-xs text-gray-700">İşe giriş/çıkış butonlarını kullan</span>
        </label>

        <div v-if="form.checkInSettings.enabled" class="space-y-3 pl-4 border-l-2 border-gray-200">
          <label class="flex items-center">
            <input
              type="checkbox"
              v-model="form.checkInSettings.locationRequired"
              class="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-xs text-gray-700">Lokasyon kontrolü gerekli</span>
          </label>

          <div v-if="form.checkInSettings.locationRequired" class="space-y-3">
            <div class="grid grid-cols-3 gap-3">
              <Input
                v-model.number="form.checkInSettings.allowedLocation.latitude"
                type="number"
                step="0.000001"
                label="Enlem"
              />
              <Input
                v-model.number="form.checkInSettings.allowedLocation.longitude"
                type="number"
                step="0.000001"
                label="Boylam"
              />
              <Input
                v-model.number="form.checkInSettings.allowedLocation.radius"
                type="number"
                label="Yarıçap (m)"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              @click="getCurrentLocation"
              :disabled="gettingLocation"
            >
              {{ gettingLocation ? 'Konum alınıyor...' : 'Mevcut Konumu Kullan' }}
            </Button>
          </div>

          <label class="flex items-center">
            <input
              type="checkbox"
              v-model="form.checkInSettings.autoCheckIn"
              class="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-xs text-gray-700">Otomatik giriş/çıkış (mesai saatlerine göre)</span>
          </label>
        </div>

        <div class="flex justify-end">
          <Button @click="saveSettings" size="sm" :disabled="loading">Kaydet</Button>
        </div>
      </div>
    </div>

    <!-- Hafta Tatili Ayarları -->
    <div v-show="activeTab === 'weekend'" class="bg-white rounded-lg shadow p-4">
      <h3 class="text-sm font-semibold mb-4 text-gray-800">Hafta Tatili Ayarları</h3>

      <div class="flex gap-2 mb-4">
        <button
          @click="weekendTab = 'company'"
          :class="weekendTab === 'company' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'"
          class="px-3 py-1 text-xs rounded"
        >
          Şirket
        </button>
        <button
          @click="weekendTab = 'department'"
          :class="
            weekendTab === 'department' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          "
          class="px-3 py-1 text-xs rounded"
        >
          Departman
        </button>
        <button
          @click="weekendTab = 'employee'"
          :class="
            weekendTab === 'employee' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          "
          class="px-3 py-1 text-xs rounded"
        >
          Çalışan
        </button>
      </div>

      <!-- Şirket Hafta Tatili -->
      <div v-if="weekendTab === 'company'" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">Hafta Tatili Günleri</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="day in weekDays"
              :key="day.value"
              class="flex items-center px-3 py-1.5 border rounded cursor-pointer hover:bg-gray-50 text-xs"
              :class="
                companyWeekendDays.includes(day.value)
                  ? 'bg-blue-100 border-blue-500'
                  : 'bg-white border-gray-300'
              "
            >
              <input
                type="checkbox"
                :value="day.value"
                v-model="companyWeekendDays"
                class="mr-2 w-3 h-3"
                @change="saveWeekendSettings"
              />
              {{ day.label }}
            </label>
          </div>
        </div>

        <div v-if="companyWeekendDays.length >= 2" class="border-t pt-4">
          <label class="block text-xs font-medium text-gray-700 mb-2"
            >Yıllık İzin Hesaplamasında Hafta Tatili</label
          >
          <div class="space-y-2">
            <label
              v-for="option in leaveDeductionOptions"
              :key="option.value"
              class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50 text-xs"
              :class="weekendLeaveDeduction === option.value ? 'bg-blue-50 border-blue-500' : ''"
            >
              <input
                type="radio"
                v-model="weekendLeaveDeduction"
                :value="option.value"
                class="mr-2"
                @change="saveWeekendSettings"
              />
              <div>
                <span class="font-medium">{{ option.label }}</span>
                <p class="text-[10px] text-gray-500">{{ option.desc }}</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Departman Hafta Tatili -->
      <div v-if="weekendTab === 'department'" class="space-y-4">
        <select
          v-model="selectedDepartment"
          @change="loadDepartmentWeekend"
          class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
        >
          <option value="">Departman Seçiniz</option>
          <option v-for="dept in departments" :key="dept._id" :value="dept._id">
            {{ dept.name }}
          </option>
        </select>
        <div v-if="selectedDepartment">
          <p class="text-[10px] text-gray-500 mb-2">Boş bırakılırsa şirket ayarları kullanılır</p>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="day in weekDays"
              :key="day.value"
              class="flex items-center px-3 py-1.5 border rounded cursor-pointer text-xs"
              :class="
                departmentWeekendDays.includes(day.value)
                  ? 'bg-blue-100 border-blue-500'
                  : 'bg-white border-gray-300'
              "
            >
              <input
                type="checkbox"
                :value="day.value"
                v-model="departmentWeekendDays"
                class="mr-2 w-3 h-3"
                @change="saveDepartmentWeekend"
              />
              {{ day.label }}
            </label>
          </div>
        </div>
      </div>

      <!-- Çalışan Hafta Tatili -->
      <div v-if="weekendTab === 'employee'" class="space-y-4">
        <select
          v-model="selectedEmployee"
          @change="loadEmployeeWeekend"
          class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
        >
          <option value="">Çalışan Seçiniz</option>
          <option v-for="emp in employees" :key="emp._id" :value="emp._id">
            {{ emp.firstName }} {{ emp.lastName }}
          </option>
        </select>
        <div v-if="selectedEmployee">
          <p class="text-[10px] text-gray-500 mb-2">
            Boş bırakılırsa departman/şirket ayarları kullanılır
          </p>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="day in weekDays"
              :key="day.value"
              class="flex items-center px-3 py-1.5 border rounded cursor-pointer text-xs"
              :class="
                employeeWeekendDays.includes(day.value)
                  ? 'bg-blue-100 border-blue-500'
                  : 'bg-white border-gray-300'
              "
            >
              <input
                type="checkbox"
                :value="day.value"
                v-model="employeeWeekendDays"
                class="mr-2 w-3 h-3"
                @change="saveEmployeeWeekend"
              />
              {{ day.label }}
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Resmi Tatiller -->
    <div v-show="activeTab === 'holidays'" class="bg-white rounded-lg shadow p-4">
      <h3 class="text-sm font-semibold mb-4 text-gray-800">Resmi Tatil Günleri</h3>
      <div v-if="!activeCompanyId" class="text-xs text-gray-500 p-3 bg-gray-50 rounded">
        Tatilleri görüntülemek için bir şirket seçin.
      </div>
      <div v-else class="space-y-3">
        <div class="flex gap-2">
          <select
            v-model="holidayYear"
            @change="loadHolidays"
            class="px-2 py-1.5 text-xs border border-gray-300 rounded"
          >
            <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
          </select>
          <Button size="sm" @click="showAddHolidayModal = true">Tatil Ekle</Button>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-gray-500">Tarih</th>
                <th class="px-3 py-2 text-left font-medium text-gray-500">İşlem</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="holiday in holidays" :key="holiday">
                <td class="px-3 py-2">{{ formatDate(holiday) }}</td>
                <td class="px-3 py-2">
                  <button @click="deleteHoliday(holiday)" class="text-red-600 hover:text-red-800">
                    Sil
                  </button>
                </td>
              </tr>
              <tr v-if="holidays.length === 0">
                <td colspan="3" class="px-3 py-4 text-center text-gray-500">Tatil bulunamadı</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Çalışma Saatleri -->
    <div v-show="activeTab === 'workinghours'" class="bg-white rounded-lg shadow p-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-sm font-semibold text-gray-800">Çalışma Saatleri Şablonları</h3>
        <Button size="sm" @click="showAddWorkingHoursModal = true">Şablon Ekle</Button>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-xs">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2 text-left font-medium text-gray-500">Ad</th>
              <th class="px-3 py-2 text-left font-medium text-gray-500">Giriş</th>
              <th class="px-3 py-2 text-left font-medium text-gray-500">Çıkış</th>
              <th class="px-3 py-2 text-left font-medium text-gray-500">Mola</th>
              <th class="px-3 py-2 text-left font-medium text-gray-500">İşlem</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="wh in workingHoursList" :key="wh._id">
              <td class="px-3 py-2">{{ wh.name }}</td>
              <td class="px-3 py-2">{{ wh.startTime }}</td>
              <td class="px-3 py-2">{{ wh.endTime }}</td>
              <td class="px-3 py-2">{{ wh.breakDuration }} dk</td>
              <td class="px-3 py-2">
                <button @click="deleteWorkingHours(wh._id)" class="text-red-600 hover:text-red-800">
                  Sil
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Puantaj Şablonları -->
    <div v-show="activeTab === 'puantaj'" class="bg-white rounded-lg shadow p-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-sm font-semibold text-gray-800">Puantaj Şablonları</h3>
        <router-link to="/puantaj-templates" class="text-xs text-blue-600 hover:text-blue-800"
          >Tümünü Yönet →</router-link
        >
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-xs">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2 text-left font-medium text-gray-500">Ad</th>
              <th class="px-3 py-2 text-left font-medium text-gray-500">Açıklama</th>
              <th class="px-3 py-2 text-left font-medium text-gray-500">Durum</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="pt in puantajTemplates" :key="pt._id">
              <td class="px-3 py-2">{{ pt.name }}</td>
              <td class="px-3 py-2">{{ pt.description || '-' }}</td>
              <td class="px-3 py-2">
                <span :class="pt.isDefault ? 'text-green-600' : 'text-gray-500'">{{
                  pt.isDefault ? 'Varsayılan' : 'Normal'
                }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Departmanlar -->
    <div v-show="activeTab === 'departments'">
      <Departments />
    </div>

    <!-- Kullanıcı Yönetimi -->
    <div v-show="activeTab === 'users'">
      <UserManagement />
    </div>

    <!-- İzin Onay Akışı -->
    <div v-show="activeTab === 'leave-approval'" class="bg-white rounded-lg shadow p-4">
      <!-- Genel Onay Modu -->
      <div class="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <h3 class="text-sm font-semibold mb-3 text-indigo-800">Genel Onay Modu</h3>
        <p class="text-[10px] text-indigo-600 mb-3">Bu ayar tüm talepler (izin, fazla mesai) için geçerlidir.</p>
        <div class="space-y-2">
          <label
            class="flex items-start p-3 border rounded cursor-pointer hover:bg-white transition-colors"
            :class="form.approvalMode === 'chain_with_admin' ? 'bg-white border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'"
          >
            <input
              type="radio"
              v-model="form.approvalMode"
              value="chain_with_admin"
              @change="saveApprovalMode"
              class="mt-0.5 mr-3"
            />
            <div>
              <span class="text-xs font-medium text-gray-800">Yöneticiler + Şirket Admini</span>
              <p class="text-[10px] text-gray-500">Onay zincirindeki yöneticiler sırasıyla onaylar, şirket admini son onaylayıcı olarak eklenir.</p>
            </div>
          </label>
          <label
            class="flex items-start p-3 border rounded cursor-pointer hover:bg-white transition-colors"
            :class="form.approvalMode === 'chain_managers_only' ? 'bg-white border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'"
          >
            <input
              type="radio"
              v-model="form.approvalMode"
              value="chain_managers_only"
              @change="saveApprovalMode"
              class="mt-0.5 mr-3"
            />
            <div>
              <span class="text-xs font-medium text-gray-800">Sadece Yöneticiler</span>
              <p class="text-[10px] text-gray-500">Sadece yöneticiler onaylar, şirket admini zincirde değildir. Yönetici yoksa admin devreye girer.</p>
            </div>
          </label>
          <label
            class="flex items-start p-3 border rounded cursor-pointer hover:bg-white transition-colors"
            :class="form.approvalMode === 'auto_approve' ? 'bg-white border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'"
          >
            <input
              type="radio"
              v-model="form.approvalMode"
              value="auto_approve"
              @change="saveApprovalMode"
              class="mt-0.5 mr-3"
            />
            <div>
              <span class="text-xs font-medium text-gray-800">Otomatik Onay</span>
              <p class="text-[10px] text-gray-500">Tüm talepler otomatik onaylanır, şirket adminine bilgilendirme bildirimi gönderilir.</p>
            </div>
          </label>
        </div>
      </div>

      <h3 class="text-sm font-semibold mb-4 text-gray-800">İzin Onay Akışı Ayarları</h3>
      <div class="space-y-4">
        <!-- Onay Sistemini Aktifleştir -->
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div>
            <label class="block text-xs font-medium text-gray-700">Onay Sistemini Kullan</label>
            <p class="text-[10px] text-gray-500">İzin talepleri onay sürecinden geçsin</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="form.leaveApprovalSettings.enabled"
              @change="saveLeaveApprovalSettings"
              class="sr-only peer"
            />
            <div
              class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
            ></div>
          </label>
        </div>

        <div
          v-if="form.leaveApprovalSettings.enabled"
          class="space-y-4 pl-4 border-l-2 border-gray-200"
        >
          <!-- Onaylayıcı Yoksa -->
          <div class="space-y-3">
            <label class="block text-xs font-medium text-gray-700">Onaylayıcı Olmadığında</label>
            <div class="space-y-2">
              <label
                class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                :class="
                  !form.leaveApprovalSettings.autoApproveIfNoApprover
                    ? 'bg-blue-50 border-blue-500'
                    : ''
                "
              >
                <input
                  type="radio"
                  v-model="form.leaveApprovalSettings.autoApproveIfNoApprover"
                  :value="false"
                  @change="saveLeaveApprovalSettings"
                  class="mr-2"
                />
                <div>
                  <span class="text-xs font-medium">Onay Bekle</span>
                  <p class="text-[10px] text-gray-500">
                    Talep PENDING durumunda beklesin (yönetici manuel müdahale edecek)
                  </p>
                </div>
              </label>
              <label
                class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                :class="
                  form.leaveApprovalSettings.autoApproveIfNoApprover
                    ? 'bg-blue-50 border-blue-500'
                    : ''
                "
              >
                <input
                  type="radio"
                  v-model="form.leaveApprovalSettings.autoApproveIfNoApprover"
                  :value="true"
                  @change="saveLeaveApprovalSettings"
                  class="mr-2"
                />
                <div>
                  <span class="text-xs font-medium">Otomatik Onayla</span>
                  <p class="text-[10px] text-gray-500">Onaylayıcı yoksa talep direkt onaylansın</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Onay Seviyesi -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1"
              >Kaç Seviye Onay Gerekli</label
            >
            <Input
              v-model.number="form.leaveApprovalSettings.approvalLevels"
              type="number"
              :min="0"
              @blur="saveLeaveApprovalSettings"
            />
            <p class="text-[10px] text-gray-500 mt-1">
              0 = Tüm onay zinciri, 1+ = Belirli sayıda onay yeterli
            </p>
          </div>

          <!-- Kendi Kendine Onay -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <label class="block text-xs font-medium text-gray-700">Kendi İznini Onaylama</label>
              <p class="text-[10px] text-gray-500">Yönetici kendi izin talebini onaylayabilsin</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="form.leaveApprovalSettings.allowSelfApproval"
                @change="saveLeaveApprovalSettings"
                class="sr-only peer"
              />
              <div
                class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>

          <!-- Bilgi Notu -->
          <div class="bg-blue-50 border-l-4 border-blue-500 p-3">
            <div class="flex">
              <svg class="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
              <div>
                <p class="text-xs text-blue-700 font-medium">Onay Zinciri Nasıl Belirlenir?</p>
                <p class="text-[10px] text-blue-600 mt-1">
                  Onay zinciri çalışanın departman yöneticisi, üst departman yöneticileri ve direkt
                  yöneticisinden oluşur.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fazla Mesai Onay Akışı -->
    <div v-show="activeTab === 'overtime-approval'" class="bg-white rounded-lg shadow p-4">
      <h3 class="text-sm font-semibold mb-4 text-gray-800">Fazla Mesai Onay Akışı Ayarları</h3>
      <div class="space-y-4">
        <!-- Onay Sistemini Aktifleştir -->
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div>
            <label class="block text-xs font-medium text-gray-700">Onay Sistemini Kullan</label>
            <p class="text-[10px] text-gray-500">Fazla mesai talepleri onay sürecinden geçsin</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="form.overtimeApprovalSettings.enabled"
              @change="saveOvertimeApprovalSettings"
              class="sr-only peer"
            />
            <div
              class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
            ></div>
          </label>
        </div>

        <div
          v-if="form.overtimeApprovalSettings.enabled"
          class="space-y-4 pl-4 border-l-2 border-gray-200"
        >
          <!-- İzin Onay Akışını Kullan -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <label class="block text-xs font-medium text-gray-700">İzin Onay Akışını Kullan</label>
              <p class="text-[10px] text-gray-500">İzin talepleriyle aynı onay zincirini kullan</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="form.overtimeApprovalSettings.useLeaveApprovalChain"
                @change="saveOvertimeApprovalSettings"
                class="sr-only peer"
              />
              <div
                class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>

          <!-- Onay Seviyesi -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Kaç Seviye Onay Gerekli</label>
            <input
              v-model.number="form.overtimeApprovalSettings.approvalLevels"
              type="number"
              min="0"
              @blur="saveOvertimeApprovalSettings"
              class="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p class="text-[10px] text-gray-500 mt-1">
              0 = Tüm onay zinciri, 1+ = Belirli sayıda onay yeterli
            </p>
          </div>

          <!-- Kendi Kendine Onay -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <label class="block text-xs font-medium text-gray-700">Kendi Mesaisini Onaylama</label>
              <p class="text-[10px] text-gray-500">Yönetici kendi fazla mesai talebini onaylayabilsin</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="form.overtimeApprovalSettings.allowSelfApproval"
                @change="saveOvertimeApprovalSettings"
                class="sr-only peer"
              />
              <div
                class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>

          <!-- Bilgi Notu -->
          <div class="bg-blue-50 border-l-4 border-blue-500 p-3">
            <p class="text-[10px] text-blue-700">
              Fazla mesai talepleri, "Genel Onay Modu" ayarına (İzin Onay Akışı sekmesinde) göre onay zincirine gönderilir.
              Onaylanan fazla mesailer otomatik olarak puantaja aktarılır.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Avans Ayarları -->
    <div v-show="activeTab === 'advance'" class="bg-white rounded-lg shadow p-4">
      <h3 class="text-sm font-semibold mb-4 text-gray-800">Avans Talebi Sistemi Ayarları</h3>
      <div class="space-y-4">
        <!-- Sistemi Aktifleştir -->
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div>
            <label class="block text-xs font-medium text-gray-700"
              >Avans Talebi Sistemini Aktifleştir</label
            >
            <p class="text-[10px] text-gray-500">Çalışanların avans talep edebilmesini sağlar</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="form.advanceSettings.enabled"
              @change="saveAdvanceSettings"
              class="sr-only peer"
            />
            <div
              class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
            ></div>
          </label>
        </div>

        <div v-if="form.advanceSettings.enabled" class="space-y-4 pl-4 border-l-2 border-gray-200">
          <!-- Maksimum Tutar Ayarları -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1"
                >Maksimum Tutar Tipi</label
              >
              <select
                v-model="form.advanceSettings.maxAmountType"
                @change="saveAdvanceSettings"
                class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PERCENTAGE">Maaşın Yüzdesi</option>
                <option value="FIXED">Sabit Tutar</option>
                <option value="UNLIMITED">Sınırsız</option>
              </select>
            </div>
            <div v-if="form.advanceSettings.maxAmountType !== 'UNLIMITED'">
              <label class="block text-xs font-medium text-gray-700 mb-1">
                {{
                  form.advanceSettings.maxAmountType === 'PERCENTAGE' ? 'Yüzde (%)' : 'Tutar (TL)'
                }}
              </label>
              <Input
                v-model.number="form.advanceSettings.maxAmountValue"
                type="number"
                :min="1"
                @blur="saveAdvanceSettings"
              />
            </div>
          </div>

          <!-- Taksit Ayarları -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <label class="block text-xs font-medium text-gray-700"
                >Taksitli Avansa İzin Ver</label
              >
              <p class="text-[10px] text-gray-500">Çalışanlar avansı taksitle geri ödeyebilsin</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="form.advanceSettings.allowInstallments"
                @change="saveAdvanceSettings"
                class="sr-only peer"
              />
              <div
                class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>

          <div v-if="form.advanceSettings.allowInstallments">
            <label class="block text-xs font-medium text-gray-700 mb-1"
              >Maksimum Taksit Sayısı</label
            >
            <Input
              v-model.number="form.advanceSettings.maxInstallments"
              type="number"
              :min="1"
              :max="12"
              @blur="saveAdvanceSettings"
            />
            <p class="text-[10px] text-gray-500 mt-1">1-12 ay arası</p>
          </div>

          <!-- Diğer Kısıtlamalar -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1"
                >Minimum Çalışma Süresi (Ay)</label
              >
              <Input
                v-model.number="form.advanceSettings.minWorkMonths"
                type="number"
                :min="0"
                @blur="saveAdvanceSettings"
              />
              <p class="text-[10px] text-gray-500 mt-1">Avans talep edebilmek için</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Aylık Talep Limiti</label>
              <Input
                v-model.number="form.advanceSettings.monthlyRequestLimit"
                type="number"
                :min="0"
                @blur="saveAdvanceSettings"
              />
              <p class="text-[10px] text-gray-500 mt-1">0 = Sınırsız</p>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Talep Başlangıç Günü</label>
            <Input
              v-model.number="form.advanceSettings.requestStartDay"
              type="number"
              :min="0"
              :max="31"
              @blur="saveAdvanceSettings"
            />
            <p class="text-[10px] text-gray-500 mt-1">
              Ayın kaçıncı gününden itibaren talep alınsın (0 = Her zaman)
            </p>
          </div>

          <!-- Onay Gerekliliği -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <label class="block text-xs font-medium text-gray-700">Onay Süreci Gerekli</label>
              <p class="text-[10px] text-gray-500">Avans talepleri yönetici onayına gitsin</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="form.advanceSettings.approvalRequired"
                @change="saveAdvanceSettings"
                class="sr-only peer"
              />
              <div
                class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>

          <!-- Bilgi Notu -->
          <div class="bg-blue-50 border-l-4 border-blue-500 p-3 mt-4">
            <div class="flex">
              <svg class="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
              <div>
                <p class="text-xs text-blue-700 font-medium">Avans Sistemi Hakkında</p>
                <p class="text-[10px] text-blue-600 mt-1">
                  Avans sistemi çalışanlarınızın maaş avansı talep edebilmesini sağlar. Talepler
                  onay zincirine gider ve ödeme planı oluşturulur.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Avans Onay Akışı -->
    <div v-show="activeTab === 'advance-approval'" class="bg-white rounded-lg shadow p-4">
      <h3 class="text-sm font-semibold mb-4 text-gray-800">Avans Onay Akışı Ayarları</h3>
      <div class="space-y-4">
        <!-- Onay Sistemini Aktifleştir -->
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div>
            <label class="block text-xs font-medium text-gray-700">Onay Sistemini Kullan</label>
            <p class="text-[10px] text-gray-500">Avans talepleri onay sürecinden geçsin</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="form.advanceApprovalSettings.enabled"
              @change="saveAdvanceApprovalSettings"
              class="sr-only peer"
            />
            <div
              class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
            ></div>
          </label>
        </div>

        <div
          v-if="form.advanceApprovalSettings.enabled"
          class="space-y-4 pl-4 border-l-2 border-gray-200"
        >
          <!-- İzin Onay Akışıyla Aynı -->
          <div class="flex items-center justify-between p-3 bg-yellow-50 rounded">
            <div>
              <label class="block text-xs font-medium text-gray-700"
                >İzin Onay Akışını Kullan</label
              >
              <p class="text-[10px] text-gray-500">İzin talebiyle aynı onaylayıcılar kullanılsın</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="form.advanceApprovalSettings.useLeaveApprovalChain"
                @change="saveAdvanceApprovalSettings"
                class="sr-only peer"
              />
              <div
                class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-600"
              ></div>
            </label>
          </div>

          <!-- Onaylayıcı Yoksa -->
          <div class="space-y-3">
            <label class="block text-xs font-medium text-gray-700">Onaylayıcı Olmadığında</label>
            <div class="space-y-2">
              <label
                class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                :class="
                  !form.advanceApprovalSettings.autoApproveIfNoApprover
                    ? 'bg-blue-50 border-blue-500'
                    : ''
                "
              >
                <input
                  type="radio"
                  v-model="form.advanceApprovalSettings.autoApproveIfNoApprover"
                  :value="false"
                  @change="saveAdvanceApprovalSettings"
                  class="mr-2"
                />
                <div>
                  <span class="text-xs font-medium">Onay Bekle</span>
                  <p class="text-[10px] text-gray-500">Talep PENDING durumunda beklesin</p>
                </div>
              </label>
              <label
                class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                :class="
                  form.advanceApprovalSettings.autoApproveIfNoApprover
                    ? 'bg-blue-50 border-blue-500'
                    : ''
                "
              >
                <input
                  type="radio"
                  v-model="form.advanceApprovalSettings.autoApproveIfNoApprover"
                  :value="true"
                  @change="saveAdvanceApprovalSettings"
                  class="mr-2"
                />
                <div>
                  <span class="text-xs font-medium">Otomatik Onayla</span>
                  <p class="text-[10px] text-gray-500">Onaylayıcı yoksa talep direkt onaylansın</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Onay Seviyesi -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1"
              >Kaç Seviye Onay Gerekli</label
            >
            <Input
              v-model.number="form.advanceApprovalSettings.approvalLevels"
              type="number"
              :min="0"
              @blur="saveAdvanceApprovalSettings"
            />
            <p class="text-[10px] text-gray-500 mt-1">
              0 = Tüm onay zinciri, 1+ = Belirli sayıda onay yeterli
            </p>
          </div>

          <!-- Kendi Kendine Onay -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <label class="block text-xs font-medium text-gray-700">Kendi Avansını Onaylama</label>
              <p class="text-[10px] text-gray-500">Yönetici kendi avans talebini onaylayabilsin</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="form.advanceApprovalSettings.allowSelfApproval"
                @change="saveAdvanceApprovalSettings"
                class="sr-only peer"
              />
              <div
                class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>

          <!-- Bilgi Notu -->
          <div class="bg-blue-50 border-l-4 border-blue-500 p-3">
            <div class="flex">
              <svg class="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
              <div>
                <p class="text-xs text-blue-700 font-medium">Onay Zinciri Seçenekleri</p>
                <p class="text-[10px] text-blue-600 mt-1">
                  İzin onay akışını kullanırsan, izin talepleriyle aynı yöneticiler avans
                  taleplerini de onaylar. Kapatırsan özel avans onay zinciri kullanılır (departman
                  yöneticisi → İK yöneticisi → şirket admini).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ek Ödemeler -->
    <div v-show="activeTab === 'additional-payments'" class="bg-white rounded-lg shadow">
      <!-- Alt Sekmeler -->
      <div class="border-b border-gray-200 px-4 pt-3">
        <nav class="flex gap-1">
          <button
            @click="paymentSubTab = 'company-payments'"
            class="px-4 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2"
            :class="
              paymentSubTab === 'company-payments'
                ? 'bg-green-50 text-green-700 border-green-500'
                : 'text-gray-500 hover:text-gray-700 border-transparent hover:bg-gray-50'
            "
          >
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Şirket Ödemeleri
            </span>
          </button>
          <button
            v-if="isSuperAdmin"
            @click="paymentSubTab = 'payment-types'"
            class="px-4 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2"
            :class="
              paymentSubTab === 'payment-types'
                ? 'bg-blue-50 text-blue-700 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 border-transparent hover:bg-gray-50'
            "
          >
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Ödeme Türleri
            </span>
          </button>
          <button
            @click="paymentSubTab = 'deduction-types'"
            class="px-4 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2"
            :class="
              paymentSubTab === 'deduction-types'
                ? 'bg-red-50 text-red-700 border-red-500'
                : 'text-gray-500 hover:text-gray-700 border-transparent hover:bg-gray-50'
            "
          >
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20 12H4"
                />
              </svg>
              Kesinti Türleri
            </span>
          </button>
        </nav>
      </div>

      <!-- Alt Sekme İçerikleri -->
      <div class="p-4">
        <!-- ==================== ŞİRKET ÖDEMELERİ ==================== -->
        <div v-show="paymentSubTab === 'company-payments'">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-gray-800">Şirket Ek Ödeme Türleri</h3>
            <div v-if="loadingPaymentTypes" class="flex items-center gap-2 text-xs text-gray-500">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Yükleniyor...
            </div>
          </div>

          <p class="text-xs text-gray-500 mb-4">
            Şirketinizde kullanılacak ek ödeme türlerini aktifleştirin ve varsayılan tutarlarını
            belirleyin. Çalışanlara ödeme atarken bu varsayılan değerler kullanılır veya
            özelleştirilebilir.
          </p>

          <!-- Ödeme Türleri Listesi -->
          <div class="space-y-2">
            <div
              v-for="pt in additionalPaymentTypes"
              :key="pt._id"
              class="border rounded-lg p-3 transition-colors"
              :class="
                isPaymentTypeEnabled(pt._id)
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              "
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <!-- Toggle Switch -->
                  <button
                    @click="togglePaymentType(pt, isPaymentTypeEnabled(pt._id))"
                    class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                    :class="isPaymentTypeEnabled(pt._id) ? 'bg-green-500' : 'bg-gray-300'"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      :class="isPaymentTypeEnabled(pt._id) ? 'translate-x-4' : 'translate-x-0.5'"
                    ></span>
                  </button>

                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-800">{{ pt.name }}</span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{{
                        pt.code
                      }}</span>
                      <span
                        class="text-[10px] px-1.5 py-0.5 rounded"
                        :class="{
                          'bg-blue-100 text-blue-700': pt.paymentFrequency === 'MONTHLY',
                          'bg-purple-100 text-purple-700': pt.paymentFrequency === 'YEARLY',
                          'bg-orange-100 text-orange-700': pt.paymentFrequency === 'ONE_TIME',
                        }"
                      >
                        {{ paymentFrequencyNames[pt.paymentFrequency] || pt.paymentFrequency }}
                      </span>
                      <span
                        v-if="pt.isTaxExempt"
                        class="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700"
                      >
                        Vergi Muaf
                      </span>
                    </div>
                    <p v-if="pt.description" class="text-xs text-gray-500 mt-0.5">
                      {{ pt.description }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <!-- Şirket Ayarları -->
                  <div v-if="isPaymentTypeEnabled(pt._id)" class="text-right">
                    <div class="text-sm font-semibold text-green-700">
                      {{
                        formatCurrency(
                          getCompanyPaymentType(pt._id)?.companySettings?.defaultAmount ||
                            getCompanyPaymentType(pt._id)?.defaultAmount
                        )
                      }}
                    </div>
                    <div
                      v-if="
                        getCompanyPaymentType(pt._id)?.companySettings?.customName ||
                        getCompanyPaymentType(pt._id)?.customName
                      "
                      class="text-[10px] text-gray-500"
                    >
                      {{
                        getCompanyPaymentType(pt._id)?.companySettings?.customName ||
                        getCompanyPaymentType(pt._id)?.customName
                      }}
                    </div>
                  </div>

                  <!-- Düzenle Butonu -->
                  <button
                    v-if="isPaymentTypeEnabled(pt._id)"
                    @click="
                      openPaymentTypeModal(
                        pt,
                        getCompanyPaymentType(pt._id)?.companySettings ||
                          getCompanyPaymentType(pt._id)
                      )
                    "
                    class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Ayarları Düzenle"
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
                </div>
              </div>

              <!-- Ek Bilgiler -->
              <div
                v-if="pt.isTaxExempt && pt.taxExemptLimit > 0"
                class="mt-2 text-[10px] text-gray-500 pl-12"
              >
                Vergi muafiyeti limiti: {{ formatCurrency(pt.taxExemptLimit) }}
              </div>
            </div>
          </div>

          <!-- Boş Durum -->
          <div
            v-if="!loadingPaymentTypes && additionalPaymentTypes.length === 0"
            class="text-center py-8 text-gray-500"
          >
            <svg
              class="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p class="text-sm">Henüz ödeme türü tanımlanmamış</p>
            <p class="text-xs mt-1">
              Sistem yöneticisi tarafından ödeme türleri eklendikten sonra burada görünecekler
            </p>
          </div>
        </div>

        <!-- ==================== ÖDEME TÜRLERİ (super_admin) ==================== -->
        <div v-show="paymentSubTab === 'payment-types'" v-if="isSuperAdmin">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-semibold text-gray-800">Global Ödeme Türleri</h3>
              <p class="text-xs text-gray-500 mt-1">
                Sistemdeki tüm ödeme türlerini yönetin. Bu türler tüm şirketler tarafından
                kullanılabilir.
              </p>
            </div>
            <button
              @click="openGlobalPaymentTypeModal(null)"
              class="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Yeni Tür Ekle
            </button>
          </div>

          <!-- Loading -->
          <div v-if="loadingPaymentTypes" class="flex items-center justify-center py-8">
            <svg class="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>

          <!-- Ödeme Türleri Listesi -->
          <div v-else class="space-y-2">
            <div
              v-for="pt in additionalPaymentTypes"
              :key="pt._id"
              class="border rounded-lg p-3 transition-colors"
              :class="
                pt.isActive ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300 opacity-60'
              "
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    :class="{
                      'bg-blue-500': pt.category === 'TRANSPORTATION',
                      'bg-orange-500': pt.category === 'FOOD',
                      'bg-purple-500': pt.category === 'FAMILY',
                      'bg-green-500': pt.category === 'BONUS',
                      'bg-gray-500': pt.category === 'OTHER',
                    }"
                  >
                    {{ pt.code.substring(0, 2) }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-800">{{ pt.name }}</span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{{
                        pt.code
                      }}</span>
                      <span
                        class="text-[10px] px-1.5 py-0.5 rounded"
                        :class="{
                          'bg-blue-100 text-blue-700': pt.paymentFrequency === 'MONTHLY',
                          'bg-purple-100 text-purple-700': pt.paymentFrequency === 'YEARLY',
                          'bg-orange-100 text-orange-700': pt.paymentFrequency === 'ONE_TIME',
                        }"
                      >
                        {{ paymentFrequencyNames[pt.paymentFrequency] || pt.paymentFrequency }}
                      </span>
                      <span
                        v-if="pt.isTaxExempt"
                        class="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700"
                      >
                        Vergi Muaf
                      </span>
                      <span
                        v-if="!pt.isActive"
                        class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700"
                      >
                        Pasif
                      </span>
                    </div>
                    <p v-if="pt.description" class="text-xs text-gray-500 mt-0.5">
                      {{ pt.description }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    @click="openGlobalPaymentTypeModal(pt)"
                    class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
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
                    v-if="!pt.isDefault"
                    @click="toggleGlobalPaymentTypeStatus(pt)"
                    class="p-1.5 rounded transition-colors"
                    :class="
                      pt.isActive
                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    "
                    :title="pt.isActive ? 'Pasif Yap' : 'Aktif Yap'"
                  >
                    <svg
                      v-if="pt.isActive"
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    <svg
                      v-else
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Boş Durum -->
          <div
            v-if="!loadingPaymentTypes && additionalPaymentTypes.length === 0"
            class="text-center py-8 text-gray-500"
          >
            <svg
              class="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <p class="text-sm">Henüz ödeme türü tanımlanmamış</p>
            <p class="text-xs mt-1">
              "Yeni Tür Ekle" butonuna tıklayarak ödeme türü ekleyebilirsiniz
            </p>
          </div>
        </div>

        <!-- ==================== KESİNTİ TÜRLERİ ==================== -->
        <div v-show="paymentSubTab === 'deduction-types'">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-semibold text-gray-800">Kesinti Türleri</h3>
              <p class="text-xs text-gray-500 mt-1">
                Çalışanlardan yapılacak kesintilerin türlerini yönetin.
              </p>
            </div>
            <button
              @click="openDeductionTypeModal(null)"
              class="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Yeni Kesinti Türü
            </button>
          </div>

          <!-- Loading -->
          <div v-if="loadingDeductionTypes" class="flex items-center justify-center py-8">
            <svg class="animate-spin h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24">
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>

          <!-- Kesinti Türleri Listesi -->
          <div v-else class="space-y-2">
            <div
              v-for="dt in deductionTypes"
              :key="dt._id"
              class="border rounded-lg p-3 transition-colors bg-white border-gray-200"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <svg
                      class="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M20 12H4"
                      />
                    </svg>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-800">{{ dt.name }}</span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{{
                        dt.code
                      }}</span>
                      <span
                        class="text-[10px] px-1.5 py-0.5 rounded"
                        :class="{
                          'bg-blue-100 text-blue-700': dt.deductionFrequency === 'MONTHLY',
                          'bg-purple-100 text-purple-700': dt.deductionFrequency === 'YEARLY',
                          'bg-orange-100 text-orange-700': dt.deductionFrequency === 'ONE_TIME',
                        }"
                      >
                        {{
                          deductionFrequencyNames[dt.deductionFrequency] || dt.deductionFrequency
                        }}
                      </span>
                    </div>
                    <p v-if="dt.description" class="text-xs text-gray-500 mt-0.5">
                      {{ dt.description }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <div v-if="dt.defaultAmount" class="text-right mr-2">
                    <span class="text-sm font-semibold text-red-600">{{
                      formatCurrency(dt.defaultAmount)
                    }}</span>
                  </div>
                  <button
                    @click="openDeductionTypeModal(dt)"
                    class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
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
                    v-if="!dt.isDefault"
                    @click="deleteDeductionType(dt)"
                    class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
              </div>
            </div>
          </div>

          <!-- Boş Durum -->
          <div
            v-if="!loadingDeductionTypes && deductionTypes.length === 0"
            class="text-center py-8 text-gray-500"
          >
            <svg
              class="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
            <p class="text-sm">Henüz kesinti türü tanımlanmamış</p>
            <p class="text-xs mt-1">
              "Yeni Kesinti Türü" butonuna tıklayarak kesinti türü ekleyebilirsiniz
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Ödeme Türü Ayar Modal -->
    <div
      v-if="showPaymentTypeModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4"
    >
      <div class="bg-white rounded-lg p-5 w-full max-w-2xl mx-4">
        <h3 class="text-sm font-bold mb-4">{{ editingPaymentType?.name }} - Ayarlar</h3>

        <form @submit.prevent="savePaymentType" class="space-y-4">
          <!-- Ödeme Yöntemi Seçenekleri (Yemek Kazancı için) -->
          <div
            v-if="
              editingPaymentType?.hasPaymentMethodOptions &&
              editingPaymentType?.paymentMethodOptions?.length > 0
            "
            class="border rounded-lg p-4 bg-gray-50"
          >
            <label class="block text-xs font-medium text-gray-700 mb-3">Ödeme Yöntemi</label>
            <div class="space-y-3">
              <div
                v-for="method in editingPaymentType.paymentMethodOptions"
                :key="method.code"
                class="flex items-start gap-3"
              >
                <input
                  :id="'method_' + method.code"
                  type="radio"
                  :value="method.code"
                  v-model="paymentTypeForm.selectedPaymentMethod"
                  @change="onPaymentMethodChange(method.code)"
                  class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label :for="'method_' + method.code" class="flex-1 cursor-pointer">
                  <span class="text-sm font-medium text-gray-800"
                    >{{ editingPaymentType.name }} {{ method.name.toLowerCase() }}</span
                  >
                  <p class="text-[11px] text-gray-500 mt-0.5">{{ method.description }}</p>
                </label>
              </div>
            </div>

            <!-- KDV Dahil Checkbox (Yol Abonman için) -->
            <div
              v-if="paymentTypeForm.selectedPaymentMethod === 'SUBSCRIPTION'"
              class="mt-3 flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200"
            >
              <input
                v-model="paymentTypeForm.includesVat"
                type="checkbox"
                id="includesVat"
                class="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label for="includesVat" class="text-xs text-orange-800">
                Abonman ödemelerini KDV Dahil yapıyorum.
              </label>
            </div>

            <!-- Yıllık Limitler Bilgisi -->
            <div v-if="activeYearlyTaxLimit" class="mt-4 p-3 bg-blue-50 rounded-lg">
              <p class="text-xs font-medium text-blue-800 mb-1">
                {{ activeYearlyTaxLimit.year }} Yılı Limitleri:
              </p>
              <!-- Yemek için limitler -->
              <div
                v-if="editingPaymentType?.code === 'YEMEK'"
                class="flex gap-4 text-[11px] text-blue-700"
              >
                <span
                  >SGK Günlük Limit:
                  {{ formatCurrency(activeYearlyTaxLimit.yemekLimits?.sgkDailyLimit) }}</span
                >
                <span
                  >Vergi Günlük Limit:
                  {{ formatCurrency(activeYearlyTaxLimit.yemekLimits?.vatDailyLimit) }}</span
                >
              </div>
              <!-- Yol için limitler -->
              <div
                v-else-if="editingPaymentType?.code === 'YOL'"
                class="flex flex-col gap-1 text-[11px] text-blue-700"
              >
                <div class="flex gap-4">
                  <span
                    >Günlük Limit (Abonman):
                    {{ formatCurrency(activeYearlyTaxLimit.yolLimits?.sgkDailyLimit) }}</span
                  >
                  <span v-if="paymentTypeForm.includesVat"
                    >KDV Dahil:
                    {{
                      formatCurrency((activeYearlyTaxLimit.yolLimits?.sgkDailyLimit || 0) * 1.1)
                    }}</span
                  >
                </div>
              </div>
              <p class="text-[10px] text-blue-600 mt-1 italic">
                Not: Ek Kazanç ve Kesinti tanımları dönemden bağımsız yapılır. Bu nedenle önceki yıl
                bordrolarını hesapladıktan ve kesinleştirdikten sonra bu ekran ile Ek Kazanç ve
                Kesintileri düzenleyebilirsiniz.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Varsayılan Tutar</label>
              <div class="relative">
                <input
                  v-model.number="paymentTypeForm.defaultAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  class="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
                  >₺</span
                >
              </div>
              <p class="text-[10px] text-gray-500 mt-1">
                Çalışanlara atanırken kullanılacak varsayılan tutar
              </p>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1"
                >Özel İsim (İsteğe Bağlı)</label
              >
              <input
                v-model="paymentTypeForm.customName"
                type="text"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örn: Personel Servisi"
              />
              <p class="text-[10px] text-gray-500 mt-1">
                Şirketinize özel isim kullanmak isterseniz
              </p>
            </div>
          </div>

          <div
            v-if="editingPaymentType?.paymentFrequency === 'ONE_TIME'"
            class="flex items-center gap-2"
          >
            <input
              v-model="paymentTypeForm.requiresApproval"
              type="checkbox"
              id="requiresApproval"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label for="requiresApproval" class="text-xs text-gray-700">
              Tek seferlik ödemeler için onay gereksin
            </label>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1"
              >Maksimum Tutar (İsteğe Bağlı)</label
            >
            <div class="relative">
              <input
                v-model.number="paymentTypeForm.maxAmount"
                type="number"
                min="0"
                step="0.01"
                class="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Limit yok"
              />
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₺</span>
            </div>
            <p class="text-[10px] text-gray-500 mt-1">Bu türden atanabilecek maksimum tutar</p>
          </div>

          <!-- Diğer özel durumlar için not -->
          <div class="text-[10px] text-gray-500 border-t pt-3">
            Diğer özel durumlar için lütfen ek kazanç ve kesinti ekranlarında düzenleme yapınız.
            Seçili bölümler için kazanç kesinti bilgileri kaydetme işlemi ile otomatik
            ayarlanacaktır.
          </div>

          <div class="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="sm" type="button" @click="closePaymentTypeModal"
              >İptal</Button
            >
            <Button type="submit" size="sm" :disabled="savingPaymentType">
              {{ savingPaymentType ? 'Kaydediliyor...' : 'Kaydet' }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Yıllık Vergi Limitleri (super_admin ve bayi_admin için) -->
    <div v-show="activeTab === 'yearly-tax-limits'" class="bg-white rounded-lg shadow p-4">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Yıllık SGK ve Vergi Limitleri</h3>
          <p class="text-xs text-gray-500 mt-1">
            Yemek ve Yol kazançları için yıllık SGK ve Vergi muafiyet limitlerini düzenleyin.
          </p>
        </div>
        <button
          @click="openYearlyLimitModal(null)"
          class="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Yeni Yıl Ekle
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loadingYearlyLimits" class="flex items-center justify-center py-8">
        <svg class="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>

      <!-- Yıllık Limitler Listesi -->
      <div v-else class="space-y-3">
        <div
          v-for="limit in yearlyTaxLimits"
          :key="limit._id"
          class="border rounded-lg p-4 transition-colors"
          :class="limit.isActive ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <span
                class="text-lg font-bold"
                :class="limit.isActive ? 'text-green-700' : 'text-gray-700'"
              >
                {{ limit.year }}
              </span>
              <span
                v-if="limit.isActive"
                class="text-[10px] px-2 py-0.5 rounded-full bg-green-500 text-white font-medium"
              >
                AKTİF YIL
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="!limit.isActive"
                @click="setActiveYear(limit)"
                class="text-xs px-2 py-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                title="Aktif Yıl Olarak Ayarla"
              >
                Aktif Yap
              </button>
              <button
                @click="openYearlyLimitModal(limit)"
                class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
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
                v-if="!limit.isActive"
                @click="deleteYearlyLimit(limit)"
                class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
          </div>

          <!-- Limit Detayları -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Yemek Limitleri -->
            <div class="bg-white rounded-lg p-3 border border-orange-100">
              <h4 class="text-xs font-semibold text-orange-700 mb-2 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Yemek Kazancı
              </h4>
              <div class="space-y-1 text-xs">
                <div class="flex justify-between">
                  <span class="text-gray-500">SGK Günlük:</span>
                  <span class="font-medium text-gray-700">{{
                    formatCurrency(limit.yemekLimits?.sgkDailyLimit)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Vergi Günlük:</span>
                  <span class="font-medium text-gray-700">{{
                    formatCurrency(limit.yemekLimits?.vatDailyLimit)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Yol Limitleri -->
            <div class="bg-white rounded-lg p-3 border border-blue-100">
              <h4 class="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                Yol Kazancı
              </h4>
              <div class="space-y-1 text-xs">
                <div class="flex justify-between">
                  <span class="text-gray-500">SGK Günlük:</span>
                  <span class="font-medium text-gray-700">{{
                    formatCurrency(limit.yolLimits?.sgkDailyLimit)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Vergi Günlük:</span>
                  <span class="font-medium text-gray-700">{{
                    formatCurrency(limit.yolLimits?.vatDailyLimit)
                  }}</span>
                </div>
                <div class="flex justify-between border-t pt-1 mt-1">
                  <span class="text-gray-500">SGK Aylık:</span>
                  <span class="font-medium text-gray-700">{{
                    formatCurrency(limit.yolLimits?.sgkMonthlyLimit)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Vergi Aylık:</span>
                  <span class="font-medium text-gray-700">{{
                    formatCurrency(limit.yolLimits?.vatMonthlyLimit)
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notlar -->
          <div v-if="limit.notes" class="mt-3 text-xs text-gray-500 italic">
            {{ limit.notes }}
          </div>
        </div>

        <!-- Boş Durum -->
        <div v-if="yearlyTaxLimits.length === 0" class="text-center py-8 text-gray-500">
          <svg
            class="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p class="text-sm">Henüz yıllık limit tanımlanmamış</p>
          <p class="text-xs mt-1">
            Yeni yıl ekleyerek SGK ve Vergi limitlerini tanımlayabilirsiniz
          </p>
        </div>
      </div>
    </div>

    <!-- Yıllık Limit Düzenleme Modal -->
    <div
      v-if="showYearlyLimitModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div class="flex items-center justify-between p-4 border-b">
          <h3 class="text-sm font-semibold text-gray-800">
            {{ yearlyLimitForm._id ? 'Yıllık Limitleri Düzenle' : 'Yeni Yıl Ekle' }}
          </h3>
          <button @click="showYearlyLimitModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form @submit.prevent="saveYearlyLimit" class="p-4 space-y-4">
          <!-- Yıl -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Yıl</label>
            <input
              v-model.number="yearlyLimitForm.year"
              type="number"
              min="2020"
              max="2099"
              required
              :disabled="!!yearlyLimitForm._id"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <!-- Yemek Limitleri -->
          <div class="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <h4 class="text-xs font-semibold text-orange-700 mb-3">Yemek Kazancı Limitleri</h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] text-gray-600 mb-1">SGK Günlük Limit (TL)</label>
                <input
                  v-model.number="yearlyLimitForm.yemekLimits.sgkDailyLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label class="block text-[10px] text-gray-600 mb-1">Vergi Günlük Limit (TL)</label>
                <input
                  v-model.number="yearlyLimitForm.yemekLimits.vatDailyLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <!-- Yol Limitleri -->
          <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <h4 class="text-xs font-semibold text-blue-700 mb-3">Yol Kazancı Limitleri</h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] text-gray-600 mb-1">SGK Günlük Limit (TL)</label>
                <input
                  v-model.number="yearlyLimitForm.yolLimits.sgkDailyLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-[10px] text-gray-600 mb-1">Vergi Günlük Limit (TL)</label>
                <input
                  v-model.number="yearlyLimitForm.yolLimits.vatDailyLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-[10px] text-gray-600 mb-1">SGK Aylık Limit (TL)</label>
                <input
                  v-model.number="yearlyLimitForm.yolLimits.sgkMonthlyLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-[10px] text-gray-600 mb-1">Vergi Aylık Limit (TL)</label>
                <input
                  v-model.number="yearlyLimitForm.yolLimits.vatMonthlyLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- Notlar -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Notlar</label>
            <textarea
              v-model="yearlyLimitForm.notes"
              rows="2"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Opsiyonel açıklama..."
            ></textarea>
          </div>

          <!-- Aktif Yıl -->
          <div class="flex items-center gap-2">
            <input
              v-model="yearlyLimitForm.isActive"
              type="checkbox"
              id="yearlyLimitActive"
              class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label for="yearlyLimitActive" class="text-xs text-gray-700">
              Bu yılı aktif yıl olarak ayarla
            </label>
          </div>

          <!-- Buttons -->
          <div class="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              @click="showYearlyLimitModal = false"
              class="px-4 py-2 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              :disabled="savingYearlyLimit"
              class="px-4 py-2 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {{ savingYearlyLimit ? 'Kaydediliyor...' : 'Kaydet' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Şifre Değiştirme -->
    <div v-show="activeTab === 'password'" class="bg-white rounded-lg shadow p-4 max-w-md">
      <h3 class="text-sm font-semibold mb-4 text-gray-800">Şifre Değiştirme</h3>
      <form @submit.prevent="changePassword" class="space-y-3">
        <div
          v-if="authStore.user?.mustChangePassword"
          class="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-xs"
        >
          İlk giriş yapıyorsunuz. Lütfen şifrenizi belirleyin.
        </div>
        <div v-if="!authStore.user?.mustChangePassword">
          <Input
            v-model="passwordForm.currentPassword"
            type="password"
            label="Mevcut Şifre"
            required
          />
        </div>
        <Input
          v-model="passwordForm.newPassword"
          type="password"
          label="Yeni Şifre"
          required
          minlength="6"
        />
        <Input
          v-model="passwordForm.confirmPassword"
          type="password"
          label="Yeni Şifre Tekrar"
          required
        />
        <div
          v-if="
            passwordForm.newPassword &&
            passwordForm.confirmPassword &&
            passwordForm.newPassword !== passwordForm.confirmPassword
          "
          class="text-xs text-red-600"
        >
          Şifreler eşleşmiyor
        </div>
        <div class="flex justify-end">
          <Button
            type="submit"
            size="sm"
            :disabled="
              passwordForm.newPassword !== passwordForm.confirmPassword ||
              passwordForm.newPassword.length < 6 ||
              changingPassword
            "
          >
            {{ changingPassword ? 'Değiştiriliyor...' : 'Şifreyi Değiştir' }}
          </Button>
        </div>
      </form>
    </div>

    <!-- Tatil Ekleme Modal -->
    <div
      v-if="showAddHolidayModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-4 w-full max-w-sm">
        <h3 class="text-sm font-bold mb-3">Tatil Ekle</h3>
        <form @submit.prevent="addHoliday" class="space-y-3">
          <Input v-model="newHoliday.date" type="date" label="Tarih" required />
          <div class="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" @click="showAddHolidayModal = false"
              >İptal</Button
            >
            <Button type="submit" size="sm">Ekle</Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Çalışma Saati Ekleme Modal -->
    <div
      v-if="showAddWorkingHoursModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-4 w-full max-w-sm">
        <h3 class="text-sm font-bold mb-3">Çalışma Saati Şablonu Ekle</h3>
        <form @submit.prevent="addWorkingHours" class="space-y-3">
          <Input v-model="newWorkingHours.name" label="Şablon Adı" required />
          <Input v-model="newWorkingHours.startTime" type="time" label="Giriş Saati" required />
          <Input v-model="newWorkingHours.endTime" type="time" label="Çıkış Saati" required />
          <Input
            v-model.number="newWorkingHours.breakDuration"
            type="number"
            label="Mola Süresi (dk)"
          />
          <div class="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" @click="showAddWorkingHoursModal = false"
              >İptal</Button
            >
            <Button type="submit" size="sm">Ekle</Button>
          </div>
        </form>
      </div>
    </div>
    <!-- Bilgi Değişiklik Talepleri -->
    <div v-show="activeTab === 'profile-requests'" class="bg-white rounded-lg shadow p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold">Çalışan Bilgi Değişiklik Talepleri</h3>
        <Button size="xs" variant="secondary" @click="loadProfileRequests">Yenile</Button>
      </div>

      <div v-if="profileRequestsLoading" class="text-center py-6">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
      </div>

      <div v-else-if="profileRequests.length === 0" class="text-center py-6 text-gray-500 text-sm">
        Bekleyen bilgi değişiklik talebi yok
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="pr in profileRequests"
          :key="pr._id"
          class="border border-gray-200 rounded-lg p-4"
        >
          <div class="flex items-start justify-between mb-2">
            <div>
              <p class="text-sm font-semibold text-gray-800">
                {{ pr.employee?.firstName }} {{ pr.employee?.lastName }}
              </p>
              <p class="text-xs text-gray-500">
                TC: {{ pr.employee?.tcKimlik }} | {{ formatProfileDate(pr.createdAt) }}
              </p>
            </div>
            <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              Bekliyor
            </span>
          </div>

          <!-- Değişiklik detayları -->
          <div class="bg-gray-50 rounded p-2 mb-3 space-y-1">
            <div v-for="(change, field) in pr.changes" :key="field" class="flex items-center text-xs gap-2">
              <span class="font-medium text-gray-700 w-28">{{ change.label || field }}:</span>
              <span class="text-red-500 line-through">{{ change.old || '(boş)' }}</span>
              <span class="text-gray-400">→</span>
              <span class="text-green-600 font-medium">{{ change.new || '(boş)' }}</span>
            </div>
          </div>

          <!-- Onay/Red butonları -->
          <div class="flex gap-2 items-center">
            <input
              v-model="pr._reviewNote"
              type="text"
              placeholder="Not (opsiyonel)"
              class="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button
              size="xs"
              variant="success"
              :disabled="pr._processing"
              @click="handleProfileRequest(pr, 'approve')"
            >
              Onayla
            </Button>
            <Button
              size="xs"
              variant="danger"
              :disabled="pr._processing"
              @click="handleProfileRequest(pr, 'reject')"
            >
              Reddet
            </Button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';
import Button from '@/components/Button.vue';
import Input from '@/components/Input.vue';
import PhoneInput from '@/components/PhoneInput.vue';
import ThemeSelector from '@/components/ThemeSelector.vue';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import Departments from './Departments.vue';
import UserManagement from './UserManagement.vue';

const authStore = useAuthStore();
const toast = useToastStore();
const confirmModal = useConfirmStore();
const route = useRoute();

// Bayi admin için şirket seçimi
const isDealer = computed(() => authStore.isBayiAdmin);
const isSuperAdmin = computed(() => authStore.isSuperAdmin);
const companies = ref([]);
const selectedCompanyId = ref('');

// Aktif şirket ID'sini döndür (bayi_admin için seçilen, diğerleri için kendi şirketi)
const activeCompanyId = computed(() => {
  if (isDealer.value) {
    return selectedCompanyId.value;
  }
  return authStore.companyId;
});

// Tabs
// Tab Icons - Lucide/Feather style stroke icons
const tabIcons = {
  theme:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>',
  company:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>',
  general:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>',
  departments:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>',
  users:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
  checkin:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>',
  weekend:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>',
  holidays:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M12 14l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5z" /></svg>',
  workinghours:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>',
  puantaj:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>',
  'leave-approval':
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>',
  advance:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12a2 2 0 002 2h14v-4" /><path d="M18 12a2 2 0 00-2 2v4h4v-4a2 2 0 00-2-2z" /></svg>',
  'advance-approval':
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /><circle cx="12" cy="12" r="4" /></svg>',
  'overtime-approval':
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /><path d="M17 17l3 3" /></svg>',
  password:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>',
  dealer:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>',
  'additional-payments':
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 8a4 4 0 100 8 4 4 0 000-8z" /><path d="M12 10v4m-2-2h4" /></svg>',
  'yearly-tax-limits':
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>',
  'profile-requests':
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M17 11l2 2 4-4" /></svg>',
};

const tabs = computed(() => {
  const baseTabs = [
    { id: 'theme', name: 'Tema', icon: tabIcons.theme },
    { id: 'company', name: 'Şirket Bilgileri', icon: tabIcons.company },
    { id: 'general', name: 'Genel', icon: tabIcons.general },
    { id: 'departments', name: 'Departmanlar', icon: tabIcons.departments },
    { id: 'checkin', name: 'Giriş/Çıkış', icon: tabIcons.checkin },
    { id: 'weekend', name: 'Hafta Tatili', icon: tabIcons.weekend },
    { id: 'holidays', name: 'Resmi Tatiller', icon: tabIcons.holidays },
    { id: 'workinghours', name: 'Çalışma Saatleri', icon: tabIcons.workinghours },
    { id: 'puantaj', name: 'Puantaj', icon: tabIcons.puantaj },
    { id: 'leave-approval', name: 'İzin Onay Akışı', icon: tabIcons['leave-approval'] },
    { id: 'overtime-approval', name: 'Mesai Onay Akışı', icon: tabIcons['overtime-approval'] },
    { id: 'advance', name: 'Avans Ayarları', icon: tabIcons.advance },
    { id: 'advance-approval', name: 'Avans Onay Akışı', icon: tabIcons['advance-approval'] },
    { id: 'additional-payments', name: 'Ek Ödemeler', icon: tabIcons['additional-payments'] },
    { id: 'password', name: 'Şifre', icon: tabIcons.password },
  ];

  // Kullanıcı Yönetimi sekmesini sadece belirli rollere göster
  if (authStore.hasAnyRole('super_admin', 'bayi_admin', 'company_admin')) {
    baseTabs.splice(3, 0, { id: 'users', name: 'Kullanıcı Yönetimi', icon: tabIcons.users });
  }

  // Bayi Ayarları sekmesini sadece bayi_admin için göster
  if (authStore.isBayiAdmin) {
    baseTabs.unshift({ id: 'dealer', name: 'Bayi Ayarları', icon: tabIcons.dealer });
  }

  // Bilgi Değişiklik Talepleri sekmesini company_admin, super_admin, bayi_admin için göster
  if (authStore.hasAnyRole('super_admin', 'bayi_admin', 'company_admin')) {
    baseTabs.push({
      id: 'profile-requests',
      name: 'Bilgi Talepleri',
      icon: tabIcons['profile-requests'],
    });
  }

  // Yıllık Vergi Limitleri sekmesini super_admin ve bayi_admin için göster
  if (authStore.hasAnyRole('super_admin', 'bayi_admin')) {
    baseTabs.push({
      id: 'yearly-tax-limits',
      name: 'Yıllık Limitler',
      icon: tabIcons['yearly-tax-limits'],
    });
  }

  return baseTabs;
});
const activeTab = ref(authStore.isBayiAdmin ? 'dealer' : 'company');

// Dealer Settings (bayi_admin için)
const dealerForm = ref({
  name: '',
  ikDisplayName: '',
});
const savingDealer = ref(false);

const loadDealerSettings = async () => {
  const userRole = authStore.user?.role?.name || authStore.user?.role;
  if (userRole !== 'bayi_admin' || !authStore.user?.dealer) return;
  try {
    const dealerId = authStore.user.dealer?._id || authStore.user.dealer;
    const response = await api.get(`/dealers/${dealerId}`);
    const data = response.data?.data || response.data;
    dealerForm.value.name = data?.name || '';
    dealerForm.value.ikDisplayName = data?.ikDisplayName || '';
  } catch (error) {
    console.error('Bayi bilgileri yüklenemedi:', error);
  }
};

const saveDealerSettings = async () => {
  if (!authStore.user?.dealer) return;
  savingDealer.value = true;
  try {
    const dealerId = authStore.user.dealer?._id || authStore.user.dealer;
    await api.put(`/dealers/${dealerId}`, {
      name: dealerForm.value.name,
      ikDisplayName: dealerForm.value.ikDisplayName,
    });
    toast.success('Bayi ayarları kaydedildi');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Kaydetme hatası');
  } finally {
    savingDealer.value = false;
  }
};

// Company Info
const companyForm = ref({
  name: '',
  address: '',
  taxOffice: '',
  taxNumber: '',
  mersisNo: '',
  foundingDate: '',
  authorizedPersonFullName: '',
  authorizedPersonEmail: '',
  authorizedPersonPhone: '',
});
const savingCompany = ref(false);

// Format functions
const formatTaxNumber = event => {
  let value = event.target.value.replace(/\D/g, '');
  if (value.length > 11) value = value.substring(0, 11);
  companyForm.value.taxNumber = value;
};

const formatMersisNo = event => {
  let value = event.target.value.replace(/\D/g, '');
  if (value.length > 16) value = value.substring(0, 16);
  companyForm.value.mersisNo = value;
};

const formatAuthorizedPhone = event => {
  let value = event.target.value.replace(/\D/g, '');
  if (value.length > 11) value = value.substring(0, 11);
  // Format: 0 555 555 55 55
  if (value.length > 0) {
    value = value.replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    value = value.replace(/(\d{1})(\d{3})(\d{3})(\d{2})/, '$1 $2 $3 $4');
    value = value.replace(/(\d{1})(\d{3})(\d{3})/, '$1 $2 $3');
    value = value.replace(/(\d{1})(\d{3})/, '$1 $2');
  }
  companyForm.value.authorizedPersonPhone = value;
};

// General Settings
const form = ref({
  title: '',
  logo: '',
  activeAttendanceTemplate: '',
  payrollCalculationType: 'NET',
  autoAddApprovedEmployees: true,
  checkInSettings: {
    enabled: false,
    locationRequired: true,
    allowedLocation: { latitude: null, longitude: null, radius: 100 },
    autoCheckIn: false,
  },
  advanceSettings: {
    enabled: false,
    maxAmountType: 'PERCENTAGE',
    maxAmountValue: 50,
    maxInstallments: 3,
    minWorkMonths: 3,
    requestStartDay: 1,
    monthlyRequestLimit: 1,
    approvalRequired: true,
    allowInstallments: true,
  },
  leaveApprovalSettings: {
    enabled: true,
    requireApproval: true,
    autoApproveIfNoApprover: false,
    approvalLevels: 0,
    allowSelfApproval: false,
  },
  advanceApprovalSettings: {
    enabled: true,
    useLeaveApprovalChain: true,
    requireApproval: true,
    autoApproveIfNoApprover: false,
    approvalLevels: 0,
    allowSelfApproval: false,
  },
  approvalMode: 'chain_with_admin',
  overtimeApprovalSettings: {
    enabled: true,
    useLeaveApprovalChain: true,
    approvalLevels: 0,
    allowSelfApproval: false,
  },
});
const file = ref(null);
const loading = ref(false);
const gettingLocation = ref(false);
const attendanceTemplates = ref([]);

// Password
const showPasswordChangeModal = ref(false);
const changingPassword = ref(false);
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '', newEmail: '', newPhone: '' });

// Placeholder email kontrolü (TC@personelplus.com veya vergi@personelplus.com gibi sistem tarafından atanmış email)
const isPlaceholderEmail = computed(() => {
  const email = authStore.user?.email || '';
  return email.endsWith('@personelplus.com') || email.endsWith('@placeholder.com');
});

// Weekend Settings
const weekendTab = ref('company');
const weekDays = [
  { value: 0, label: 'Pazar' },
  { value: 1, label: 'Pazartesi' },
  { value: 2, label: 'Salı' },
  { value: 3, label: 'Çarşamba' },
  { value: 4, label: 'Perşembe' },
  { value: 5, label: 'Cuma' },
  { value: 6, label: 'Cumartesi' },
];
const companyWeekendDays = ref([0]);
const departmentWeekendDays = ref([]);
const employeeWeekendDays = ref([]);
const selectedDepartment = ref('');
const selectedEmployee = ref('');
const departments = ref([]);
const employees = ref([]);
const weekendLeaveDeduction = ref('none');
const leaveDeductionOptions = [
  {
    value: 'none',
    label: 'Hiçbiri düşülmesin',
    desc: 'Hafta tatili günleri yıllık izinden düşülmez',
  },
  { value: 'all', label: 'Tümü düşülsün', desc: 'Tüm hafta tatili günleri yıllık izinden düşülür' },
  {
    value: 'first_only',
    label: 'Sadece birinci gün',
    desc: 'Sadece birinci hafta tatili günü düşülür',
  },
  {
    value: 'second_only',
    label: 'Sadece ikinci gün',
    desc: 'Sadece ikinci hafta tatili günü düşülür',
  },
];

// Holidays
const holidayYear = ref(new Date().getFullYear());
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear();
  return [currentYear - 1, currentYear, currentYear + 1];
});
const holidays = ref([]);
const showAddHolidayModal = ref(false);
const newHoliday = ref({ name: '', date: '' });

// Working Hours
const workingHoursList = ref([]);
const showAddWorkingHoursModal = ref(false);
const newWorkingHours = ref({ name: '', startTime: '09:00', endTime: '18:00', breakDuration: 60 });

// Puantaj Templates
const puantajTemplates = ref([]);

// Ek Ödemeler (Additional Payments)
const additionalPaymentTypes = ref([]); // Global ödeme türleri
const companyPaymentTypes = ref([]); // Şirketin aktifleştirdiği türler
const loadingPaymentTypes = ref(false);
const savingPaymentType = ref(false);
const showPaymentTypeModal = ref(false);
const editingPaymentType = ref(null);
const paymentTypeForm = ref({
  paymentTypeId: '',
  defaultAmount: 0,
  customName: '',
  requiresApproval: false,
  maxAmount: null,
  selectedPaymentMethod: null,
  hasSgkDeduction: true,
  hasVatDeduction: true,
  createAutoDeduction: false,
  includesVat: false,
});

// Yıllık vergi limitleri
const yearlyTaxLimits = ref([]);
const activeYearlyTaxLimit = ref(null);
const loadingYearlyLimits = ref(false);
const savingYearlyLimit = ref(false);
const showYearlyLimitModal = ref(false);
const yearlyLimitForm = ref({
  _id: null,
  year: new Date().getFullYear(),
  yemekLimits: {
    sgkDailyLimit: 0,
    vatDailyLimit: 0,
  },
  yolLimits: {
    sgkDailyLimit: 0,
    vatDailyLimit: 0,
    sgkMonthlyLimit: 0,
    vatMonthlyLimit: 0,
  },
  notes: '',
  isActive: false,
});

// Alt sekme yönetimi
const paymentSubTab = ref('company-payments'); // 'company-payments', 'payment-types', 'deduction-types'

// Global ödeme türü yönetimi (super_admin)
const showGlobalPaymentTypeModal = ref(false);
const savingGlobalPaymentType = ref(false);
const globalPaymentTypeForm = ref({
  _id: null,
  name: '',
  code: '',
  description: '',
  category: 'OTHER',
  paymentFrequency: 'MONTHLY',
  isTaxExempt: false,
  taxExemptLimit: 0,
  isActive: true,
  displayOrder: 99,
});

// Kesinti Türleri
const deductionTypes = ref([]);
const loadingDeductionTypes = ref(false);
const savingDeductionType = ref(false);
const showDeductionTypeModal = ref(false);
const deductionTypeForm = ref({
  _id: null,
  name: '',
  code: '',
  description: '',
  deductionFrequency: 'MONTHLY',
  defaultAmount: null,
  isActive: true,
});

// Ödeme kategorisi adları
const paymentCategoryNames = {
  TRANSPORTATION: 'Ulaşım',
  FOOD: 'Yemek',
  FAMILY: 'Aile',
  CLOTHING: 'Giyim',
  BONUS: 'Prim',
  OTHER: 'Diğer',
};

// Ödeme sıklığı adları
const paymentFrequencyNames = {
  MONTHLY: 'Aylık',
  YEARLY: 'Yıllık',
  ONE_TIME: 'Tek Seferlik',
};

// Kesinti sıklığı adları
const deductionFrequencyNames = {
  MONTHLY: 'Aylık',
  YEARLY: 'Yıllık',
  ONE_TIME: 'Tek Seferlik',
};

// Kesinti Türleri Functions
const loadDeductionTypes = async () => {
  loadingDeductionTypes.value = true;
  try {
    // TODO: Backend API eklendikten sonra aktif edilecek
    // const response = await api.get('/deduction-types')
    // deductionTypes.value = response.data
    deductionTypes.value = [];
  } catch (error) {
    console.error('Kesinti türleri yüklenemedi:', error);
  } finally {
    loadingDeductionTypes.value = false;
  }
};

const openDeductionTypeModal = dt => {
  if (dt) {
    deductionTypeForm.value = {
      _id: dt._id,
      name: dt.name || '',
      code: dt.code || '',
      description: dt.description || '',
      deductionFrequency: dt.deductionFrequency || 'MONTHLY',
      defaultAmount: dt.defaultAmount || null,
      isActive: dt.isActive !== false,
    };
  } else {
    deductionTypeForm.value = {
      _id: null,
      name: '',
      code: '',
      description: '',
      deductionFrequency: 'MONTHLY',
      defaultAmount: null,
      isActive: true,
    };
  }
  showDeductionTypeModal.value = true;
};

const saveDeductionType = async () => {
  savingDeductionType.value = true;
  try {
    // TODO: Backend API eklendikten sonra aktif edilecek
    toast.info('Kesinti türleri özelliği yakında aktif olacak');
    showDeductionTypeModal.value = false;
  } catch (error) {
    toast.error(error.response?.data?.message || 'Kesinti türü kaydedilemedi');
  } finally {
    savingDeductionType.value = false;
  }
};

const deleteDeductionType = async dt => {
  if (!confirm(`"${dt.name}" kesinti türünü silmek istediğinizden emin misiniz?`)) return;
  try {
    // TODO: Backend API eklendikten sonra aktif edilecek
    toast.info('Kesinti türleri özelliği yakında aktif olacak');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Kesinti türü silinemedi');
  }
};

// Formatters
const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('tr-TR');
};

// Load Functions
const loadCompanies = async () => {
  if (!isDealer.value) return;
  try {
    const response = await api.get('/companies');
    companies.value = response.data?.data || response.data;
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error);
  }
};

const onCompanyChange = () => {
  if (selectedCompanyId.value) {
    loadCompanyInfo();
    loadSettings();
    loadWeekendSettings();
    loadDepartments();
    loadEmployees();
    loadHolidays();
    loadWorkingHours();
    loadPuantajTemplates();
    loadAdditionalPaymentTypes();
  }
};

const loadCompanyInfo = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) return;
    const response = await api.get(`/companies/${companyId}`);
    const company = response.data;
    companyForm.value = {
      name: company.name || '',
      address: company.address || '',
      taxOffice: company.taxOffice || '',
      taxNumber: company.taxNumber || '',
      mersisNo: company.mersisNo || '',
      foundingDate: company.foundingDate ? company.foundingDate.split('T')[0] : '',
      authorizedPersonFullName: company.authorizedPerson?.fullName || '',
      authorizedPersonEmail: company.authorizedPerson?.email || '',
      authorizedPersonPhone: company.authorizedPerson?.phone || '',
    };
  } catch (error) {
    console.error('Şirket bilgileri yüklenemedi:', error);
  }
};

const saveCompanyInfo = async () => {
  savingCompany.value = true;
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      savingCompany.value = false;
      return;
    }
    await api.put(`/companies/${companyId}`, {
      name: companyForm.value.name,
      address: companyForm.value.address,
      taxOffice: companyForm.value.taxOffice,
      taxNumber: companyForm.value.taxNumber,
      mersisNo: companyForm.value.mersisNo,
      foundingDate: companyForm.value.foundingDate,
      authorizedPersonFullName: companyForm.value.authorizedPersonFullName,
      authorizedPersonPhone: companyForm.value.authorizedPersonPhone,
    });
    toast.success('Şirket bilgileri başarıyla kaydedildi');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Şirket bilgileri kaydedilemedi');
  } finally {
    savingCompany.value = false;
  }
};

const loadSettings = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) return;

    // Bayi admin için companyId query param olarak gönder
    const params = isDealer.value ? { companyId } : {};
    const response = await api.get('/settings', { params });
    form.value.title = response.data.title || '';
    form.value.logo = response.data.logo ? `http://localhost:3000${response.data.logo}` : '';
    if (response.data.checkInSettings) {
      form.value.checkInSettings = {
        enabled: response.data.checkInSettings.enabled || false,
        locationRequired: response.data.checkInSettings.locationRequired !== false,
        allowedLocation: response.data.checkInSettings.allowedLocation || {
          latitude: null,
          longitude: null,
          radius: 100,
        },
        autoCheckIn: response.data.checkInSettings.autoCheckIn || false,
      };
    }
    // companyId zaten yukarıda tanımlı
    if (companyId) {
      const companyResponse = await api.get(`/companies/${companyId}`);
      form.value.activeAttendanceTemplate =
        companyResponse.data.activeAttendanceTemplate?._id || '';
      form.value.payrollCalculationType = companyResponse.data.payrollCalculationType || 'NET';
      form.value.autoAddApprovedEmployees = companyResponse.data.autoAddApprovedEmployees !== false;
      if (companyResponse.data.advanceSettings) {
        form.value.advanceSettings = {
          enabled: companyResponse.data.advanceSettings.enabled || false,
          maxAmountType: companyResponse.data.advanceSettings.maxAmountType || 'PERCENTAGE',
          maxAmountValue: companyResponse.data.advanceSettings.maxAmountValue || 50,
          maxInstallments: companyResponse.data.advanceSettings.maxInstallments || 3,
          minWorkMonths: companyResponse.data.advanceSettings.minWorkMonths || 3,
          requestStartDay: companyResponse.data.advanceSettings.requestStartDay || 1,
          monthlyRequestLimit: companyResponse.data.advanceSettings.monthlyRequestLimit || 1,
          approvalRequired: companyResponse.data.advanceSettings.approvalRequired !== false,
          allowInstallments: companyResponse.data.advanceSettings.allowInstallments !== false,
        };
      }
      if (companyResponse.data.leaveApprovalSettings) {
        form.value.leaveApprovalSettings = {
          enabled: companyResponse.data.leaveApprovalSettings.enabled !== false,
          requireApproval: companyResponse.data.leaveApprovalSettings.requireApproval !== false,
          autoApproveIfNoApprover:
            companyResponse.data.leaveApprovalSettings.autoApproveIfNoApprover || false,
          approvalLevels: companyResponse.data.leaveApprovalSettings.approvalLevels || 0,
          allowSelfApproval: companyResponse.data.leaveApprovalSettings.allowSelfApproval || false,
        };
      }
      if (companyResponse.data.advanceApprovalSettings) {
        form.value.advanceApprovalSettings = {
          enabled: companyResponse.data.advanceApprovalSettings.enabled !== false,
          useLeaveApprovalChain:
            companyResponse.data.advanceApprovalSettings.useLeaveApprovalChain !== false,
          requireApproval: companyResponse.data.advanceApprovalSettings.requireApproval !== false,
          autoApproveIfNoApprover:
            companyResponse.data.advanceApprovalSettings.autoApproveIfNoApprover || false,
          approvalLevels: companyResponse.data.advanceApprovalSettings.approvalLevels || 0,
          allowSelfApproval:
            companyResponse.data.advanceApprovalSettings.allowSelfApproval || false,
        };
      }
      if (companyResponse.data.approvalMode) {
        form.value.approvalMode = companyResponse.data.approvalMode;
      }
      if (companyResponse.data.overtimeApprovalSettings) {
        form.value.overtimeApprovalSettings = {
          enabled: companyResponse.data.overtimeApprovalSettings.enabled !== false,
          useLeaveApprovalChain:
            companyResponse.data.overtimeApprovalSettings.useLeaveApprovalChain !== false,
          approvalLevels: companyResponse.data.overtimeApprovalSettings.approvalLevels || 0,
          allowSelfApproval:
            companyResponse.data.overtimeApprovalSettings.allowSelfApproval || false,
        };
      }
    }
    const templatesResponse = await api.get('/attendance-templates');
    attendanceTemplates.value = templatesResponse.data;
  } catch (error) {
    console.error('Ayarlar yüklenemedi:', error);
  }
};

const loadWeekendSettings = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) return;
    const response = await api.get(`/weekend-settings/company/${companyId}`);
    companyWeekendDays.value = response.data.weekendDays || [0];
    weekendLeaveDeduction.value = response.data.weekendLeaveDeduction || 'none';
  } catch (error) {
    console.error('Hafta tatili ayarları yüklenemedi:', error);
  }
};

const loadDepartments = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      departments.value = [];
      return;
    }
    const response = await api.get('/departments', { params: { company: companyId } });
    departments.value = response.data?.data || response.data;
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error);
  }
};

const loadEmployees = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      employees.value = [];
      return;
    }
    const response = await api.get('/employees', { params: { company: companyId } });
    employees.value = response.data?.data || response.data;
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error);
  }
};

const loadDepartmentWeekend = async () => {
  if (!selectedDepartment.value) return;
  try {
    const response = await api.get(`/weekend-settings/department/${selectedDepartment.value}`);
    departmentWeekendDays.value = response.data.weekendDays || [];
  } catch (error) {
    console.error('Departman ayarları yüklenemedi:', error);
  }
};

const loadEmployeeWeekend = async () => {
  if (!selectedEmployee.value) return;
  try {
    const response = await api.get(`/weekend-settings/employee/${selectedEmployee.value}`);
    employeeWeekendDays.value = response.data.weekendDays || [];
  } catch (error) {
    console.error('Çalışan ayarları yüklenemedi:', error);
  }
};

const loadHolidays = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      holidays.value = [];
      return;
    }
    const response = await api.get(`/company-holidays/${companyId}/${holidayYear.value}`);
    holidays.value = response.data.holidays || [];
  } catch (error) {
    console.error('Tatiller yüklenemedi:', error);
  }
};

const loadWorkingHours = async () => {
  try {
    const response = await api.get('/working-hours');
    workingHoursList.value = response.data?.data || response.data;
  } catch (error) {
    console.error('Çalışma saatleri yüklenemedi:', error);
  }
};

const loadPuantajTemplates = async () => {
  try {
    const response = await api.get('/puantaj/templates');
    puantajTemplates.value = response.data?.data || response.data || [];
  } catch (error) {
    console.error('Puantaj şablonları yüklenemedi:', error);
  }
};

// Ek Ödemeler Functions
const loadAdditionalPaymentTypes = async () => {
  loadingPaymentTypes.value = true;
  try {
    // Global ödeme türlerini yükle
    const typesResponse = await api.get('/additional-payment-types');
    additionalPaymentTypes.value = typesResponse.data;

    // Şirketin ödeme türlerini yükle
    const companyId = activeCompanyId.value;
    if (companyId) {
      const companyResponse = await api.get(`/companies/${companyId}/payment-types`);
      companyPaymentTypes.value = companyResponse.data;
    }

    // Yıllık vergi limitlerini yükle
    await loadYearlyTaxLimits();
  } catch (error) {
    console.error('Ödeme türleri yüklenemedi:', error);
  } finally {
    loadingPaymentTypes.value = false;
  }
};

const loadYearlyTaxLimits = async () => {
  try {
    // Admin için tüm limitleri yükle
    if (['super_admin', 'bayi_admin'].includes(authStore.user?.role)) {
      loadingYearlyLimits.value = true;
      const response = await api.get('/yearly-tax-limits');
      yearlyTaxLimits.value = response.data.sort((a, b) => b.year - a.year);
      activeYearlyTaxLimit.value = yearlyTaxLimits.value.find(l => l.isActive) || null;
    } else {
      // Normal kullanıcılar için sadece aktif yıl
      const response = await api.get('/yearly-tax-limits/active');
      const data = response.data?.data || response.data;
      activeYearlyTaxLimit.value = data;
      yearlyTaxLimits.value = data ? [data] : [];
    }
  } catch (error) {
    console.error('Yıllık limitler yüklenemedi:', error);
    yearlyTaxLimits.value = [];
    activeYearlyTaxLimit.value = null;
  } finally {
    loadingYearlyLimits.value = false;
  }
};

const openYearlyLimitModal = limit => {
  if (limit) {
    yearlyLimitForm.value = {
      _id: limit._id,
      year: limit.year,
      yemekLimits: {
        sgkDailyLimit: limit.yemekLimits?.sgkDailyLimit || 0,
        vatDailyLimit: limit.yemekLimits?.vatDailyLimit || 0,
      },
      yolLimits: {
        sgkDailyLimit: limit.yolLimits?.sgkDailyLimit || 0,
        vatDailyLimit: limit.yolLimits?.vatDailyLimit || 0,
        sgkMonthlyLimit: limit.yolLimits?.sgkMonthlyLimit || 0,
        vatMonthlyLimit: limit.yolLimits?.vatMonthlyLimit || 0,
      },
      notes: limit.notes || '',
      isActive: limit.isActive || false,
    };
  } else {
    const currentYear = new Date().getFullYear();
    yearlyLimitForm.value = {
      _id: null,
      year: currentYear + 1,
      yemekLimits: {
        sgkDailyLimit: 0,
        vatDailyLimit: 0,
      },
      yolLimits: {
        sgkDailyLimit: 0,
        vatDailyLimit: 0,
        sgkMonthlyLimit: 0,
        vatMonthlyLimit: 0,
      },
      notes: '',
      isActive: false,
    };
  }
  showYearlyLimitModal.value = true;
};

const saveYearlyLimit = async () => {
  try {
    savingYearlyLimit.value = true;
    const data = {
      year: yearlyLimitForm.value.year,
      yemekLimits: yearlyLimitForm.value.yemekLimits,
      yolLimits: yearlyLimitForm.value.yolLimits,
      notes: yearlyLimitForm.value.notes,
      isActive: yearlyLimitForm.value.isActive,
    };

    if (yearlyLimitForm.value._id) {
      await api.put(`/yearly-tax-limits/${yearlyLimitForm.value._id}`, data);
    } else {
      await api.post('/yearly-tax-limits', data);
    }

    showYearlyLimitModal.value = false;
    await loadYearlyTaxLimits();
    toast.success('Yıllık limit kaydedildi');
  } catch (error) {
    console.error('Yıllık limit kaydedilemedi:', error);
    toast.error(error.response?.data?.message || 'Kaydetme sırasında bir hata oluştu');
  } finally {
    savingYearlyLimit.value = false;
  }
};

const setActiveYear = async limit => {
  const confirmed = await confirmModal.show({
    title: 'Aktif Yıl Ayarla',
    message: `${limit.year} yılını aktif yıl olarak ayarlamak istediğinize emin misiniz?`,
    type: 'warning',
    confirmText: 'Ayarla',
  });
  if (!confirmed) return;
  try {
    await api.put(`/yearly-tax-limits/${limit._id}`, { isActive: true });
    await loadYearlyTaxLimits();
    toast.success('Aktif yıl ayarlandı');
  } catch (error) {
    console.error('Aktif yıl ayarlanamadı:', error);
    toast.error(error.response?.data?.message || 'İşlem sırasında bir hata oluştu');
  }
};

const deleteYearlyLimit = async limit => {
  const confirmed = await confirmModal.show({
    title: 'Limit Sil',
    message: `${limit.year} yılı limitlerini silmek istediğinize emin misiniz?`,
    type: 'danger',
    confirmText: 'Sil',
  });
  if (!confirmed) return;
  try {
    await api.delete(`/yearly-tax-limits/${limit._id}`);
    await loadYearlyTaxLimits();
    toast.success('Limit silindi');
  } catch (error) {
    console.error('Limit silinemedi:', error);
    toast.error(error.response?.data?.message || 'Silme sırasında bir hata oluştu');
  }
};

const getCompanyPaymentType = paymentTypeId => {
  return companyPaymentTypes.value.find(
    cpt =>
      cpt.paymentType?._id === paymentTypeId || cpt.companySettings?.paymentType === paymentTypeId
  );
};

const isPaymentTypeEnabled = paymentTypeId => {
  const cpt = getCompanyPaymentType(paymentTypeId);
  return cpt?.isEnabled || cpt?.companySettings?.isActive;
};

const openPaymentTypeModal = (paymentType, companySettings = null) => {
  editingPaymentType.value = paymentType;
  if (companySettings) {
    paymentTypeForm.value = {
      paymentTypeId: paymentType._id,
      defaultAmount: companySettings.defaultAmount || 0,
      customName: companySettings.customName || '',
      requiresApproval: companySettings.settings?.requiresApproval || false,
      maxAmount: companySettings.settings?.maxAmount || null,
      selectedPaymentMethod: companySettings.settings?.selectedPaymentMethod || null,
      hasSgkDeduction: companySettings.settings?.hasSgkDeduction !== false,
      hasVatDeduction: companySettings.settings?.hasVatDeduction !== false,
      createAutoDeduction: companySettings.settings?.createAutoDeduction || false,
      includesVat: companySettings.settings?.includesVat || false,
    };
  } else {
    // Varsayılan ödeme yöntemi varsa ilkini seç
    const defaultMethod =
      paymentType.hasPaymentMethodOptions && paymentType.paymentMethodOptions?.length > 0
        ? paymentType.paymentMethodOptions[0].code
        : null;
    const methodSettings = paymentType.paymentMethodOptions?.find(m => m.code === defaultMethod);

    paymentTypeForm.value = {
      paymentTypeId: paymentType._id,
      defaultAmount: 0,
      customName: '',
      requiresApproval: false,
      maxAmount: null,
      selectedPaymentMethod: defaultMethod,
      hasSgkDeduction: methodSettings?.hasSgkDeduction !== false,
      hasVatDeduction: methodSettings?.hasVatDeduction !== false,
      createAutoDeduction:
        defaultMethod === 'MEAL_CARD_ONLY' ||
        defaultMethod === 'NON_MEAL_CARD' ||
        defaultMethod === 'SUBSCRIPTION',
      includesVat: false,
    };
  }
  showPaymentTypeModal.value = true;
};

const closePaymentTypeModal = () => {
  showPaymentTypeModal.value = false;
  editingPaymentType.value = null;
  paymentTypeForm.value = {
    paymentTypeId: '',
    defaultAmount: 0,
    customName: '',
    requiresApproval: false,
    maxAmount: null,
    selectedPaymentMethod: null,
    hasSgkDeduction: true,
    hasVatDeduction: true,
    createAutoDeduction: false,
    includesVat: false,
  };
};

const onPaymentMethodChange = methodCode => {
  const method = editingPaymentType.value?.paymentMethodOptions?.find(m => m.code === methodCode);
  if (method) {
    paymentTypeForm.value.hasSgkDeduction = method.hasSgkDeduction;
    paymentTypeForm.value.hasVatDeduction = method.hasVatDeduction;
    paymentTypeForm.value.createAutoDeduction =
      methodCode === 'MEAL_CARD_ONLY' || methodCode === 'NON_MEAL_CARD';
  }
};

const savePaymentType = async () => {
  const companyId = activeCompanyId.value;
  if (!companyId) {
    toast.error('Lütfen bir şirket seçin');
    return;
  }

  savingPaymentType.value = true;
  try {
    await api.post(`/companies/${companyId}/payment-types`, {
      paymentTypeId: paymentTypeForm.value.paymentTypeId,
      defaultAmount: paymentTypeForm.value.defaultAmount,
      customName: paymentTypeForm.value.customName || null,
      settings: {
        requiresApproval: paymentTypeForm.value.requiresApproval,
        maxAmount: paymentTypeForm.value.maxAmount || null,
        selectedPaymentMethod: paymentTypeForm.value.selectedPaymentMethod,
        hasSgkDeduction: paymentTypeForm.value.hasSgkDeduction,
        hasVatDeduction: paymentTypeForm.value.hasVatDeduction,
        createAutoDeduction: paymentTypeForm.value.createAutoDeduction,
        includesVat: paymentTypeForm.value.includesVat,
      },
    });
    toast.success('Ödeme türü ayarları kaydedildi');
    closePaymentTypeModal();
    await loadAdditionalPaymentTypes();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Kaydetme başarısız');
  } finally {
    savingPaymentType.value = false;
  }
};

const togglePaymentType = async (paymentType, currentEnabled) => {
  const companyId = activeCompanyId.value;
  if (!companyId) {
    toast.error('Lütfen bir şirket seçin');
    return;
  }

  try {
    if (currentEnabled) {
      // Deaktif et
      const cpt = getCompanyPaymentType(paymentType._id);
      if (cpt?.companySettings?._id) {
        await api.delete(`/companies/${companyId}/payment-types/${cpt.companySettings._id}`);
        toast.success('Ödeme türü deaktif edildi');
      }
    } else {
      // Aktifleştirmek için modal aç
      openPaymentTypeModal(paymentType);
      return;
    }
    await loadAdditionalPaymentTypes();
  } catch (error) {
    toast.error(error.response?.data?.message || 'İşlem başarısız');
  }
};

const formatCurrency = amount => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
};

// Save Functions
const saveSettings = async () => {
  const companyId = activeCompanyId.value;
  if (!companyId) {
    toast.error('Lütfen bir şirket seçin');
    return;
  }

  loading.value = true;
  try {
    const formData = new FormData();
    formData.append('title', form.value.title);
    if (file.value) formData.append('logo', file.value);
    formData.append('checkInSettings', JSON.stringify(form.value.checkInSettings));
    // Bayi admin için companyId ekle
    if (isDealer.value) {
      formData.append('companyId', companyId);
    }
    await api.put('/settings', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    toast.success('Ayarlar kaydedildi');
    loadSettings();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  } finally {
    loading.value = false;
  }
};

const saveTemplateSetting = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      return;
    }
    await api.put(`/companies/${companyId}/attendance-template`, {
      templateId: form.value.activeAttendanceTemplate || null,
    });
    toast.success('Puantaj şablonu ayarı kaydedildi');
  } catch (error) {
    console.error('Save template setting error:', error.response?.data);
    toast.error(error.response?.data?.message || error.message || 'Hata oluştu');
  }
};

const savePayrollType = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      return;
    }
    await api.put(`/companies/${companyId}/payroll-calculation-type`, {
      payrollCalculationType: form.value.payrollCalculationType,
    });
    toast.success('Ücret hesaplama tipi kaydedildi');
  } catch (error) {
    console.error('Save payroll type error:', error.response?.data);
    toast.error(error.response?.data?.message || error.message || 'Hata oluştu');
  }
};

const saveAutoAddSetting = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      return;
    }
    await api.put(`/companies/${companyId}`, {
      autoAddApprovedEmployees: form.value.autoAddApprovedEmployees,
    });
    toast.success('Otomatik ekleme ayarı kaydedildi');
  } catch (error) {
    console.error('Save auto add setting error:', error.response?.data);
    toast.error(error.response?.data?.message || error.message || 'Hata oluştu');
  }
};

const saveWeekendSettings = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      return;
    }
    await api.put(`/weekend-settings/company/${companyId}`, {
      weekendDays: companyWeekendDays.value,
      weekendLeaveDeduction: weekendLeaveDeduction.value,
    });
    toast.success('Hafta tatili ayarları kaydedildi');
  } catch (error) {
    console.error('Save weekend settings error:', error.response?.data);
    toast.error(error.response?.data?.message || error.message || 'Hata oluştu');
  }
};

const saveDepartmentWeekend = async () => {
  if (!selectedDepartment.value) return;
  try {
    await api.put(`/weekend-settings/department/${selectedDepartment.value}`, {
      weekendDays: departmentWeekendDays.value.length > 0 ? departmentWeekendDays.value : null,
    });
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  }
};

const saveEmployeeWeekend = async () => {
  if (!selectedEmployee.value) return;
  try {
    await api.put(`/weekend-settings/employee/${selectedEmployee.value}`, {
      weekendDays: employeeWeekendDays.value.length > 0 ? employeeWeekendDays.value : null,
    });
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  }
};

const saveAdvanceSettings = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      return;
    }
    await api.put(`/companies/${companyId}`, {
      advanceSettings: form.value.advanceSettings,
    });
    toast.success('Avans ayarları kaydedildi');
  } catch (error) {
    console.error('Save error:', error);
    toast.error(error.response?.data?.message || error.message || 'Hata oluştu');
  }
};

const saveLeaveApprovalSettings = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      return;
    }
    await api.put(`/companies/${companyId}`, {
      leaveApprovalSettings: form.value.leaveApprovalSettings,
    });
    toast.success('İzin onay ayarları kaydedildi');
  } catch (error) {
    console.error('Save leave approval settings error:', error.response?.data);
    toast.error(error.response?.data?.message || error.message || 'Hata oluştu');
  }
};

const saveAdvanceApprovalSettings = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      return;
    }
    await api.put(`/companies/${companyId}`, {
      advanceApprovalSettings: form.value.advanceApprovalSettings,
    });
    toast.success('Avans onay ayarları kaydedildi');
  } catch (error) {
    console.error('Save advance approval settings error:', error.response?.data);
    toast.error(error.response?.data?.message || error.message || 'Hata oluştu');
  }
};

const saveApprovalMode = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      return;
    }
    await api.put(`/companies/${companyId}`, {
      approvalMode: form.value.approvalMode,
    });
    toast.success('Onay modu kaydedildi');
  } catch (error) {
    console.error('Save approval mode error:', error.response?.data);
    toast.error(error.response?.data?.message || error.message || 'Hata oluştu');
  }
};

const saveOvertimeApprovalSettings = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      return;
    }
    await api.put(`/companies/${companyId}`, {
      overtimeApprovalSettings: form.value.overtimeApprovalSettings,
    });
    toast.success('Fazla mesai onay ayarları kaydedildi');
  } catch (error) {
    console.error('Save overtime approval settings error:', error.response?.data);
    toast.error(error.response?.data?.message || error.message || 'Hata oluştu');
  }
};

// Other Actions
const MAX_LOGO_SIZE = 500 * 1024; // 500KB maksimum dosya boyutu

const handleFileChange = event => {
  const selectedFile = event.target.files[0];
  if (!selectedFile) return;

  // Dosya boyutu kontrolü
  if (selectedFile.size > MAX_LOGO_SIZE) {
    toast.error(
      `Logo dosyası çok büyük. Maksimum ${MAX_LOGO_SIZE / 1024}KB olmalıdır. Seçilen dosya: ${Math.round(selectedFile.size / 1024)}KB`
    );
    event.target.value = ''; // Input'u temizle
    return;
  }

  // Dosya tipi kontrolü
  if (!selectedFile.type.startsWith('image/')) {
    toast.error('Sadece resim dosyaları yüklenebilir');
    event.target.value = '';
    return;
  }

  file.value = selectedFile;
  const reader = new FileReader();
  reader.onload = e => {
    form.value.logo = e.target.result;
  };
  reader.readAsDataURL(file.value);
};

const getCurrentLocation = () => {
  gettingLocation.value = true;
  if (!navigator.geolocation) {
    toast.error('Tarayıcınız konum özelliğini desteklemiyor');
    gettingLocation.value = false;
    return;
  }
  navigator.geolocation.getCurrentPosition(
    position => {
      form.value.checkInSettings.allowedLocation.latitude = position.coords.latitude;
      form.value.checkInSettings.allowedLocation.longitude = position.coords.longitude;
      gettingLocation.value = false;
      toast.success('Konum alındı');
    },
    error => {
      toast.error('Konum alınamadı: ' + error.message);
      gettingLocation.value = false;
    }
  );
};

const changePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.warning('Şifreler eşleşmiyor');
    return;
  }
  if (passwordForm.value.newPassword.length < 6) {
    toast.warning('Şifre en az 6 karakter olmalıdır');
    return;
  }
  if (isPlaceholderEmail.value && (!passwordForm.value.newEmail || !passwordForm.value.newPhone)) {
    toast.warning('Email adresi ve telefon numarası gereklidir');
    return;
  }
  changingPassword.value = true;
  try {
    const payload = {
      currentPassword: passwordForm.value.currentPassword || undefined,
      newPassword: passwordForm.value.newPassword,
    };
    if (isPlaceholderEmail.value) {
      payload.newEmail = passwordForm.value.newEmail;
      payload.newPhone = passwordForm.value.newPhone;
    }
    await api.post('/auth/change-password', payload);
    toast.success(isPlaceholderEmail.value ? 'Bilgileriniz başarıyla güncellendi' : 'Şifre başarıyla değiştirildi');
    if (authStore.user?.mustChangePassword) {
      showPasswordChangeModal.value = false;
      await authStore.fetchCurrentUser();
    }
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '', newEmail: '', newPhone: '' };
  } catch (error) {
    toast.error(error.response?.data?.message || 'İşlem başarısız');
  } finally {
    changingPassword.value = false;
  }
};

const addHoliday = async () => {
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      return;
    }
    // Mevcut tatillere yeni tarihi ekle
    const currentHolidays = holidays.value.map(h => h.date || h);
    currentHolidays.push(newHoliday.value.date);
    await api.post('/company-holidays', {
      companyId,
      year: holidayYear.value,
      holidays: currentHolidays,
    });
    showAddHolidayModal.value = false;
    newHoliday.value = { name: '', date: '' };
    loadHolidays();
    toast.success('Tatil eklendi');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  }
};

const deleteHoliday = async dateToDelete => {
  const confirmed = await confirmModal.show({
    title: 'Tatil Sil',
    message: 'Bu tatili silmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Sil',
  });
  if (!confirmed) return;
  try {
    const companyId = activeCompanyId.value;
    if (!companyId) {
      toast.error('Lütfen bir şirket seçin');
      return;
    }
    // Silinecek tarih dışındakileri filtrele
    const remainingHolidays = holidays.value
      .map(h => h.date || h)
      .filter(h => new Date(h).toISOString() !== new Date(dateToDelete).toISOString());
    await api.post('/company-holidays', {
      companyId,
      year: holidayYear.value,
      holidays: remainingHolidays,
    });
    loadHolidays();
    toast.success('Tatil silindi');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  }
};

const addWorkingHours = async () => {
  try {
    await api.post('/working-hours', newWorkingHours.value);
    showAddWorkingHoursModal.value = false;
    newWorkingHours.value = { name: '', startTime: '09:00', endTime: '18:00', breakDuration: 60 };
    loadWorkingHours();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  }
};

const deleteWorkingHours = async id => {
  const confirmed = await confirmModal.show({
    title: 'Şablon Sil',
    message: 'Bu şablonu silmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Sil',
  });
  if (!confirmed) return;
  try {
    await api.delete(`/working-hours/${id}`);
    loadWorkingHours();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  }
};

// ===== Bilgi Değişiklik Talepleri =====
const profileRequests = ref([]);
const profileRequestsLoading = ref(false);

const loadProfileRequests = async () => {
  profileRequestsLoading.value = true;
  try {
    const res = await api.get('/employees/change-requests/pending');
    const data = res.data?.data || res.data || [];
    profileRequests.value = data.map(r => ({ ...r, _reviewNote: '', _processing: false }));
  } catch (err) {
    console.error('Bilgi talepleri yüklenemedi:', err);
  }
  profileRequestsLoading.value = false;
};

const handleProfileRequest = async (pr, action) => {
  pr._processing = true;
  try {
    await api.put(`/employees/change-requests/${pr._id}`, {
      action,
      reviewNote: pr._reviewNote || undefined
    });
    toast.success(action === 'approve' ? 'Değişiklik onaylandı' : 'Değişiklik reddedildi');
    await loadProfileRequests();
  } catch (err) {
    toast.error(err.response?.data?.message || 'İşlem başarısız');
  }
  pr._processing = false;
};

const formatProfileDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('tr-TR');
};

onMounted(async () => {
  // Bayi admin için önce şirketleri yükle
  if (isDealer.value) {
    await loadCompanies();
    loadDealerSettings();
    // Bayi admin için yıllık limitleri de yükle
    loadYearlyTaxLimits();
  } else {
    // Company admin için direkt yükle
    loadCompanyInfo();
    loadSettings();
    loadWeekendSettings();
    loadDepartments();
    loadEmployees();
    loadHolidays();
    loadWorkingHours();
    loadPuantajTemplates();
    loadAdditionalPaymentTypes();
  }

  // Super admin için yıllık limitleri yükle
  if (authStore.isSuperAdmin) {
    loadYearlyTaxLimits();
  }

  // Bilgi değişiklik taleplerini yükle
  if (authStore.hasAnyRole('super_admin', 'bayi_admin', 'company_admin')) {
    loadProfileRequests();
  }

  if (route.query.changePassword === 'true' || authStore.user?.mustChangePassword) {
    showPasswordChangeModal.value = true;
  }
});
</script>
