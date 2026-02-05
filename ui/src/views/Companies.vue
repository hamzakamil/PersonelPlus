<template>
  <div class="p-6">
    <div class="flex justify-end items-center mb-6 gap-2">
      <Button v-if="canCreate" variant="secondary" @click="showExcelModal = true">Excel'den Toplu Ekle</Button>
      <Button v-if="canCreate" @click="openNewCompanyModal">Yeni Şirket Ekle</Button>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ara</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Şirket adı, email..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div v-if="isSuperAdmin">
          <label class="block text-sm font-medium text-gray-700 mb-1">Bayi</label>
          <select v-model="filters.dealer" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tümü</option>
            <option v-for="dealer in dealers" :key="dealer._id" :value="dealer._id">{{ dealer.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Sıralama</label>
          <select v-model="filters.sortBy" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="name">İsme Göre</option>
            <option value="createdAt">Oluşturulma Tarihine Göre</option>
          </select>
        </div>
        <div class="flex items-end">
          <button @click="resetFilters" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">
            Filtreleri Temizle
          </button>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 table-fixed">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-16 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
              <th class="w-[20%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şirket Adı</th>
              <th v-if="isSuperAdmin" class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bayi</th>
              <th class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vergi No</th>
              <th class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma</th>
              <th class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="(company, index) in filteredCompanies"
              :key="company._id"
              :class="{
                'bg-gray-50': index % 2 === 1,
                'bg-white': index % 2 === 0
              }"
            >
              <td class="px-2 py-3 text-sm text-gray-900 font-medium">
                {{ index + 1 }}
              </td>
              <td class="px-2 py-3">
                <div class="flex items-center gap-2">
                  <div class="text-sm font-medium text-gray-900 truncate" :title="company.name">
                    {{ company.name }}
                  </div>
                  <span v-if="company.isDealerSelfCompany" class="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full whitespace-nowrap">
                    Kendi Şirketim
                  </span>
                </div>
                <div v-if="company.taxOffice" class="text-sm text-gray-500 truncate" :title="company.taxOffice">
                  {{ company.taxOffice }}
                </div>
              </td>
              <td v-if="isSuperAdmin" class="px-2 py-3">
                <div class="text-sm text-gray-600 truncate" :title="company.dealer?.name">
                  {{ company.dealer?.name || '-' }}
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600 truncate lowercase" :title="company.contactEmail">
                  {{ company.contactEmail || '-' }}
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600 font-mono truncate" :title="company.taxNumber">
                  {{ company.taxNumber || '-' }}
                </div>
              </td>
              <td class="px-2 py-3 text-sm text-gray-600">
                {{ formatDate(company.createdAt) }}
              </td>
              <td class="px-2 py-3">
                <div class="flex gap-1">
                  <router-link
                    :to="`/attendance-calendar?company=${company._id}`"
                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="Puantaj"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </router-link>
                  <button v-if="canEdit" @click="editCompany(company)" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Düzenle">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button v-if="canDelete" @click="deleteCompany(company._id)" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredCompanies.length === 0">
              <td :colspan="isSuperAdmin ? 7 : 6" class="px-4 py-8 text-center text-gray-500">
                Kayıt bulunamadı
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Alt Bilgi -->
      <div class="p-4 bg-gray-50 border-t">
        <div class="flex justify-between items-center">
          <p class="text-sm text-gray-600">
            Toplam {{ filteredCompanies.length }} şirket gösteriliyor
          </p>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-6 text-gray-800 border-b pb-3">
          {{ editingCompany ? 'Şirket Düzenle' : 'Yeni Şirket Ekle' }}
        </h2>
        <form @submit.prevent="saveCompany" class="space-y-6">
          <!-- Bayi Seçimi (Sadece Super Admin ve Yeni Ekleme) -->
          <div v-if="isSuperAdmin && !editingCompany" class="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Bayi <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.dealerId"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option disabled value="">Bayi seçiniz</option>
              <option v-for="dealer in dealers" :key="dealer._id" :value="String(dealer._id)">
                {{ dealer.name }}
              </option>
            </select>
            <p class="text-xs text-gray-500 mt-1">Şirketin bağlı olacağı bayiyi seçin</p>
          </div>

          <!-- Şirket Temel Bilgileri -->
          <div class="space-y-4">
            <h4 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span class="w-1 h-5 bg-blue-600 rounded"></span>
              İşletme / Şirket Bilgileri
            </h4>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Şirket Ünvanı <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="Örn: ABC TEKSTİL SANAYİ VE TİCARET A.Ş."
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Vergi Dairesi
                </label>
                <input
                  v-model="form.taxOffice"
                  type="text"
                  placeholder="Örn: Kadıköy Vergi Dairesi"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Vergi / TC Kimlik No
                </label>
                <input
                  v-model="form.taxNumber"
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
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Mersis No
                </label>
                <input
                  v-model="form.mersisNo"
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
                  v-model="form.foundingDate"
                  type="date"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Adres
              </label>
              <textarea
                v-model="form.address"
                rows="3"
                placeholder="Tam adres bilgisi..."
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              ></textarea>
            </div>
          </div>

          <!-- Yetkili Kişi Bilgileri -->
          <div class="space-y-4 border-t pt-6">
            <h4 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span class="w-1 h-5 bg-green-600 rounded"></span>
              Yetkili Kişi Bilgileri (Company Admin)
            </h4>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad <span class="text-red-500" v-if="!editingCompany">*</span>
              </label>
              <input
                v-model="form.authorizedPersonFullName"
                type="text"
                :required="!editingCompany"
                placeholder="Yetkili kişinin tam adı"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div v-if="!editingCompany">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Email <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.authorizedPersonEmail"
                  type="email"
                  required
                  placeholder="admin@sirket.com"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent lowercase"
                />
                <p class="text-xs text-gray-500 mt-1">Sisteme giriş için kullanılacak</p>
              </div>
              <div v-else>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Email - Şirket Kullanıcı Adı
                </label>
                <input
                  v-model="form.authorizedPersonEmail"
                  type="email"
                  placeholder="admin@sirket.com"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent lowercase font-mono"
                />
                <p class="text-xs text-amber-600 mt-1">⚠️ Email değişirse kullanıcının giriş bilgisi de değişecektir</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  v-model="form.authorizedPersonPhone"
                  type="text"
                  maxlength="15"
                  @input="formatPhone"
                  placeholder="0 555 555 55 55"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                />
              </div>
            </div>

            <div v-if="!editingCompany">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Şifre <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.authorizedPersonPassword"
                type="password"
                required
                minlength="6"
                placeholder="Minimum 6 karakter"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p class="text-xs text-blue-600 mt-1">ℹ️ İlk girişte şifre değiştirme ekranı açılacaktır</p>
            </div>

            <!-- Şifre Belirleme/Sıfırlama (Düzenleme modunda) -->
            <div v-if="editingCompany" class="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 class="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Şifre Belirleme / Sıfırlama
              </h4>
              <div class="flex gap-3 items-end">
                <div class="flex-1">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Yeni Şifre</label>
                  <input
                    v-model="newPassword"
                    type="password"
                    minlength="6"
                    placeholder="Minimum 6 karakter"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  @click="resetPassword"
                  :disabled="!newPassword || newPassword.length < 6 || resettingPassword"
                  class="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg v-if="resettingPassword" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {{ resettingPassword ? 'Kaydediliyor...' : 'Şifreyi Kaydet' }}
                </button>
              </div>
              <p class="text-xs text-amber-700 mt-2">⚠️ Şifre değiştirildiğinde kullanıcı ilk girişte yeni şifre belirlemek zorunda kalacaktır</p>
            </div>
          </div>

          <!-- Butonlar -->
          <div class="flex gap-3 justify-end border-t pt-4">
            <Button variant="secondary" @click="closeModal" type="button">İptal</Button>
            <Button type="submit">
              {{ editingCompany ? 'Güncelle' : 'Şirketi Ekle' }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Excel Toplu Ekleme Modal -->
    <div v-if="showExcelModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">Excel'den Toplu Şirket Ekle</h2>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <h3 class="font-semibold text-blue-900 mb-2">📄 Luca Excel Formatı</h3>
          <p class="text-sm text-blue-800 mb-2">
            <strong>Luca programından Excel almak için:</strong><br>
            Yönetici menüsü → Müşteri işlemleri → Müşteri listesi → Diğer işlemler bölümünden Excel alınabilir
          </p>
          <div class="text-sm text-blue-800 mt-3">
            <strong>Sütun yapısı:</strong>
            <ul class="list-disc list-inside mt-2 space-y-1">
              <li><strong>A Sütunu:</strong> Kısa Ad (kullanılmayacak)</li>
              <li><strong>B Sütunu:</strong> Uzun Ad → <span class="bg-blue-200 px-1 rounded">Şirket Ünvanı</span></li>
              <li><strong>C Sütunu:</strong> Vergi Dairesi → <span class="bg-blue-200 px-1 rounded">Vergi Dairesi</span></li>
              <li><strong>D Sütunu:</strong> Vergi No → <span class="bg-blue-200 px-1 rounded">Vergi/TC Kimlik No</span></li>
              <li><strong>E Sütunu:</strong> TC Kimlik Numarası → <span class="bg-blue-200 px-1 rounded">Vergi/TC Kimlik No</span> (öncelikli)</li>
              <li><strong>F Sütunu:</strong> Açıklama (kullanılmayacak)</li>
              <li><strong>G Sütunu:</strong> Kuruluş Tarihi → <span class="bg-blue-200 px-1 rounded">Kuruluş Tarihi</span></li>
            </ul>
            <p class="mt-3 text-xs italic">
              ⚠️ Not: Hem Vergi No (D) hem TC Kimlik (E) dolu ise, TC Kimlik numarası kullanılacaktır.
            </p>
          </div>
          <div class="mt-4 p-3 bg-green-100 rounded-lg border border-green-300">
            <p class="text-sm text-green-800 font-semibold">🔐 Otomatik Giriş Bilgileri:</p>
            <ul class="text-sm text-green-700 mt-1 list-disc list-inside">
              <li><strong>Kullanıcı Adı:</strong> [Vergi/TC Kimlik No]@firma.local</li>
              <li><strong>Şifre:</strong> 123456</li>
            </ul>
            <p class="text-xs text-green-600 mt-2 italic">İlk girişte şifre değiştirilmesi zorunludur.</p>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Excel Dosyası Seçin
          </label>
          <input
            type="file"
            ref="excelFileInput"
            @change="handleExcelFileChange"
            accept=".xlsx,.xls"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">
            Sadece .xlsx veya .xls formatında dosyalar kabul edilir
          </p>
        </div>

        <div v-if="excelPreview.length > 0" class="mb-4">
          <h3 class="font-semibold mb-2">Önizleme (İlk 5 kayıt):</h3>
          <div class="overflow-x-auto border rounded">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-100">
                <tr>
                  <th class="px-2 py-1 text-left">Şirket Ünvanı</th>
                  <th class="px-2 py-1 text-left">Vergi Dairesi</th>
                  <th class="px-2 py-1 text-left">Vergi/TC Kimlik</th>
                  <th class="px-2 py-1 text-left">Kuruluş Tarihi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in excelPreview.slice(0, 5)" :key="idx" class="border-t">
                  <td class="px-2 py-1">{{ row.name }}</td>
                  <td class="px-2 py-1">{{ row.taxOffice }}</td>
                  <td class="px-2 py-1">{{ row.taxNumber }}</td>
                  <td class="px-2 py-1">{{ row.foundingDate }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-sm text-gray-600 mt-2">
            Toplam {{ excelPreview.length }} şirket bulundu
          </p>
        </div>

        <div class="flex gap-2 justify-end">
          <Button variant="secondary" @click="closeExcelModal">İptal</Button>
          <Button
            @click="uploadExcelData"
            :disabled="excelPreview.length === 0 || isUploading"
          >
            {{ isUploading ? 'Yükleniyor...' : `${excelPreview.length} Şirketi Ekle` }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Sonuç Modal -->
    <div v-if="showResultModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">Toplu Ekleme Sonuçları</h2>

        <div class="space-y-4 mb-6">
          <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <span class="text-green-800 font-medium">Başarılı:</span>
            <span class="text-2xl font-bold text-green-600">{{ uploadResults.success }}</span>
          </div>
          <div class="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <span class="text-red-800 font-medium">Başarısız:</span>
            <span class="text-2xl font-bold text-red-600">{{ uploadResults.failed }}</span>
          </div>
        </div>

        <div v-if="uploadResults.errors.length > 0" class="mb-4">
          <h3 class="font-semibold mb-2 text-red-700">Hatalar:</h3>
          <div class="max-h-60 overflow-y-auto border rounded p-3 bg-red-50">
            <div v-for="(error, idx) in uploadResults.errors" :key="idx" class="text-sm text-red-800 mb-2">
              <strong>Satır {{ error.row }}:</strong> {{ error.message }}
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <Button @click="closeResultModal">Kapat</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import * as XLSX from 'xlsx'

const authStore = useAuthStore()
const toast = useToastStore()
const confirmModal = useConfirmStore()
const companies = ref([])
const dealers = ref([])
const showModal = ref(false)
const editingCompany = ref(null)

const filters = ref({
  search: '',
  dealer: '',
  sortBy: 'name'
})

const form = ref({
  name: '',
  dealerId: '',
  address: '',
  taxOffice: '',
  taxNumber: '',
  mersisNo: '',
  foundingDate: '',
  authorizedPersonFullName: '',
  authorizedPersonPhone: '',
  authorizedPersonEmail: '',
  authorizedPersonPassword: ''
})

// Excel import refs
const showExcelModal = ref(false)
const showResultModal = ref(false)
const excelFileInput = ref(null)
const excelPreview = ref([])
const isUploading = ref(false)
const uploadResults = ref({
  success: 0,
  failed: 0,
  errors: []
})

// Password reset refs
const newPassword = ref('')
const resettingPassword = ref(false)

const userRole = computed(() => authStore.user?.role?.name || authStore.user?.role)
const isSuperAdmin = computed(() => userRole.value === 'super_admin')
const isBayiAdmin = computed(() => userRole.value === 'bayi_admin')
const canCreate = computed(() => ['super_admin', 'bayi_admin'].includes(userRole.value))
const canEdit = computed(() => ['super_admin', 'bayi_admin', 'company_admin'].includes(userRole.value))
const canDelete = computed(() => ['super_admin', 'bayi_admin'].includes(userRole.value))

const filteredCompanies = computed(() => {
  let result = companies.value

  // Search filter
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(company =>
      company.name?.toLowerCase().includes(search) ||
      company.contactEmail?.toLowerCase().includes(search) ||
      company.taxNumber?.toLowerCase().includes(search)
    )
  }

  // Dealer filter
  if (filters.value.dealer) {
    result = result.filter(company => company.dealer?._id === filters.value.dealer)
  }

  // Sort - Kendi Şirketim her zaman en üstte
  result = [...result].sort((a, b) => {
    // Kendi şirketi (selfCompany) önce gelsin
    if (a.isDealerSelfCompany && !b.isDealerSelfCompany) return -1
    if (!a.isDealerSelfCompany && b.isDealerSelfCompany) return 1

    // Sonra normal sıralama
    if (filters.value.sortBy === 'name') {
      return a.name.localeCompare(b.name, 'tr')
    } else if (filters.value.sortBy === 'createdAt') {
      return new Date(b.createdAt) - new Date(a.createdAt)
    }
    return 0
  })

  return result
})

const resetFilters = () => {
  filters.value = {
    search: '',
    dealer: '',
    sortBy: 'name'
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

// Format functions
const formatTaxNumber = (event) => {
  let value = event.target.value.replace(/\D/g, '')
  if (value.length > 11) value = value.substring(0, 11)
  form.value.taxNumber = value
}

const formatMersisNo = (event) => {
  let value = event.target.value.replace(/\D/g, '')
  if (value.length > 16) value = value.substring(0, 16)
  form.value.mersisNo = value
}

const formatPhone = (event) => {
  let value = event.target.value.replace(/\D/g, '')
  if (value.length > 11) value = value.substring(0, 11)
  form.value.authorizedPersonPhone = value
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

const loadDealers = async () => {
  // Sadece super admin için bayileri yükle
  if (!isSuperAdmin.value) return

  try {
    const response = await api.get('/dealers')
    dealers.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Bayiler yüklenemedi:', error)
    dealers.value = []
  }
}

const saveCompany = async () => {
  try {
    // Validation
    if (!form.value.name || form.value.name.trim() === '') {
      toast.warning('Şirket ünvanı gereklidir')
      return
    }

    if (!editingCompany.value) {
      // Yeni şirket oluştururken validasyon
      if (!form.value.authorizedPersonFullName || form.value.authorizedPersonFullName.trim() === '') {
        toast.warning('Yetkili adı soyadı gereklidir')
        return
      }
      if (!form.value.authorizedPersonEmail || form.value.authorizedPersonEmail.trim() === '') {
        toast.warning('Yetkili email adresi gereklidir')
        return
      }
      if (!form.value.authorizedPersonPassword || form.value.authorizedPersonPassword.trim() === '') {
        toast.warning('Yetkili şifre gereklidir')
        return
      }

      // Super admin için bayi seçimi zorunlu
      if (isSuperAdmin.value && (!form.value.dealerId || form.value.dealerId.trim() === '')) {
        toast.warning('Bayi seçimi gereklidir')
        return
      }
    }

    const payload = {
      name: form.value.name,
      address: form.value.address || '',
      taxOffice: form.value.taxOffice || '',
      taxNumber: form.value.taxNumber || '',
      mersisNo: form.value.mersisNo || '',
      foundingDate: form.value.foundingDate || null
    }

    // Super admin için dealerId ekle
    if (isSuperAdmin.value && !editingCompany.value) {
      payload.dealerId = form.value.dealerId
    }
    // Bayi admin için otomatik olarak kendi dealer ID'sini ekle
    else if (isBayiAdmin.value && !editingCompany.value && authStore.user?.dealer) {
      payload.dealerId = authStore.user.dealer
    }

    if (!editingCompany.value) {
      payload.authorizedPersonFullName = form.value.authorizedPersonFullName
      payload.authorizedPersonPhone = form.value.authorizedPersonPhone || ''
      payload.authorizedPersonEmail = form.value.authorizedPersonEmail.toLowerCase()
      payload.authorizedPersonPassword = form.value.authorizedPersonPassword
    } else {
      if (form.value.authorizedPersonFullName) {
        payload.authorizedPersonFullName = form.value.authorizedPersonFullName
      }
      if (form.value.authorizedPersonPhone) {
        payload.authorizedPersonPhone = form.value.authorizedPersonPhone
      }
      // Email değişikliği (bayi_admin ve super_admin için)
      if (form.value.authorizedPersonEmail) {
        payload.authorizedPersonEmail = form.value.authorizedPersonEmail.toLowerCase().trim()
      }
    }

    if (editingCompany.value) {
      await api.put(`/companies/${editingCompany.value._id}`, payload)
    } else {
      await api.post('/companies', payload)
    }

    closeModal()
    loadCompanies()
  } catch (error) {
    console.error('Şirket kaydetme hatası:', error)
    let errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Bilinmeyen bir hata oluştu'
    if (!error.response) {
      errorMessage = 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.'
    }
    toast.error(errorMessage, 6000)
  }
}

const editCompany = (company) => {
  editingCompany.value = company
  newPassword.value = '' // Reset password field

  let foundingDateFormatted = ''
  if (company.foundingDate) {
    const date = new Date(company.foundingDate)
    foundingDateFormatted = date.toISOString().split('T')[0]
  }

  form.value = {
    name: company.name,
    dealerId: company.dealer?._id || '',
    address: company.address || '',
    taxOffice: company.taxOffice || '',
    taxNumber: company.taxNumber || '',
    mersisNo: company.mersisNo || '',
    foundingDate: foundingDateFormatted,
    authorizedPersonFullName: company.authorizedPerson?.fullName || '',
    authorizedPersonPhone: company.authorizedPerson?.phone || '',
    authorizedPersonEmail: company.authorizedPerson?.email || company.contactEmail || '',
    authorizedPersonPassword: ''
  }
  showModal.value = true
}

const resetPassword = async () => {
  if (!editingCompany.value || !newPassword.value || newPassword.value.length < 6) {
    toast.warning('Şifre en az 6 karakter olmalıdır')
    return
  }

  resettingPassword.value = true

  try {
    const response = await api.put(`/companies/${editingCompany.value._id}/reset-password`, {
      newPassword: newPassword.value
    })

    toast.success(response.data.message || 'Şifre başarıyla güncellendi')

    if (response.data.username) {
      toast.info(`Kullanıcı adı: ${response.data.username}`, 8000)
    }

    newPassword.value = ''
  } catch (error) {
    console.error('Şifre sıfırlama hatası:', error)
    const errorMessage = error.response?.data?.message || 'Şifre sıfırlanırken bir hata oluştu'
    toast.error(errorMessage)
  } finally {
    resettingPassword.value = false
  }
}

const deleteCompany = async (id) => {
  const confirmed = await confirmModal.show({
    title: 'Şirket Sil',
    message: 'Bu şirketi silmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Sil'
  })
  if (!confirmed) return

  try {
    await api.delete(`/companies/${id}`)
    toast.success('Şirket başarıyla silindi')
    loadCompanies()
  } catch (error) {
    toast.error(error.response?.data?.message || 'Şirket silinemedi')
  }
}

const resetForm = () => {
  form.value = {
    name: '',
    dealerId: '',
    address: '',
    taxOffice: '',
    taxNumber: '',
    mersisNo: '',
    foundingDate: '',
    authorizedPersonFullName: '',
    authorizedPersonPhone: '',
    authorizedPersonEmail: '',
    authorizedPersonPassword: ''
  }
}

const openNewCompanyModal = () => {
  editingCompany.value = null
  resetForm()
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingCompany.value = null
  resetForm()
}

// Excel import functions
const handleExcelFileChange = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
      parseExcelData(jsonData)
    } catch (error) {
      console.error('Excel okuma hatası:', error)
      toast.error('Excel dosyası okunamadı. Lütfen geçerli bir Excel dosyası seçin.')
    }
  }
  reader.readAsArrayBuffer(file)
}

const parseExcelData = (rows) => {
  const companies = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0 || !row[1]) continue

    const name = row[1] ? String(row[1]).trim() : ''
    const taxOffice = row[2] ? String(row[2]).trim() : ''
    const vergiNo = row[3] ? String(row[3]).trim() : ''
    const tcKimlik = row[4] ? String(row[4]).trim() : ''
    const foundingDateRaw = row[6]

    let taxNumber = tcKimlik || vergiNo || ''

    let foundingDate = ''
    if (foundingDateRaw) {
      try {
        if (typeof foundingDateRaw === 'number') {
          const excelDate = XLSX.SSF.parse_date_code(foundingDateRaw)
          foundingDate = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
        } else {
          const parsedDate = new Date(foundingDateRaw)
          if (!isNaN(parsedDate.getTime())) {
            foundingDate = parsedDate.toISOString().split('T')[0]
          }
        }
      } catch (error) {
        console.warn(`Satır ${i + 1}: Tarih formatı okunamadı`, error)
      }
    }

    if (name) {
      companies.push({
        name,
        taxOffice,
        taxNumber,
        foundingDate,
        rowNumber: i + 1
      })
    }
  }

  excelPreview.value = companies
}

const uploadExcelData = async () => {
  if (excelPreview.value.length === 0) {
    toast.warning('Yüklenecek şirket bulunamadı')
    return
  }

  isUploading.value = true
  uploadResults.value = {
    success: 0,
    failed: 0,
    errors: []
  }

  try {
    let dealerId = null
    if (isSuperAdmin.value) {
      if (!authStore.user?.dealer) {
        toast.warning('Super Admin olarak toplu ekleme yaparken önce bir bayi seçmelisiniz. Şu an için lütfen tek tek ekleyin.')
        isUploading.value = false
        return
      }
      dealerId = authStore.user.dealer
    } else if (isBayiAdmin.value && authStore.user?.dealer) {
      dealerId = authStore.user.dealer
    }

    if (!dealerId) {
      toast.error('Bayi bilgisi bulunamadı')
      isUploading.value = false
      return
    }

    for (const company of excelPreview.value) {
      try {
        const payload = {
          name: company.name,
          dealerId: dealerId,
          taxOffice: company.taxOffice || '',
          taxNumber: company.taxNumber || '',
          mersisNo: '',
          foundingDate: company.foundingDate || null,
          skipAuthorizedPerson: true
        }

        await api.post('/companies/bulk', payload)
        uploadResults.value.success++
      } catch (error) {
        uploadResults.value.failed++
        uploadResults.value.errors.push({
          row: company.rowNumber,
          message: error.response?.data?.message || error.message || 'Bilinmeyen hata'
        })
      }
    }

    showExcelModal.value = false
    showResultModal.value = true
    loadCompanies()
  } catch (error) {
    console.error('Toplu yükleme hatası:', error)
    toast.error('Toplu yükleme sırasında bir hata oluştu')
  } finally {
    isUploading.value = false
  }
}

const closeExcelModal = () => {
  showExcelModal.value = false
  excelPreview.value = []
  if (excelFileInput.value) {
    excelFileInput.value.value = ''
  }
}

const closeResultModal = () => {
  showResultModal.value = false
  uploadResults.value = {
    success: 0,
    failed: 0,
    errors: []
  }
}

onMounted(() => {
  loadCompanies()
  loadDealers()
})
</script>
