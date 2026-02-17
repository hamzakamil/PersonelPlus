<template>
  <div class="p-4 max-w-4xl mx-auto">
    <!-- İlk Giriş: Bilgi Tamamlama Modalı -->
    <div
      v-if="showFirstLoginModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-5 w-full max-w-sm">
        <h2 class="text-base font-bold mb-3">Hesap Bilgilerini Tamamla</h2>
        <p class="text-xs text-gray-600 mb-3">
          İlk girişinizde email adresinizi, telefon numaranızı ve şifrenizi belirlemeniz gerekmektedir.
        </p>
        <form @submit.prevent="completeFirstLogin">
          <div class="space-y-3">
            <Input
              v-model="firstLoginForm.newEmail"
              type="email"
              label="Email Adresi"
              placeholder="ornek@email.com"
              required
            />
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Telefon Numarası <span class="text-red-500">*</span></label>
              <PhoneInput v-model="firstLoginForm.newPhone" required />
            </div>
            <Input
              v-model="firstLoginForm.newPassword"
              type="password"
              label="Yeni Şifre"
              required
              minlength="6"
            />
            <Input
              v-model="firstLoginForm.confirmPassword"
              type="password"
              label="Yeni Şifre Tekrar"
              required
            />
            <div
              v-if="firstLoginForm.newPassword && firstLoginForm.confirmPassword && firstLoginForm.newPassword !== firstLoginForm.confirmPassword"
              class="text-xs text-red-600"
            >
              Şifreler eşleşmiyor
            </div>
            <p v-if="firstLoginError" class="text-xs text-red-600">{{ firstLoginError }}</p>
            <Button
              type="submit"
              size="sm"
              class="w-full"
              :disabled="
                firstLoginLoading ||
                firstLoginForm.newPassword !== firstLoginForm.confirmPassword ||
                firstLoginForm.newPassword.length < 6 ||
                !firstLoginForm.newEmail ||
                !firstLoginForm.newPhone
              "
            >
              {{ firstLoginLoading ? 'Kaydediliyor...' : 'Kaydet' }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <h1 class="text-xl font-bold mb-6">Hesabım</h1>

    <!-- Yükleniyor -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>

    <div v-else-if="employee" class="space-y-6">
      <!-- Profil Fotoğrafı -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 flex items-center gap-4">
          <div class="relative group">
            <div
              v-if="photoPreview || employee.profilePhoto"
              class="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer"
              @click="$refs.photoInput.click()"
            >
              <img :src="photoPreview || employee.profilePhoto" alt="Profil" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold border-2 border-gray-200 cursor-pointer"
              @click="$refs.photoInput.click()"
            >
              {{ employee.firstName?.charAt(0) }}{{ employee.lastName?.charAt(0) }}
            </div>
            <div
              class="absolute inset-0 w-20 h-20 rounded-full bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              @click="$refs.photoInput.click()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <h3 class="text-base font-semibold text-gray-900">{{ employee.firstName }} {{ employee.lastName }}</h3>
            <p class="text-xs text-gray-500">{{ employee.position || employee.department?.name || '' }}</p>
            <div class="flex gap-2 mt-1.5">
              <button
                v-if="!photoUploading"
                @click="$refs.photoInput.click()"
                class="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Fotoğraf Yükle
              </button>
              <span v-if="photoUploading" class="text-xs text-gray-500">Yükleniyor...</span>
              <button
                v-if="employee.profilePhoto && !photoUploading"
                @click="deletePhoto"
                class="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Sil
              </button>
            </div>
            <p class="text-[10px] text-gray-400 mt-0.5">Maks. 2MB (JPEG, PNG, WebP)</p>
          </div>
        </div>
      </div>

      <!-- Kişisel Bilgiler -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-700">Kişisel Bilgiler</h2>
          <button
            v-if="!editMode"
            @click="startEdit"
            class="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Düzenle
          </button>
        </div>
        <div class="p-5">
          <!-- Bekleyen Talep Uyarısı -->
          <div v-if="pendingRequest" class="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p class="text-sm text-yellow-800 font-medium">Bekleyen bilgi değişiklik talebiniz var</p>
            <p class="text-xs text-yellow-700 mt-1">
              Değişiklik talebiniz şirket yöneticinizin onayını bekliyor. Onaylanmadan yeni bir değişiklik talebi oluşturamazsınız.
            </p>
            <div class="mt-2 space-y-1">
              <div v-for="(change, field) in pendingRequest.changes" :key="field" class="text-xs text-yellow-700">
                <strong>{{ change.label || field }}:</strong>
                {{ change.old || '(boş)' }} → {{ change.new || '(boş)' }}
              </div>
            </div>
          </div>

          <!-- Görüntüleme Modu -->
          <div v-if="!editMode" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><p class="text-xs text-gray-500 mb-0.5">Ad Soyad</p><p class="text-sm text-gray-900">{{ employee.firstName }} {{ employee.lastName }}</p></div>
            <div><p class="text-xs text-gray-500 mb-0.5">Email</p><p class="text-sm text-gray-900">{{ userEmail || '-' }}</p></div>
            <div><p class="text-xs text-gray-500 mb-0.5">Telefon</p><p class="text-sm text-gray-900">{{ formatPhone(employee.phone) || '-' }}</p></div>
            <div><p class="text-xs text-gray-500 mb-0.5">TC Kimlik No</p><p class="text-sm text-gray-900">{{ employee.tcKimlik || '-' }}</p></div>
            <div><p class="text-xs text-gray-500 mb-0.5">Doğum Tarihi</p><p class="text-sm text-gray-900">{{ formatDate(employee.birthDate) || '-' }}</p></div>
            <div><p class="text-xs text-gray-500 mb-0.5">Doğum Yeri</p><p class="text-sm text-gray-900">{{ employee.birthPlace || '-' }}</p></div>
            <div><p class="text-xs text-gray-500 mb-0.5">Kan Grubu</p><p class="text-sm text-gray-900">{{ employee.bloodType || '-' }}</p></div>
            <div><p class="text-xs text-gray-500 mb-0.5">Askerlik Durumu</p><p class="text-sm text-gray-900">{{ employee.militaryStatus || '-' }}</p></div>
            <div><p class="text-xs text-gray-500 mb-0.5">Pasaport No</p><p class="text-sm text-gray-900">{{ employee.passportNumber || '-' }}</p></div>
          </div>

          <!-- Düzenleme Modu -->
          <div v-else>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p class="text-xs text-gray-500 mb-0.5">Ad Soyad</p><p class="text-sm text-gray-900">{{ employee.firstName }} {{ employee.lastName }}</p></div>
              <div><p class="text-xs text-gray-500 mb-0.5">Email</p><p class="text-sm text-gray-900">{{ userEmail || '-' }}</p></div>
              <div><p class="text-xs text-gray-500 mb-0.5">TC Kimlik No</p><p class="text-sm text-gray-900">{{ employee.tcKimlik || '-' }}</p></div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <PhoneInput v-model="editForm.phone" />
              </div>
              <Input v-model="editForm.birthDate" type="date" label="Doğum Tarihi" />
              <Input v-model="editForm.birthPlace" type="text" label="Doğum Yeri" placeholder="Doğum yeri" />
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Kan Grubu</label>
                <select v-model="editForm.bloodType" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seçiniz</option>
                  <option v-for="bt in bloodTypes" :key="bt" :value="bt">{{ bt }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Askerlik Durumu</label>
                <select v-model="editForm.militaryStatus" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seçiniz</option>
                  <option v-for="ms in militaryStatuses" :key="ms" :value="ms">{{ ms }}</option>
                </select>
              </div>
              <Input v-model="editForm.passportNumber" type="text" label="Pasaport No" placeholder="Pasaport numarası" />
            </div>
            <div class="flex gap-2 mt-4 justify-end">
              <Button variant="secondary" size="sm" @click="cancelEdit">İptal</Button>
              <Button size="sm" @click="submitChange" :disabled="saving">
                {{ saving ? 'Gönderiliyor...' : 'Değişiklik Talebi Gönder' }}
              </Button>
            </div>
            <p v-if="editError" class="text-xs text-red-600 mt-2">{{ editError }}</p>
            <p v-if="editSuccess" class="text-xs text-green-600 mt-2">{{ editSuccess }}</p>
          </div>
        </div>
      </div>

      <!-- İş Bilgileri (salt okunur) -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h2 class="text-sm font-semibold text-gray-700">İş Bilgileri</h2>
        </div>
        <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><p class="text-xs text-gray-500 mb-0.5">Şirket</p><p class="text-sm text-gray-900">{{ employee.company?.name || '-' }}</p></div>
          <div><p class="text-xs text-gray-500 mb-0.5">SGK İşyeri</p><p class="text-sm text-gray-900">{{ employee.workplace?.name || '-' }}</p></div>
          <div><p class="text-xs text-gray-500 mb-0.5">İşyeri Bölümü</p><p class="text-sm text-gray-900">{{ employee.workplaceSection?.name || '-' }}</p></div>
          <div><p class="text-xs text-gray-500 mb-0.5">Departman</p><p class="text-sm text-gray-900">{{ employee.department?.name || '-' }}</p></div>
          <div><p class="text-xs text-gray-500 mb-0.5">Görevi</p><p class="text-sm text-gray-900">{{ employee.position || '-' }}</p></div>
          <div><p class="text-xs text-gray-500 mb-0.5">Personel No</p><p class="text-sm text-gray-900">{{ employee.personelNumarasi || employee.employeeNumber || '-' }}</p></div>
          <div><p class="text-xs text-gray-500 mb-0.5">İşe Giriş Tarihi</p><p class="text-sm text-gray-900">{{ formatDate(employee.hireDate) || '-' }}</p></div>
        </div>
      </div>

      <!-- Şifre Değiştirme -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h2 class="text-sm font-semibold text-gray-700">Şifre Değiştir</h2>
        </div>
        <div class="p-5">
          <form @submit.prevent="changePassword" class="max-w-sm space-y-3">
            <Input
              v-model="passwordForm.currentPassword"
              type="password"
              label="Mevcut Şifre"
              required
            />
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
              v-if="passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword"
              class="text-xs text-red-600"
            >
              Şifreler eşleşmiyor
            </div>
            <p v-if="passwordError" class="text-xs text-red-600">{{ passwordError }}</p>
            <p v-if="passwordSuccess" class="text-xs text-green-600">{{ passwordSuccess }}</p>
            <Button
              type="submit"
              size="sm"
              :disabled="
                passwordLoading ||
                passwordForm.newPassword !== passwordForm.confirmPassword ||
                passwordForm.newPassword.length < 6 ||
                !passwordForm.currentPassword
              "
            >
              {{ passwordLoading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir' }}
            </Button>
          </form>
        </div>
      </div>

      <!-- Son Değişiklik Talepleri -->
      <div v-if="changeRequests.length > 0" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h2 class="text-sm font-semibold text-gray-700">Bilgi Değişiklik Geçmişi</h2>
        </div>
        <div class="divide-y divide-gray-100">
          <div v-for="req in changeRequests" :key="req._id" class="px-5 py-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-gray-500">{{ formatDateTime(req.createdAt) }}</span>
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="{
                  'bg-yellow-100 text-yellow-700': req.status === 'pending',
                  'bg-green-100 text-green-700': req.status === 'approved',
                  'bg-red-100 text-red-700': req.status === 'rejected'
                }"
              >
                {{ req.status === 'pending' ? 'Bekliyor' : req.status === 'approved' ? 'Onaylandı' : 'Reddedildi' }}
              </span>
            </div>
            <div class="space-y-0.5">
              <div v-for="(change, field) in req.changes" :key="field" class="text-xs text-gray-600">
                <strong>{{ change.label || field }}:</strong>
                {{ change.old || '(boş)' }} → {{ change.new || '(boş)' }}
              </div>
            </div>
            <p v-if="req.reviewNote" class="text-xs text-gray-500 mt-1 italic">Not: {{ req.reviewNote }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Hata -->
    <div v-else-if="loadError" class="text-center py-12">
      <p class="text-gray-500">{{ loadError }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';
import Input from '@/components/Input.vue';
import Button from '@/components/Button.vue';
import PhoneInput from '@/components/PhoneInput.vue';

const authStore = useAuthStore();

// Data
const employee = ref(null);
const loading = ref(true);
const loadError = ref('');
const editMode = ref(false);
const saving = ref(false);
const editError = ref('');
const editSuccess = ref('');
const pendingRequest = ref(null);
const changeRequests = ref([]);
const photoPreview = ref(null);
const photoUploading = ref(false);

// Edit form
const editForm = ref({
  phone: '',
  birthDate: '',
  birthPlace: '',
  bloodType: '',
  militaryStatus: '',
  passportNumber: ''
});

// Password form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});
const passwordLoading = ref(false);
const passwordError = ref('');
const passwordSuccess = ref('');

// First login form
const firstLoginForm = ref({
  newEmail: '',
  newPhone: '',
  newPassword: '',
  confirmPassword: ''
});
const firstLoginLoading = ref(false);
const firstLoginError = ref('');

// Placeholder email kontrolü
const isPlaceholderEmail = computed(() => {
  const email = authStore.user?.email || '';
  return email.endsWith('@personelplus.com') || email.endsWith('@placeholder.com');
});

const showFirstLoginModal = computed(() => {
  return authStore.user?.mustChangePassword && isPlaceholderEmail.value;
});

const userEmail = computed(() => {
  if (isPlaceholderEmail.value) return '(Henüz belirtilmedi)';
  return authStore.user?.email || '';
});

// Options
const bloodTypes = ['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-'];
const militaryStatuses = ['Yapıldı', 'Muaf', 'Tecilli', 'Yapılmadı'];

// Methods
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('tr-TR');
};

const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('tr-TR');
};

const formatPhone = (phone) => {
  if (!phone) return '';
  if (phone.length === 11 && phone.startsWith('05')) {
    return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}`;
  }
  return phone;
};

const loadEmployee = async () => {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await api.get('/employees/me');
    employee.value = res.data?.data || res.data;
  } catch (err) {
    loadError.value = err.response?.data?.message || 'Bilgiler yüklenemedi';
  }
  loading.value = false;
};

const loadChangeRequests = async () => {
  try {
    const res = await api.get('/employees/me/change-requests');
    const data = res.data?.data || res.data || [];
    changeRequests.value = data;
    pendingRequest.value = data.find(r => r.status === 'pending') || null;
  } catch (err) {
    console.error('Değişiklik talepleri yüklenemedi:', err);
  }
};

const startEdit = () => {
  if (pendingRequest.value) return;
  editError.value = '';
  editSuccess.value = '';
  editForm.value = {
    phone: employee.value.phone || '',
    birthDate: employee.value.birthDate ? new Date(employee.value.birthDate).toISOString().split('T')[0] : '',
    birthPlace: employee.value.birthPlace || '',
    bloodType: employee.value.bloodType || '',
    militaryStatus: employee.value.militaryStatus || '',
    passportNumber: employee.value.passportNumber || ''
  };
  editMode.value = true;
};

const cancelEdit = () => {
  editMode.value = false;
  editError.value = '';
  editSuccess.value = '';
};

const submitChange = async () => {
  saving.value = true;
  editError.value = '';
  editSuccess.value = '';
  try {
    const res = await api.put('/employees/me', editForm.value);
    editSuccess.value = res.data?.message || 'Değişiklik talebiniz gönderildi';
    editMode.value = false;
    await loadChangeRequests();
  } catch (err) {
    editError.value = err.response?.data?.message || 'Talep gönderilemedi';
  }
  saving.value = false;
};

const changePassword = async () => {
  passwordLoading.value = true;
  passwordError.value = '';
  passwordSuccess.value = '';
  try {
    const res = await api.post('/auth/change-password', {
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    });
    passwordSuccess.value = res.data?.message || 'Şifreniz değiştirildi';
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
  } catch (err) {
    passwordError.value = err.response?.data?.message || 'Şifre değiştirilemedi';
  }
  passwordLoading.value = false;
};

const completeFirstLogin = async () => {
  firstLoginLoading.value = true;
  firstLoginError.value = '';
  try {
    await api.post('/auth/change-password', {
      newPassword: firstLoginForm.value.newPassword,
      newEmail: firstLoginForm.value.newEmail,
      newPhone: firstLoginForm.value.newPhone
    });
    await authStore.fetchCurrentUser();
    firstLoginForm.value = { newEmail: '', newPhone: '', newPassword: '', confirmPassword: '' };
    // Employee bilgilerini yeniden yükle
    await loadEmployee();
  } catch (err) {
    firstLoginError.value = err.response?.data?.message || 'Bilgiler kaydedilemedi';
  }
  firstLoginLoading.value = false;
};

const handlePhotoChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Önizleme
  const reader = new FileReader();
  reader.onload = (ev) => { photoPreview.value = ev.target.result; };
  reader.readAsDataURL(file);

  // Yükle
  photoUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await api.put(`/employees/${employee.value._id}/profile-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    employee.value.profilePhoto = res.data?.data?.profilePhoto;
    photoPreview.value = null;
  } catch (err) {
    alert(err.response?.data?.message || 'Fotoğraf yüklenemedi');
    photoPreview.value = null;
  }
  photoUploading.value = false;
  e.target.value = '';
};

const deletePhoto = async () => {
  if (!confirm('Fotoğrafı silmek istediğinize emin misiniz?')) return;
  try {
    await api.delete(`/employees/${employee.value._id}/profile-photo`);
    employee.value.profilePhoto = null;
    photoPreview.value = null;
  } catch (err) {
    alert(err.response?.data?.message || 'Fotoğraf silinemedi');
  }
};

onMounted(async () => {
  await loadEmployee();
  await loadChangeRequests();
});
</script>
