<template>
  <div class="p-6">
    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select
            v-model="filters.status"
            @change="fetchData"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tumu</option>
            <option value="active">Aktif</option>
            <option value="pending_payment">Odeme Bekliyor</option>
            <option value="expired">Suresi Dolmus</option>
            <option value="suspended">Askiya Alinmis</option>
            <option value="trial">Deneme</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Faturalama Tipi</label>
          <select
            v-model="filters.billingType"
            @change="fetchData"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tumu</option>
            <option value="monthly">Aylik</option>
            <option value="yearly">Yillik</option>
            <option value="unlimited">Sinirsiz</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Sure Uyarisi</label>
          <select
            v-model="filters.expiringDays"
            @change="fetchData"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tumu</option>
            <option value="7">7 gun icinde</option>
            <option value="14">14 gun icinde</option>
            <option value="30">30 gun icinde</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            @click="clearFilters"
            class="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>
    </div>

    <!-- Istatistikler -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-3xl font-bold text-blue-600">{{ stats.totalCompanies || 0 }}</div>
        <div class="text-sm text-gray-600">Toplam Sirket</div>
      </div>
      <div class="bg-green-50 rounded-lg shadow p-4">
        <div class="text-3xl font-bold text-green-600">{{ stats.activeSubscriptions || 0 }}</div>
        <div class="text-sm text-green-600">Aktif Abonelik</div>
      </div>
      <div class="bg-yellow-50 rounded-lg shadow p-4">
        <div class="text-3xl font-bold text-yellow-600">{{ stats.pendingPayments || 0 }}</div>
        <div class="text-sm text-yellow-600">Odeme Bekliyor</div>
      </div>
      <div class="bg-red-50 rounded-lg shadow p-4">
        <div class="text-3xl font-bold text-red-600">{{ stats.expiringSoon || 0 }}</div>
        <div class="text-sm text-red-600">Suresi Yaklasiyor</div>
      </div>
      <div class="bg-purple-50 rounded-lg shadow p-4">
        <div class="text-3xl font-bold text-purple-600">
          {{ formatCurrency(stats.totalMonthlyRevenue || 0) }}
        </div>
        <div class="text-sm text-purple-600">Aylik Gelir</div>
      </div>
    </div>

    <!-- Sirket Listesi -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="px-6 py-4 border-b flex justify-between items-center">
        <h2 class="text-lg font-semibold text-gray-800">Sirket Abonelikleri</h2>
      </div>

      <div v-if="loading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-gray-500">Yukleniyor...</p>
      </div>

      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Sirket
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Durum
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Faturalama
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Bitis Tarihi
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Ucret
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Odeme
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Islemler
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="company in companies" :key="company._id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ company.name }}</div>
              <div class="text-sm text-gray-500">{{ company.contactEmail }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="getStatusClass(company.subscription?.status)"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ getStatusLabel(company.subscription?.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ getBillingTypeLabel(company.subscription?.billingType) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span v-if="company.subscription?.billingType === 'unlimited'" class="text-blue-600"
                >Sinirsiz</span
              >
              <span
                v-else-if="company.subscription?.endDate"
                :class="getDateClass(company.subscription.endDate)"
              >
                {{ formatDate(company.subscription.endDate) }}
                <span
                  v-if="getDaysRemaining(company.subscription.endDate) <= 30"
                  class="block text-xs"
                >
                  ({{ getDaysRemaining(company.subscription.endDate) }} gun kaldi)
                </span>
              </span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatCurrency(company.subscription?.price || 0) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span v-if="company.subscription?.isPaid" class="text-green-600 text-sm">Odendi</span>
              <span v-else class="text-red-600 text-sm">Odenmedi</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <button
                @click="openActivateModal(company)"
                class="text-blue-600 hover:text-blue-900"
                title="Abonelik Baslat/Guncelle"
              >
                Aktifle
              </button>
              <button
                v-if="
                  company.subscription?.status === 'active' &&
                  company.subscription?.billingType !== 'unlimited'
                "
                @click="openExtendModal(company)"
                class="text-green-600 hover:text-green-900"
                title="Sure Uzat"
              >
                Uzat
              </button>
              <button
                v-if="!company.subscription?.isPaid"
                @click="openPaymentModal(company)"
                class="text-purple-600 hover:text-purple-900"
                title="Odeme Al"
              >
                Odeme
              </button>
              <button
                v-if="company.subscription?.status === 'active'"
                @click="openSuspendModal(company)"
                class="text-red-600 hover:text-red-900"
                title="Askiya Al"
              >
                Askiya Al
              </button>
              <button
                @click="openHistoryModal(company)"
                class="text-gray-600 hover:text-gray-900"
                title="Gecmis"
              >
                Gecmis
              </button>
            </td>
          </tr>
          <tr v-if="companies.length === 0">
            <td colspan="7" class="px-6 py-8 text-center text-gray-500">Sirket bulunamadi</td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="pagination.pages > 1" class="px-6 py-4 border-t flex items-center justify-between">
        <div class="text-sm text-gray-500">Toplam {{ pagination.total }} kayit</div>
        <div class="flex gap-2">
          <button
            v-for="page in pagination.pages"
            :key="page"
            @click="goToPage(page)"
            :class="
              page === pagination.page
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            "
            class="px-3 py-1 rounded"
          >
            {{ page }}
          </button>
        </div>
      </div>
    </div>

    <!-- Abonelik Aktifle/Guncelle Modal -->
    <div
      v-if="showActivateModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Abonelik Baslat/Guncelle</h2>
        <p class="text-gray-600 mb-4">{{ selectedCompany?.name }}</p>

        <form @submit.prevent="activateSubscription">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Faturalama Tipi *</label>
              <select
                v-model="activateForm.billingType"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Aylik</option>
                <option value="yearly">Yillik</option>
                <option value="unlimited">Sinirsiz</option>
              </select>
            </div>

            <div v-if="activateForm.billingType !== 'unlimited'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Ucret (TRY)</label>
              <input
                v-model.number="activateForm.price"
                type="number"
                min="0"
                step="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div v-if="activateForm.billingType !== 'unlimited'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Baslangic Tarihi</label>
              <input
                v-model="activateForm.startDate"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="flex items-center">
                <input
                  v-model="activateForm.autoRenew"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600"
                />
                <span class="ml-2 text-sm text-gray-700">Otomatik Yenileme</span>
              </label>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea
                v-model="activateForm.notes"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showActivateModal = false"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Iptal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Sure Uzatma Modal -->
    <div
      v-if="showExtendModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Abonelik Suresi Uzat</h2>
        <p class="text-gray-600 mb-2">{{ selectedCompany?.name }}</p>
        <p class="text-sm text-gray-500 mb-4">
          Mevcut bitis: {{ formatDate(selectedCompany?.subscription?.endDate) }}
        </p>

        <form @submit.prevent="extendSubscription">
          <div class="space-y-4">
            <div v-if="selectedCompany?.subscription?.billingType === 'monthly'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Kac Ay Uzatilsin?</label>
              <select
                v-model.number="extendForm.months"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1 Ay</option>
                <option value="2">2 Ay</option>
                <option value="3">3 Ay</option>
                <option value="6">6 Ay</option>
                <option value="12">12 Ay</option>
              </select>
            </div>

            <div v-if="selectedCompany?.subscription?.billingType === 'yearly'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Kac Yil Uzatilsin?</label>
              <select
                v-model.number="extendForm.years"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1 Yil</option>
                <option value="2">2 Yil</option>
                <option value="3">3 Yil</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ucret (TRY)</label>
              <input
                v-model.number="extendForm.price"
                type="number"
                min="0"
                step="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea
                v-model="extendForm.notes"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showExtendModal = false"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Iptal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {{ saving ? 'Uzatiliyor...' : 'Uzat' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Odeme Modal -->
    <div
      v-if="showPaymentModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Odeme Kaydet</h2>
        <p class="text-gray-600 mb-4">{{ selectedCompany?.name }}</p>

        <form @submit.prevent="recordPayment">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Odeme Tutari (TRY) *</label
              >
              <input
                v-model.number="paymentForm.amount"
                type="number"
                min="0"
                step="0.01"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea
                v-model="paymentForm.notes"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showPaymentModal = false"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Iptal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {{ saving ? 'Kaydediliyor...' : 'Odeme Kaydet' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Askiya Alma Modal -->
    <div
      v-if="showSuspendModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4 text-red-600">Aboneligi Askiya Al</h2>
        <p class="text-gray-600 mb-4">{{ selectedCompany?.name }}</p>
        <p class="text-sm text-yellow-600 bg-yellow-50 p-3 rounded mb-4">
          Dikkat: Abonelik askiya alindiginda sirket sistemi kullanamiyor olacak.
        </p>

        <form @submit.prevent="suspendSubscription">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Askiya Alma Nedeni</label>
              <textarea
                v-model="suspendForm.reason"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ornegin: Odeme yapilmadi..."
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showSuspendModal = false"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Iptal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {{ saving ? 'Islem yapiliyor...' : 'Askiya Al' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Gecmis Modal -->
    <div
      v-if="showHistoryModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Abonelik Gecmisi</h2>
          <button @click="showHistoryModal = false" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p class="text-gray-600 mb-4">{{ selectedCompany?.name }}</p>

        <div v-if="historyLoading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>

        <div v-else-if="subscriptionHistory.length === 0" class="text-center py-8 text-gray-500">
          Gecmis kaydi bulunamadi
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(item, index) in subscriptionHistory"
            :key="index"
            class="border rounded-lg p-3"
          >
            <div class="flex justify-between items-start">
              <div>
                <span
                  :class="getActionClass(item.action)"
                  class="px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ getActionLabel(item.action) }}
                </span>
                <span class="text-sm text-gray-500 ml-2">{{ formatDateTime(item.date) }}</span>
              </div>
              <span v-if="item.amount" class="text-sm font-medium text-green-600">
                {{ formatCurrency(item.amount) }}
              </span>
            </div>
            <p v-if="item.note" class="text-sm text-gray-600 mt-2">{{ item.note }}</p>
            <div v-if="item.previousEndDate && item.newEndDate" class="text-xs text-gray-500 mt-1">
              {{ formatDate(item.previousEndDate) }} → {{ formatDate(item.newEndDate) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import { useToastStore } from '@/stores/toast';

const toast = useToastStore();

const loading = ref(false);
const saving = ref(false);
const historyLoading = ref(false);
const companies = ref([]);
const stats = ref({});
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 });

const filters = ref({
  status: '',
  billingType: '',
  expiringDays: '',
});

// Modals
const showActivateModal = ref(false);
const showExtendModal = ref(false);
const showPaymentModal = ref(false);
const showSuspendModal = ref(false);
const showHistoryModal = ref(false);

const selectedCompany = ref(null);
const subscriptionHistory = ref([]);

// Forms
const activateForm = ref({
  billingType: 'monthly',
  price: 0,
  startDate: new Date().toISOString().split('T')[0],
  autoRenew: false,
  notes: '',
});

const extendForm = ref({
  months: 1,
  years: 1,
  price: 0,
  notes: '',
});

const paymentForm = ref({
  amount: 0,
  notes: '',
});

const suspendForm = ref({
  reason: '',
});

// Helpers
const formatDate = date => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('tr-TR');
};

const formatDateTime = date => {
  if (!date) return '-';
  return new Date(date).toLocaleString('tr-TR');
};

const formatCurrency = amount => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0);
};

const getDaysRemaining = endDate => {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

const getStatusLabel = status => {
  const labels = {
    active: 'Aktif',
    pending_payment: 'Odeme Bekliyor',
    expired: 'Suresi Dolmus',
    suspended: 'Askida',
    trial: 'Deneme',
  };
  return labels[status] || status || 'Belirsiz';
};

const getStatusClass = status => {
  const classes = {
    active: 'bg-green-100 text-green-800',
    pending_payment: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-800',
    suspended: 'bg-gray-100 text-gray-800',
    trial: 'bg-blue-100 text-blue-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
};

const getBillingTypeLabel = type => {
  const labels = {
    monthly: 'Aylik',
    yearly: 'Yillik',
    unlimited: 'Sinirsiz',
  };
  return labels[type] || type || '-';
};

const getDateClass = endDate => {
  const days = getDaysRemaining(endDate);
  if (days <= 7) return 'text-red-600 font-medium';
  if (days <= 30) return 'text-yellow-600';
  return 'text-gray-900';
};

const getActionLabel = action => {
  const labels = {
    created: 'Olusturuldu',
    renewed: 'Yenilendi',
    extended: 'Uzatildi',
    expired: 'Suresi Doldu',
    suspended: 'Askiya Alindi',
    activated: 'Aktiflestirildi',
    payment_received: 'Odeme Alindi',
    warning_sent: 'Uyari Gonderildi',
  };
  return labels[action] || action;
};

const getActionClass = action => {
  const classes = {
    created: 'bg-blue-100 text-blue-800',
    renewed: 'bg-green-100 text-green-800',
    extended: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    suspended: 'bg-gray-100 text-gray-800',
    activated: 'bg-green-100 text-green-800',
    payment_received: 'bg-purple-100 text-purple-800',
    warning_sent: 'bg-yellow-100 text-yellow-800',
  };
  return classes[action] || 'bg-gray-100 text-gray-800';
};

// API Calls
const fetchData = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (filters.value.status) params.append('status', filters.value.status);
    if (filters.value.billingType) params.append('billingType', filters.value.billingType);
    if (filters.value.expiringDays) params.append('expiringDays', filters.value.expiringDays);
    params.append('page', pagination.value.page);
    params.append('limit', pagination.value.limit);

    const response = await api.get(`/company-subscriptions?${params.toString()}`);
    const data = response.data?.data || response.data;

    companies.value = data?.companies || [];
    pagination.value = data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 };
    stats.value = data?.stats || {};
  } catch (error) {
    console.error('Veri yuklenirken hata:', error);
    toast.error('Veriler yuklenirken hata olustu');
  } finally {
    loading.value = false;
  }
};

const clearFilters = () => {
  filters.value = { status: '', billingType: '', expiringDays: '' };
  pagination.value.page = 1;
  fetchData();
};

const goToPage = page => {
  pagination.value.page = page;
  fetchData();
};

// Modal Operations
const openActivateModal = company => {
  selectedCompany.value = company;
  activateForm.value = {
    billingType: company.subscription?.billingType || 'monthly',
    price: company.subscription?.price || 0,
    startDate: new Date().toISOString().split('T')[0],
    autoRenew: company.subscription?.autoRenew || false,
    notes: '',
  };
  showActivateModal.value = true;
};

const openExtendModal = company => {
  selectedCompany.value = company;
  extendForm.value = {
    months: 1,
    years: 1,
    price: company.subscription?.price || 0,
    notes: '',
  };
  showExtendModal.value = true;
};

const openPaymentModal = company => {
  selectedCompany.value = company;
  paymentForm.value = {
    amount: company.subscription?.price || 0,
    notes: '',
  };
  showPaymentModal.value = true;
};

const openSuspendModal = company => {
  selectedCompany.value = company;
  suspendForm.value = { reason: '' };
  showSuspendModal.value = true;
};

const openHistoryModal = async company => {
  selectedCompany.value = company;
  showHistoryModal.value = true;
  historyLoading.value = true;

  try {
    const response = await api.get(`/company-subscriptions/${company._id}/history`);
    subscriptionHistory.value = response.data?.data?.history || response.data?.history || [];
  } catch (error) {
    console.error('Gecmis yuklenirken hata:', error);
    subscriptionHistory.value = [];
  } finally {
    historyLoading.value = false;
  }
};

// Actions
const activateSubscription = async () => {
  saving.value = true;
  try {
    await api.post(
      `/company-subscriptions/${selectedCompany.value._id}/activate`,
      activateForm.value
    );
    toast.success('Abonelik basariyla aktiflestirildi');
    showActivateModal.value = false;
    fetchData();
  } catch (error) {
    console.error('Aktiflestireme hatasi:', error);
    toast.error(error.response?.data?.message || 'Islem sirasinda hata olustu');
  } finally {
    saving.value = false;
  }
};

const extendSubscription = async () => {
  saving.value = true;
  try {
    const payload = {
      price: extendForm.value.price,
      notes: extendForm.value.notes,
    };
    if (selectedCompany.value?.subscription?.billingType === 'monthly') {
      payload.months = extendForm.value.months;
    } else {
      payload.years = extendForm.value.years;
    }

    await api.post(`/company-subscriptions/${selectedCompany.value._id}/extend`, payload);
    toast.success('Abonelik suresi uzatildi');
    showExtendModal.value = false;
    fetchData();
  } catch (error) {
    console.error('Uzatma hatasi:', error);
    toast.error(error.response?.data?.message || 'Islem sirasinda hata olustu');
  } finally {
    saving.value = false;
  }
};

const recordPayment = async () => {
  saving.value = true;
  try {
    await api.post(
      `/company-subscriptions/${selectedCompany.value._id}/payment`,
      paymentForm.value
    );
    toast.success('Odeme basariyla kaydedildi');
    showPaymentModal.value = false;
    fetchData();
  } catch (error) {
    console.error('Odeme hatasi:', error);
    toast.error(error.response?.data?.message || 'Islem sirasinda hata olustu');
  } finally {
    saving.value = false;
  }
};

const suspendSubscription = async () => {
  saving.value = true;
  try {
    await api.post(
      `/company-subscriptions/${selectedCompany.value._id}/suspend`,
      suspendForm.value
    );
    toast.success('Abonelik askiya alindi');
    showSuspendModal.value = false;
    fetchData();
  } catch (error) {
    console.error('Askiya alma hatasi:', error);
    toast.error(error.response?.data?.message || 'Islem sirasinda hata olustu');
  } finally {
    saving.value = false;
  }
};

onMounted(fetchData);
</script>
