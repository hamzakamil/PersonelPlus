export const TOUR_ID = 'bayi_admin_dashboard'

export const getSteps = () => [
  {
    popover: {
      title: 'Bayi Panelinize Hoşgeldiniz! 👋',
      description: 'Bu tur, bayi yönetim panelinizin özelliklerini tanıtacak. Şirketlerinizi ve çalışanlarınızı kolayca yönetin.',
      side: 'over',
      align: 'center'
    }
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Navigasyon Menüsü',
      description: 'Sol menüde şirketler, çalışanlar, izinler, puantaj ve daha fazlası bulunuyor.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-companies"]',
    popover: {
      title: 'Şirketleriniz',
      description: 'Bayinize bağlı şirketleri buradan yönetin. Yeni şirket ekleyebilir, mevcut şirketleri düzenleyebilirsiniz.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-subscription"]',
    popover: {
      title: 'Paket Satın Al',
      description: 'Şirketleriniz için uygun abonelik paketlerini buradan satın alabilirsiniz.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-employees"]',
    popover: {
      title: 'Çalışan Yönetimi',
      description: 'Tüm şirketlerinizdeki çalışanları görüntüleyin. İşe giriş/çıkış işlemleri ve çalışan detayları burada.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-leaves"]',
    popover: {
      title: 'İzin Yönetimi',
      description: 'İzin taleplerini onaylayın, izin cetvelini görüntüleyin ve izin bakiyelerini takip edin.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-puantaj"]',
    popover: {
      title: 'Aylık Puantaj',
      description: 'Çalışanlarınızın aylık devam durumunu puantaj tablosu üzerinden görüntüleyin ve düzenleyin.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-settings"]',
    popover: {
      title: 'Ayarlar',
      description: 'Şirket ayarları, çalışma saatleri, tatil günleri ve diğer yapılandırmaları buradan yapın.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="header-notifications"]',
    popover: {
      title: 'Bildirimler',
      description: 'Önemli bildirimler, talep güncellemeleri ve uyarılar burada görüntülenir.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '[data-tour="dashboard-summary-cards"]',
    popover: {
      title: 'Genel Bakış',
      description: 'Şirket sayısı, bekleyen işlemler, bugün giriş yapanlar ve toplam çalışan sayınız bir bakışta.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    popover: {
      title: 'Hazırsınız! ✅',
      description: 'Bayi panelinizi kullanmaya başlayabilirsiniz. Turu tekrar izlemek isterseniz sol alt köşedeki butonu kullanın.',
      side: 'over',
      align: 'center'
    }
  }
]
