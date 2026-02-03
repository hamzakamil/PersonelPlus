import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// Tema tanımlamaları
export const themes = {
  modernBlue: {
    id: 'modernBlue',
    name: 'Modern Mavi',
    description: 'Kunduz tarzı modern ve canlı mavi tema',
    preview: {
      primary: '#3b82f6',
      secondary: '#1e3a8a',
      accent: '#f97316'
    },
    colors: {
      // Sidebar
      sidebarBg: 'linear-gradient(180deg, #1e3a8a 0%, #0f172a 100%)',
      sidebarText: '#e2e8f0',
      sidebarTextHover: '#ffffff',
      sidebarActive: '#3b82f6',
      sidebarActiveBg: 'rgba(59, 130, 246, 0.2)',
      sidebarBorder: 'rgba(59, 130, 246, 0.3)',
      // Header
      headerBg: '#ffffff',
      headerText: '#1e293b',
      headerBorder: '#e2e8f0',
      // Main content
      pageBg: '#f1f5f9',
      cardBg: '#ffffff',
      cardBorder: '#e2e8f0',
      // Primary colors
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryLight: '#dbeafe',
      // Accent
      accent: '#f97316',
      accentHover: '#ea580c',
      // Text
      textPrimary: '#1e293b',
      textSecondary: '#64748b',
      textMuted: '#94a3b8',
      // Status colors
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6'
    }
  },
  darkNavy: {
    id: 'darkNavy',
    name: 'Koyu Lacivert',
    description: 'Profesyonel koyu lacivert tema',
    preview: {
      primary: '#6366f1',
      secondary: '#1e1b4b',
      accent: '#a855f7'
    },
    colors: {
      sidebarBg: 'linear-gradient(180deg, #1e1b4b 0%, #0f0d2e 100%)',
      sidebarText: '#c7d2fe',
      sidebarTextHover: '#ffffff',
      sidebarActive: '#6366f1',
      sidebarActiveBg: 'rgba(99, 102, 241, 0.2)',
      sidebarBorder: 'rgba(99, 102, 241, 0.3)',
      headerBg: '#ffffff',
      headerText: '#1e1b4b',
      headerBorder: '#e0e7ff',
      pageBg: '#f5f3ff',
      cardBg: '#ffffff',
      cardBorder: '#e0e7ff',
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      primaryLight: '#e0e7ff',
      accent: '#a855f7',
      accentHover: '#9333ea',
      textPrimary: '#1e1b4b',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#6366f1'
    }
  },
  emeraldGreen: {
    id: 'emeraldGreen',
    name: 'Zümrüt Yeşil',
    description: 'Doğal ve ferah yeşil tema',
    preview: {
      primary: '#10b981',
      secondary: '#064e3b',
      accent: '#06b6d4'
    },
    colors: {
      sidebarBg: 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)',
      sidebarText: '#a7f3d0',
      sidebarTextHover: '#ffffff',
      sidebarActive: '#10b981',
      sidebarActiveBg: 'rgba(16, 185, 129, 0.2)',
      sidebarBorder: 'rgba(16, 185, 129, 0.3)',
      headerBg: '#ffffff',
      headerText: '#064e3b',
      headerBorder: '#d1fae5',
      pageBg: '#ecfdf5',
      cardBg: '#ffffff',
      cardBorder: '#d1fae5',
      primary: '#10b981',
      primaryHover: '#059669',
      primaryLight: '#d1fae5',
      accent: '#06b6d4',
      accentHover: '#0891b2',
      textPrimary: '#064e3b',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#06b6d4'
    }
  },
  coralPink: {
    id: 'coralPink',
    name: 'Coral Pembe',
    description: 'Enerjik ve modern pembe tema',
    preview: {
      primary: '#f43f5e',
      secondary: '#881337',
      accent: '#f97316'
    },
    colors: {
      sidebarBg: 'linear-gradient(180deg, #881337 0%, #4c0519 100%)',
      sidebarText: '#fecdd3',
      sidebarTextHover: '#ffffff',
      sidebarActive: '#f43f5e',
      sidebarActiveBg: 'rgba(244, 63, 94, 0.2)',
      sidebarBorder: 'rgba(244, 63, 94, 0.3)',
      headerBg: '#ffffff',
      headerText: '#881337',
      headerBorder: '#fecdd3',
      pageBg: '#fff1f2',
      cardBg: '#ffffff',
      cardBorder: '#fecdd3',
      primary: '#f43f5e',
      primaryHover: '#e11d48',
      primaryLight: '#ffe4e6',
      accent: '#f97316',
      accentHover: '#ea580c',
      textPrimary: '#881337',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#f43f5e'
    }
  },
  classicGray: {
    id: 'classicGray',
    name: 'Klasik Gri',
    description: 'Sade ve profesyonel gri tema',
    preview: {
      primary: '#475569',
      secondary: '#1e293b',
      accent: '#3b82f6'
    },
    colors: {
      sidebarBg: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      sidebarText: '#cbd5e1',
      sidebarTextHover: '#ffffff',
      sidebarActive: '#3b82f6',
      sidebarActiveBg: 'rgba(59, 130, 246, 0.2)',
      sidebarBorder: 'rgba(59, 130, 246, 0.3)',
      headerBg: '#ffffff',
      headerText: '#1e293b',
      headerBorder: '#e2e8f0',
      pageBg: '#f8fafc',
      cardBg: '#ffffff',
      cardBorder: '#e2e8f0',
      primary: '#475569',
      primaryHover: '#334155',
      primaryLight: '#f1f5f9',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      textPrimary: '#1e293b',
      textSecondary: '#64748b',
      textMuted: '#94a3b8',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6'
    }
  },
  darkMode: {
    id: 'darkMode',
    name: 'Karanlık Mod',
    description: 'Göz yormayan koyu tema',
    preview: {
      primary: '#60a5fa',
      secondary: '#111827',
      accent: '#f472b6'
    },
    colors: {
      sidebarBg: 'linear-gradient(180deg, #111827 0%, #030712 100%)',
      sidebarText: '#9ca3af',
      sidebarTextHover: '#ffffff',
      sidebarActive: '#60a5fa',
      sidebarActiveBg: 'rgba(96, 165, 250, 0.2)',
      sidebarBorder: 'rgba(96, 165, 250, 0.3)',
      headerBg: '#1f2937',
      headerText: '#f9fafb',
      headerBorder: '#374151',
      pageBg: '#111827',
      cardBg: '#1f2937',
      cardBorder: '#374151',
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      primaryLight: '#1e3a5f',
      accent: '#f472b6',
      accentHover: '#ec4899',
      textPrimary: '#f9fafb',
      textSecondary: '#d1d5db',
      textMuted: '#9ca3af',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#60a5fa'
    }
  }
}

export const useThemeStore = defineStore('theme', () => {
  // Varsayılan tema
  const currentThemeId = ref(localStorage.getItem('pys-theme') || 'modernBlue')

  // Mevcut tema objesi
  const currentTheme = ref(themes[currentThemeId.value] || themes.modernBlue)

  // Tema değiştirme fonksiyonu
  const setTheme = (themeId) => {
    if (themes[themeId]) {
      currentThemeId.value = themeId
      currentTheme.value = themes[themeId]
      localStorage.setItem('pys-theme', themeId)
      applyTheme(themes[themeId])
    }
  }

  // Temayı CSS değişkenlerine uygula
  const applyTheme = (theme) => {
    const root = document.documentElement
    const colors = theme.colors

    // CSS değişkenlerini ayarla
    root.style.setProperty('--sidebar-bg', colors.sidebarBg)
    root.style.setProperty('--sidebar-text', colors.sidebarText)
    root.style.setProperty('--sidebar-text-hover', colors.sidebarTextHover)
    root.style.setProperty('--sidebar-active', colors.sidebarActive)
    root.style.setProperty('--sidebar-active-bg', colors.sidebarActiveBg)
    root.style.setProperty('--sidebar-border', colors.sidebarBorder)

    root.style.setProperty('--header-bg', colors.headerBg)
    root.style.setProperty('--header-text', colors.headerText)
    root.style.setProperty('--header-border', colors.headerBorder)

    root.style.setProperty('--page-bg', colors.pageBg)
    root.style.setProperty('--card-bg', colors.cardBg)
    root.style.setProperty('--card-border', colors.cardBorder)

    root.style.setProperty('--primary', colors.primary)
    root.style.setProperty('--primary-hover', colors.primaryHover)
    root.style.setProperty('--primary-light', colors.primaryLight)

    root.style.setProperty('--accent', colors.accent)
    root.style.setProperty('--accent-hover', colors.accentHover)

    root.style.setProperty('--text-primary', colors.textPrimary)
    root.style.setProperty('--text-secondary', colors.textSecondary)
    root.style.setProperty('--text-muted', colors.textMuted)

    root.style.setProperty('--success', colors.success)
    root.style.setProperty('--warning', colors.warning)
    root.style.setProperty('--danger', colors.danger)
    root.style.setProperty('--info', colors.info)
  }

  // Uygulama başladığında temayı uygula
  const initTheme = () => {
    applyTheme(currentTheme.value)
  }

  // Tüm temaları listele
  const getAllThemes = () => {
    return Object.values(themes)
  }

  return {
    currentThemeId,
    currentTheme,
    setTheme,
    applyTheme,
    initTheme,
    getAllThemes
  }
})
