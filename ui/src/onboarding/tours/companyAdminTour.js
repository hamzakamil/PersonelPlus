export const TOUR_ID = 'company_admin_dashboard'

export const getSteps = () => [
  {
    popover: {
      title: 'Şirket Panelinize Hoşgeldiniz! 👋',
      description: 'Bu tur, şirket yönetim panelinizi tanıtacak. Çalışanlarınızı, izinleri ve talepleri kolayca yönetin.',
      side: 'over',
      align: 'center'
    }
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Yönetim Menüsü',
      description: 'Sol menüde çalışanlar, izinler, avanslar, puantaj, bordro ve daha fazlasına erişebilirsiniz.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-employees"]',
    popover: {
      title: 'Çalışan Yönetimi',
      description: 'Çalışanlarınızı görüntüleyin, yeni çalışan ekleyin, işe giriş/çıkış işlemlerini yapın.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-leaves"]',
    popover: {
      title: 'İzin Yönetimi',
      description: 'İzin taleplerini inceleyin ve onaylayın. İzin cetveli, özet ve bakiye raporlarını görüntüleyin.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-advance"]',
    popover: {
      title: 'Avans Talepleri',
      description: 'Çalışan avans taleplerini buradan inceleyin ve onayla/reddet işlemleri yapın.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-puantaj"]',
    popover: {
      title: 'Aylık Puantaj',
      description: 'Aylık devam durumunu görüntüleyin ve düzenleyin. Çalışanlarınızın giriş/çıkış kayıtları burada.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-bordro"]',
    popover: {
      title: 'Bordro Yönetimi',
      description: 'Bordro onaylama, listeleme ve istatistik işlemlerini bu bölümden yapabilirsiniz.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-settings"]',
    popover: {
      title: 'Ayarlar',
      description: 'Şirket bilgileri, çalışma saatleri, izin türleri ve diğer yapılandırmaları buradan yönetin.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="header-notifications"]',
    popover: {
      title: 'Bildirimler',
      description: 'Yeni izin talepleri, avans istekleri ve diğer önemli bildirimler burada.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '[data-tour="dashboard-summary-cards"]',
    popover: {
      title: 'Günlük Özet',
      description: 'Bugün giriş yapanlar, geç kalanlar, izinli çalışanlar ve bekleyen talepleri bir bakışta görün.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="dashboard-quick-approve"]',
    popover: {
      title: 'Hızlı Onay Paneli',
      description: 'Bekleyen talepleri buradan hızlıca onaylayabilir veya reddedebilirsiniz. Zaman kazandıran pratik bir özellik!',
      side: 'top',
      align: 'center'
    }
  },
  {
    popover: {
      title: 'Tur Tamamlandı! ✅',
      description: 'Şirket panelinizi kullanmaya hazırsınız. Turu tekrar izlemek için sol alt köşedeki butonu kullanabilirsiniz.',
      side: 'over',
      align: 'center'
    }
  }
]
