<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Global Ayarlar</h1>

    <!-- Kayıt Modu Ayarları -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Kayıt Ayarları</h2>
      <p class="text-sm text-gray-500 mb-4">
        Yeni kullanıcı kayıtlarının nasıl onaylanacağını belirleyin.
      </p>

      <div v-if="loadingMode" class="text-center py-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Email Doğrulama -->
        <label
          class="relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all"
          :class="
            registrationMode === 'email_verification'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          "
        >
          <input
            type="radio"
            name="registrationMode"
            value="email_verification"
            v-model="registrationMode"
            @change="saveRegistrationMode"
            class="sr-only"
          />
          <div class="flex items-center mb-2">
            <svg
              class="w-6 h-6 text-blue-500 mr-2"
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
            <span class="font-medium text-gray-900">Email Doğrulama</span>
          </div>
          <p class="text-sm text-gray-500">
            Kayıt sonrası otomatik doğrulama emaili gönderilir. Kullanıcı linke tıklayarak hesabını
            aktif eder.
          </p>
          <div v-if="registrationMode === 'email_verification'" class="absolute top-3 right-3">
            <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </label>

        <!-- Manuel Onay -->
        <label
          class="relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all"
          :class="
            registrationMode === 'manual_approval'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-gray-300'
          "
        >
          <input
            type="radio"
            name="registrationMode"
            value="manual_approval"
            v-model="registrationMode"
            @change="saveRegistrationMode"
            class="sr-only"
          />
          <div class="flex items-center mb-2">
            <svg
              class="w-6 h-6 text-green-500 mr-2"
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
            <span class="font-medium text-gray-900">Manuel Onay</span>
          </div>
          <p class="text-sm text-gray-500">
            Kayıt sonrası yönetici onayı beklenir. Kayıt Talepleri sayfasından onay/red yapılır.
          </p>
          <div v-if="registrationMode === 'manual_approval'" class="absolute top-3 right-3">
            <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </label>
      </div>
    </div>

    <!-- Deneme Hesabı Ayarları -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Deneme Hesabı Ayarları</h2>
      <p class="text-sm text-gray-500 mb-4">
        Google ile kayıt olan yeni kullanıcıların deneme hesabı limitlerini belirleyin.
      </p>

      <div v-if="loadingTrial" class="text-center py-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Deneme Süresi (gün)</label>
          <input
            v-model.number="trialForm.trialDays"
            type="number"
            min="1"
            max="365"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <p class="text-xs text-gray-400 mt-1">Yeni kayıt olan kullanıcıya verilen deneme süresi</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Çalışan Kotası</label>
          <input
            v-model.number="trialForm.trialEmployeeQuota"
            type="number"
            min="1"
            max="1000"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <p class="text-xs text-gray-400 mt-1">Deneme hesabında eklenebilecek maksimum çalışan sayısı</p>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button
          @click="saveTrialSettings"
          :disabled="savingTrial"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {{ savingTrial ? 'Kaydediliyor...' : 'Kaydet' }}
        </button>
      </div>
    </div>

    <!-- Destek İletişim Bilgileri -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Destek İletişim Bilgileri</h2>
      <p class="text-sm text-gray-500 mb-4">
        Abonelik satın alma sayfasında görüntülenecek destek bilgilerini ayarlayın.
      </p>

      <div v-if="loadingSupportInfo" class="text-center py-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
      <form v-else @submit.prevent="saveSupportInfo" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Destek Email <span class="text-red-500">*</span>
            </label>
            <input
              v-model="supportForm.supportEmail"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="destek@personelplus.com"
            />
          </div>
          <div>
            <PhoneInput
              v-model="supportForm.supportPhone"
              label="Destek Telefon"
              :required="true"
              placeholder="05XX XXX XX XX"
            />
          </div>
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="savingSupportInfo"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ savingSupportInfo ? 'Kaydediliyor...' : 'Kaydet' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Çalışan Aktivasyon Modu -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Çalışan Aktivasyon Modu</h2>
      <p class="text-sm text-gray-500 mb-4">
        Çalışanların hesap aktivasyonunda hangi yöntemin kullanılacağını belirleyin.
      </p>

      <div v-if="loadingActivationMode" class="text-center py-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Email -->
        <label
          class="relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all"
          :class="activationMode === 'email' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
        >
          <input type="radio" name="activationMode" value="email" v-model="activationMode" @change="saveActivationMode" class="sr-only" />
          <div class="flex items-center mb-2">
            <svg class="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span class="font-medium text-gray-900">Email</span>
          </div>
          <p class="text-sm text-gray-500">Çalışana email ile aktivasyon linki gönderilir.</p>
          <div v-if="activationMode === 'email'" class="absolute top-3 right-3">
            <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>

        <!-- SMS -->
        <label
          class="relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all"
          :class="activationMode === 'sms' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'"
        >
          <input type="radio" name="activationMode" value="sms" v-model="activationMode" @change="saveActivationMode" class="sr-only" />
          <div class="flex items-center mb-2">
            <svg class="w-6 h-6 text-teal-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span class="font-medium text-gray-900">SMS</span>
          </div>
          <p class="text-sm text-gray-500">Çalışana SMS ile doğrulama kodu gönderilir.</p>
          <div v-if="activationMode === 'sms'" class="absolute top-3 right-3">
            <svg class="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>

        <!-- Her İkisi -->
        <label
          class="relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all"
          :class="activationMode === 'both' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'"
        >
          <input type="radio" name="activationMode" value="both" v-model="activationMode" @change="saveActivationMode" class="sr-only" />
          <div class="flex items-center mb-2">
            <svg class="w-6 h-6 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span class="font-medium text-gray-900">Her İkisi</span>
          </div>
          <p class="text-sm text-gray-500">Email ve SMS seçenekleri birlikte gösterilir.</p>
          <div v-if="activationMode === 'both'" class="absolute top-3 right-3">
            <svg class="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
      </div>
    </div>

    <!-- SMS Ayarları (Verimor) -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">SMS Ayarları (Verimor)</h2>
      <p class="text-sm text-gray-500 mb-4">
        Çalışan aktivasyonu ve OTP doğrulamaları için SMS sağlayıcı bilgilerini yapılandırın.
      </p>

      <div v-if="loadingSms" class="text-center py-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
      <form v-else @submit.prevent="saveSmsConfig" class="space-y-4">
        <!-- SMS Aktif/Pasif Toggle -->
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <span class="text-sm font-medium text-gray-700">SMS Servisi</span>
            <p class="text-xs text-gray-400">Aktif edildiğinde DB ayarları kullanılır, pasifse .env değişkenleri geçerli olur</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="smsForm.enabled" class="sr-only peer" />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Verimor Kullanıcı Adı <span class="text-red-500">*</span>
            </label>
            <input
              v-model="smsForm.username"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Verimor hesap kullanıcı adı"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Verimor Şifre <span class="text-red-500">*</span>
            </label>
            <input
              v-model="smsForm.password"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              :placeholder="smsForm.hasPassword ? 'Değiştirmek için yeni şifre girin' : 'Verimor hesap şifresi'"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Gönderici Adı</label>
            <input
              v-model="smsForm.sourceAddr"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="PersonelPlus"
            />
            <p class="text-xs text-gray-400 mt-1">SMS'lerde görünecek gönderici adı</p>
          </div>
          <div class="flex items-center">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="smsForm.mockSms" class="sr-only peer" />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              <span class="ml-3 text-sm font-medium text-gray-700">Test Modu (Mock)</span>
            </label>
            <p class="text-xs text-gray-400 ml-2">Aktifken gerçek SMS gönderilmez, konsola yazılır</p>
          </div>
        </div>

        <div class="flex items-center gap-3 justify-end">
          <!-- Test SMS Gönder -->
          <div class="flex items-center gap-2">
            <PhoneInput
              v-model="testSmsPhone"
              label=""
              :required="false"
              placeholder="Test numarası"
              class="w-48"
            />
            <button
              type="button"
              @click="sendTestSms"
              :disabled="sendingTestSms || !testSmsPhone"
              class="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {{ sendingTestSms ? 'Gönderiliyor...' : 'Test SMS' }}
            </button>
          </div>
          <button
            type="submit"
            :disabled="savingSms"
            class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {{ savingSms ? 'Kaydediliyor...' : 'Kaydet' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Yıllık Asgari Ücret Yönetimi -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Yıllık Asgari Ücret Yönetimi</h2>

      <!-- Mevcut Asgari Ücretler Listesi -->
      <div class="mb-6">
        <h3 class="text-md font-medium text-gray-700 mb-3">Mevcut Asgari Ücretler</h3>
        <div v-if="loading" class="text-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <div v-else-if="minimumWages.length === 0" class="text-gray-500 text-center py-4">
          Henüz asgari ücret kaydı yok
        </div>
        <table v-else class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yıl</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Net Asgari Ücret
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Brüt Asgari Ücret
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Yürürlük Tarihi
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="wage in minimumWages" :key="wage.year" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ wage.year }}</td>
              <td class="px-4 py-3 text-sm text-gray-900">{{ formatCurrency(wage.net) }}</td>
              <td class="px-4 py-3 text-sm text-gray-900">{{ formatCurrency(wage.brut) }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ formatDate(wage.effectiveDate) }}</td>
              <td class="px-4 py-3 text-sm">
                <button @click="editWage(wage)" class="text-blue-600 hover:text-blue-900 mr-3">
                  Düzenle
                </button>
                <button @click="deleteWage(wage.year)" class="text-red-600 hover:text-red-900">
                  Sil
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Yeni Asgari Ücret Ekleme/Düzenleme Formu -->
      <div class="border-t pt-6">
        <h3 class="text-md font-medium text-gray-700 mb-4">
          {{ editingWage ? 'Asgari Ücret Düzenle' : 'Yeni Asgari Ücret Ekle' }}
        </h3>
        <form @submit.prevent="saveWage" class="space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Yıl <span class="text-red-500">*</span></label
              >
              <input
                v-model.number="wageForm.year"
                type="number"
                min="2020"
                :max="new Date().getFullYear() + 10"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                :disabled="editingWage"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Net Asgari Ücret (TL) <span class="text-red-500">*</span></label
              >
              <input
                v-model.number="wageForm.net"
                type="number"
                step="0.01"
                min="0"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="28007.50"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Brüt Asgari Ücret (TL) <span class="text-red-500">*</span></label
              >
              <input
                v-model.number="wageForm.brut"
                type="number"
                step="0.01"
                min="0"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="33030.00"
              />
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button
              v-if="editingWage"
              type="button"
              @click="cancelEdit"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ saving ? 'Kaydediliyor...' : editingWage ? 'Güncelle' : 'Ekle' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import PhoneInput from '@/components/PhoneInput.vue';

const toast = useToastStore();
const confirmModal = useConfirmStore();
const loading = ref(false);
const saving = ref(false);
const registrationMode = ref('manual_approval');
const loadingMode = ref(false);
const activationMode = ref('email');
const loadingActivationMode = ref(false);
const minimumWages = ref([]);
const editingWage = ref(null);
const wageForm = ref({
  year: new Date().getFullYear(),
  net: null,
  brut: null,
});

// Deneme hesabı ayarları
const loadingTrial = ref(false);
const savingTrial = ref(false);
const trialForm = ref({
  trialDays: 14,
  trialEmployeeQuota: 1,
});

// Destek bilgileri
const loadingSupportInfo = ref(false);
const savingSupportInfo = ref(false);
const supportForm = ref({
  supportEmail: '',
  supportPhone: '',
});

// SMS ayarları
const loadingSms = ref(false);
const savingSms = ref(false);
const sendingTestSms = ref(false);
const testSmsPhone = ref('');
const smsForm = ref({
  enabled: false,
  username: '',
  password: '',
  sourceAddr: 'PersonelPlus',
  mockSms: false,
  hasPassword: false,
});

const loadRegistrationMode = async () => {
  try {
    loadingMode.value = true;
    const response = await api.get('/global-settings/registration-mode');
    if (response.data.success) {
      registrationMode.value = response.data.data.registrationMode;
    }
  } catch (error) {
    console.error('Kayıt modu yüklenemedi:', error);
  } finally {
    loadingMode.value = false;
  }
};

const saveRegistrationMode = async () => {
  try {
    const response = await api.put('/global-settings/registration-mode', {
      registrationMode: registrationMode.value,
    });
    if (response.data.success) {
      toast.success(response.data.message || 'Kayıt modu güncellendi');
    }
  } catch (error) {
    console.error('Kayıt modu kaydedilemedi:', error);
    toast.error(error.response?.data?.message || 'Kayıt modu güncellenirken bir hata oluştu');
  }
};

const loadActivationMode = async () => {
  try {
    loadingActivationMode.value = true;
    const response = await api.get('/global-settings/activation-mode');
    if (response.data.success) {
      activationMode.value = response.data.data.activationMode || 'email';
    }
  } catch (error) {
    console.error('Aktivasyon modu yüklenemedi:', error);
  } finally {
    loadingActivationMode.value = false;
  }
};

const saveActivationMode = async () => {
  try {
    const response = await api.put('/global-settings/activation-mode', {
      activationMode: activationMode.value,
    });
    if (response.data.success) {
      toast.success(response.data.message || 'Aktivasyon modu güncellendi');
    }
  } catch (error) {
    console.error('Aktivasyon modu kaydedilemedi:', error);
    toast.error(error.response?.data?.message || 'Aktivasyon modu güncellenirken bir hata oluştu');
  }
};

const loadMinimumWages = async () => {
  try {
    loading.value = true;
    const response = await api.get('/global-settings/minimum-wages');
    if (response.data.success) {
      minimumWages.value = response.data.data.minimumWages || [];
    }
  } catch (error) {
    console.error('Asgari ücretler yüklenemedi:', error);
    toast.error('Asgari ücretler yüklenirken bir hata oluştu');
  } finally {
    loading.value = false;
  }
};

const saveWage = async () => {
  if (!wageForm.value.year || !wageForm.value.net || !wageForm.value.brut) {
    toast.warning('Lütfen tüm alanları doldurunuz');
    return;
  }

  try {
    saving.value = true;
    const response = await api.post('/global-settings/minimum-wages', wageForm.value);
    if (response.data.success) {
      toast.success(response.data.message || 'Asgari ücret kaydedildi');
      await loadMinimumWages();
      resetForm();
    }
  } catch (error) {
    console.error('Asgari ücret kaydedilemedi:', error);
    toast.error(error.response?.data?.message || 'Asgari ücret kaydedilirken bir hata oluştu');
  } finally {
    saving.value = false;
  }
};

const editWage = wage => {
  editingWage.value = wage;
  wageForm.value = {
    year: wage.year,
    net: wage.net,
    brut: wage.brut,
  };
};

const cancelEdit = () => {
  editingWage.value = null;
  resetForm();
};

const deleteWage = async year => {
  const confirmed = await confirmModal.show({
    title: 'Asgari Ücret Sil',
    message: `${year} yılına ait asgari ücret kaydını silmek istediğinize emin misiniz?`,
    type: 'danger',
    confirmText: 'Sil',
  });
  if (!confirmed) return;

  try {
    const response = await api.delete(`/global-settings/minimum-wages/${year}`);
    if (response.data.success) {
      toast.success('Asgari ücret silindi');
      await loadMinimumWages();
    }
  } catch (error) {
    console.error('Asgari ücret silinemedi:', error);
    toast.error(error.response?.data?.message || 'Asgari ücret silinirken bir hata oluştu');
  }
};

const resetForm = () => {
  editingWage.value = null;
  wageForm.value = {
    year: new Date().getFullYear(),
    net: null,
    brut: null,
  };
};

const formatCurrency = value => {
  if (!value) return '-';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

const formatDate = date => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('tr-TR');
};

const loadTrialSettings = async () => {
  try {
    loadingTrial.value = true;
    const response = await api.get('/global-settings/trial-settings');
    if (response.data.success) {
      trialForm.value = {
        trialDays: response.data.data.trialDays ?? 14,
        trialEmployeeQuota: response.data.data.trialEmployeeQuota ?? 1,
      };
    }
  } catch (error) {
    console.error('Deneme ayarları yüklenemedi:', error);
  } finally {
    loadingTrial.value = false;
  }
};

const saveTrialSettings = async () => {
  try {
    savingTrial.value = true;
    const response = await api.put('/global-settings/trial-settings', trialForm.value);
    if (response.data.success) {
      toast.success(response.data.message || 'Deneme ayarları güncellendi');
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Deneme ayarları güncellenirken hata oluştu');
  } finally {
    savingTrial.value = false;
  }
};

const loadSupportInfo = async () => {
  try {
    loadingSupportInfo.value = true;
    const response = await api.get('/global-settings/support-info');
    if (response.data.success) {
      supportForm.value = {
        supportEmail: response.data.data.supportEmail,
        supportPhone: response.data.data.supportPhone,
      };
    }
  } catch (error) {
    console.error('Destek bilgileri yüklenemedi:', error);
    toast.error('Destek bilgileri yüklenirken bir hata oluştu');
  } finally {
    loadingSupportInfo.value = false;
  }
};

const saveSupportInfo = async () => {
  if (!supportForm.value.supportEmail || !supportForm.value.supportPhone) {
    toast.warning('Lütfen tüm alanları doldurunuz');
    return;
  }

  try {
    savingSupportInfo.value = true;
    const response = await api.put('/global-settings/support-info', supportForm.value);
    if (response.data.success) {
      toast.success(response.data.message || 'Destek bilgileri güncellendi');
    }
  } catch (error) {
    console.error('Destek bilgileri kaydedilemedi:', error);
    toast.error(error.response?.data?.message || 'Destek bilgileri güncellenirken bir hata oluştu');
  } finally {
    savingSupportInfo.value = false;
  }
};

const loadSmsConfig = async () => {
  try {
    loadingSms.value = true;
    const response = await api.get('/global-settings/sms-config');
    if (response.data.success) {
      const data = response.data.data;
      smsForm.value = {
        enabled: data.enabled || false,
        username: data.username || '',
        password: '', // Şifre maskeli gelir, input boş başlar
        sourceAddr: data.sourceAddr || 'PersonelPlus',
        mockSms: data.mockSms || false,
        hasPassword: data.hasPassword || false,
      };
    }
  } catch (error) {
    console.error('SMS ayarları yüklenemedi:', error);
  } finally {
    loadingSms.value = false;
  }
};

const saveSmsConfig = async () => {
  try {
    savingSms.value = true;
    const payload = {
      enabled: smsForm.value.enabled,
      username: smsForm.value.username,
      sourceAddr: smsForm.value.sourceAddr,
      mockSms: smsForm.value.mockSms,
    };
    // Şifre sadece girilmişse gönder
    if (smsForm.value.password) {
      payload.password = smsForm.value.password;
    }

    const response = await api.put('/global-settings/sms-config', payload);
    if (response.data.success) {
      toast.success(response.data.message || 'SMS ayarları güncellendi');
      smsForm.value.hasPassword = response.data.data.hasPassword;
      smsForm.value.password = ''; // Şifreyi temizle
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'SMS ayarları güncellenirken hata oluştu');
  } finally {
    savingSms.value = false;
  }
};

const sendTestSms = async () => {
  if (!testSmsPhone.value) {
    toast.warning('Test SMS için telefon numarası girin');
    return;
  }

  try {
    sendingTestSms.value = true;
    // Önce kaydet, sonra test gönder
    await saveSmsConfig();

    const response = await api.post('/global-settings/sms-config/test', {
      phone: testSmsPhone.value,
    });
    if (response.data.success) {
      toast.success(response.data.message || 'Test SMS gönderildi');
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Test SMS gönderilemedi');
  } finally {
    sendingTestSms.value = false;
  }
};

onMounted(() => {
  loadRegistrationMode();
  loadActivationMode();
  loadTrialSettings();
  loadMinimumWages();
  loadSupportInfo();
  loadSmsConfig();
});
</script>
