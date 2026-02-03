<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Raporlar</h1>

    <!-- Tab Menüsü -->
    <div class="bg-white rounded-lg shadow mb-6">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex">
          <button
            @click="activeTab = 'leave'"
            :class="[
              'py-4 px-6 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'leave'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            📊 İzin Raporları
          </button>
          <button
            @click="activeTab = 'puantaj'"
            :class="[
              'py-4 px-6 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'puantaj'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            📅 Puantaj Raporları
          </button>
          <button
            @click="activeTab = 'employment'"
            :class="[
              'py-4 px-6 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'employment'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            👥 İşe Giriş/Çıkış Raporları
          </button>
        </nav>
      </div>
    </div>

    <!-- Tab İçerikleri -->
    <div class="tab-content">
      <!-- İzin Raporları -->
      <div v-if="activeTab === 'leave'">
        <LeaveReportTab />
      </div>

      <!-- Puantaj Raporları -->
      <div v-else-if="activeTab === 'puantaj'">
        <PuantajReportTab />
      </div>

      <!-- İşe Giriş/Çıkış Raporları -->
      <div v-else-if="activeTab === 'employment'">
        <EmploymentReportTab />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import LeaveReportTab from '@/components/reports/LeaveReportTab.vue'
import PuantajReportTab from '@/components/reports/PuantajReportTab.vue'
import EmploymentReportTab from '@/components/reports/EmploymentReportTab.vue'

const activeTab = ref('leave')
</script>
