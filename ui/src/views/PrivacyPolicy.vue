<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <router-link to="/login" class="text-blue-600 hover:text-blue-800 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </router-link>
          <h1 class="text-2xl font-bold text-gray-900">{{ appTitle }}</h1>
        </div>
        <span class="text-sm text-gray-500">Gizlilik Politikası</span>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div class="bg-white rounded-xl shadow-sm p-8 sm:p-12 space-y-8">

        <div class="text-center border-b pb-8">
          <h2 class="text-3xl font-bold text-gray-900">Gizlilik Politikası</h2>
          <p class="mt-2 text-gray-500">Son güncelleme: {{ lastUpdated }}</p>
        </div>

        <!-- 1. Giriş -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">1. Giriş</h3>
          <p class="text-gray-700 leading-relaxed">
            {{ appTitle }} ("Platform", "Biz"), kullanıcıların gizliliğine büyük önem verir. Bu Gizlilik Politikası, Platformumuzu kullandığınızda kişisel verilerinizin nasıl toplandığı, işlendiği, saklandığı ve korunduğu hakkında sizi bilgilendirmek amacıyla hazırlanmıştır. Bu politika, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve ilgili mevzuat hükümleri ile Avrupa Birliği Genel Veri Koruma Tüzüğü (GDPR) kapsamında düzenlenmiştir.
          </p>
        </section>

        <!-- 2. Veri Sorumlusu -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">2. Veri Sorumlusu</h3>
          <p class="text-gray-700 leading-relaxed">
            {{ appTitle }} platformu, multi-tenant SaaS yapısında hizmet veren bir insan kaynakları yönetim sistemidir. Platformda veri sorumlusu, ilgili şirket/bayi yöneticisidir. Platform sağlayıcısı olarak biz, veri işleyen konumunda teknik altyapıyı sağlamaktayız.
          </p>
        </section>

        <!-- 3. Toplanan Veriler -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">3. Toplanan Kişisel Veriler</h3>
          <p class="text-gray-700 leading-relaxed mb-4">
            Platformumuz aşağıdaki kişisel verileri toplamakta ve işlemektedir:
          </p>

          <div class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">3.1. Hesap Bilgileri</h4>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>Ad, soyad ve e-posta adresi</li>
                <li>Şifre (şifrelenmiş/hashlanmış olarak)</li>
                <li>Telefon numarası</li>
                <li>Profil fotoğrafı</li>
              </ul>
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">3.2. Google Hesap Bilgileri</h4>
              <p class="text-gray-700 mb-2">
                Google ile giriş yapmanız halinde, Google hesabınızdan aşağıdaki bilgiler alınır:
              </p>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>Google hesap kimlik numarası (Google ID)</li>
                <li>E-posta adresi</li>
                <li>Ad ve soyad</li>
                <li>Profil fotoğrafı URL'si</li>
              </ul>
              <p class="text-gray-600 text-sm mt-2">
                Google OAuth entegrasyonu yalnızca kimlik doğrulama amacı ile kullanılmaktadır. Google hesabınızdaki diğer verilere (rehber, takvim, dosyalar vb.) erişim sağlanmaz.
              </p>
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">3.3. Çalışma Bilgileri</h4>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>Şirket ve departman bilgileri</li>
                <li>Görev unvanı ve pozisyon</li>
                <li>İşe giriş/çıkış tarihleri</li>
                <li>Devamsızlık ve izin kayıtları</li>
                <li>Puantaj (çalışma takvimi) verileri</li>
                <li>Maaş ve bordro bilgileri</li>
                <li>Avans ve mesai talepleri</li>
              </ul>
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">3.4. Teknik Veriler</h4>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>IP adresi ve tarayıcı bilgileri</li>
                <li>Giriş/çıkış zaman damgaları</li>
                <li>Oturum bilgileri (JWT token)</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 4. Verilerin İşlenmesi -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">4. Verilerin İşlenme Amaçları</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-2">
            <li>Kullanıcı hesabı oluşturma ve kimlik doğrulama</li>
            <li>Google OAuth ile güvenli giriş sağlama</li>
            <li>İnsan kaynakları yönetim hizmetlerinin sunulması</li>
            <li>İzin, devamsızlık ve puantaj yönetimi</li>
            <li>Bordro ve maaş hesaplamalarının yapılması</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi (SGK, vergi vb.)</li>
            <li>Platform güvenliğinin sağlanması</li>
            <li>Bildirim ve iletişim hizmetleri</li>
            <li>Abonelik ve ödeme işlemlerinin yönetimi</li>
          </ul>
        </section>

        <!-- 5. Hukuki Dayanak -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">5. Hukuki Dayanak</h3>
          <p class="text-gray-700 leading-relaxed">
            Kişisel verileriniz, KVKK'nin 5. ve 6. maddelerinde belirtilen aşağıdaki hukuki sebeplere dayalı olarak işlenmektedir:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-2 mt-3">
            <li>Açık rızanız (Google ile giriş, profil fotoğrafı yükleme)</li>
            <li>Sözleşmenin kurulması ve ifası</li>
            <li>Hukuki yükümlülüğün yerine getirilmesi (SGK bildirimleri, İş Kanunu)</li>
            <li>Veri sorumlusunun meşru menfaati (platform güvenliği)</li>
          </ul>
        </section>

        <!-- 6. Google API Kullanımı -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">6. Google API Hizmetleri Kullanımı</h3>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <p class="text-gray-700 leading-relaxed mb-3">
              Platformumuz, Google OAuth 2.0 protokolünü kullanarak "Google ile Giriş" özelliği sunmaktadır. Bu kapsamda:
            </p>
            <ul class="list-disc list-inside text-gray-700 space-y-2">
              <li>Yalnızca kimlik doğrulama için gerekli minimum bilgiler (e-posta, ad, profil fotoğrafı) alınır</li>
              <li>Google hesabınızdaki diğer verilere erişim sağlanmaz</li>
              <li>Google API'den alınan veriler yalnızca hesap oluşturma ve giriş işlemi için kullanılır</li>
              <li>Google hesap bilgileriniz üçüncü taraflarla paylaşılmaz</li>
              <li>Google API Hizmetleri Kullanıcı Veri Politikası'na (Google API Services User Data Policy) uygun hareket edilir</li>
              <li>Sınırlı kullanım gereksinimleri (Limited Use requirements) dahilinde verileriniz işlenir</li>
            </ul>
            <p class="text-gray-600 text-sm mt-3">
              Google hesabınızı dilediğiniz zaman platformdan ayırabilir ve Google ile ilişkili verilerinizin silinmesini talep edebilirsiniz.
            </p>
          </div>
        </section>

        <!-- 7. Veri Saklama -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">7. Verilerin Saklanması ve Güvenliği</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca saklanmaktadır:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-2">
            <li>Hesap bilgileri: Hesap aktif olduğu sürece</li>
            <li>Çalışma verileri: Yasal saklama süreleri boyunca (İş Kanunu gereği en az 10 yıl)</li>
            <li>Giriş kayıtları: 1 yıl</li>
            <li>Şifreler: Bcrypt ile tek yönlü şifrelenerek saklanır (geri dönüştürülemez)</li>
          </ul>
          <p class="text-gray-700 leading-relaxed mt-3">
            Verileriniz JWT tabanlı kimlik doğrulama, HTTPS şifreleme ve erişim kontrolü mekanizmaları ile korunmaktadır. MongoDB veritabanı endüstri standartlarında güvenlik önlemleri ile yönetilmektedir.
          </p>
        </section>

        <!-- 8. Veri Paylaşımı -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">8. Verilerin Paylaşılması</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            Kişisel verileriniz aşağıdaki durumlar dışında üçüncü taraflarla paylaşılmaz:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-2">
            <li><strong>Yasal zorunluluk:</strong> Yetkili kamu kurum ve kuruluşların talepleri doğrultusunda</li>
            <li><strong>İş ilişkisi:</strong> Bağlı olduğunuz şirketin yetkili yöneticileri ile (iş ilişkisi kapsamında)</li>
            <li><strong>Ödeme işlemleri:</strong> Iyzipay ödeme altyapısı ile (yalnızca ödeme bilgileri)</li>
            <li><strong>E-posta hizmetleri:</strong> SMTP sağlayıcısı ile (yalnızca bildirim gönderimleri)</li>
          </ul>
          <p class="text-gray-700 leading-relaxed mt-3">
            Verileriniz yurt dışına aktarılmaz. Tüm veriler Türkiye sınırlarındaki sunucularda saklanır.
          </p>
        </section>

        <!-- 9. Çerezler -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">9. Çerezler ve Yerel Depolama</h3>
          <p class="text-gray-700 leading-relaxed">
            Platformumuz, oturum yönetimi için tarayıcınızın yerel depolama alanını (localStorage) kullanmaktadır. Burada yalnızca kimlik doğrulama tokeni (JWT) ve temel kullanıcı bilgileri saklanır. Üçüncü taraf izleme çerezleri veya reklam çerezleri kullanılmamaktadır.
          </p>
        </section>

        <!-- 10. Kullanıcı Hakları -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">10. Haklarınız</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            KVKK'nin 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">Kişisel verilerinizin işlenip işlenmediğini öğrenme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">İşlenmişse buna ilişkin bilgi talep etme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">Verilerin silinmesini veya yok edilmesini isteme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">İşlenen verilerin üçüncü kişilere bildirilmesini isteme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">İşlemin aleyhinize bir sonuç çıkması durumunda itiraz etme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">Kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme</span>
            </div>
          </div>
        </section>

        <!-- 11. Google Hesap Ayırma -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">11. Google Hesabının Ayrılması</h3>
          <p class="text-gray-700 leading-relaxed">
            Google hesabınızı platformdan ayırmak istediğinizde, hesap ayarlarınızdan bu işlemi gerçekleştirebilirsiniz. Ayırma işlemi sonrasında Google ID bilginiz sistemimizden silinir ve bundan sonra yalnızca e-posta/şifre ile giriş yapabilirsiniz. Ayrıca Google hesabınızın
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">
              üçüncü taraf erişim ayarlarından
            </a>
            platformumuzun erişimini kaldırabilirsiniz.
          </p>
        </section>

        <!-- 12. Çocukların Gizliliği -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">12. Çocukların Gizliliği</h3>
          <p class="text-gray-700 leading-relaxed">
            Platformumuz 18 yaşından küçük bireylere yönelik değildir. Bilerek 18 yaşından küçük bireylerden kişisel veri toplamamaktayız. Böyle bir durumun tespiti halinde ilgili veriler derhal silinir.
          </p>
        </section>

        <!-- 13. Değişiklikler -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">13. Politika Değişiklikleri</h3>
          <p class="text-gray-700 leading-relaxed">
            Bu Gizlilik Politikası, yasal değişiklikler veya platform güncellemeleri doğrultusunda zaman zaman revize edilebilir. Önemli değişiklikler yapılması halinde, platformumuz üzerinden ve/veya e-posta yoluyla bilgilendirileceksiniz. Güncel versiyonu her zaman bu sayfadan görebilirsiniz.
          </p>
        </section>

        <!-- 14. İletişim -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">14. İletişim</h3>
          <p class="text-gray-700 leading-relaxed">
            Gizlilik politikamız hakkında sorularınız veya KVKK kapsamındaki talepleriniz için aşağıdaki kanallar üzerinden bizimle iletişime geçebilirsiniz:
          </p>
          <div class="mt-4 bg-gray-50 rounded-lg p-5">
            <p class="text-gray-700"><strong>Platform:</strong> {{ appTitle }}</p>
            <p class="text-gray-700 mt-1"><strong>E-posta:</strong> destek@personelplus.com</p>
            <p class="text-gray-600 text-sm mt-3">
              KVKK kapsamındaki başvurularınız, talebin bize ulaşmasından itibaren en geç 30 gün içinde sonuçlandırılır.
            </p>
          </div>
        </section>

        <!-- Footer -->
        <div class="border-t pt-6 text-center">
          <p class="text-gray-500 text-sm">
            &copy; {{ currentYear }} {{ appTitle }}. Tüm hakları saklıdır.
          </p>
          <div class="flex items-center justify-center gap-4 mt-4">
            <router-link to="/login" class="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
              &larr; Giriş Sayfası
            </router-link>
            <span class="text-gray-300">|</span>
            <router-link to="/terms-of-service" class="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
              Kullanım Şartları
            </router-link>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
const appTitle = import.meta.env.VITE_APP_TITLE || 'PersonelPlus'
const currentYear = new Date().getFullYear()
const lastUpdated = '18 Şubat 2026'
</script>
