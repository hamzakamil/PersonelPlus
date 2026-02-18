<template>
  <div class="p-6">
    <div class="flex justify-end items-center mb-6">
      <Button @click="showModal = true">Yeni İzin Talebi</Button>
    </div>

    <div class="mb-4 flex gap-2">
      <select
        v-model="filterStatus"
        @change="loadRequests"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Tüm Durumlar</option>
        <option value="PENDING">Bekliyor</option>
        <option value="IN_PROGRESS">Onay Sürecinde</option>
        <option value="APPROVED">Onaylanan</option>
        <option value="REJECTED">Reddedilen</option>
        <option value="CANCELLED">İptal Edilen</option>
        <option value="CANCELLATION_REQUESTED">İptal Talebi</option>
      </select>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"
            >
              No
            </th>
            <th
              @click="toggleSort('leaveType')"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div class="flex items-center gap-1">
                İzin Türü
                <span v-if="sortField === 'leaveType'" class="text-blue-600">{{
                  sortOrder === 'asc' ? '↑' : '↓'
                }}</span>
                <span v-else class="text-gray-300">↕</span>
              </div>
            </th>
            <th
              @click="toggleSort('startDate')"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div class="flex items-center gap-1">
                Başlangıç
                <span v-if="sortField === 'startDate'" class="text-blue-600">{{
                  sortOrder === 'asc' ? '↑' : '↓'
                }}</span>
                <span v-else class="text-gray-300">↕</span>
              </div>
            </th>
            <th
              @click="toggleSort('endDate')"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div class="flex items-center gap-1">
                Bitiş
                <span v-if="sortField === 'endDate'" class="text-blue-600">{{
                  sortOrder === 'asc' ? '↑' : '↓'
                }}</span>
                <span v-else class="text-gray-300">↕</span>
              </div>
            </th>
            <th
              @click="toggleSort('totalDays')"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div class="flex items-center gap-1">
                Gün
                <span v-if="sortField === 'totalDays'" class="text-blue-600">{{
                  sortOrder === 'asc' ? '↑' : '↓'
                }}</span>
                <span v-else class="text-gray-300">↕</span>
              </div>
            </th>
            <th
              @click="toggleSort('status')"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div class="flex items-center gap-1">
                Durum
                <span v-if="sortField === 'status'" class="text-blue-600">{{
                  sortOrder === 'asc' ? '↑' : '↓'
                }}</span>
                <span v-else class="text-gray-300">↕</span>
              </div>
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Onaylayıcı
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="(request, index) in sortedRequests" :key="request._id">
            <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {{ index + 1 }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ request.leaveSubType?.name || request.companyLeaveType?.name || request.type }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(request.startDate) }}
              <span v-if="request.startTime"> ({{ request.startTime }})</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(request.endDate) }}
              <span v-if="request.endTime"> ({{ request.endTime }})</span>
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
                  'bg-gray-100 text-gray-800': request.status === 'CANCELLED',
                  'bg-orange-100 text-orange-800': request.status === 'CANCELLATION_REQUESTED',
                }"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ getStatusText(request.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span
                v-if="
                  request.currentApprover &&
                  (request.status === 'PENDING' || request.status === 'IN_PROGRESS')
                "
              >
                {{ request.currentApprover.firstName }} {{ request.currentApprover.lastName }}
              </span>
              <span v-else-if="request.status === 'APPROVED'" class="text-green-600">-</span>
              <span v-else-if="request.status === 'REJECTED'" class="text-red-600">-</span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                v-if="canCancel(request)"
                @click="cancelRequest(request)"
                class="text-gray-600 hover:text-gray-900 mr-2"
              >
                İptal Et
              </button>
              <button
                v-if="canAcceptLeave(request)"
                @click="openSmsAcceptanceModal(request)"
                class="text-green-600 hover:text-green-900 mr-2"
              >
                Kabul Et
              </button>
              <span
                v-else-if="request.employeeAcceptance?.status === 'ACCEPTED'"
                class="text-green-600 text-xs mr-2"
              >
                ✓ Kabul Edildi
              </span>
              <button
                v-if="canRequestCancellation(request)"
                @click="openCancellationModal(request)"
                class="text-orange-600 hover:text-orange-900 mr-2"
              >
                İptal Talebi
              </button>
              <button @click="viewDetails(request)" class="text-blue-600 hover:text-blue-900">
                Detay
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="sortedRequests.length === 0" class="text-center py-12">
        <p class="text-gray-500">Henüz izin talebiniz bulunmamaktadır.</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4 text-gray-800">Yeni İzin Talebi</h2>

        <!-- Bugünün Tarihi -->
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-sm font-medium text-blue-800">Bugün: {{ todayFormatted }}</span>
          </div>
        </div>

        <form @submit.prevent="saveRequest">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >İzin Türü <span class="text-red-500">*</span></label
              >
              <select
                v-model="form.companyLeaveType"
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

            <!-- Alt izin türü -->
            <div v-if="selectedLeaveType?.name === 'Diğer izinler' && filteredSubTypes.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Alt İzin Türü <span class="text-red-500">*</span></label
              >
              <select
                v-model="form.leaveSubType"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçiniz</option>
                <option v-for="subType in filteredSubTypes" :key="subType._id" :value="subType._id">
                  {{ subType.name }}
                </option>
              </select>
            </div>

            <!-- Basitleştirilmiş İzin Süresi Girişi -->
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >İzin Başlangıç Tarihi <span class="text-red-500">*</span></label
                >
                <input
                  v-model="form.startDate"
                  type="date"
                  required
                  @input="onStartDateChange"
                  :max="isSameDayRequired ? form.startDate : undefined"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Kaç Gün İzin <span class="text-red-500">*</span></label
                >
                <input
                  v-model.number="manualDaysInput"
                  type="number"
                  min="1"
                  required
                  @input="onDaysInputChange"
                  placeholder="Örn: 5"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p class="text-xs text-gray-500 mt-1">İş günü sayısı</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >İzin Bitiş Tarihi <span class="text-red-500">*</span></label
                >
                <input
                  v-model="form.endDate"
                  type="date"
                  required
                  @input="onEndDateChange"
                  :min="form.startDate"
                  :max="isSameDayRequired ? form.startDate : undefined"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p class="text-xs text-gray-500 mt-1">Bitiş tarihi</p>
              </div>
            </div>

            <!-- Hesaplanan Bilgiler -->
            <div
              v-if="form.startDate && form.endDate && calculatedDays > 0"
              class="border border-green-300 bg-green-50 rounded-lg p-4"
            >
              <h4 class="font-semibold text-green-800 mb-3 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                İzin Detayları
              </h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between items-center py-2 border-b border-green-200">
                  <span class="text-gray-700">İzin Başlangıç:</span>
                  <span class="font-semibold text-gray-900">{{ formatDate(form.startDate) }}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-green-200">
                  <span class="text-gray-700">İzin Bitiş:</span>
                  <span class="font-semibold text-gray-900">{{ formatDate(form.endDate) }}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-green-200">
                  <span class="text-gray-700">İş Başı Tarihi:</span>
                  <span class="font-semibold text-green-700">{{ returnDateFormatted }}</span>
                </div>
                <div
                  v-if="!form.isHourly"
                  class="flex justify-between items-center py-2 border-b border-green-200"
                >
                  <span class="text-gray-700">İzin Süresi:</span>
                  <span class="font-semibold text-gray-900">{{ calculatedDays }} iş günü</span>
                </div>
                <div
                  v-if="weekendDaysInRange > 0 && isAnnualLeave"
                  class="flex justify-between items-center py-2"
                >
                  <span class="text-gray-700">Hafta Tatili ({{ weekendDayNames }}):</span>
                  <span class="font-medium text-orange-700"
                    >{{ weekendDaysInRange }} gün (hesaplamaya dahil değil)</span
                  >
                </div>
                <div
                  v-if="totalCalendarDays > calculatedDays"
                  class="bg-blue-50 border border-blue-200 rounded p-3 mt-3"
                >
                  <p class="text-xs text-blue-800">
                    <strong>Toplam takvim günü:</strong> {{ totalCalendarDays }} gün
                    <br />
                    <strong>Kullanılan izin:</strong> {{ calculatedDays }} iş günü
                    <span v-if="weekendDaysInRange > 0"
                      >({{ weekendDaysInRange }} hafta tatili hariç)</span
                    >
                  </p>
                </div>
              </div>
            </div>

            <!-- Yarım Gün Seçeneği -->
            <div v-if="showHalfDayOption" class="flex items-center gap-4">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  v-model="form.isHalfDay"
                  class="mr-2"
                  @change="handleHalfDayChange"
                />
                <span class="text-sm text-gray-700">Yarım Gün</span>
              </label>
              <div v-if="form.isHalfDay">
                <label class="block text-sm font-medium text-gray-700 mb-1">Yarım Gün Dönemi</label>
                <select
                  v-model="form.halfDayPeriod"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="morning">Öğleden Önce</option>
                  <option value="afternoon">Öğleden Sonra</option>
                </select>
              </div>
            </div>

            <!-- Saatlik İzin Seçeneği -->
            <div v-if="showHourlyOption" class="flex items-center gap-4">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  v-model="form.isHourly"
                  class="mr-2"
                  @change="handleHourlyChange"
                />
                <span class="text-sm text-gray-700">Saatlik İzin</span>
              </label>
              <div v-if="form.isHourly" class="grid grid-cols-2 gap-4 flex-1">
                <Input
                  v-model="form.startTime"
                  type="time"
                  label="Başlangıç Saati"
                  @input="calculateHours"
                />
                <Input
                  v-model="form.endTime"
                  type="time"
                  label="Bitiş Saati"
                  @input="calculateHours"
                />
                <div v-if="calculatedHours > 0" class="col-span-2 bg-blue-50 p-3 rounded-lg">
                  <p class="text-sm text-blue-800">
                    <strong>Toplam Saat:</strong> {{ calculatedHours }} saat
                  </p>
                </div>
              </div>
            </div>

            <Textarea v-model="form.description" label="Açıklama" :required="descriptionRequired" />
            <div v-if="isReportLeave">
              <label class="block text-sm font-medium text-gray-700 mb-2">Rapor Dosyası</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                @change="handleFileChange"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeModal">İptal</Button>
              <Button type="submit" :disabled="saving">{{
                saving ? 'Kaydediliyor...' : 'Kaydet'
              }}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Cancellation Request Modal -->
    <div
      v-if="showCancellationModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4 text-gray-800">İptal Talebi Gönder</h2>

        <div v-if="cancellationRequest" class="mb-4 p-3 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600">
            <strong>İzin:</strong>
            {{
              cancellationRequest.leaveSubType?.name ||
              cancellationRequest.companyLeaveType?.name ||
              cancellationRequest.type
            }}
          </p>
          <p class="text-sm text-gray-600">
            <strong>Tarih:</strong> {{ formatDate(cancellationRequest.startDate) }} -
            {{ formatDate(cancellationRequest.endDate) }}
          </p>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            İptal Nedeni <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="cancellationReason"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="İzninizi neden iptal ettirmek istediğinizi açıklayınız..."
            required
          ></textarea>
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p class="text-sm text-yellow-800">
            <strong>Not:</strong> İptal talebiniz, izninizi onaylayan yöneticiler tarafından
            değerlendirilecektir.
          </p>
        </div>

        <div class="flex gap-2 justify-end">
          <Button variant="secondary" @click="closeCancellationModal">Vazgeç</Button>
          <Button
            @click="submitCancellationRequest"
            :disabled="!cancellationReason || cancellationSubmitting"
            class="bg-orange-600 hover:bg-orange-700"
          >
            {{ cancellationSubmitting ? 'Gönderiliyor...' : 'Talep Gönder' }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div
      v-if="showDetailModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 class="text-xl font-bold mb-4">İzin Talebi Detayları</h2>
        <div class="space-y-4" v-if="selectedRequest">
          <div>
            <strong>İzin Türü:</strong>
            {{
              selectedRequest.leaveSubType?.name ||
              selectedRequest.companyLeaveType?.name ||
              selectedRequest.type
            }}
          </div>
          <div>
            <strong>Tarih:</strong> {{ formatDate(selectedRequest.startDate) }} -
            {{ formatDate(selectedRequest.endDate) }}
          </div>
          <div v-if="selectedRequest.startTime || selectedRequest.endTime">
            <strong>Saat:</strong> {{ selectedRequest.startTime }} - {{ selectedRequest.endTime }}
          </div>
          <div>
            <strong>Toplam:</strong> {{ selectedRequest.totalDays }}
            {{ selectedRequest.isHourly ? 'saat' : 'gün' }}
          </div>
          <div v-if="selectedRequest.description">
            <strong>Açıklama:</strong> {{ selectedRequest.description }}
          </div>
          <div v-if="selectedRequest.document">
            <strong>Rapor:</strong>
            <a
              :href="selectedRequest.document"
              target="_blank"
              class="text-blue-600 hover:underline ml-2"
            >
              Dosyayı Görüntüle
            </a>
          </div>
          <div v-if="selectedRequest.status === 'REJECTED' && selectedRequest.rejectReason">
            <strong>Red Nedeni:</strong> {{ selectedRequest.rejectReason }}
          </div>
          <div
            v-if="
              selectedRequest.status === 'CANCELLATION_REQUESTED' &&
              selectedRequest.cancellationReason
            "
            class="bg-orange-50 border border-orange-200 rounded-lg p-3"
          >
            <strong class="text-orange-800">İptal Nedeni:</strong>
            <p class="text-orange-700 mt-1">{{ selectedRequest.cancellationReason }}</p>
            <p v-if="selectedRequest.cancellationRequestedAt" class="text-xs text-orange-600 mt-2">
              Talep Tarihi: {{ formatDate(selectedRequest.cancellationRequestedAt) }}
            </p>
          </div>
          <div
            v-if="
              selectedRequest.currentApprover &&
              (selectedRequest.status === 'PENDING' || selectedRequest.status === 'IN_PROGRESS')
            "
          >
            <strong>Onay Bekleniyor:</strong> {{ selectedRequest.currentApprover?.firstName }}
            {{ selectedRequest.currentApprover?.lastName }}
          </div>
          <div
            v-if="
              selectedRequest.cancellationCurrentApprover &&
              selectedRequest.status === 'CANCELLATION_REQUESTED'
            "
          >
            <strong>İptal Onayı Bekleniyor:</strong>
            {{ selectedRequest.cancellationCurrentApprover?.firstName }}
            {{ selectedRequest.cancellationCurrentApprover?.lastName }}
          </div>
          <div
            v-if="selectedRequest.employeeAcceptance?.status === 'ACCEPTED'"
            class="bg-green-50 border border-green-200 rounded-lg p-3"
          >
            <strong class="text-green-800">Çalışan Kabulü:</strong>
            <p class="text-green-700 mt-1">SMS ile kabul edildi</p>
            <p
              v-if="selectedRequest.employeeAcceptance?.acceptedAt"
              class="text-xs text-green-600 mt-2"
            >
              Kabul Tarihi: {{ formatDate(selectedRequest.employeeAcceptance.acceptedAt) }}
            </p>
          </div>
          <div v-if="selectedRequest.history && selectedRequest.history.length > 0">
            <strong>Onay Geçmişi:</strong>
            <div class="mt-2 space-y-1">
              <div
                v-for="(item, index) in selectedRequest.history"
                :key="index"
                class="text-sm text-gray-600"
              >
                {{ item.approver?.firstName }} {{ item.approver?.lastName }}:
                {{ getStatusText(item.status) }} - {{ formatDate(item.date) }}
                <span v-if="item.note" class="text-gray-500 italic">({{ item.note }})</span>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <Button variant="secondary" @click="showDetailModal = false">Kapat</Button>
        </div>
      </div>
    </div>

    <!-- SMS İzin Kabul Modalı -->
    <SmsVerificationModal
      :show="showSmsAcceptanceModal"
      title="İzin Kabulü"
      :description="
        smsAcceptanceRequest
          ? `${formatDate(smsAcceptanceRequest.startDate)} - ${formatDate(smsAcceptanceRequest.endDate)} tarihleri arasındaki ${smsAcceptanceRequest.totalDays} günlük izninizi kabul etmek için SMS doğrulaması yapınız.`
          : ''
      "
      :send-code-fn="sendAcceptanceCode"
      :verify-code-fn="acceptLeave"
      @close="closeSmsAcceptanceModal"
      @verified="onLeaveAccepted"
      @error="onSmsAcceptanceError"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import api from '@/services/api';
import Button from '@/components/Button.vue';
import Input from '@/components/Input.vue';
import Textarea from '@/components/Textarea.vue';
import SmsVerificationModal from '@/components/SmsVerificationModal.vue';

const authStore = useAuthStore();
const toast = useToastStore();
const confirmModal = useConfirmStore();
const requests = ref([]);
const leaveTypes = ref([]);
const leaveSubTypes = ref([]);

// Sıralama
const sortField = ref('startDate');
const sortOrder = ref('desc');
const showModal = ref(false);
const showDetailModal = ref(false);
const selectedRequest = ref(null);
const filterStatus = ref('');
const saving = ref(false);
const descriptionRequired = ref(false);
const file = ref(null);
const calculatedDays = ref(0);
const calculatedHours = ref(0);
const conflictWarning = ref(null);
const manualDaysInput = ref(null);
const weekendDaysInRange = ref(0);
const totalCalendarDays = ref(0);
const employeeWeekendDays = ref([0]); // Default: Pazar

// İptal talebi modalı için
const showCancellationModal = ref(false);
const cancellationRequest = ref(null);
const cancellationReason = ref('');
const cancellationSubmitting = ref(false);

// SMS kabul modalı için
const showSmsAcceptanceModal = ref(false);
const smsAcceptanceRequest = ref(null);

const form = ref({
  companyLeaveType: '',
  leaveSubType: '',
  startDate: '',
  endDate: '',
  returnDate: '',
  startTime: '',
  endTime: '',
  isHalfDay: false,
  halfDayPeriod: 'morning',
  isHourly: false,
  hours: 0,
  description: '',
});

// Bugünün tarihi
const today = computed(() => {
  const d = new Date();
  return d.toISOString().split('T')[0];
});

const todayFormatted = computed(() => {
  return formatDate(today.value);
});

// İş başı tarihi
const returnDateFormatted = computed(() => {
  if (!form.value.endDate) return '-';
  const endDate = new Date(form.value.endDate);
  endDate.setDate(endDate.getDate() + 1);
  return formatDate(endDate.toISOString().split('T')[0]);
});

// Yıllık izin mi?
const isAnnualLeave = computed(() => {
  return selectedLeaveType.value?.name?.toLowerCase().includes('yıllık');
});

// Hafta tatili günlerinin isimleri
const weekendDayNames = computed(() => {
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return employeeWeekendDays.value.map(d => dayNames[d]).join(', ');
});

const selectedLeaveType = computed(() => {
  return leaveTypes.value.find(lt => lt._id === form.value.companyLeaveType);
});

const filteredSubTypes = computed(() => {
  if (selectedLeaveType.value?.name === 'Diğer izinler') {
    return leaveSubTypes.value.filter(st => {
      // parentPermitId populate edilmiş olabilir (obje) veya sadece ID olabilir (string)
      const parentId = st.parentPermitId?._id || st.parentPermitId;
      const selectedId = selectedLeaveType.value._id;
      return parentId?.toString() === selectedId?.toString();
    });
  }
  return [];
});

const showHourlyOption = computed(() => {
  return selectedLeaveType.value?.name?.toLowerCase().includes('saatlik');
});

const showHalfDayOption = computed(() => {
  return selectedLeaveType.value?.name?.toLowerCase().includes('yarım gün yıllık izin');
});

const isSameDayRequired = computed(() => {
  return form.value.isHourly || form.value.isHalfDay;
});

const isReportLeave = computed(() => {
  return (
    selectedLeaveType.value?.name?.toLowerCase().includes('rapor') ||
    selectedLeaveType.value?.name?.toLowerCase().includes('istirahat')
  );
});

const loadLeaveTypes = async () => {
  try {
    let companyId = null;
    if (authStore.user?.company) {
      // company object veya string olabilir
      companyId =
        typeof authStore.user.company === 'object'
          ? authStore.user.company._id
          : authStore.user.company;
    }

    if (!companyId) {
      console.error('Şirket bilgisi bulunamadı');
      return;
    }

    const response = await api.get('/working-permits', {
      params: { companyId },
    });

    if (response.data.success) {
      const allPermits = response.data.data || [];
      leaveTypes.value = allPermits.filter(p => !p.parentPermitId);
      leaveSubTypes.value = allPermits.filter(p => p.parentPermitId);
    }
  } catch (error) {
    console.error('İzin türleri yüklenemedi:', error);
    leaveTypes.value = [];
    leaveSubTypes.value = [];
  }
};

// Çalışanın hafta tatili günlerini yükle
const loadEmployeeWeekendDays = async () => {
  try {
    const employeesResponse = await api.get('/employees');
    const employees = employeesResponse.data?.data || employeesResponse.data || [];
    const employee = employees.find(e => e.email === authStore.user.email);

    if (employee) {
      const weekendResponse = await api.get(`/weekend-settings/employee/${employee._id}`);
      const weekendData = weekendResponse.data?.data || weekendResponse.data;
      if (weekendData && weekendData.weekendDays) {
        employeeWeekendDays.value = weekendData.weekendDays;
      } else {
        // Şirket default'unu al
        const companyWeekendResponse = await api.get('/weekend-settings');
        const companyData = companyWeekendResponse.data?.data || companyWeekendResponse.data;
        if (companyData && companyData.weekendDays) {
          employeeWeekendDays.value = companyData.weekendDays;
        }
      }
    }
  } catch (error) {
    console.error('Hafta tatili bilgisi alınamadı:', error);
  }
};

// Başlangıç tarihi değiştiğinde
const onStartDateChange = () => {
  if (manualDaysInput.value && manualDaysInput.value > 0) {
    // Eğer gün sayısı varsa, bitiş tarihini yeniden hesapla
    calculateEndDateFromDays();
  } else {
    // Yoksa sadece calculateDays'i çağır
    calculateDays();
  }
};

// Gün sayısı değiştiğinde
const onDaysInputChange = () => {
  if (!form.value.startDate || !manualDaysInput.value || manualDaysInput.value < 1) {
    form.value.endDate = '';
    return;
  }
  calculateEndDateFromDays();
};

// Bitiş tarihi manuel olarak değiştiğinde
const onEndDateChange = () => {
  if (!form.value.startDate || !form.value.endDate) {
    manualDaysInput.value = null;
    return;
  }

  // Başlangıç ve bitiş tarihi arasındaki iş günü sayısını hesapla
  const start = new Date(form.value.startDate);
  const end = new Date(form.value.endDate);
  let currentDate = new Date(start);
  let workDays = 0;

  while (currentDate <= end) {
    if (!employeeWeekendDays.value.includes(currentDate.getDay())) {
      workDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  manualDaysInput.value = workDays;
  calculateDays();
};

// Gün bazlı girişten bitiş tarihi hesaplama (yardımcı fonksiyon)
const calculateEndDateFromDays = () => {
  if (!form.value.startDate || !manualDaysInput.value || manualDaysInput.value < 1) {
    form.value.endDate = '';
    return;
  }

  let currentDate = new Date(form.value.startDate);
  let daysAdded = 0;

  // İş günü sayısını ekle (hafta tatilleri hariç)
  while (daysAdded < manualDaysInput.value) {
    if (!employeeWeekendDays.value.includes(currentDate.getDay())) {
      daysAdded++;
    }
    if (daysAdded < manualDaysInput.value) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  form.value.endDate = currentDate.toISOString().split('T')[0];
  calculateDays();
};

const loadRequests = async () => {
  try {
    const params = {};
    if (filterStatus.value) {
      params.status = filterStatus.value;
    }
    const response = await api.get('/leave-requests', { params });
    if (response.data.success) {
      requests.value = response.data.data || [];
    } else {
      requests.value = [];
    }
  } catch (error) {
    console.error('Talepler yüklenemedi:', error);
    requests.value = [];
  }
};

const calculateDays = async () => {
  if (!form.value.startDate || !form.value.endDate) {
    calculatedDays.value = 0;
    weekendDaysInRange.value = 0;
    totalCalendarDays.value = 0;
    conflictWarning.value = null;
    return;
  }
  if (form.value.isHourly) {
    conflictWarning.value = null;
    return;
  }

  try {
    const employeesResponse = await api.get('/employees');
    const employee = employeesResponse.data.find(e => e.email === authStore.user.email);

    // Hafta tatili günlerini say
    const start = new Date(form.value.startDate);
    const end = new Date(form.value.endDate);
    let currentDate = new Date(start);
    let weekendCount = 0;
    let workDayCount = 0;

    while (currentDate <= end) {
      if (employeeWeekendDays.value.includes(currentDate.getDay())) {
        weekendCount++;
      } else {
        workDayCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    weekendDaysInRange.value = weekendCount;
    const diffTime = Math.abs(end - start);
    totalCalendarDays.value = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (employee) {
      const returnDate = form.value.returnDate || form.value.endDate;
      const params = {
        employeeId: employee._id,
        startDate: form.value.startDate,
        returnDate: returnDate,
        isHalfDay: form.value.isHalfDay,
        isHourly: form.value.isHourly,
        hours: form.value.hours,
      };

      const response = await api.post('/leave-requests/calculate-days', params);
      calculatedDays.value = response.data.totalDays;

      if (response.data.hasConflict && response.data.conflicts.length > 0) {
        const conflict = response.data.conflicts[0];
        conflictWarning.value = conflict.message;
      } else {
        conflictWarning.value = null;
      }
    } else {
      if (form.value.isHalfDay) {
        calculatedDays.value = 0.5;
      } else {
        calculatedDays.value = workDayCount;
      }
      conflictWarning.value = null;
    }
  } catch (error) {
    console.error('Gün hesaplanamadı:', error);
    conflictWarning.value = null;
  }
};

const calculateHours = () => {
  if (!form.value.startTime || !form.value.endTime) {
    calculatedHours.value = 0;
    return;
  }

  const start = new Date(`2000-01-01T${form.value.startTime}`);
  const end = new Date(`2000-01-01T${form.value.endTime}`);
  const diffMs = end - start;
  const diffHours = diffMs / (1000 * 60 * 60);

  calculatedHours.value = Math.abs(diffHours);
  form.value.hours = calculatedHours.value;
};

const handleHalfDayChange = () => {
  if (form.value.isHalfDay) {
    form.value.isHourly = false;
    form.value.startTime = '';
    form.value.endTime = '';
    if (form.value.startDate) {
      form.value.endDate = form.value.startDate;
    }
    calculatedDays.value = 0.5;
    conflictWarning.value = null;
  } else {
    calculateDays();
  }
};

const handleHourlyChange = () => {
  if (form.value.isHourly) {
    form.value.isHalfDay = false;
    form.value.halfDayPeriod = 'morning';
    if (form.value.startDate) {
      form.value.endDate = form.value.startDate;
    }
    calculatedDays.value = 0;
    conflictWarning.value = null;
  } else {
    calculateDays();
  }
};

const handleStartDateChange = () => {
  if (isSameDayRequired.value && form.value.startDate) {
    form.value.endDate = form.value.startDate;
  }
  calculateDays();
};

const handleLeaveTypeChange = async () => {
  checkDescriptionRequired();
  if (selectedLeaveType.value?.name !== 'Diğer izinler') {
    form.value.leaveSubType = '';
  }

  if (!showHourlyOption.value) {
    form.value.isHourly = false;
    form.value.startTime = '';
    form.value.endTime = '';
  }
  if (!showHalfDayOption.value) {
    form.value.isHalfDay = false;
    form.value.halfDayPeriod = 'morning';
  }

  if (isSameDayRequired.value && form.value.startDate) {
    form.value.endDate = form.value.startDate;
  } else {
    // Gün bazlı girişi sıfırla
    manualDaysInput.value = null;
    form.value.endDate = '';
  }
};

const checkDescriptionRequired = () => {
  const isUnpaid =
    selectedLeaveType.value?.name?.toLowerCase().includes('ücretsiz') ||
    selectedLeaveType.value?.name?.toLowerCase().includes('mazeret');
  descriptionRequired.value = isUnpaid || false;
};

const handleFileChange = event => {
  file.value = event.target.files[0];
};

const saveRequest = async () => {
  if (selectedLeaveType.value?.name === 'Diğer izinler' && !form.value.leaveSubType) {
    toast.warning('Alt izin türü seçilmelidir');
    return;
  }

  if (
    (form.value.isHourly || form.value.isHalfDay) &&
    form.value.startDate !== form.value.endDate
  ) {
    toast.warning('Saatlik ve yarım gün izinler için başlangıç ve bitiş tarihi aynı gün olmalıdır');
    return;
  }

  if (form.value.isHourly && (!form.value.startTime || !form.value.endTime)) {
    toast.warning('Saatlik izin için başlangıç ve bitiş saati gereklidir');
    return;
  }

  saving.value = true;
  try {
    const formData = new FormData();
    formData.append('companyLeaveType', form.value.companyLeaveType);
    if (form.value.leaveSubType) {
      formData.append('leaveSubType', form.value.leaveSubType);
    }
    formData.append('startDate', form.value.startDate);
    formData.append('endDate', form.value.endDate || form.value.startDate);
    if (form.value.returnDate) formData.append('returnDate', form.value.returnDate);
    formData.append('isHalfDay', form.value.isHalfDay);
    formData.append('halfDayPeriod', form.value.halfDayPeriod);
    formData.append('isHourly', form.value.isHourly);
    if (form.value.startTime) formData.append('startTime', form.value.startTime);
    if (form.value.endTime) formData.append('endTime', form.value.endTime);
    if (form.value.hours) formData.append('hours', form.value.hours);
    if (form.value.description) formData.append('description', form.value.description);
    if (file.value) formData.append('document', file.value);

    await api.post('/leave-requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    closeModal();
    loadRequests();
    toast.success('İzin talebi oluşturuldu');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  } finally {
    saving.value = false;
  }
};

const viewDetails = request => {
  selectedRequest.value = request;
  showDetailModal.value = true;
};

const cancelRequest = async request => {
  const confirmed = await confirmModal.show({
    title: 'İzin Talebi İptali',
    message: 'İzin talebini iptal etmek istediğinizden emin misiniz?',
    type: 'danger',
    confirmText: 'İptal Et',
  });
  if (!confirmed) return;

  try {
    await api.post(`/leave-requests/${request._id}/cancel`);
    loadRequests();
    toast.success('İzin talebi iptal edildi');
  } catch (error) {
    toast.error(error.response?.data?.message || error.response?.data?.error || 'Hata oluştu');
  }
};

const canCancel = request => {
  return request.status === 'PENDING' || request.status === 'IN_PROGRESS';
};

// Onaylanmış izin için iptal talebi gönderilebilir mi?
const canRequestCancellation = request => {
  // Sadece APPROVED durumundaki izinler için iptal talebi gönderilebilir
  if (request.status !== 'APPROVED') return false;

  // İzin bitiş tarihinden itibaren 6 ay içinde iptal talebi gönderilebilir
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(request.endDate);
  endDate.setHours(0, 0, 0, 0);

  // 6 ay öncesinin tarihini hesapla
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return endDate >= sixMonthsAgo;
};

// İptal talebi modalını aç
const openCancellationModal = request => {
  cancellationRequest.value = request;
  cancellationReason.value = '';
  showCancellationModal.value = true;
};

// İptal talebi modalını kapat
const closeCancellationModal = () => {
  showCancellationModal.value = false;
  cancellationRequest.value = null;
  cancellationReason.value = '';
};

// İptal talebi gönder
const submitCancellationRequest = async () => {
  if (!cancellationReason.value || !cancellationRequest.value) {
    toast.warning('İptal nedeni zorunludur');
    return;
  }

  cancellationSubmitting.value = true;
  try {
    await api.post(`/leave-requests/${cancellationRequest.value._id}/request-cancellation`, {
      reason: cancellationReason.value,
    });

    closeCancellationModal();
    loadRequests();
    toast.success('İptal talebi gönderildi');
  } catch (error) {
    toast.error(error.response?.data?.message || 'İptal talebi gönderilemedi');
  } finally {
    cancellationSubmitting.value = false;
  }
};

// SMS ile izin kabul fonksiyonları
const canAcceptLeave = request => {
  // Sadece APPROVED durumundaki ve henüz kabul edilmemiş izinler için
  if (request.status !== 'APPROVED') return false;
  const acceptanceStatus = request.employeeAcceptance?.status;
  return acceptanceStatus === 'PENDING' || !acceptanceStatus || acceptanceStatus === 'NOT_REQUIRED';
};

const getAcceptanceStatusText = request => {
  const status = request.employeeAcceptance?.status;
  if (status === 'ACCEPTED') return 'Kabul Edildi';
  if (status === 'PENDING') return 'Kabul Bekliyor';
  return null;
};

const openSmsAcceptanceModal = request => {
  smsAcceptanceRequest.value = request;
  showSmsAcceptanceModal.value = true;
};

const closeSmsAcceptanceModal = () => {
  showSmsAcceptanceModal.value = false;
  smsAcceptanceRequest.value = null;
};

const sendAcceptanceCode = async () => {
  if (!smsAcceptanceRequest.value) {
    throw new Error('İzin talebi bulunamadı');
  }

  const response = await api.post(
    `/leave-requests/${smsAcceptanceRequest.value._id}/request-acceptance-code`
  );
  return {
    verificationId: response.data.verificationId,
    maskedPhone: response.data.maskedPhone,
    expiresAt: response.data.expiresAt,
  };
};

const acceptLeave = async (code, verificationId) => {
  if (!smsAcceptanceRequest.value) {
    throw new Error('İzin talebi bulunamadı');
  }

  const response = await api.post(
    `/leave-requests/${smsAcceptanceRequest.value._id}/accept-leave`,
    {
      code,
      verificationId,
    }
  );
  return response.data;
};

const onLeaveAccepted = () => {
  closeSmsAcceptanceModal();
  loadRequests();
  toast.success('İzin kabul edildi');
};

const onSmsAcceptanceError = errorMessage => {
  toast.error(errorMessage);
};

const resetForm = () => {
  form.value = {
    companyLeaveType: '',
    leaveSubType: '',
    startDate: today.value,
    endDate: '',
    returnDate: '',
    startTime: '',
    endTime: '',
    isHalfDay: false,
    halfDayPeriod: 'morning',
    isHourly: false,
    hours: 0,
    description: '',
  };
  file.value = null;
  calculatedDays.value = 0;
  calculatedHours.value = 0;
  descriptionRequired.value = false;
  conflictWarning.value = null;
  manualDaysInput.value = null;
  weekendDaysInRange.value = 0;
  totalCalendarDays.value = 0;
};

const closeModal = () => {
  showModal.value = false;
  resetForm();
};

// Sıralama fonksiyonları
const toggleSort = field => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
};

const sortedRequests = computed(() => {
  if (!requests.value || requests.value.length === 0) return [];

  return [...requests.value].sort((a, b) => {
    let aVal, bVal;

    switch (sortField.value) {
      case 'leaveType':
        aVal = a.leaveSubType?.name || a.companyLeaveType?.name || a.type || '';
        bVal = b.leaveSubType?.name || b.companyLeaveType?.name || b.type || '';
        break;
      case 'startDate':
        aVal = new Date(a.startDate);
        bVal = new Date(b.startDate);
        break;
      case 'endDate':
        aVal = new Date(a.endDate);
        bVal = new Date(b.endDate);
        break;
      case 'totalDays':
        aVal = a.totalDays || 0;
        bVal = b.totalDays || 0;
        break;
      case 'status':
        aVal = a.status || '';
        bVal = b.status || '';
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });
});

const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('tr-TR');
};

const getStatusText = status => {
  const statusMap = {
    PENDING: 'Bekliyor',
    IN_PROGRESS: 'Onay Sürecinde',
    APPROVED: 'Onaylandı',
    REJECTED: 'Reddedildi',
    CANCELLED: 'İptal Edildi',
    CANCELLATION_REQUESTED: 'İptal Talebi',
  };
  return statusMap[status] || status;
};

onMounted(async () => {
  await loadRequests();
  await loadLeaveTypes();
  await loadEmployeeWeekendDays();
  // Bugünün tarihini başlangıç tarihi olarak set et
  form.value.startDate = today.value;
});

watch(() => form.value.isHalfDay, handleHalfDayChange);
watch(() => form.value.isHourly, handleHourlyChange);
watch(() => form.value.startTime, calculateHours);
watch(() => form.value.endTime, calculateHours);
watch(selectedLeaveType, handleLeaveTypeChange);
</script>

<style scoped></style>
