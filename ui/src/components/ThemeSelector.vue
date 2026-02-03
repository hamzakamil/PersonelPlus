<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold mb-6 text-gray-800 border-b pb-3 flex items-center gap-2">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
      Tema Ayarları
    </h3>

    <p class="text-sm text-gray-600 mb-6">
      Arayüz temasını seçin. Tercihleriniz tarayıcınızda saklanır ve bir sonraki girişinizde hatırlanır.
    </p>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="theme in themes"
        :key="theme.id"
        @click="selectTheme(theme.id)"
        class="relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-300 hover:shadow-lg group"
        :class="[
          currentThemeId === theme.id
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        ]"
      >
        <!-- Seçili göstergesi -->
        <div
          v-if="currentThemeId === theme.id"
          class="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
        >
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <!-- Tema önizleme -->
        <div class="mb-3">
          <div class="h-24 rounded-lg overflow-hidden flex shadow-sm">
            <!-- Sidebar önizleme -->
            <div
              class="w-1/3 p-2"
              :style="{ background: theme.colors.sidebarBg }"
            >
              <div class="space-y-1.5">
                <div
                  class="h-2 rounded-full"
                  :style="{ backgroundColor: theme.colors.sidebarActive, opacity: 0.6, width: '80%' }"
                ></div>
                <div
                  class="h-2 rounded-full"
                  :style="{ backgroundColor: theme.colors.sidebarText, opacity: 0.4, width: '100%' }"
                ></div>
                <div
                  class="h-2 rounded-full"
                  :style="{ backgroundColor: theme.colors.sidebarText, opacity: 0.4, width: '70%' }"
                ></div>
                <div
                  class="h-2 rounded-full"
                  :style="{ backgroundColor: theme.colors.sidebarText, opacity: 0.4, width: '90%' }"
                ></div>
              </div>
            </div>
            <!-- Content önizleme -->
            <div
              class="w-2/3 flex flex-col"
              :style="{ backgroundColor: theme.colors.pageBg }"
            >
              <!-- Header -->
              <div
                class="h-6 border-b flex items-center px-2"
                :style="{ backgroundColor: theme.colors.headerBg, borderColor: theme.colors.headerBorder }"
              >
                <div
                  class="h-2 w-16 rounded-full"
                  :style="{ backgroundColor: theme.colors.textPrimary, opacity: 0.5 }"
                ></div>
              </div>
              <!-- Content area -->
              <div class="flex-1 p-2">
                <div
                  class="h-full rounded-md flex items-center justify-center"
                  :style="{ backgroundColor: theme.colors.cardBg, borderColor: theme.colors.cardBorder }"
                >
                  <div
                    class="w-8 h-4 rounded"
                    :style="{ backgroundColor: theme.colors.primary }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tema bilgisi -->
        <div>
          <h4 class="font-semibold text-gray-900 mb-1">{{ theme.name }}</h4>
          <p class="text-xs text-gray-500 line-clamp-2">{{ theme.description }}</p>
        </div>

        <!-- Renk göstergesi -->
        <div class="mt-3 flex gap-1.5">
          <div
            class="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
            :style="{ backgroundColor: theme.preview.primary }"
            :title="'Ana Renk'"
          ></div>
          <div
            class="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
            :style="{ backgroundColor: theme.preview.secondary }"
            :title="'İkincil Renk'"
          ></div>
          <div
            class="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
            :style="{ backgroundColor: theme.preview.accent }"
            :title="'Vurgu Rengi'"
          ></div>
        </div>
      </div>
    </div>

    <!-- Aktif tema bilgisi -->
    <div class="mt-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            :style="{ background: currentTheme.colors.sidebarBg }"
          >
            <svg class="w-5 h-5" :style="{ color: currentTheme.colors.sidebarActive }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">Aktif Tema</p>
            <p class="text-xs text-gray-500">{{ currentTheme.name }}</p>
          </div>
        </div>
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          Uygulandı
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore, themes as allThemes } from '@/stores/theme'

const themeStore = useThemeStore()

const themes = computed(() => Object.values(allThemes))
const currentThemeId = computed(() => themeStore.currentThemeId)
const currentTheme = computed(() => themeStore.currentTheme)

const selectTheme = (themeId) => {
  themeStore.setTheme(themeId)
}
</script>
