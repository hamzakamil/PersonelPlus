<template>
  <div class="min-h-screen" :style="{ backgroundColor: 'var(--page-bg)' }">
    <ToastContainer />
    <ConfirmModal />
    <div class="flex">
      <!-- Sidebar - Modern design with theme support -->
      <aside
        class="sidebar-fixed min-h-screen flex-shrink-0 shadow-2xl"
        :style="{ background: 'var(--sidebar-bg)' }"
      >
        <!-- Logo Section -->
        <div class="p-5 border-b" :style="{ borderColor: 'var(--sidebar-border)' }">
          <div v-if="companyLogo" class="flex justify-center mb-3">
            <img
              :src="companyLogo"
              alt="Şirket Logosu"
              class="max-h-12 max-w-full object-contain rounded-lg"
            />
          </div>
          <div v-else class="flex justify-center mb-3">
            <img src="/logo.svg" alt="PersonelPlus" class="h-14 w-auto" />
          </div>
          <h1
            class="text-sm font-semibold truncate text-center"
            :style="{ color: 'var(--sidebar-text-hover)' }"
          >
            {{ companyTitle }}
          </h1>
        </div>

        <!-- Navigation -->
        <nav class="py-4 overflow-y-auto" style="max-height: calc(100vh - 100px)">
          <template v-for="item in menuItems" :key="item.path || item.name">
            <!-- Alt menüsü olan öğeler -->
            <div v-if="item.children" class="mb-1">
              <button
                @click="toggleMenu(item.name)"
                class="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm transition-all duration-200 mx-2 rounded-xl"
                :style="{
                  color:
                    isMenuActive(item) || isMenuExpanded(item.name)
                      ? 'var(--sidebar-text-hover)'
                      : 'var(--sidebar-text)',
                  backgroundColor:
                    isMenuActive(item) || isMenuExpanded(item.name)
                      ? 'var(--sidebar-active-bg)'
                      : 'transparent',
                }"
                @mouseenter="$event.target.style.backgroundColor = 'var(--sidebar-active-bg)'"
                @mouseleave="
                  $event.target.style.backgroundColor =
                    isMenuActive(item) || isMenuExpanded(item.name)
                      ? 'var(--sidebar-active-bg)'
                      : 'transparent'
                "
              >
                <div class="flex items-center gap-3">
                  <span class="w-5 h-5 flex-shrink-0" v-html="item.icon"></span>
                  <span class="font-medium">{{ item.name }}</span>
                </div>
                <span
                  class="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                  :class="{ 'rotate-180': isMenuExpanded(item.name) }"
                  v-html="icons.chevronDown"
                ></span>
              </button>
              <!-- Alt menü öğeleri -->
              <div v-show="isMenuExpanded(item.name)" class="mt-1 ml-4 space-y-1 animate-slide-up">
                <router-link
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 mx-2 rounded-xl"
                  :style="{
                    color:
                      $route.path === child.path
                        ? 'var(--sidebar-text-hover)'
                        : 'var(--sidebar-text)',
                    backgroundColor:
                      $route.path === child.path ? 'var(--sidebar-active-bg)' : 'transparent',
                    borderLeft:
                      $route.path === child.path
                        ? '3px solid var(--sidebar-active)'
                        : '3px solid transparent',
                  }"
                >
                  <span class="w-4 h-4 flex-shrink-0" v-html="child.icon"></span>
                  <span>{{ child.name }}</span>
                </router-link>
              </div>
            </div>
            <!-- Alt menüsü olmayan öğeler -->
            <router-link
              v-else
              :to="item.path"
              class="flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 mx-2 rounded-xl mb-1"
              :style="{
                color:
                  $route.path === item.path ? 'var(--sidebar-text-hover)' : 'var(--sidebar-text)',
                backgroundColor:
                  $route.path === item.path ? 'var(--sidebar-active-bg)' : 'transparent',
                borderLeft:
                  $route.path === item.path
                    ? '3px solid var(--sidebar-active)'
                    : '3px solid transparent',
              }"
            >
              <span class="w-5 h-5 flex-shrink-0" v-html="item.icon"></span>
              <span class="font-medium">{{ item.name }}</span>
            </router-link>
          </template>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 min-w-0">
        <!-- Header -->
        <header
          class="shadow-sm border-b sticky top-0 z-10"
          :style="{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--header-border)' }"
        >
          <div class="px-6 py-3 flex justify-between items-center">
            <div class="flex items-center gap-4">
              <h2 class="text-lg font-semibold" :style="{ color: 'var(--header-text)' }">
                {{ currentPageTitle }}
              </h2>
            </div>
            <div class="flex items-center gap-4">
              <NotificationBadge />
              <MessageBadge />
              <div
                class="flex items-center gap-3 px-4 py-2 rounded-xl"
                :style="{ backgroundColor: 'var(--primary-light)' }"
              >
                <div class="text-right">
                  <div
                    v-if="displayRoleLabel"
                    class="text-[10px] font-medium uppercase tracking-wide"
                    :style="{ color: 'var(--text-muted)' }"
                  >
                    {{ displayRoleLabel }}
                  </div>
                  <div class="text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">
                    {{ displayUserName }}
                  </div>
                </div>
                <div
                  class="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  :style="{ backgroundColor: 'var(--primary)' }"
                >
                  {{ userInitials }}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                @click="handleLogout"
                class="flex items-center gap-2"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Çıkış
              </Button>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="animate-fade-in">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import Button from '@/components/Button.vue';
import MessageBadge from '@/components/MessageBadge.vue';
import NotificationBadge from '@/components/NotificationBadge.vue';
import ToastContainer from '@/components/ToastContainer.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import api from '@/services/api';

const router = useRouter();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const companyTitle = ref('PersonelPlus');
const companyLogo = ref('');

const user = computed(() => authStore.user);

// Kullanıcı baş harfleri
const userInitials = computed(() => {
  const name = displayUserName.value || '';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});

// Alt menü açılır/kapanır state
const expandedMenus = ref([]);

const toggleMenu = menuName => {
  const index = expandedMenus.value.indexOf(menuName);
  if (index > -1) {
    expandedMenus.value.splice(index, 1);
  } else {
    expandedMenus.value.push(menuName);
  }
};

const isMenuExpanded = menuName => expandedMenus.value.includes(menuName);

// Aktif menü kontrolü - alt menülerden biri aktifse parent'ı da aktif say
const isMenuActive = item => {
  const currentPath = router.currentRoute.value.path;
  if (item.path) {
    return currentPath === item.path;
  }
  if (item.children) {
    return item.children.some(child => currentPath === child.path);
  }
  return false;
};

const displayRoleLabel = computed(() => {
  if (!user.value) return '';
  const role = user.value.role;
  if (role === 'super_admin') return 'Süper Admin';
  if (role === 'bayi_admin') return 'Bayi';
  if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(role))
    return 'Şirket';
  return '';
});

const displayUserName = computed(() => {
  if (!user.value) return '';
  const role = user.value.role;

  if (role === 'super_admin') {
    return 'Süper Admin';
  }
  if (role === 'bayi_admin' && user.value.dealer) {
    if (typeof user.value.dealer === 'object' && user.value.dealer.name) {
      return user.value.dealer.name;
    }
    return user.value.email || '';
  }
  if (
    ['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(role) &&
    user.value.company
  ) {
    if (typeof user.value.company === 'object' && user.value.company.name) {
      return user.value.company.name;
    }
    return user.value.email || '';
  }
  if (role === 'employee' && user.value.employeeName) {
    return user.value.employeeName;
  }
  if (role === 'employee') {
    return user.value.email || '';
  }

  return user.value.email || '';
});

// SVG Icons - Lucide/Feather style stroke icons
const icons = {
  dashboard:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>',
  dealers:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>',
  database:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>',
  company:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>',
  globe:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>',
  shield:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>',
  users:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
  calendar:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>',
  userCog:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="18" cy="15" r="3" /><circle cx="9" cy="7" r="4" /><path d="M10 15H6a4 4 0 00-4 4v2" /><path d="M21.7 16.4l-.9-.3m-5.6-2.2l-.9-.3m2.3 5.1l.3-.9m2.2-5.6l.3-.9m.2 7.4l-.4-1m-2.4-5.4l-.4-1m-2.1 5.3l1-.4m5.4-2.4l1-.4" /></svg>',
  package:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>',
  creditCard:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>',
  receipt:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" /><path d="M8 10h8M8 14h4" /></svg>',
  chart:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>',
  message:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>',
  support:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>',
  briefcase:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M5 2h10a2 2 0 012 2v16a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2z" /><path d="M17 8l4 2v4l-4 2" /><circle cx="13" cy="12" r="1" fill="currentColor" /></svg>',
  clock:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>',
  calendarCheck:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M9 16l2 2 4-4" /></svg>',
  wallet:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12a2 2 0 002 2h14v-4" /><path d="M18 12a2 2 0 00-2 2v4h4v-4a2 2 0 00-2-2z" /></svg>',
  fileText:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>',
  table:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>',
  settings:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>',
  checkCircle:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>',
  barChart:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>',
  pieChart:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M21.21 15.89A10 10 0 118 2.83" /><path d="M22 12A10 10 0 0012 2v10z" /></svg>',
  list: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>',
  myLeaves:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path d="M12 12v4m0 0l-2-2m2 2l2-2" /></svg>',
  commission:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  campaign:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M7.941 18.941c-2.5 2.5-6.5.5-6.5.5s-2-4 .5-6.5l9-9a2 2 0 012.828 0l3.172 3.172a2 2 0 010 2.828l-9 9z" /><path d="M11 11l6 6" /><path d="M20 8l-2-2" /><path d="M22 6l-2-2" /></svg>',
  invoice:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /><path d="M14 2v6h6" /></svg>',
  upload:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>',
  chevronDown:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>',
  alertCircle:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>',
};

const menuItems = computed(() => {
  const role = user.value?.role;
  const items = [];

  if (role === 'super_admin') {
    items.push({ path: '/', name: 'Genel Durum Özeti', icon: icons.dashboard });
    items.push({ path: '/dealers', name: 'Bayiler', icon: icons.dealers });
    items.push({ path: '/admin/health-check', name: 'Veritabanı Kontrolü', icon: icons.database });
    items.push({ path: '/companies', name: 'Şirketler', icon: icons.company });
    items.push({ path: '/global-settings', name: 'Global Ayarlar', icon: icons.globe });
    items.push({ path: '/role-management', name: 'Yetki Yönetimi', icon: icons.shield });
    items.push({ path: '/user-management', name: 'Kullanıcı Yönetimi', icon: icons.users });
    items.push({ path: '/working-permits', name: 'Çalışan İzinleri', icon: icons.calendar });
    items.push({ path: '/manager-assignment', name: 'Yönetici Atama', icon: icons.userCog });
    // Abonelik Sistemi - Super Admin
    items.push({ path: '/package-management', name: 'Paket Yönetimi', icon: icons.package });
    items.push({ path: '/subscriptions', name: 'Abonelik Yönetimi', icon: icons.creditCard });
    items.push({ path: '/payments', name: 'Ödeme Geçmişi', icon: icons.receipt });
    items.push({ path: '/revenue-analytics', name: 'Gelir Analitikleri', icon: icons.chart });
    items.push({
      path: '/commission-management',
      name: 'Komisyon Yönetimi',
      icon: icons.commission,
    });
    items.push({ path: '/campaign-management', name: 'Kampanya Yönetimi', icon: icons.campaign });
    items.push({ path: '/invoice-management', name: 'e-Fatura Yönetimi', icon: icons.invoice });
    items.push({ path: '/messages', name: 'Mesajlar', icon: icons.message });
    items.push({ path: '/support', name: 'Destek', icon: icons.support });
  } else if (role === 'bayi_admin') {
    items.push({ path: '/', name: 'Genel Durum Özeti', icon: icons.dashboard });
    items.push({ path: '/companies', name: 'Şirketler', icon: icons.company });
    items.push({
      path: '/company-subscriptions',
      name: 'Şirket Abonelikleri',
      icon: icons.creditCard,
    });
    // Çalışanlar - Alt menülü
    items.push({
      name: 'Çalışanlar',
      icon: icons.users,
      children: [
        { path: '/employees', name: 'Çalışan Listesi', icon: icons.users },
        { path: '/employment/list', name: 'İşe Giriş/Çıkış', icon: icons.briefcase },
      ],
    });
    // İzinler - Alt menülü
    items.push({
      name: 'İzinler',
      icon: icons.calendar,
      children: [
        { path: '/leave-requests', name: 'İzin Talepleri', icon: icons.calendarCheck },
        { path: '/leave-ledger', name: 'İzin Cetveli', icon: icons.table },
      ],
    });
    items.push({ path: '/advance-requests', name: 'Avanslar', icon: icons.wallet });
    items.push({ path: '/overtime-requests', name: 'Fazla Mesai', icon: icons.clock });
    items.push({ path: '/puantaj', name: 'Aylık Puantaj', icon: icons.table });
    items.push({ path: '/attendance-dashboard', name: 'Devam Takip', icon: icons.clock });
    // Bordro Yönetimi - Alt menülü
    items.push({
      name: 'Bordro Yönetimi',
      icon: icons.receipt,
      children: [
        { path: '/bordro-upload', name: 'Bordro Yükle', icon: icons.upload },
        { path: '/bordro-list', name: 'Yükleme Geçmişi', icon: icons.list },
        { path: '/bordro-stats', name: 'Onay İstatistikleri', icon: icons.barChart },
        { path: '/bordro-rejections', name: 'Reddedilenler', icon: icons.alertCircle },
      ],
    });
    items.push({ path: '/reports', name: 'Raporlar', icon: icons.fileText });
    items.push({ path: '/settings', name: 'Ayarlar', icon: icons.settings });
    items.push({ path: '/messages', name: 'Mesajlar', icon: icons.message });
    items.push({ path: '/support', name: 'Destek', icon: icons.support });
  } else if (
    ['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(role)
  ) {
    items.push({ path: '/', name: 'Genel Durum Özeti', icon: icons.dashboard });
    // Çalışanlar - Alt menülü
    items.push({
      name: 'Çalışanlar',
      icon: icons.users,
      children: [
        { path: '/employees', name: 'Çalışan Listesi', icon: icons.users },
        { path: '/employment/list', name: 'İşe Giriş/Çıkış', icon: icons.briefcase },
      ],
    });
    // İzinler - Alt menülü
    items.push({
      name: 'İzinler',
      icon: icons.calendar,
      children: [
        { path: '/leave-requests', name: 'İzin Talepleri', icon: icons.calendarCheck },
        { path: '/leave-summary', name: 'İzin Özeti', icon: icons.pieChart },
        { path: '/leave-ledger', name: 'İzin Cetveli', icon: icons.table },
        { path: '/leave-balances', name: 'İzin Bakiyeleri', icon: icons.barChart },
        { path: '/approvals', name: 'Onaylar', icon: icons.checkCircle },
      ],
    });
    items.push({ path: '/advance-requests', name: 'Avanslar', icon: icons.wallet });
    items.push({ path: '/overtime-requests', name: 'Fazla Mesai', icon: icons.clock });
    items.push({ path: '/puantaj', name: 'Aylık Puantaj', icon: icons.table });
    items.push({ path: '/attendance-dashboard', name: 'Devam Takip', icon: icons.clock });
    // Bordro Yönetimi - Şirket Admin
    items.push({
      name: 'Bordro Yönetimi',
      icon: icons.receipt,
      children: [
        { path: '/bordro-approval', name: 'Bordro Onayı', icon: icons.checkCircle },
        { path: '/bordro-company-list', name: 'Bordro Listesi', icon: icons.list },
        { path: '/bordro-stats', name: 'Onay İstatistikleri', icon: icons.barChart },
      ],
    });
    items.push({ path: '/reports', name: 'Raporlar', icon: icons.fileText });
    items.push({ path: '/settings', name: 'Ayarlar', icon: icons.settings });
    items.push({ path: '/messages', name: 'Mesajlar', icon: icons.message });
    items.push({ path: '/support', name: 'Destek', icon: icons.support });
  } else if (role === 'employee') {
    items.push({ path: '/', name: 'Genel Durum Özeti', icon: icons.dashboard });
    items.push({ path: '/my-bordros', name: 'Bordrolarım', icon: icons.receipt });
    items.push({ path: '/employee-leave-types', name: 'İzin Türleri', icon: icons.list });
    items.push({ path: '/my-leaves', name: 'İzin Taleplerim', icon: icons.myLeaves });
    items.push({ path: '/advance-requests', name: 'Avans Taleplerim', icon: icons.wallet });
    items.push({ path: '/leave-ledger', name: 'İzin Cetveli', icon: icons.table });
    items.push({ path: '/messages', name: 'Mesajlar', icon: icons.message });
  }

  return items;
});

const currentPageTitle = computed(() => {
  const route = router.currentRoute.value;
  // Önce üst seviyede ara
  let item = menuItems.value.find(item => item.path === route.path);
  if (item) return item.name;

  // Alt menülerde ara
  for (const menuItem of menuItems.value) {
    if (menuItem.children) {
      const child = menuItem.children.find(c => c.path === route.path);
      if (child) return child.name;
    }
  }

  return 'Genel Durum Özeti';
});

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};

// Aktif rotanın parent menüsünü aç
const autoExpandActiveMenu = () => {
  const currentPath = router.currentRoute.value.path;
  for (const item of menuItems.value) {
    if (item.children) {
      const hasActiveChild = item.children.some(c => c.path === currentPath);
      if (hasActiveChild && !expandedMenus.value.includes(item.name)) {
        expandedMenus.value.push(item.name);
      }
    }
  }
};

// Route değiştiğinde aktif menüyü aç
watch(
  () => router.currentRoute.value.path,
  () => {
    autoExpandActiveMenu();
  }
);

onMounted(async () => {
  // Aktif menüyü aç
  autoExpandActiveMenu();

  // Şirket bilgilerini yükle
  if (user.value?.company) {
    try {
      const companyData = user.value.company;
      const companyId = companyData?._id || companyData;
      const response = await api.get(`/companies/${companyId}`);
      const data = response.data?.data || response.data;
      if (data?.title) {
        companyTitle.value = data.title;
      }
      if (data?.logo) {
        companyLogo.value = data.logo.startsWith('http')
          ? data.logo
          : `http://localhost:3000${data.logo}`;
      }
    } catch (error) {
      console.error('Şirket bilgisi alınamadı:', error);
    }
  }
  // Şirket yoksa veya logo yoksa varsayılan kullanılır
});
</script>
