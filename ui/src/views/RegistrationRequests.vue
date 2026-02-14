<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Kayıt Talepleri</h1>
      <div class="flex items-center gap-2 text-sm text-gray-500">
        <span
          v-if="stats.pending > 0"
          class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium"
        >
          {{ stats.pending }} bekleyen
        </span>
      </div>
    </div>

    <!-- Durum Filtreleme Tabları -->
    <div class="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="
          activeTab = tab.value;
          loadRequests();
        "
        class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
        :class="
          activeTab === tab.value
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        "
      >
        {{ tab.label }}
        <span
          v-if="tab.value === 'pending' && stats.pending > 0"
          class="ml-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full"
        >
          {{ stats.pending }}
        </span>
      </button>
    </div>

    <!-- Tablo -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-500 mt-2 text-sm">Yükleniyor...</p>
      </div>

      <div v-else-if="requests.length === 0" class="text-center py-12">
        <svg
          class="w-12 h-12 text-gray-300 mx-auto mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p class="text-gray-500">Kayıt talebi bulunamadı</p>
      </div>

      <table v-else class="min-w-full divide-y divide-gray-200 text-xs">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Ad Soyad
            </th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Firma Adı
            </th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bayi</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="request in requests" :key="request._id" class="hover:bg-gray-50">
            <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
              {{ request.fullName }}
            </td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500 lowercase">
              {{ request.user?.email }}
            </td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
              {{ request.phone || '-' }}
            </td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
              {{ request.companyName }}
            </td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
              <span v-if="request.dealer" class="text-purple-700 font-medium">{{
                request.dealer.name
              }}</span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(request.createdAt) }}
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
              <span
                v-if="request.status === 'pending' && !request.emailVerified"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
              >
                Email Doğrulama Bekliyor
              </span>
              <span
                v-else
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="statusClass(request.status)"
              >
                {{ statusLabel(request.status) }}
              </span>
            </td>
            <td class="px-3 py-3 whitespace-nowrap text-sm">
              <div class="flex gap-1">
                <template v-if="request.status === 'pending'">
                  <button
                    @click="approveRequest(request)"
                    class="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                  >
                    Onayla
                  </button>
                  <button
                    @click="openRejectModal(request)"
                    class="px-2 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                  >
                    Reddet
                  </button>
                </template>
                <div v-else class="text-gray-400 text-xs">
                  <span v-if="request.processedAt">{{ formatDate(request.processedAt) }}</span>
                  <span v-if="request.rejectionReason" class="block text-red-500 mt-1">
                    Sebep: {{ request.rejectionReason }}
                  </span>
                </div>
                <button
                  @click="deleteRequest(request)"
                  class="px-2 py-1 bg-gray-500 text-white text-xs rounded-md hover:bg-gray-600 transition-colors"
                  title="Talebi ve ilişkili kullanıcı/şirketi sil"
                >
                  Sil
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div
        v-if="pagination.totalPages > 1"
        class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200"
      >
        <div class="text-sm text-gray-700">
          Toplam <span class="font-medium">{{ pagination.total }}</span> kayıt
        </div>
        <div class="flex gap-1">
          <button
            v-for="page in pagination.totalPages"
            :key="page"
            @click="
              currentPage = page;
              loadRequests();
            "
            class="px-3 py-1 text-sm rounded-md"
            :class="
              currentPage === page
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            "
          >
            {{ page }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reddetme Modalı -->
    <div
      v-if="showRejectModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Kayıt Talebini Reddet</h3>
        <p class="text-sm text-gray-600 mb-4">
          <strong>{{ rejectingRequest?.fullName }}</strong> kullanıcısının kayıt talebini reddetmek
          üzeresiniz.
        </p>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Reddetme Sebebi (Opsiyonel)</label
          >
          <textarea
            v-model="rejectionReason"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            placeholder="Red sebebini yazın..."
          ></textarea>
        </div>
        <div class="flex justify-end gap-2">
          <button
            @click="
              showRejectModal = false;
              rejectionReason = '';
            "
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            İptal
          </button>
          <button
            @click="rejectRequest"
            :disabled="rejecting"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
          >
            {{ rejecting ? 'Reddediliyor...' : 'Reddet' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';

const toast = useToastStore();
const confirmModal = useConfirmStore();

const loading = ref(false);
const requests = ref([]);
const activeTab = ref('');
const currentPage = ref(1);
const pagination = ref({ total: 0, totalPages: 1 });
const stats = ref({ pending: 0, approved: 0, rejected: 0 });

const showRejectModal = ref(false);
const rejectingRequest = ref(null);
const rejectionReason = ref('');
const rejecting = ref(false);

const tabs = [
  { label: 'Tümü', value: '' },
  { label: 'Bekleyen', value: 'pending' },
  { label: 'Onaylanan', value: 'approved' },
  { label: 'Reddedilen', value: 'rejected' },
];

const loadRequests = async () => {
  try {
    loading.value = true;
    const params = { page: currentPage.value, limit: 20 };
    if (activeTab.value) params.status = activeTab.value;

    const response = await api.get('/registration-requests', { params });
    if (response.data.success) {
      requests.value = response.data.data?.requests || [];
      pagination.value = response.data.data?.pagination || { total: 0, totalPages: 1 };
    }
  } catch (error) {
    console.error('Kayıt talepleri yüklenemedi:', error);
    toast.error('Kayıt talepleri yüklenirken bir hata oluştu');
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const response = await api.get('/registration-requests/stats');
    if (response.data.success) {
      stats.value = response.data.data || { pending: 0, approved: 0, rejected: 0 };
    }
  } catch (error) {
    console.error('İstatistikler yüklenemedi:', error);
  }
};

const approveRequest = async request => {
  const confirmed = await confirmModal.show({
    title: 'Kayıt Onayı',
    message: `${request.fullName} kullanıcısının kayıt talebini onaylamak istediğinize emin misiniz? Kullanıcı giriş yapabilecek.`,
    type: 'success',
    confirmText: 'Onayla',
  });
  if (!confirmed) return;

  try {
    const response = await api.put(`/registration-requests/${request._id}/approve`);
    if (response.data.success) {
      toast.success('Kayıt talebi onaylandı');
      await loadRequests();
      await loadStats();
    }
  } catch (error) {
    console.error('Onaylama hatası:', error);
    toast.error(error.response?.data?.message || 'Onaylama sırasında bir hata oluştu');
  }
};

const openRejectModal = request => {
  rejectingRequest.value = request;
  rejectionReason.value = '';
  showRejectModal.value = true;
};

const rejectRequest = async () => {
  try {
    rejecting.value = true;
    const response = await api.put(`/registration-requests/${rejectingRequest.value._id}/reject`, {
      rejectionReason: rejectionReason.value,
    });
    if (response.data.success) {
      toast.success('Kayıt talebi reddedildi');
      showRejectModal.value = false;
      rejectionReason.value = '';
      rejectingRequest.value = null;
      await loadRequests();
      await loadStats();
    }
  } catch (error) {
    console.error('Reddetme hatası:', error);
    toast.error(error.response?.data?.message || 'Reddetme sırasında bir hata oluştu');
  } finally {
    rejecting.value = false;
  }
};

const deleteRequest = async request => {
  const confirmed = await confirmModal.show({
    title: 'Kayıt Talebini Sil',
    message: `${request.fullName} kullanıcısının kayıt talebini, kullanıcı hesabını ve oluşturulan şirketi kalıcı olarak silmek istediğinize emin misiniz?`,
    type: 'danger',
    confirmText: 'Tümünü Sil',
  });
  if (!confirmed) return;

  try {
    const response = await api.delete(`/registration-requests/${request._id}`);
    if (response.data.success) {
      toast.success('Kayıt talebi ve ilişkili veriler silindi');
      await loadRequests();
      await loadStats();
    }
  } catch (error) {
    console.error('Silme hatası:', error);
    toast.error(error.response?.data?.message || 'Silme sırasında bir hata oluştu');
  }
};

const statusClass = status => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const statusLabel = status => {
  switch (status) {
    case 'pending':
      return 'Bekliyor';
    case 'approved':
      return 'Onaylandı';
    case 'rejected':
      return 'Reddedildi';
    default:
      return status;
  }
};

const formatDate = date => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

onMounted(() => {
  loadRequests();
  loadStats();
});
</script>
