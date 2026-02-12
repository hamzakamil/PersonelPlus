<template>
  <div class="p-6">
    <div class="flex justify-end items-center mb-6">
      <Button @click="showModal = true">Yeni Bayi Ekle</Button>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ara</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Bayi adı, email, telefon..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Süre Durumu</label>
          <select
            v-model="filters.timeStatus"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            <option value="expired">Süresi Dolmuş</option>
            <option value="expiring">Süresi Yakın (30 gün)</option>
            <option value="active">Aktif (30+ gün)</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            @click="resetFilters"
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
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
              <th
                class="w-16 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                No
              </th>
              <th
                class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Bayi Adı
              </th>
              <th
                class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Email
              </th>
              <th
                class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Telefon
              </th>
              <th
                class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Başlangıç
              </th>
              <th
                class="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Bitiş
              </th>
              <th
                class="w-[12%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Kalan Süre
              </th>
              <th
                class="w-[8%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Durum
              </th>
              <th
                class="w-[8%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Maks. Şirket
              </th>
              <th
                class="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="(dealer, index) in filteredDealers"
              :key="dealer._id"
              :class="{
                'bg-red-50': !dealer.isActive && index % 2 === 0,
                'bg-red-100': !dealer.isActive && index % 2 === 1,
                'bg-gray-50': dealer.isActive && index % 2 === 1,
                'bg-white': dealer.isActive && index % 2 === 0,
              }"
            >
              <td class="px-2 py-3 text-sm text-gray-900 font-medium">
                {{ index + 1 }}
              </td>
              <td class="px-2 py-3">
                <div class="text-sm font-medium text-gray-900 truncate" :title="dealer.name">
                  {{ dealer.name }}
                </div>
                <div
                  v-if="dealer.referralCode"
                  class="text-xs text-purple-600 font-mono mt-0.5"
                  :title="'Referans Kodu: ' + dealer.referralCode"
                >
                  {{ dealer.referralCode }}
                </div>
              </td>
              <td class="px-2 py-3">
                <div class="text-sm text-gray-600 truncate lowercase" :title="dealer.contactEmail">
                  {{ dealer.contactEmail || '-' }}
                </div>
              </td>
              <td class="px-2 py-3 text-sm text-gray-600">{{ dealer.contactPhone || '-' }}</td>
              <td class="px-2 py-3 text-sm text-gray-600">
                {{ formatDate(dealer.startDate || dealer.createdAt) }}
              </td>
              <td class="px-2 py-3 text-sm text-gray-600">
                {{ formatDate(dealer.endDate) }}
              </td>
              <td class="px-2 py-3">
                <div class="text-sm truncate" :title="formatRemainingTime(dealer.endDate)">
                  <span
                    :class="{
                      'text-green-600 font-semibold': getRemainingDays(dealer.endDate) > 90,
                      'text-yellow-600 font-semibold':
                        getRemainingDays(dealer.endDate) > 30 &&
                        getRemainingDays(dealer.endDate) <= 90,
                      'text-red-600 font-semibold': getRemainingDays(dealer.endDate) <= 30,
                    }"
                  >
                    {{ formatRemainingTime(dealer.endDate) }}
                  </span>
                </div>
              </td>
              <td class="px-2 py-3">
                <span
                  :class="
                    dealer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  "
                  class="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full"
                >
                  {{ dealer.isActive ? 'Aktif' : 'Pasif' }}
                </span>
              </td>
              <td class="px-2 py-3 text-sm text-gray-600 text-center">
                {{
                  dealer.maxCompanies !== null && dealer.maxCompanies !== undefined
                    ? dealer.maxCompanies
                    : '∞'
                }}
              </td>
              <td class="px-2 py-3">
                <div class="flex gap-1">
                  <button
                    @click="viewCompanies(dealer._id)"
                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="Şirketler"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </button>
                  <button
                    @click="toggleStatus(dealer)"
                    :class="
                      dealer.isActive
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-green-600 hover:bg-green-50'
                    "
                    class="p-1.5 rounded"
                    :title="dealer.isActive ? 'Pasif Yap' : 'Aktif Yap'"
                  >
                    <svg
                      v-if="dealer.isActive"
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="editDealer(dealer)"
                    class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
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
                    @click="deleteDealer(dealer._id)"
                    class="p-1.5 text-red-600 hover:bg-red-50 rounded"
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
              </td>
            </tr>
            <tr v-if="filteredDealers.length === 0">
              <td colspan="10" class="px-4 py-8 text-center text-gray-500">Kayıt bulunamadı</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Alt Bilgi -->
      <div class="p-4 bg-gray-50 border-t">
        <div class="flex justify-between items-center">
          <p class="text-sm text-gray-600">Toplam {{ filteredDealers.length }} bayi gösteriliyor</p>
          <div class="flex gap-4 text-sm text-gray-600">
            <span
              >Aktif: <strong class="text-green-600">{{ activeCount }}</strong></span
            >
            <span
              >Pasif: <strong class="text-red-600">{{ inactiveCount }}</strong></span
            >
            <span
              >Süresi Yakın: <strong class="text-yellow-600">{{ expiringCount }}</strong></span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 class="text-xl font-bold mb-4">
          {{ editingDealer ? 'Bayi Düzenle' : 'Yeni Bayi Ekle' }}
        </h2>
        <form @submit.prevent="saveDealer">
          <div class="space-y-4">
            <Input v-model="form.name" label="Bayi Adı" required uppercase />
            <div
              v-if="editingDealer && editingDealer.referralCode"
              class="bg-purple-50 p-3 rounded-lg border border-purple-200"
            >
              <label class="block text-xs font-medium text-purple-700 mb-1">Referans Kodu</label>
              <div class="flex items-center gap-2">
                <span class="text-lg font-mono font-bold text-purple-900 tracking-wider">{{
                  editingDealer.referralCode
                }}</span>
                <button
                  type="button"
                  @click="copyReferralCode(editingDealer.referralCode)"
                  class="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Kopyala
                </button>
              </div>
              <p class="text-xs text-purple-600 mt-1">
                Bu kodu paylaşarak şirketlerin bayiniz altında kayıt olmasını sağlayabilirsiniz.
              </p>
            </div>
            <Input v-model="form.contactEmail" type="email" label="İletişim Email" required />
            <Input v-model="form.contactPhone" label="Telefon" />
            <Input
              v-model="form.contactPerson"
              label="Yetkili Kişi"
              placeholder="Ad Soyad"
              uppercase
            />
            <Input
              v-model="form.taxNumber"
              label="Vergi No / TCKN"
              placeholder="Ödeme için gerekli"
            />
            <Textarea v-model="form.address" label="Adres" />
            <div class="grid grid-cols-2 gap-4">
              <Input v-model="form.city" label="Şehir" placeholder="Istanbul" uppercase />
              <Input v-model="form.zipCode" label="Posta Kodu" placeholder="34000" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Başlangıç Tarihi <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.startDate"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Bitiş Tarihi <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.endDate"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">Varsayılan: Başlangıç tarihinden 1 yıl sonra</p>
            </div>

            <div class="flex items-center">
              <input
                v-model="form.isActive"
                type="checkbox"
                id="isActive"
                class="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label for="isActive" class="text-sm font-medium text-gray-700"> Bayi Aktif </label>
            </div>

            <Input
              v-model.number="form.maxCompanies"
              type="number"
              label="Maksimum Şirket Sayısı"
              min="0"
              placeholder="Boş bırakılırsa sınırsız"
            />
            <p class="text-xs text-gray-500">
              Bu bayi için maksimum şirket sayısı. Boş bırakılırsa sınırsız şirket ekleyebilir.
            </p>

            <div v-if="!editingDealer">
              <Input v-model="form.email" type="email" label="Admin Email" required />
              <Input v-model="form.password" type="password" label="Admin Şifre" required />
            </div>

            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeModal">İptal</Button>
              <Button type="submit">Kaydet</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/services/api';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import Button from '@/components/Button.vue';
import Input from '@/components/Input.vue';
import Textarea from '@/components/Textarea.vue';

const toast = useToastStore();
const confirmModal = useConfirmStore();
const dealers = ref([]);
const showModal = ref(false);
const editingDealer = ref(null);
const filters = ref({
  search: '',
  status: '',
  timeStatus: '',
});

const form = ref({
  name: '',
  contactEmail: '',
  contactPhone: '',
  contactPerson: '',
  taxNumber: '',
  address: '',
  city: '',
  zipCode: '',
  startDate: '',
  endDate: '',
  isActive: true,
  maxCompanies: null,
  email: '',
  password: '',
});

const filteredDealers = computed(() => {
  let result = dealers.value;

  // Search filter
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    result = result.filter(
      dealer =>
        dealer.name?.toLowerCase().includes(search) ||
        dealer.contactEmail?.toLowerCase().includes(search) ||
        dealer.contactPhone?.toLowerCase().includes(search)
    );
  }

  // Status filter
  if (filters.value.status === 'active') {
    result = result.filter(d => d.isActive);
  } else if (filters.value.status === 'inactive') {
    result = result.filter(d => !d.isActive);
  }

  // Time status filter
  if (filters.value.timeStatus === 'expired') {
    result = result.filter(d => getRemainingDays(d.endDate) < 0);
  } else if (filters.value.timeStatus === 'expiring') {
    result = result.filter(
      d => getRemainingDays(d.endDate) >= 0 && getRemainingDays(d.endDate) <= 30
    );
  } else if (filters.value.timeStatus === 'active') {
    result = result.filter(d => getRemainingDays(d.endDate) > 30);
  }

  return result;
});

const activeCount = computed(() => dealers.value.filter(d => d.isActive).length);
const inactiveCount = computed(() => dealers.value.filter(d => !d.isActive).length);
const expiringCount = computed(
  () =>
    dealers.value.filter(d => {
      const days = getRemainingDays(d.endDate);
      return days >= 0 && days <= 30;
    }).length
);

const resetFilters = () => {
  filters.value = {
    search: '',
    status: '',
    timeStatus: '',
  };
};

const formatDate = date => {
  if (!date) return '—';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

const getRemainingDays = endDate => {
  if (!endDate) return 0;
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const formatRemainingTime = endDate => {
  if (!endDate) return '—';

  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end - now;

  if (diffMs < 0) {
    return 'Süresi Dolmuş';
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);

  const remainingDays = diffDays % 30;
  const remainingHours = diffHours % 24;

  if (diffMonths > 0) {
    return `${diffMonths} ay ${remainingDays} gün`;
  } else if (diffDays > 0) {
    return `${diffDays} gün ${remainingHours} saat`;
  } else {
    return `${diffHours} saat`;
  }
};

const loadDealers = async () => {
  try {
    const response = await api.get('/dealers');
    dealers.value = response.data?.data || response.data || [];
  } catch (error) {
    console.error('Bayiler yüklenemedi:', error);
    dealers.value = [];
  }
};

const saveDealer = async () => {
  try {
    // Eğer bitiş tarihi girilmemişse, başlangıç tarihinden 1 yıl sonrasını ayarla
    if (!form.value.endDate && form.value.startDate) {
      const startDate = new Date(form.value.startDate);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      form.value.endDate = endDate.toISOString().split('T')[0];
    }

    if (editingDealer.value) {
      await api.put(`/dealers/${editingDealer.value._id}`, form.value);
    } else {
      await api.post('/dealers', form.value);
    }
    closeModal();
    loadDealers();
    toast.success('Bayi kaydedildi');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  }
};

const toggleStatus = async dealer => {
  const newStatus = !dealer.isActive;
  const confirmMessage = newStatus
    ? `${dealer.name} bayisini aktif yapmak istediğinize emin misiniz?`
    : `${dealer.name} bayisini pasif yapmak istediğinize emin misiniz? Pasif bayi giriş yaptığında sadece "Hesabınız pasif durumdadır" mesajı görecektir.`;

  const confirmed = await confirmModal.show({
    title: newStatus ? 'Bayi Aktif Yap' : 'Bayi Pasif Yap',
    message: confirmMessage,
    type: 'warning',
    confirmText: newStatus ? 'Aktif Yap' : 'Pasif Yap',
  });
  if (!confirmed) return;

  try {
    await api.put(`/dealers/${dealer._id}`, {
      ...dealer,
      isActive: newStatus,
    });
    loadDealers();
    toast.success('Bayi durumu güncellendi');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Durum güncellenemedi');
  }
};

const editDealer = dealer => {
  editingDealer.value = dealer;

  // Tarihleri input[type="date"] formatına çevir
  const formatDateForInput = date => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  form.value = {
    name: dealer.name,
    contactEmail: dealer.contactEmail,
    contactPhone: dealer.contactPhone || '',
    contactPerson: dealer.contactPerson || '',
    taxNumber: dealer.taxNumber || '',
    address: dealer.address || '',
    city: dealer.city || '',
    zipCode: dealer.zipCode || '',
    startDate: formatDateForInput(dealer.startDate || dealer.createdAt),
    endDate: formatDateForInput(dealer.endDate),
    isActive: dealer.isActive !== undefined ? dealer.isActive : true,
    maxCompanies: dealer.maxCompanies || null,
    email: '',
    password: '',
  };
  showModal.value = true;
};

const deleteDealer = async id => {
  const confirmed = await confirmModal.show({
    title: 'Bayi Sil',
    message: 'Bu bayiyi silmek istediğinize emin misiniz?',
    type: 'danger',
    confirmText: 'Sil',
  });
  if (!confirmed) return;

  try {
    await api.delete(`/dealers/${id}`);
    loadDealers();
    toast.success('Bayi silindi');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Hata oluştu');
  }
};

const viewCompanies = dealerId => {
  window.location.href = '/companies?dealer=' + dealerId;
};

const copyReferralCode = code => {
  navigator.clipboard.writeText(code);
  toast.success('Referans kodu kopyalandı: ' + code);
};

const closeModal = () => {
  showModal.value = false;
  editingDealer.value = null;

  // Bugünün tarihi
  const today = new Date().toISOString().split('T')[0];
  // 1 yıl sonrası
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const endDate = oneYearLater.toISOString().split('T')[0];

  form.value = {
    name: '',
    contactEmail: '',
    contactPhone: '',
    contactPerson: '',
    taxNumber: '',
    address: '',
    city: '',
    zipCode: '',
    startDate: today,
    endDate: endDate,
    isActive: true,
    maxCompanies: null,
    email: '',
    password: '',
  };
};

onMounted(() => {
  loadDealers();

  // Modal açıldığında varsayılan tarihleri ayarla
  const today = new Date().toISOString().split('T')[0];
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const endDate = oneYearLater.toISOString().split('T')[0];

  form.value.startDate = today;
  form.value.endDate = endDate;
});
</script>
