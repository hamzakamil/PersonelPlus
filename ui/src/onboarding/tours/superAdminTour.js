export const TOUR_ID = 'super_admin_dashboard'

export const getSteps = () => [
  {
    popover: {
      title: 'PersonelPlus\'a Hoşgeldiniz! 👋',
      description: 'Bu kısa tur, yönetim panelinizin temel özelliklerini tanıtacak. Hadi başlayalım!',
      side: 'over',
      align: 'center'
    }
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Yan Menü',
      description: 'Tüm yönetim modülleri burada. Bayiler, şirketler, ayarlar ve daha fazlasına buradan ulaşabilirsiniz.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-dealers"]',
    popover: {
      title: 'Bayi Yönetimi',
      description: 'Sistemdeki tüm bayileri buradan yönetebilirsiniz. Yeni bayi ekleyebilir, mevcut bayileri düzenleyebilirsiniz.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-companies"]',
    popover: {
      title: 'Şirket Yönetimi',
      description: 'Tüm şirketleri görüntüleyin ve yönetin. Şirket detaylarını, çalışanlarını ve abonelik durumlarını takip edin.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-global-settings"]',
    popover: {
      title: 'Global Ayarlar',
      description: 'Sistem genelindeki ayarları buradan yapılandırabilirsiniz. Asgari ücret, kayıt modu, SMS ayarları ve daha fazlası.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-subscriptions"]',
    popover: {
      title: 'Abonelik Yönetimi',
      description: 'Paket yönetimi, abonelikler ve ödeme geçmişini bu bölümden takip edebilirsiniz.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="header-notifications"]',
    popover: {
      title: 'Bildirimler',
      description: 'Sistem bildirimleri burada görüntülenir. Yeni talepler, onay bekleyen işlemler ve önemli uyarılar.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '[data-tour="header-messages"]',
    popover: {
      title: 'Mesajlar',
      description: 'Bayiler ve şirketlerle iletişim kurmak için mesajlaşma modülünü kullanın.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '[data-tour="dashboard-summary-cards"]',
    popover: {
      title: 'Özet Kartlar',
      description: 'Sistemdeki aktif bayiler, şirketler, çalışanlar ve talep sayılarına hızlı bir bakış atabilirsiniz.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    popover: {
      title: 'Tur Tamamlandı! ✅',
      description: 'Artık sistemi kullanmaya başlayabilirsiniz. Bu turu istediğiniz zaman sol alt köşedeki butondan tekrar başlatabilirsiniz.',
      side: 'over',
      align: 'center'
    }
  }
]
