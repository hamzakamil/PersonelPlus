<template>
  <div>
    <div class="flex justify-end items-center mb-6">
      <Button @click="goBack">Geri Dön</Button>
    </div>

    <div class="bg-white rounded-lg shadow p-6 max-w-4xl max-h-[600px] overflow-y-auto">
      <form @submit.prevent="saveEmployee" @input="hasChanges = true">
        <div class="space-y-6">
          <!-- Profil Fotoğrafı -->
          <div v-if="employee" class="flex items-center gap-4">
            <div class="relative group">
              <div
                v-if="photoPreview || employee.profilePhoto"
                class="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer"
                @click="$refs.photoInput.click()"
              >
                <img :src="photoPreview || employee.profilePhoto" alt="Profil" class="w-full h-full object-cover" />
              </div>
              <div
                v-else
                class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg font-bold border-2 border-gray-200 cursor-pointer"
                @click="$refs.photoInput.click()"
              >
                {{ employee.firstName?.charAt(0) }}{{ employee.lastName?.charAt(0) }}
              </div>
              <div
                class="absolute inset-0 w-16 h-16 rounded-full bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                @click="$refs.photoInput.click()"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                ref="photoInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="handlePhotoChange"
              />
            </div>
            <div>
              <div class="flex gap-2">
                <button type="button" @click="$refs.photoInput.click()" class="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  {{ photoUploading ? 'Yükleniyor...' : 'Fotoğraf Yükle' }}
                </button>
                <button
                  v-if="employee.profilePhoto"
                  type="button"
                  @click="deletePhoto"
                  class="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Sil
                </button>
              </div>
              <p class="text-[10px] text-gray-400 mt-0.5">Maks. 2MB (JPEG, PNG, WebP)</p>
            </div>
          </div>

          <!-- Genel Bilgiler -->
          <div>
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Genel Bilgiler</h2>
            <div class="grid grid-cols-2 gap-4">
              <Input v-model="form.firstName" label="Ad" required uppercase />
              <Input v-model="form.lastName" label="Soyad" required uppercase />
              <Input v-model="form.email" type="email" label="Email" />
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Cep Numarası</label>
                <input
                  v-model="form.phone"
                  @input="formatPhone"
                  type="text"
                  maxlength="15"
                  placeholder="0 555 555 55 55"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p
                  v-if="
                    form.phone &&
                    form.phone.replace(/\s/g, '').replace(/\D/g, '').length !== 0 &&
                    form.phone.replace(/\s/g, '').replace(/\D/g, '').length !== 11
                  "
                  class="mt-1 text-xs text-red-600"
                >
                  Cep numarası 11 haneli olmalıdır (0 555 555 55 55)
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >TC Kimlik No <span class="text-red-500">*</span></label
                >
                <input
                  v-model="form.tcKimlik"
                  @input="formatTCKimlik"
                  type="text"
                  maxlength="11"
                  placeholder="11 haneli TC Kimlik No"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p
                  v-if="form.tcKimlik && form.tcKimlik.replace(/\D/g, '').length !== 11"
                  class="mt-1 text-xs text-red-600"
                >
                  TC Kimlik No 11 haneli olmalıdır
                </p>
              </div>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-sm font-medium text-gray-700">Görevi (mesleği)</label>
                  <a
                    href="https://www.turmob.org.tr/arsiv/mbs/resmigazete/-MeslekAd%C4%B1veKodralri.pdf"
                    target="_blank"
                    class="text-xs text-blue-600 hover:text-blue-800 underline"
                    download
                  >
                    📥 SGK Meslek Kodları Listesi İndir
                  </a>
                </div>
                <input
                  v-model="form.position"
                  type="text"
                  @input="form.position = $event.target.value.toLocaleUpperCase('tr-TR')"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Görevi (mesleği) giriniz"
                />
                <p class="mt-1 text-xs text-gray-500">
                  İndirilen meslek kodlarından uygun olanı yazabilirsiniz.
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Doğum Tarihi</label>
                <input
                  v-model="form.birthDate"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >İşe Başlama Tarihi</label
                >
                <input
                  v-model="form.hireDate"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >İşten Çıkış Tarihi</label
                >
                <input
                  v-model="form.exitDate"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p class="mt-1 text-xs text-red-600" v-if="form.exitDate">
                  ⚠️ İşten çıkış tarihi girildiğinde çalışan pasif olacak ve giriş yapamayacak
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >İşten Ayrılış Nedeni</label
                >
                <div class="relative">
                  <select
                    v-model="form.exitReasonCode"
                    @change="handleExitReasonChange"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    <template v-if="!showAllExitReasons">
                      <option
                        v-for="reason in commonExitReasons"
                        :key="reason.code"
                        :value="reason.code"
                      >
                        {{ reason.code }} - {{ reason.name }}
                      </option>
                      <option value="__show_all__">📋 Tüm Liste</option>
                    </template>
                    <template v-else>
                      <option
                        v-for="reason in allExitReasons"
                        :key="reason.code"
                        :value="reason.code"
                      >
                        {{ reason.code }} - {{ reason.name }}
                      </option>
                      <option value="__hide_all__">⬆️ Yaygın Olanları Göster</option>
                    </template>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Ücret Bilgileri -->
          <div class="border-t pt-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Ücret Bilgileri</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Ücret
                  <span v-if="!form.salary" class="text-gray-400 text-xs ml-2"
                    >(Asgari ücretli)</span
                  >
                  <span v-else class="text-gray-600 text-xs ml-2">
                    ({{ form.isNetSalary ? 'Net' : 'Brüt' }} ücret)
                  </span>
                </label>
                <input
                  v-model="form.salaryDisplay"
                  @input="formatSalary"
                  type="text"
                  placeholder="Ücret giriniz (örn: 15.000)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p v-if="!form.salary" class="mt-1 text-xs text-gray-500">
                  Boş bırakılırsa "asgari ücretli" olarak görünecektir
                </p>
                <p v-else class="mt-1 text-xs text-gray-600">
                  {{ formatNumber(form.salary) }} {{ form.isNetSalary ? 'Net' : 'Brüt' }} ücret
                </p>
              </div>
              <div class="flex items-center pt-6">
                <input
                  type="checkbox"
                  v-model="form.isNetSalary"
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label class="text-sm font-medium text-gray-700">Net ücret</label>
                <p class="ml-2 text-xs text-gray-500">
                  ({{ form.isNetSalary ? 'Net' : 'Brüt' }} ücret olarak işaretlendi)
                </p>
              </div>
            </div>
          </div>

          <!-- Sözleşme Tipi -->
          <div class="border-t pt-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Sözleşme Tipi</h2>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="ct in contractTypes"
                :key="ct.value"
                type="button"
                @click="form.contractType = ct.value; hasChanges = true"
                :title="ct.tooltip"
                class="px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all"
                :class="form.contractType === ct.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'"
              >
                {{ ct.label }}
              </button>
            </div>

            <!-- Belirli Süreli Sözleşme Bitiş Tarihi -->
            <div v-if="form.contractType === 'BELİRLİ_SÜRELİ'" class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Sözleşme Bitiş Tarihi <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.contractEndDate"
                @change="hasChanges = true"
                type="date"
                class="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="mt-1 text-xs text-gray-500">Belirli süreli sözleşmenin sona ereceği tarih</p>
            </div>
          </div>

          <!-- Kimlik Bilgileri -->
          <div class="border-t pt-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Kimlik Bilgileri</h2>
            <div class="grid grid-cols-2 gap-4">
              <Input v-model="form.birthPlace" label="Doğum Yeri" uppercase />
              <Input v-model="form.passportNumber" label="Pasaport No" />
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Kan Grubu</label>
                <select
                  v-model="form.bloodType"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçiniz</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="0+">0+</option>
                  <option value="0-">0-</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Askerlik Durumu</label>
                <select
                  v-model="form.militaryStatus"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçiniz</option>
                  <option value="Yapıldı">Yapıldı</option>
                  <option value="Tecilli">Tecilli</option>
                  <option value="Muaf">Muaf</option>
                  <option value="Yapılmadı">Yapılmadı</option>
                </select>
              </div>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  v-model="form.hasCriminalRecord"
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label class="text-sm font-medium text-gray-700">Sabıkalı mı?</label>
              </div>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  v-model="form.hasDrivingLicense"
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label class="text-sm font-medium text-gray-700">Ehliyet var mı?</label>
              </div>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  v-model="form.isRetired"
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label class="text-sm font-medium text-gray-700">Emekli mi?</label>
              </div>
            </div>
          </div>

          <!-- Özel Alanlar -->
          <div class="border-t pt-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Özel Alanlar</h2>
            <div v-for="(field, index) in form.customFields" :key="index" class="flex gap-2 mb-2">
              <Input v-model="field.name" :label="`Alan Adı ${index + 1}`" class="flex-1" />
              <Input v-model="field.value" :label="`Değer ${index + 1}`" class="flex-1" />
              <button
                type="button"
                @click="removeCustomField(index)"
                class="mt-6 px-3 py-2 text-red-600 hover:text-red-900"
              >
                Sil
              </button>
            </div>
            <Button type="button" variant="secondary" @click="addCustomField" class="mt-2">
              Yeni Alan Ekle
            </Button>
          </div>

          <!-- Departman -->
          <div class="border-t pt-6">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Departman</label>
                <select
                  v-model="form.department"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçiniz (Opsiyonel)</option>
                  <option v-for="dept in departments" :key="dept._id" :value="dept._id">
                    {{ dept.name }}
                  </option>
                </select>
              </div>

              <!-- Manager (Üst Yönetici) -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Üst Yönetici (Opsiyonel)</label
                >
                <select
                  v-model="form.manager"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçiniz (Opsiyonel)</option>
                  <option v-for="emp in availableManagers" :key="emp._id" :value="emp._id">
                    {{ emp.firstName }} {{ emp.lastName }}
                    {{ emp.position ? `(${emp.position})` : '' }}
                  </option>
                </select>
                <p class="mt-1 text-xs text-gray-500">
                  Çalışanın direkt üst yöneticisini seçin. Departman yöneticisi otomatik olarak
                  belirlenir.
                </p>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <Button variant="secondary" @click="goBack">İptal</Button>
            <Button type="submit" :disabled="saving">{{
              saving ? 'Kaydediliyor...' : 'Kaydet'
            }}</Button>
          </div>
        </div>
      </form>
    </div>

    <!-- İzin Talepleri Bölümü -->
    <div class="bg-white rounded-lg shadow p-6 mt-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-gray-800">İzin Talepleri</h2>
        <Button @click="showLeaveRequestModal = true">Yeni İzin Talebi Ekle</Button>
      </div>

      <!-- Filtreler -->
      <div class="mb-4 flex gap-2">
        <select
          v-model="leaveFilterStatus"
          @change="loadLeaveRequests"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tüm Durumlar</option>
          <option value="PENDING">Bekliyor</option>
          <option value="IN_PROGRESS">Onay Sürecinde</option>
          <option value="APPROVED">Onaylanan</option>
          <option value="REJECTED">Reddedilen</option>
        </select>
      </div>

      <!-- İzin Talepleri Listesi -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                İzin Türü
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Başlangıç
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Bitiş
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Gün
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Durum
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="request in leaveRequests" :key="request._id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ request.leaveSubType?.name || request.companyLeaveType?.name || request.type }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(request.startDate) }}
                <span v-if="request.startTime" class="text-gray-400">
                  ({{ request.startTime }})</span
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(request.endDate) }}
                <span v-if="request.endTime" class="text-gray-400"> ({{ request.endTime }})</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ request.totalDays }} {{ request.isHourly ? 'saat' : 'gün' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="{
                    'bg-yellow-100 text-yellow-800':
                      request.status === 'PENDING' || request.status === 'IN_PROGRESS',
                    'bg-green-100 text-green-800': request.status === 'APPROVED',
                    'bg-red-100 text-red-800': request.status === 'REJECTED',
                  }"
                  class="px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ getLeaveStatusText(request.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="viewLeaveRequest(request)"
                  class="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Görüntüle
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="leaveRequests.length === 0" class="text-center py-8 text-gray-500">
          Henüz izin talebi bulunmamaktadır.
        </div>
      </div>
    </div>

    <!-- İzin Talebi Ekleme Modal -->
    <div
      v-if="showLeaveRequestModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">Yeni İzin Talebi</h2>
        <form @submit.prevent="createLeaveRequest">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                İzin Türü <span class="text-red-500">*</span>
              </label>
              <select
                v-model="leaveRequestForm.companyLeaveType"
                @change="handleLeaveTypeChange"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seçiniz</option>
                <option v-for="type in leaveTypes" :key="type._id" :value="type._id">
                  {{ type.name }}
                </option>
              </select>
            </div>

            <div v-if="selectedLeaveType?.isOtherCategory && filteredSubTypes.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-1">Alt İzin Türü *</label>
              <select
                v-model="leaveRequestForm.leaveSubType"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seçiniz</option>
                <option v-for="subType in filteredSubTypes" :key="subType._id" :value="subType._id">
                  {{ subType.name }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Başlangıç Tarihi <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="leaveRequestForm.startDate"
                  type="date"
                  @change="calculateLeaveDays"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Bitiş Tarihi <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="leaveRequestForm.endDate"
                  type="date"
                  @change="calculateLeaveDays"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                v-model="leaveRequestForm.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="İzin talebi açıklaması"
              ></textarea>
            </div>

            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="showLeaveRequestModal = false" type="button"
                >İptal</Button
              >
              <Button type="submit" :disabled="savingLeaveRequest">
                {{ savingLeaveRequest ? 'Gönderiliyor...' : 'Gönder' }}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Ek Ödemeler Bölümü -->
    <div class="bg-white rounded-lg shadow p-6 mt-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-gray-800">Ek Ödemeler</h2>
        <Button @click="showEmployeePaymentModal = true" v-if="enabledPaymentTypes.length > 0">
          Ek Ödeme Ata
        </Button>
      </div>

      <!-- Yükleniyor -->
      <div v-if="loadingEmployeePayments" class="flex items-center justify-center py-8">
        <svg class="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
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
        <span class="ml-2 text-sm text-gray-500">Yükleniyor...</span>
      </div>

      <!-- Ödeme Listesi -->
      <div v-else-if="employeePayments.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Ödeme Türü
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Başlangıç
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="payment in employeePayments" :key="payment._id">
              <td class="px-4 py-3 whitespace-nowrap">
                <div>
                  <span class="text-sm font-medium text-gray-900">
                    {{
                      payment.companyPaymentType?.customName ||
                      payment.companyPaymentType?.paymentType?.name ||
                      'Bilinmeyen'
                    }}
                  </span>
                  <span
                    class="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                    :class="{
                      'bg-blue-100 text-blue-700':
                        payment.companyPaymentType?.paymentType?.paymentFrequency === 'MONTHLY',
                      'bg-purple-100 text-purple-700':
                        payment.companyPaymentType?.paymentType?.paymentFrequency === 'YEARLY',
                      'bg-orange-100 text-orange-700':
                        payment.companyPaymentType?.paymentType?.paymentFrequency === 'ONE_TIME',
                    }"
                  >
                    {{
                      paymentFrequencyNames[
                        payment.companyPaymentType?.paymentType?.paymentFrequency
                      ] || ''
                    }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                {{
                  formatCurrency(payment.amount ?? payment.companyPaymentType?.defaultAmount ?? 0)
                }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(payment.startDate) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="{
                    'bg-yellow-100 text-yellow-800': payment.status === 'PENDING',
                    'bg-green-100 text-green-800':
                      payment.status === 'APPROVED' && payment.isActive,
                    'bg-blue-100 text-blue-800': payment.status === 'PAID',
                    'bg-red-100 text-red-800': payment.status === 'REJECTED',
                    'bg-gray-100 text-gray-800': !payment.isActive,
                  }"
                >
                  {{ paymentStatusNames[payment.status] || payment.status }}
                  {{ !payment.isActive ? '(Pasif)' : '' }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm">
                <div class="flex gap-1">
                  <button
                    v-if="payment.isActive && payment.status !== 'PAID'"
                    @click="editEmployeePayment(payment)"
                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
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
                    v-if="payment.isActive && payment.status !== 'PAID'"
                    @click="endEmployeePayment(payment)"
                    class="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Sonlandır"
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
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Özet -->
        <div v-if="employeePaymentsSummary" class="mt-4 p-3 bg-blue-50 rounded-lg">
          <div class="flex justify-between items-center">
            <span class="text-sm text-blue-700">Toplam Aylık Ek Ödeme:</span>
            <span class="text-lg font-bold text-blue-800">{{
              formatCurrency(employeePaymentsSummary.monthlyTotal)
            }}</span>
          </div>
        </div>
      </div>

      <!-- Boş Durum -->
      <div v-else class="text-center py-8 text-gray-500">
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
        <p class="text-sm">Henüz ek ödeme atanmamış</p>
        <p v-if="enabledPaymentTypes.length === 0" class="text-xs mt-1">
          Şirket ayarlarından önce ödeme türlerini aktifleştirmeniz gerekiyor
        </p>
      </div>
    </div>

    <!-- Ek Ödeme Atama Modal -->
    <div
      v-if="showEmployeePaymentModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-5 w-full max-w-md">
        <h3 class="text-sm font-bold mb-4">
          {{ editingEmployeePayment ? 'Ek Ödeme Düzenle' : 'Ek Ödeme Ata' }}
        </h3>

        <form @submit.prevent="saveEmployeePayment" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Ödeme Türü</label>
            <select
              v-model="employeePaymentForm.companyPaymentTypeId"
              :disabled="editingEmployeePayment"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              required
            >
              <option value="">Seçiniz</option>
              <option v-for="pt in enabledPaymentTypes" :key="pt._id" :value="pt._id">
                {{ pt.customName || pt.paymentType?.name }} ({{
                  paymentFrequencyNames[pt.paymentType?.paymentFrequency]
                }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Tutar</label>
            <div class="relative">
              <input
                v-model.number="employeePaymentForm.amount"
                type="number"
                min="0"
                step="0.01"
                class="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Şirket varsayılanı kullanılır"
              />
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₺</span>
            </div>
            <p v-if="selectedPaymentTypeDefault" class="text-[10px] text-gray-500 mt-1">
              Şirket varsayılanı: {{ formatCurrency(selectedPaymentTypeDefault) }}
            </p>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
            <input
              v-model="employeePaymentForm.startDate"
              type="date"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1"
              >Bitiş Tarihi (İsteğe Bağlı)</label
            >
            <input
              v-model="employeePaymentForm.endDate"
              type="date"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-[10px] text-gray-500 mt-1">Boş bırakılırsa süresiz devam eder</p>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Not (İsteğe Bağlı)</label>
            <textarea
              v-model="employeePaymentForm.notes"
              rows="2"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ek açıklama..."
            ></textarea>
          </div>

          <div class="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="sm" type="button" @click="closeEmployeePaymentModal"
              >İptal</Button
            >
            <Button type="submit" size="sm" :disabled="savingEmployeePayment">
              {{ savingEmployeePayment ? 'Kaydediliyor...' : 'Kaydet' }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import api from '@/services/api';
import Button from '@/components/Button.vue';
import Input from '@/components/Input.vue';

const contractTypes = [
  { value: 'BELİRSİZ_SÜRELİ', label: 'Normal', tooltip: 'Belirsiz süreli' },
  { value: 'BELİRLİ_SÜRELİ', label: 'Belirli Süreli', tooltip: 'Proje bazlı' },
  { value: 'KISMİ_SÜRELİ', label: 'Part Time', tooltip: 'Kısmi süreli' },
  { value: 'UZAKTAN_ÇALIŞMA', label: 'Uzaktan Çalışma', tooltip: 'Uzaktan çalışma' },
];

const route = useRoute();
const toast = useToastStore();
const confirmModal = useConfirmStore();
const router = useRouter();
const authStore = useAuthStore();

const employee = ref(null);
const departments = ref([]);
const allEmployees = ref([]); // Tüm çalışanlar (manager seçimi için)
const saving = ref(false);
const hasChanges = ref(false);
const photoPreview = ref(null);
const photoUploading = ref(false);

// İzin talepleri için
const leaveRequests = ref([]);
const leaveTypes = ref([]);
const leaveSubTypes = ref([]);
const showLeaveRequestModal = ref(false);
const leaveFilterStatus = ref('');
const savingLeaveRequest = ref(false);

const leaveRequestForm = ref({
  companyLeaveType: '',
  leaveSubType: '',
  startDate: '',
  endDate: '',
  description: '',
});

const selectedLeaveType = computed(() => {
  return leaveTypes.value.find(t => t._id === leaveRequestForm.value.companyLeaveType);
});

const filteredSubTypes = computed(() => {
  if (!selectedLeaveType.value?.isOtherCategory) {
    return [];
  }
  return leaveSubTypes.value.filter(
    st =>
      st.parentLeaveType && st.parentLeaveType.toString() === selectedLeaveType.value._id.toString()
  );
});

// Ek Ödemeler State
const employeePayments = ref([]);
const employeePaymentsSummary = ref(null);
const enabledPaymentTypes = ref([]);
const loadingEmployeePayments = ref(false);
const savingEmployeePayment = ref(false);
const showEmployeePaymentModal = ref(false);
const editingEmployeePayment = ref(null);
const employeePaymentForm = ref({
  companyPaymentTypeId: '',
  amount: null,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  notes: '',
});

// Ödeme sıklığı adları
const paymentFrequencyNames = {
  MONTHLY: 'Aylık',
  YEARLY: 'Yıllık',
  ONE_TIME: 'Tek Seferlik',
};

// Ödeme durumu adları
const paymentStatusNames = {
  PENDING: 'Bekliyor',
  APPROVED: 'Onaylı',
  REJECTED: 'Reddedildi',
  PAID: 'Ödendi',
  CANCELLED: 'İptal',
};

const selectedPaymentTypeDefault = computed(() => {
  if (!employeePaymentForm.value.companyPaymentTypeId) return null;
  const pt = enabledPaymentTypes.value.find(
    p => p._id === employeePaymentForm.value.companyPaymentTypeId
  );
  return pt?.defaultAmount || null;
});

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  tcKimlik: '',
  position: '',
  birthDate: '',
  hireDate: '',
  exitDate: '',
  exitReason: '',
  exitReasonCode: '',
  salary: null,
  salaryDisplay: '',
  isNetSalary: true,
  contractType: 'BELİRSİZ_SÜRELİ',
  contractEndDate: '',
  birthPlace: '',
  passportNumber: '',
  bloodType: '',
  militaryStatus: '',
  hasCriminalRecord: false,
  hasDrivingLicense: false,
  isRetired: false,
  customFields: [],
  department: '',
  manager: '',
});

const showAllExitReasons = ref(false);

// En çok kullanılan çıkış nedenleri
const commonExitReasons = [
  { code: '3', name: 'İstifa - Belirsiz süreli iş sözleşmesinin işçi tarafından feshi (istifa)' },
  {
    code: '4',
    name: 'İşveren Feshi (Genel) - Belirsiz süreli iş sözleşmesinin işveren tarafından haklı sebep bildirilmeden feshi',
  },
  {
    code: '1',
    name: 'Deneme Süresinde İşveren Çıkışı - Deneme süreli iş sözleşmesinin işverence feshi',
  },
  {
    code: '2',
    name: 'Deneme Süresinde İstifa - Deneme süreli iş sözleşmesinin işçi tarafından feshi',
  },
  { code: '5', name: 'Süreli Sözleşme Sona Erdi - Belirli süreli iş sözleşmesinin sona ermesi' },
  { code: '8', name: 'Emeklilik (Yaşlılık) - Emeklilik (yaşlılık) veya toptan ödeme nedeniyle' },
  { code: '10', name: 'Ölüm' },
  { code: '12', name: 'Askerlik' },
];

// Tüm çıkış nedenleri
const allExitReasons = [
  {
    code: '1',
    name: 'Deneme Süresinde İşveren Çıkışı - Deneme süreli iş sözleşmesinin işverence feshi',
  },
  {
    code: '2',
    name: 'Deneme Süresinde İstifa - Deneme süreli iş sözleşmesinin işçi tarafından feshi',
  },
  { code: '3', name: 'İstifa - Belirsiz süreli iş sözleşmesinin işçi tarafından feshi (istifa)' },
  {
    code: '4',
    name: 'İşveren Feshi (Genel) - Belirsiz süreli iş sözleşmesinin işveren tarafından haklı sebep bildirilmeden feshi',
  },
  { code: '5', name: 'Süreli Sözleşme Sona Erdi - Belirli süreli iş sözleşmesinin sona ermesi' },
  { code: '8', name: 'Emeklilik (Yaşlılık) - Emeklilik (yaşlılık) veya toptan ödeme nedeniyle' },
  { code: '9', name: 'Malulen Emeklilik - Malulen emeklilik nedeniyle' },
  { code: '10', name: 'Ölüm' },
  { code: '12', name: 'Askerlik' },
  { code: '13', name: 'Kadın İşçinin Evlenmesi' },
  {
    code: '23',
    name: 'İşçi Haklı Nedenle Fesih (Zorunlu) - İşçi tarafından zorunlu nedenle fesih',
  },
  { code: '24', name: 'İşçi Sağlık Nedeniyle Fesih - İşçi tarafından sağlık nedeniyle fesih' },
  {
    code: '42-4857/25-II-A',
    name: 'İşveren Haklı Nedenle Fesih - Sağlık Nedeni (Uzun Süreli Hastalık) - İşçinin, tutulduğu hastalık nedeniyle doğrudan işe gelmesinin imkânsız olması ve bu halin 6 haftayı (42 iş gününü) geçmesi',
  },
  {
    code: '43-4857/25-II-B',
    name: 'İşveren Haklı Nedenle Fesih - Sağlık Nedeni (Hastalığı Gizleme) - İşçinin, işe girerken işvereni yanıltması (sözleşmenin esaslı noktalarından birinde yanlış beyanda bulunması)',
  },
  {
    code: '44-4857/25-II-C',
    name: 'İşveren Haklı Nedenle Fesih - Ahlak & İyiniyete Aykırılık - İşçinin, işverene veya ailesine veya işyerindeki diğer bir işçiye sataşması, gözdağı vermesi veya onların şeref ve namusuna dokunacak sözler sarf etmesi ya da davranışlarda bulunması',
  },
  {
    code: '45-4857/25-II-D',
    name: 'İşveren Haklı Nedenle Fesih - Cinsel Taciz - İşçinin, işverene veya işyerindeki diğer bir işçiye cinsel tacizde bulunması',
  },
  {
    code: '46-4857/25-II-E',
    name: 'İşveren Haklı Nedenle Fesih - Saldırı veya Sarhoşluk - İşçinin, işverene veya işyerindeki diğer bir işçiye saldırması veya işyerine sarhoş ya da uyuşturucu madde almış olarak gelmesi',
  },
  {
    code: '47-4857/25-II-F',
    name: 'İşveren Haklı Nedenle Fesih - Güveni Kötüye Kullanma & Suç - İşçinin, işverenin güvenini kötüye kullanması, hırsızlık yapması, işverenin meslek sırlarını ifşa etmesi veya işyerinde suç işlemesi',
  },
  {
    code: '48-4857/25-II-G',
    name: 'İşveren Haklı Nedenle Fesih - İşi Savsaklama - İşçinin, işini yedi iş günü üst üste veya bir ay içinde toplam on iş günü yapmadan kendi isteğiyle terk etmesi',
  },
  {
    code: '49-4857/25-II-H',
    name: 'İşveren Haklı Nedenle Fesih - İş Güvenliğini İhlal - İşçinin, işin güvenliğini tehlikeye düşürmesi, işyerinin malına kasıtlı olarak veya ağır ihmal sonucu önemli ölçüde zarar vermesi',
  },
  {
    code: '50-4857/25-II-I',
    name: 'İşveren Haklı Nedenle Fesih - Zorlayıcı Sebep - İşçiyi işyerinde bir haftadan fazla süreyle çalışmaktan alıkoyan zorlayıcı bir sebebin ortaya çıkması (örneğin: işçinin tutuklanması veya gözaltına alınması)',
  },
];

const handlePhotoChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !employee.value) return;

  const reader = new FileReader();
  reader.onload = (ev) => { photoPreview.value = ev.target.result; };
  reader.readAsDataURL(file);

  photoUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await api.put(`/employees/${route.params.id}/profile-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    employee.value.profilePhoto = res.data?.data?.profilePhoto;
    photoPreview.value = null;
    toast.success('Fotoğraf yüklendi');
  } catch (err) {
    toast.error(err.response?.data?.message || 'Fotoğraf yüklenemedi');
    photoPreview.value = null;
  }
  photoUploading.value = false;
  e.target.value = '';
};

const deletePhoto = async () => {
  if (!employee.value || !confirm('Fotoğrafı silmek istediğinize emin misiniz?')) return;
  try {
    await api.delete(`/employees/${route.params.id}/profile-photo`);
    employee.value.profilePhoto = null;
    photoPreview.value = null;
    toast.success('Fotoğraf silindi');
  } catch (err) {
    toast.error(err.response?.data?.message || 'Fotoğraf silinemedi');
  }
};

const loadEmployee = async () => {
  try {
    const response = await api.get(`/employees/${route.params.id}`);
    // Backend { success: true, data: employee } formatında döndürüyor
    employee.value = response.data?.data || response.data;

    // Format dates for input
    const formatDateForInput = date => {
      if (!date) return '';
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    };

    // Reset showAllExitReasons when loading employee
    showAllExitReasons.value = false;

    form.value = {
      firstName: employee.value.firstName || '',
      lastName: employee.value.lastName || '',
      email: employee.value.email || '',
      phone: employee.value.phone || '',
      tcKimlik: employee.value.tcKimlik || '',
      position: employee.value.position || '',
      birthDate: formatDateForInput(employee.value.birthDate),
      hireDate: formatDateForInput(employee.value.hireDate),
      exitDate: formatDateForInput(employee.value.exitDate),
      exitReason: employee.value.exitReason || '',
      exitReasonCode: employee.value.exitReasonCode || '',
      salary: employee.value.salary || null,
      salaryDisplay: employee.value.salary ? formatNumber(employee.value.salary) : '',
      isNetSalary: employee.value.isNetSalary !== undefined ? employee.value.isNetSalary : true,
      contractType: employee.value.contractType || 'BELİRSİZ_SÜRELİ',
      contractEndDate: formatDateForInput(employee.value.contractEndDate),
      birthPlace: employee.value.birthPlace || '',
      passportNumber: employee.value.passportNumber || '',
      bloodType: employee.value.bloodType || '',
      militaryStatus: employee.value.militaryStatus || '',
      hasCriminalRecord: employee.value.hasCriminalRecord || false,
      hasDrivingLicense: employee.value.hasDrivingLicense || false,
      isRetired: employee.value.isRetired || false,
      customFields: employee.value.customFields || [],
      department: employee.value.department?._id || '',
      manager: employee.value.manager?._id || employee.value.manager || '',
    };
    hasChanges.value = false;

    // İzin talepleri ve izin türlerini yükle
    await loadLeaveRequests();
    await loadLeaveTypes();
  } catch (error) {
    console.error('Personel yüklenemedi:', error);
    toast.error('Personel bilgileri yüklenemedi');
  }
};

const loadDepartments = async () => {
  try {
    const response = await api.get('/departments');
    departments.value = response.data?.data || response.data;
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error);
  }
};

const loadEmployees = async () => {
  try {
    const response = await api.get('/employees');
    const employees = response.data?.data || response.data || [];
    allEmployees.value = employees.filter(emp => emp._id !== route.params.id); // Kendisini hariç tut
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error);
  }
};

const availableManagers = computed(() => {
  return allEmployees.value.filter(emp => emp.isActive !== false);
});

const formatTCKimlik = event => {
  let value = event.target.value.replace(/\D/g, '');
  if (value.length > 11) {
    value = value.substring(0, 11);
  }
  form.value.tcKimlik = value;
  hasChanges.value = true;
};

const formatPhone = event => {
  let value = event.target.value.replace(/\D/g, '');

  // 5 ile başlıyorsa başına 0 ekle
  if (value.length > 0 && value[0] === '5') {
    value = '0' + value;
  }

  // Format: 0 555 555 55 55 (11 hane - 15 karakter toplam: 11 hane + 4 boşluk)
  // 11 haneden fazla girilemez
  if (value.length > 11) {
    value = value.substring(0, 11);
  }

  if (value.length > 0) {
    let formatted = value[0];
    if (value.length > 1) {
      formatted += ' ' + value.substring(1, 4);
    }
    if (value.length > 4) {
      formatted += ' ' + value.substring(4, 7);
    }
    if (value.length > 7) {
      formatted += ' ' + value.substring(7, 9);
    }
    if (value.length > 9) {
      formatted += ' ' + value.substring(9, 11);
    }
    form.value.phone = formatted;
  } else {
    form.value.phone = '';
  }
  hasChanges.value = true;
};

const formatSalary = event => {
  let value = event.target.value.replace(/[^\d]/g, '');
  if (value) {
    form.value.salary = parseFloat(value);
    form.value.salaryDisplay = formatNumber(parseFloat(value));
  } else {
    form.value.salary = null;
    form.value.salaryDisplay = '';
  }
  hasChanges.value = true;
};

const formatNumber = num => {
  if (!num && num !== 0) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Exit reason dropdown handler
const handleExitReasonChange = () => {
  if (form.value.exitReasonCode === '__show_all__') {
    showAllExitReasons.value = true;
    form.value.exitReasonCode = '';
    hasChanges.value = false; // Bu bir UI değişikliği, kaydetmeyi tetiklemesin
  } else if (form.value.exitReasonCode === '__hide_all__') {
    showAllExitReasons.value = false;
    form.value.exitReasonCode = '';
    hasChanges.value = false; // Bu bir UI değişikliği, kaydetmeyi tetiklemesin
  } else if (form.value.exitReasonCode) {
    const selectedReason = allExitReasons.find(r => r.code === form.value.exitReasonCode);
    if (selectedReason) {
      form.value.exitReason = selectedReason.name;
    }
    hasChanges.value = true;
  } else {
    form.value.exitReason = '';
    form.value.exitReasonCode = '';
    hasChanges.value = true;
  }
};

const addCustomField = () => {
  form.value.customFields.push({ name: '', value: '' });
  hasChanges.value = true;
};

const removeCustomField = index => {
  form.value.customFields.splice(index, 1);
  hasChanges.value = true;
};

const saveEmployee = async () => {
  if (!hasChanges.value) {
    return;
  }

  const confirmed = await confirmModal.show({
    title: 'Değişiklikleri Kaydet',
    message: 'Değişiklikleri kaydetmek istiyor musunuz?',
    type: 'info',
    confirmText: 'Kaydet',
  });
  if (!confirmed) return;

  saving.value = true;
  try {
    // TC Kimlik validation
    if (form.value.tcKimlik && form.value.tcKimlik.length !== 11) {
      toast.warning('TC Kimlik No 11 haneli olmalıdır');
      return;
    }

    // Format dates
    const payload = {
      ...form.value,
      birthDate: form.value.birthDate ? new Date(form.value.birthDate) : null,
      hireDate: form.value.hireDate ? new Date(form.value.hireDate) : null,
      exitDate: form.value.exitDate ? new Date(form.value.exitDate) : null,
      exitReason: form.value.exitReason || undefined,
      exitReasonCode: form.value.exitReasonCode || undefined,
      salary: form.value.salary || null,
      isNetSalary: form.value.isNetSalary !== undefined ? form.value.isNetSalary : true,
      contractEndDate: form.value.contractType === 'BELİRLİ_SÜRELİ' && form.value.contractEndDate ? new Date(form.value.contractEndDate) : null,
      phone: form.value.phone.replace(/\s/g, ''), // Remove spaces before sending
      tcKimlik: form.value.tcKimlik,
    };

    // Remove salaryDisplay from payload
    delete payload.salaryDisplay;

    await api.put(`/employees/${route.params.id}`, payload);
    toast.success('Personel bilgileri kaydedildi');
    hasChanges.value = false;
    loadEmployee();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  } finally {
    saving.value = false;
  }
};

const goBack = async () => {
  if (hasChanges.value) {
    const confirmed = await confirmModal.show({
      title: 'Kaydedilmemiş Değişiklikler',
      message: 'Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?',
      type: 'warning',
      confirmText: 'Çık',
    });
    if (!confirmed) return;
  }
  router.push('/employees');
};

// Warn before leaving page with unsaved changes
const beforeUnload = e => {
  if (hasChanges.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};

const formatDate = date => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const getLeaveStatusText = status => {
  const statusMap = {
    PENDING: 'Bekliyor',
    IN_PROGRESS: 'Onay Sürecinde',
    APPROVED: 'Onaylanan',
    REJECTED: 'Reddedilen',
  };
  return statusMap[status] || status;
};

const loadLeaveRequests = async () => {
  if (!employee.value?._id) {
    return;
  }

  try {
    const params = { employee: employee.value._id };
    if (leaveFilterStatus.value) {
      params.status = leaveFilterStatus.value;
    }

    const response = await api.get('/leave-requests', { params });
    leaveRequests.value = response.data || [];
  } catch (error) {
    console.error('İzin talepleri yüklenemedi:', error);
    leaveRequests.value = [];
  }
};

const loadLeaveTypes = async () => {
  if (!employee.value?.company) {
    return;
  }

  try {
    const companyId = employee.value.company._id || employee.value.company;
    const response = await api.get('/leave-types', {
      params: { companyId },
    });
    if (response.data.success) {
      leaveTypes.value = response.data.data || [];
    }
  } catch (error) {
    console.error('İzin türleri yüklenemedi:', error);
  }
};

const loadLeaveSubTypes = async () => {
  if (!selectedLeaveType.value?.isOtherCategory || !selectedLeaveType.value._id) {
    leaveSubTypes.value = [];
    return;
  }

  try {
    const params = { parentLeaveType: selectedLeaveType.value._id };
    if (employee.value?.company) {
      params.companyId = employee.value.company._id || employee.value.company;
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
  leaveRequestForm.value.leaveSubType = '';
  if (selectedLeaveType.value?.isOtherCategory) {
    await loadLeaveSubTypes();
  }
};

const calculateLeaveDays = () => {
  if (leaveRequestForm.value.startDate && leaveRequestForm.value.endDate) {
    const start = new Date(leaveRequestForm.value.startDate);
    const end = new Date(leaveRequestForm.value.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    // Backend'de daha detaylı hesaplama yapılacak
  }
};

const createLeaveRequest = async () => {
  if (!employee.value?._id) {
    toast.error('Çalışan bilgisi bulunamadı');
    return;
  }

  savingLeaveRequest.value = true;
  try {
    const formData = new FormData();
    formData.append('employee', employee.value._id);
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
    showLeaveRequestModal.value = false;
    leaveRequestForm.value = {
      companyLeaveType: '',
      leaveSubType: '',
      startDate: '',
      endDate: '',
      description: '',
    };
    await loadLeaveRequests();
  } catch (error) {
    console.error('İzin talebi oluşturma hatası:', error);
    toast.error(error.response?.data?.message || 'İzin talebi oluşturulamadı');
  } finally {
    savingLeaveRequest.value = false;
  }
};

const viewLeaveRequest = request => {
  // Detay sayfasına yönlendir veya modal göster
  router.push(`/leave-requests/${request._id}`);
};

// Ek Ödemeler Functions
const loadEmployeePayments = async () => {
  if (!employee.value?._id) return;

  loadingEmployeePayments.value = true;
  try {
    const response = await api.get(`/employees/${employee.value._id}/payments`);
    employeePayments.value = response.data.payments || [];
    employeePaymentsSummary.value = response.data.summary || null;
  } catch (error) {
    console.error('Ek ödemeler yüklenemedi:', error);
  } finally {
    loadingEmployeePayments.value = false;
  }
};

const loadEnabledPaymentTypes = async () => {
  try {
    const companyId =
      employee.value?.company?._id ||
      employee.value?.company ||
      authStore.user?.company?._id ||
      authStore.user?.company;
    if (!companyId) return;

    const response = await api.get(`/companies/${companyId}/payment-types/enabled`);
    enabledPaymentTypes.value = response.data || [];
  } catch (error) {
    console.error('Aktif ödeme türleri yüklenemedi:', error);
  }
};

const formatCurrency = amount => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
};

const editEmployeePayment = payment => {
  editingEmployeePayment.value = payment;
  employeePaymentForm.value = {
    companyPaymentTypeId: payment.companyPaymentType?._id || '',
    amount: payment.amount,
    startDate: payment.startDate ? payment.startDate.split('T')[0] : '',
    endDate: payment.endDate ? payment.endDate.split('T')[0] : '',
    notes: payment.notes || '',
  };
  showEmployeePaymentModal.value = true;
};

const closeEmployeePaymentModal = () => {
  showEmployeePaymentModal.value = false;
  editingEmployeePayment.value = null;
  employeePaymentForm.value = {
    companyPaymentTypeId: '',
    amount: null,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
  };
};

const saveEmployeePayment = async () => {
  if (!employee.value?._id) {
    toast.error('Çalışan bilgisi bulunamadı');
    return;
  }

  savingEmployeePayment.value = true;
  try {
    if (editingEmployeePayment.value) {
      // Güncelleme
      await api.put(
        `/employees/${employee.value._id}/payments/${editingEmployeePayment.value._id}`,
        {
          amount: employeePaymentForm.value.amount || null,
          startDate: employeePaymentForm.value.startDate,
          endDate: employeePaymentForm.value.endDate || null,
          notes: employeePaymentForm.value.notes || null,
        }
      );
      toast.success('Ödeme güncellendi');
    } else {
      // Yeni kayıt
      await api.post(`/employees/${employee.value._id}/payments`, {
        companyPaymentTypeId: employeePaymentForm.value.companyPaymentTypeId,
        amount: employeePaymentForm.value.amount || null,
        startDate: employeePaymentForm.value.startDate,
        endDate: employeePaymentForm.value.endDate || null,
        notes: employeePaymentForm.value.notes || null,
      });
      toast.success('Ödeme atandı');
    }

    closeEmployeePaymentModal();
    await loadEmployeePayments();
  } catch (error) {
    console.error('Ödeme kaydedilemedi:', error);
    toast.error(error.response?.data?.message || 'Kaydetme başarısız');
  } finally {
    savingEmployeePayment.value = false;
  }
};

const endEmployeePayment = async payment => {
  const confirmed = await confirmModal.show({
    title: 'Ödemeyi Sonlandır',
    message: 'Bu ödemeyi sonlandırmak istediğinizden emin misiniz?',
    type: 'danger',
    confirmText: 'Sil',
  });
  if (!confirmed) return;

  try {
    await api.delete(`/employees/${employee.value._id}/payments/${payment._id}`);
    toast.success('Ödeme sonlandırıldı');
    await loadEmployeePayments();
  } catch (error) {
    console.error('Ödeme sonlandırılamadı:', error);
    toast.error(error.response?.data?.message || 'İşlem başarısız');
  }
};

onMounted(async () => {
  await loadEmployee();
  await loadDepartments();
  await loadEmployees();
  await loadEnabledPaymentTypes();
  await loadEmployeePayments();
  window.addEventListener('beforeunload', beforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload);
});
</script>
