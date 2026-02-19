export const TOUR_ID = 'employee_dashboard'

export const getSteps = () => [
  {
    popover: {
      title: 'PersonelPlus\'a Hoşgeldiniz! 👋',
      description: 'Bu kısa tur, çalışan panelinizin temel özelliklerini tanıtacak.',
      side: 'over',
      align: 'center'
    }
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Menünüz',
      description: 'Sol menüde bordro, izin talepleri, avans ve hesap bilgilerinize erişebilirsiniz.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-my-bordros"]',
    popover: {
      title: 'Bordrolarım',
      description: 'Aylık bordrolarınızı görüntüleyin ve indirin.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-my-leaves"]',
    popover: {
      title: 'İzin Taleplerim',
      description: 'Yeni izin talebi oluşturun, mevcut taleplerinizin durumunu takip edin.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-advance-requests"]',
    popover: {
      title: 'Avans Taleplerim',
      description: 'Avans talebinde bulunun ve önceki taleplerinizin durumunu görüntüleyin.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-messages"]',
    popover: {
      title: 'Mesajlar',
      description: 'Yöneticiniz ve İK departmanıyla mesajlaşma yoluyla iletişim kurun.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-my-account"]',
    popover: {
      title: 'Hesabım',
      description: 'Kişisel bilgilerinizi güncelleyin ve şifrenizi değiştirin.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="header-notifications"]',
    popover: {
      title: 'Bildirimler',
      description: 'İzin onayları, reddedilen talepler ve diğer bildirimler burada görüntülenir.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '[data-tour="dashboard-summary-cards"]',
    popover: {
      title: 'Özet Bilgileriniz',
      description: 'Bugün giriş durumunuz, kalan izin günleriniz, bekleyen talepleriniz ve yaklaşan izinleriniz.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    popover: {
      title: 'Hazırsınız! ✅',
      description: 'Çalışan panelinizi kullanmaya başlayabilirsiniz. Turu tekrar izlemek için sol alt köşedeki butonu kullanın.',
      side: 'over',
      align: 'center'
    }
  }
]
