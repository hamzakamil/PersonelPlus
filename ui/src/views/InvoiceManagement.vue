<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">e-Fatura Yönetimi</h1>
        <p class="text-gray-600 mt-1">GİB e-Fatura ve e-Arşiv fatura yönetimi</p>
      </div>
      <div class="flex gap-2">
        <button
          @click="showIntegratorTest = true"
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          <span class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Entegratör Testi
          </span>
        </button>
        <button
          v-if="selectedInvoices.length > 0"
          @click="bulkSend"
          :disabled="bulkSending"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {{ bulkSending ? 'Gönderiliyor...' : `${selectedInvoices.length} Fatura Gönder` }}
        </button>
      </div>
    </div>

    <!-- İstatistik Kartları -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Toplam Fatura</div>
        <div class="text-2xl font-bold text-gray-900">{{ stats.totalInvoices || 0 }}</div>
        <div class="text-sm text-gray-600">{{ formatCurrency(stats.totalAmount || 0) }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Taslak</div>
        <div class="text-2xl font-bold text-yellow-600">{{ stats.draftCount || 0 }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Gönderildi</div>
        <div class="text-2xl font-bold text-blue-600">{{ stats.sentCount || 0 }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Kabul Edildi</div>
        <div class="text-2xl font-bold text-green-600">{{ stats.acceptedCount || 0 }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Reddedildi</div>
        <div class="text-2xl font-bold text-red-600">{{ stats.rejectedCount || 0 }}</div>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Arama</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Fatura no veya UUID..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="draft">Taslak</option>
            <option value="sent">Gönderildi</option>
            <option value="accepted">Kabul Edildi</option>
            <option value="rejected">Reddedildi</option>
            <option value="cancelled">İptal</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fatura Tipi</label>
          <select
            v-model="filters.invoiceType"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="SATIS">Satış</option>
            <option value="IADE">İade</option>
            <option value="TEVKIFAT">Tevkifat</option>
            <option value="ISTISNA">İstisna</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
          <input
            v-model="filters.startDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
          <input
            v-model="filters.endDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Fatura Listesi -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="loading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">Yükleniyor...</p>
      </div>

      <div v-else-if="invoices.length === 0" class="p-8 text-center text-gray-500">
        Fatura bulunamadı
      </div>

      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left">
              <input
                type="checkbox"
                @change="toggleSelectAll"
                :checked="selectedInvoices.length === draftInvoices.length && draftInvoices.length > 0"
                class="rounded border-gray-300"
              />
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fatura No</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alıcı</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="invoice in invoices" :key="invoice._id" class="hover:bg-gray-50">
            <td class="px-4 py-3">
              <input
                v-if="invoice.gibStatus === 'draft'"
                type="checkbox"
                :checked="selectedInvoices.includes(invoice._id)"
                @change="toggleSelect(invoice._id)"
                class="rounded border-gray-300"
              />
            </td>
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">{{ invoice.invoiceNumber }}</div>
              <div class="text-xs text-gray-500">{{ invoice.uuid?.substring(0, 8) }}...</div>
            </td>
            <td class="px-4 py-3">
              <div class="text-sm text-gray-900">
                {{ invoice.accountingCustomerParty?.party?.partyName || '-' }}
              </div>
              <div class="text-xs text-gray-500">
                {{ invoice.accountingCustomerParty?.party?.partyIdentification?.id || '-' }}
              </div>
            </td>
            <td class="px-4 py-3">
              <span :class="getInvoiceTypeClass(invoice.invoiceTypeCode)" class="px-2 py-1 text-xs rounded-full">
                {{ getInvoiceTypeLabel(invoice.invoiceTypeCode) }}
              </span>
              <div v-if="invoice.isEArchive" class="text-xs text-purple-600 mt-1">e-Arşiv</div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">
              {{ formatDate(invoice.issueDate) }}
            </td>
            <td class="px-4 py-3 text-right">
              <div class="font-medium text-gray-900">
                {{ formatCurrency(invoice.legalMonetaryTotal?.payableAmount) }}
              </div>
              <div class="text-xs text-gray-500">
                KDV: {{ formatCurrency(invoice.taxTotal?.taxAmount) }}
              </div>
            </td>
            <td class="px-4 py-3 text-center">
              <span :class="getStatusClass(invoice.gibStatus)" class="px-2 py-1 text-xs rounded-full">
                {{ getStatusLabel(invoice.gibStatus) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-1">
                <button
                  @click="viewInvoice(invoice)"
                  class="p-1 text-gray-600 hover:text-blue-600"
                  title="Detay"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  v-if="invoice.gibStatus === 'draft'"
                  @click="sendInvoice(invoice)"
                  :disabled="sendingInvoice === invoice._id"
                  class="p-1 text-gray-600 hover:text-green-600 disabled:opacity-50"
                  title="GİB'e Gönder"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
                <button
                  v-if="['sent', 'accepted'].includes(invoice.gibStatus)"
                  @click="checkStatus(invoice)"
                  :disabled="checkingStatus === invoice._id"
                  class="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-50"
                  title="Durum Sorgula"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  @click="downloadXml(invoice)"
                  class="p-1 text-gray-600 hover:text-purple-600"
                  title="XML İndir"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </button>
                <button
                  v-if="invoice.gibStatus !== 'draft'"
                  @click="downloadPdf(invoice)"
                  class="p-1 text-gray-600 hover:text-red-600"
                  title="PDF İndir"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  v-if="!['cancelled', 'rejected'].includes(invoice.gibStatus)"
                  @click="cancelInvoice(invoice)"
                  class="p-1 text-gray-600 hover:text-red-600"
                  title="İptal Et"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="pagination.pages > 1" class="px-4 py-3 bg-gray-50 border-t flex justify-between items-center">
        <div class="text-sm text-gray-600">
          Toplam {{ pagination.total }} fatura
        </div>
        <div class="flex gap-1">
          <button
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page === 1"
            class="px-3 py-1 border rounded disabled:opacity-50"
          >
            Önceki
          </button>
          <span class="px-3 py-1">{{ pagination.page }} / {{ pagination.pages }}</span>
          <button
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page === pagination.pages"
            class="px-3 py-1 border rounded disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>

    <!-- Fatura Detay Modal -->
    <div
      v-if="selectedInvoice"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="selectedInvoice = null"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div class="p-6 border-b flex justify-between items-center">
          <h2 class="text-xl font-bold">Fatura Detayı</h2>
          <button @click="selectedInvoice = null" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-2 gap-6">
            <!-- Fatura Bilgileri -->
            <div>
              <h3 class="font-semibold text-gray-900 mb-3">Fatura Bilgileri</h3>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-500">Fatura No:</dt>
                  <dd class="font-medium">{{ selectedInvoice.invoiceNumber }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500">UUID:</dt>
                  <dd class="font-mono text-xs">{{ selectedInvoice.uuid }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500">Tip:</dt>
                  <dd>{{ getInvoiceTypeLabel(selectedInvoice.invoiceTypeCode) }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500">Profil:</dt>
                  <dd>{{ selectedInvoice.profileId }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500">Tarih:</dt>
                  <dd>{{ formatDate(selectedInvoice.issueDate) }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500">Durum:</dt>
                  <dd>
                    <span :class="getStatusClass(selectedInvoice.gibStatus)" class="px-2 py-1 text-xs rounded-full">
                      {{ getStatusLabel(selectedInvoice.gibStatus) }}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Tutar Bilgileri -->
            <div>
              <h3 class="font-semibold text-gray-900 mb-3">Tutar Bilgileri</h3>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-500">Mal/Hizmet Toplamı:</dt>
                  <dd>{{ formatCurrency(selectedInvoice.legalMonetaryTotal?.lineExtensionAmount) }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500">KDV:</dt>
                  <dd>{{ formatCurrency(selectedInvoice.taxTotal?.taxAmount) }}</dd>
                </div>
                <div class="flex justify-between border-t pt-2">
                  <dt class="text-gray-900 font-medium">Toplam:</dt>
                  <dd class="font-bold">{{ formatCurrency(selectedInvoice.legalMonetaryTotal?.payableAmount) }}</dd>
                </div>
              </dl>
            </div>

            <!-- Satıcı Bilgileri -->
            <div>
              <h3 class="font-semibold text-gray-900 mb-3">Satıcı</h3>
              <dl class="space-y-1 text-sm">
                <dd class="font-medium">{{ selectedInvoice.accountingSupplierParty?.party?.partyName }}</dd>
                <dd class="text-gray-500">
                  VKN: {{ selectedInvoice.accountingSupplierParty?.party?.partyIdentification?.id }}
                </dd>
                <dd class="text-gray-500">
                  {{ selectedInvoice.accountingSupplierParty?.party?.postalAddress?.cityName }}
                </dd>
              </dl>
            </div>

            <!-- Alıcı Bilgileri -->
            <div>
              <h3 class="font-semibold text-gray-900 mb-3">Alıcı</h3>
              <dl class="space-y-1 text-sm">
                <dd class="font-medium">{{ selectedInvoice.accountingCustomerParty?.party?.partyName }}</dd>
                <dd class="text-gray-500">
                  VKN: {{ selectedInvoice.accountingCustomerParty?.party?.partyIdentification?.id }}
                </dd>
                <dd class="text-gray-500">
                  {{ selectedInvoice.accountingCustomerParty?.party?.postalAddress?.cityName }}
                </dd>
              </dl>
            </div>
          </div>

          <!-- Fatura Kalemleri -->
          <div class="mt-6">
            <h3 class="font-semibold text-gray-900 mb-3">Fatura Kalemleri</h3>
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-2 text-left">Ürün/Hizmet</th>
                  <th class="px-3 py-2 text-right">Miktar</th>
                  <th class="px-3 py-2 text-right">Birim Fiyat</th>
                  <th class="px-3 py-2 text-right">KDV</th>
                  <th class="px-3 py-2 text-right">Toplam</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="line in selectedInvoice.invoiceLines" :key="line.lineId">
                  <td class="px-3 py-2">{{ line.item?.name }}</td>
                  <td class="px-3 py-2 text-right">{{ line.quantity?.value }} {{ line.quantity?.unitCode }}</td>
                  <td class="px-3 py-2 text-right">{{ formatCurrency(line.price?.priceAmount) }}</td>
                  <td class="px-3 py-2 text-right">{{ formatCurrency(line.taxTotal?.taxAmount) }}</td>
                  <td class="px-3 py-2 text-right font-medium">{{ formatCurrency(line.lineExtensionAmount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- GİB Yanıtı -->
          <div v-if="selectedInvoice.gibResponse?.ettn" class="mt-6">
            <h3 class="font-semibold text-gray-900 mb-3">GİB Yanıtı</h3>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">ETTN:</dt>
                <dd class="font-mono">{{ selectedInvoice.gibResponse.ettn }}</dd>
              </div>
              <div v-if="selectedInvoice.gibResponse.statusDescription" class="flex justify-between">
                <dt class="text-gray-500">Açıklama:</dt>
                <dd>{{ selectedInvoice.gibResponse.statusDescription }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <!-- Entegratör Test Modal -->
    <div
      v-if="showIntegratorTest"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showIntegratorTest = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div class="p-6 border-b">
          <h2 class="text-xl font-bold">Entegratör Bağlantı Testi</h2>
        </div>
        <div class="p-6">
          <div v-if="testingIntegrators" class="text-center py-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-2 text-gray-600">Test ediliyor...</p>
          </div>
          <div v-else-if="integratorTestResults">
            <div v-for="(result, name) in integratorTestResults" :key="name" class="mb-4 p-4 border rounded-lg">
              <div class="flex justify-between items-center">
                <span class="font-medium capitalize">{{ name }}</span>
                <span :class="result.success ? 'text-green-600' : 'text-red-600'">
                  {{ result.success ? '✓ Başarılı' : '✗ Başarısız' }}
                </span>
              </div>
              <div v-if="result.latency" class="text-sm text-gray-500 mt-1">
                Gecikme: {{ result.latency }}ms
              </div>
              <div v-if="!result.success" class="text-sm text-red-600 mt-1">
                {{ result.message }}
              </div>
            </div>
          </div>
          <button
            @click="testIntegrators"
            :disabled="testingIntegrators"
            class="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ testingIntegrators ? 'Test Ediliyor...' : 'Testi Başlat' }}
          </button>
        </div>
      </div>
    </div>

    <!-- İptal Modal -->
    <div
      v-if="cancellingInvoice"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6 border-b">
          <h2 class="text-xl font-bold">Fatura İptal</h2>
        </div>
        <div class="p-6">
          <p class="text-gray-600 mb-4">
            <strong>{{ cancellingInvoice.invoiceNumber }}</strong> numaralı faturayı iptal etmek üzeresiniz.
          </p>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">İptal Nedeni *</label>
            <textarea
              v-model="cancelReason"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="İptal nedenini yazın..."
            ></textarea>
          </div>
          <div class="flex gap-2">
            <button
              @click="cancellingInvoice = null; cancelReason = ''"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Vazgeç
            </button>
            <button
              @click="confirmCancel"
              :disabled="!cancelReason || processingCancel"
              class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {{ processingCancel ? 'İşleniyor...' : 'İptal Et' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/services/api'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const toast = useToastStore()
const confirmModal = useConfirmStore()
const loading = ref(false)
const invoices = ref([])
const stats = ref({})
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 })

const filters = ref({
  search: '',
  status: '',
  invoiceType: '',
  startDate: '',
  endDate: ''
})

const selectedInvoices = ref([])
const selectedInvoice = ref(null)
const sendingInvoice = ref(null)
const checkingStatus = ref(null)
const bulkSending = ref(false)

const showIntegratorTest = ref(false)
const testingIntegrators = ref(false)
const integratorTestResults = ref(null)

const cancellingInvoice = ref(null)
const cancelReason = ref('')
const processingCancel = ref(false)

const draftInvoices = computed(() => invoices.value.filter(i => i.gibStatus === 'draft'))

const fetchInvoices = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...filters.value
    }

    // Boş filtreleri kaldır
    Object.keys(params).forEach(key => {
      if (!params[key]) delete params[key]
    })

    const response = await api.get('/invoices', { params })
    invoices.value = response.data.data.invoices
    pagination.value = response.data.data.pagination

    // Stats'ı dönüştür
    const statsData = response.data.data.stats || {}
    stats.value = {
      totalInvoices: Object.values(statsData).reduce((sum, s) => sum + (s.count || 0), 0),
      totalAmount: Object.values(statsData).reduce((sum, s) => sum + (s.totalAmount || 0), 0),
      draftCount: statsData.draft?.count || 0,
      sentCount: statsData.sent?.count || 0,
      acceptedCount: statsData.accepted?.count || 0,
      rejectedCount: statsData.rejected?.count || 0,
      cancelledCount: statsData.cancelled?.count || 0
    }
  } catch (error) {
    console.error('Fatura listesi hatası:', error)
  } finally {
    loading.value = false
  }
}

const changePage = (page) => {
  pagination.value.page = page
  fetchInvoices()
}

const toggleSelectAll = () => {
  if (selectedInvoices.value.length === draftInvoices.value.length) {
    selectedInvoices.value = []
  } else {
    selectedInvoices.value = draftInvoices.value.map(i => i._id)
  }
}

const toggleSelect = (id) => {
  const index = selectedInvoices.value.indexOf(id)
  if (index > -1) {
    selectedInvoices.value.splice(index, 1)
  } else {
    selectedInvoices.value.push(id)
  }
}

const viewInvoice = async (invoice) => {
  try {
    const response = await axios.get(`/api/invoices/${invoice._id}`)
    selectedInvoice.value = response.data.data
  } catch (error) {
    console.error('Fatura detay hatası:', error)
    toast.error('Fatura detayı yüklenemedi')
  }
}

const sendInvoice = async (invoice) => {
  const confirmed = await confirmModal.show({
    title: 'Faturayı Gönder',
    message: `${invoice.invoiceNumber} numaralı faturayı GİB'e göndermek istediğinize emin misiniz?`,
    type: 'info',
    confirmText: 'Gönder'
  })
  if (!confirmed) return

  sendingInvoice.value = invoice._id
  try {
    await axios.post(`/api/invoices/${invoice._id}/send`)
    fetchInvoices()
    toast.success('Fatura başarıyla gönderildi')
  } catch (error) {
    console.error('Fatura gönderim hatası:', error)
    toast.error(error.response?.data?.message || 'Fatura gönderilemedi')
  } finally {
    sendingInvoice.value = null
  }
}

const checkStatus = async (invoice) => {
  checkingStatus.value = invoice._id
  try {
    const response = await axios.post(`/api/invoices/${invoice._id}/check-status`)
    fetchInvoices()
    toast.success(`Durum: ${response.data.data.status?.statusDescription || 'Güncellendi'}`)
  } catch (error) {
    console.error('Durum sorgulama hatası:', error)
    toast.error(error.response?.data?.message || 'Durum sorgulanamadı')
  } finally {
    checkingStatus.value = null
  }
}

const bulkSend = async () => {
  const confirmed = await confirmModal.show({
    title: 'Toplu Fatura Gönderimi',
    message: `${selectedInvoices.value.length} faturayı GİB'e göndermek istediğinize emin misiniz?`,
    type: 'info',
    confirmText: 'Gönder'
  })
  if (!confirmed) return

  bulkSending.value = true
  try {
    const response = await api.post('/invoices/bulk-send', {
      invoiceIds: selectedInvoices.value
    })

    const result = response.data.data
    toast.success(`${result.success.length} fatura gönderildi, ${result.failed.length} başarısız`)

    selectedInvoices.value = []
    fetchInvoices()
  } catch (error) {
    console.error('Toplu gönderim hatası:', error)
    toast.error(error.response?.data?.message || 'Toplu gönderim başarısız')
  } finally {
    bulkSending.value = false
  }
}

const downloadXml = async (invoice) => {
  try {
    const response = await axios.get(`/api/invoices/${invoice._id}/xml`, {
      responseType: 'blob'
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${invoice.invoiceNumber}.xml`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('XML indirme hatası:', error)
    toast.error('XML indirilemedi')
  }
}

const downloadPdf = async (invoice) => {
  try {
    const response = await axios.get(`/api/invoices/${invoice._id}/pdf`, {
      responseType: 'blob'
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${invoice.invoiceNumber}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('PDF indirme hatası:', error)
    toast.error('PDF indirilemedi')
  }
}

const cancelInvoice = (invoice) => {
  cancellingInvoice.value = invoice
  cancelReason.value = ''
}

const confirmCancel = async () => {
  if (!cancelReason.value) return

  processingCancel.value = true
  try {
    await axios.post(`/api/invoices/${cancellingInvoice.value._id}/cancel`, {
      reason: cancelReason.value
    })

    cancellingInvoice.value = null
    cancelReason.value = ''
    fetchInvoices()
    toast.success('Fatura iptal edildi')
  } catch (error) {
    console.error('İptal hatası:', error)
    toast.error(error.response?.data?.message || 'Fatura iptal edilemedi')
  } finally {
    processingCancel.value = false
  }
}

const testIntegrators = async () => {
  testingIntegrators.value = true
  integratorTestResults.value = null

  try {
    const response = await api.post('/invoices/integrators/test')
    integratorTestResults.value = response.data.data
  } catch (error) {
    console.error('Entegratör test hatası:', error)
    toast.error('Test başarısız')
  } finally {
    testingIntegrators.value = false
  }
}

// Helpers
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount || 0)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

const getStatusClass = (status) => {
  const classes = {
    draft: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-blue-100 text-blue-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getStatusLabel = (status) => {
  const labels = {
    draft: 'Taslak',
    pending: 'Beklemede',
    sent: 'Gönderildi',
    accepted: 'Kabul Edildi',
    rejected: 'Reddedildi',
    cancelled: 'İptal'
  }
  return labels[status] || status
}

const getInvoiceTypeClass = (type) => {
  const classes = {
    SATIS: 'bg-blue-100 text-blue-800',
    IADE: 'bg-orange-100 text-orange-800',
    TEVKIFAT: 'bg-purple-100 text-purple-800',
    ISTISNA: 'bg-green-100 text-green-800',
    OZELMATRAH: 'bg-yellow-100 text-yellow-800',
    IHRACKAYITLI: 'bg-cyan-100 text-cyan-800'
  }
  return classes[type] || 'bg-gray-100 text-gray-800'
}

const getInvoiceTypeLabel = (type) => {
  const labels = {
    SATIS: 'Satış',
    IADE: 'İade',
    TEVKIFAT: 'Tevkifat',
    ISTISNA: 'İstisna',
    OZELMATRAH: 'Özel Matrah',
    IHRACKAYITLI: 'İhraç Kayıtlı'
  }
  return labels[type] || type
}

// Filtreleri izle
watch(filters, () => {
  pagination.value.page = 1
  fetchInvoices()
}, { deep: true })

onMounted(() => {
  fetchInvoices()
})
</script>
