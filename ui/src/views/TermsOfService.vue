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
        <span class="text-sm text-gray-500">Kullanım Şartları</span>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div class="bg-white rounded-xl shadow-sm p-8 sm:p-12 space-y-8">

        <div class="text-center border-b pb-8">
          <h2 class="text-3xl font-bold text-gray-900">Kullanım Şartları</h2>
          <p class="mt-2 text-gray-500">Son güncelleme: {{ lastUpdated }}</p>
        </div>

        <!-- 1. Genel Hükümler -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">1. Genel Hükümler</h3>
          <p class="text-gray-700 leading-relaxed">
            Bu Kullanım Şartları, {{ appTitle }} ("Platform") tarafından sunulan insan kaynakları yönetim hizmetlerinin kullanımına ilişkin koşulları düzenler. Platforma kayıt olarak veya Platformu kullanarak bu şartları kabul etmiş sayılırsınız. Bu şartları kabul etmiyorsanız Platformu kullanmayınız.
          </p>
        </section>

        <!-- 2. Tanımlar -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">2. Tanımlar</h3>
          <div class="space-y-3">
            <div class="flex gap-2">
              <span class="font-medium text-gray-900 whitespace-nowrap">"Platform":</span>
              <span class="text-gray-700">{{ appTitle }} web uygulaması ve ilgili tüm hizmetler.</span>
            </div>
            <div class="flex gap-2">
              <span class="font-medium text-gray-900 whitespace-nowrap">"Kullanıcı":</span>
              <span class="text-gray-700">Platforma kayıtlı tüm bireysel kullanıcılar (çalışanlar, yöneticiler, adminler).</span>
            </div>
            <div class="flex gap-2">
              <span class="font-medium text-gray-900 whitespace-nowrap">"Abone":</span>
              <span class="text-gray-700">Platform üzerinden abonelik satın alan bayi veya şirket yöneticileri.</span>
            </div>
            <div class="flex gap-2">
              <span class="font-medium text-gray-900 whitespace-nowrap">"Hizmet":</span>
              <span class="text-gray-700">Platformun sunduğu insan kaynakları yönetimi, puantaj, izin takibi, bordro ve diğer İK hizmetleri.</span>
            </div>
          </div>
        </section>

        <!-- 3. Hizmet Kapsamı -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">3. Hizmet Kapsamı</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            {{ appTitle }}, multi-tenant SaaS yapısında aşağıdaki hizmetleri sunmaktadır:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-2">
            <li>Çalışan bilgi yönetimi ve personel kayıtları</li>
            <li>Puantaj (devamsızlık takvimi) yönetimi</li>
            <li>Yıllık izin, rapor ve diğer izin türleri takibi</li>
            <li>Mesai ve avans talep yönetimi</li>
            <li>Bordro görüntüleme ve onay süreçleri</li>
            <li>Departman ve organizasyon yönetimi</li>
            <li>Raporlama ve istatistik hizmetleri</li>
            <li>Bildirim ve iletişim altyapısı</li>
          </ul>
        </section>

        <!-- 4. Hesap Oluşturma -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">4. Hesap Oluşturma ve Güvenlik</h3>
          <div class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">4.1. Kayıt</h4>
              <p class="text-gray-700">
                Platformu kullanmak için geçerli bir e-posta adresi ile kayıt olmanız veya Google hesabınız ile giriş yapmanız gerekmektedir. Kayıt sırasında verdiğiniz bilgilerin doğru ve güncel olması sizin sorumluluğunuzdadır.
              </p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">4.2. Hesap Güvenliği</h4>
              <p class="text-gray-700">
                Hesap bilgilerinizin (şifre, oturum tokeni vb.) gizliliğini korumak sizin sorumluluğunuzdadır. Hesabınız üzerinden gerçekleştirilen tüm işlemlerden siz sorumlusunuz. Yetkisiz erişim tespit ettiğinizde derhal bize bildirmeniz gerekmektedir.
              </p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">4.3. Google ile Giriş</h4>
              <p class="text-gray-700">
                Google hesabınız ile giriş yaptığınızda, Google'ın kullanım şartları ve gizlilik politikası da geçerlidir. Google hesabınız üzerinden sağlanan kimlik doğrulama bilgilerinin doğruluğu Google tarafından garanti edilmektedir.
              </p>
            </div>
          </div>
        </section>

        <!-- 5. Kullanım Kuralları -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">5. Kullanım Kuralları</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            Platform kullanıcıları aşağıdaki kurallara uymakla yükümlüdür:
          </p>
          <div class="space-y-3">
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Platformu yalnızca yasal amaçlarla ve iş süreçlerinin yönetimi için kullanmak</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Doğru ve güncel bilgiler sağlamak</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Diğer kullanıcıların kişisel verilerini korumak ve gizliliğe saygı göstermek</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">İş mevzuatına ve ilgili yasal düzenlemelere uygun hareket etmek</span>
            </div>
          </div>

          <p class="text-gray-700 leading-relaxed mt-4 mb-3">
            Aşağıdaki davranışlar kesinlikle yasaktır:
          </p>
          <div class="space-y-3">
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Yetkisiz erişim girişimleri veya güvenlik açıklarını kötüye kullanma</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Platformu başkalarının haklarına zarar verecek şekilde kullanma</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Otomatik bot, crawler veya benzeri araçlarla Platforma erişim</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Yanıltıcı, sahte veya hukuka aykırı içerik yükleme</span>
            </div>
          </div>
        </section>

        <!-- 6. Abonelik ve Ödeme -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">6. Abonelik ve Ödeme</h3>
          <div class="space-y-3 text-gray-700 leading-relaxed">
            <p>
              <strong>6.1.</strong> Platform hizmetleri abonelik modeli ile sunulmaktadır. Abonelik paketleri, fiyatları ve özellikleri Platform üzerinde belirtilmektedir.
            </p>
            <p>
              <strong>6.2.</strong> Ödemeler, Iyzipay ödeme altyapısı üzerinden güvenli şekilde gerçekleştirilir. Kredi kartı bilgileriniz Platform tarafından saklanmaz; doğrudan Iyzipay tarafından işlenir.
            </p>
            <p>
              <strong>6.3.</strong> Abonelik süresi sonunda yenileme yapılmazsa, Platforma erişim kısıtlanabilir. Verileriniz yasal saklama süresi boyunca korunmaya devam eder.
            </p>
            <p>
              <strong>6.4.</strong> İade ve iptal koşulları, satın alma sırasında belirtilen şartlara tabidir. Mesafeli satış sözleşmesi hükümleri geçerlidir.
            </p>
          </div>
        </section>

        <!-- 7. Fikri Mülkiyet -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">7. Fikri Mülkiyet Hakları</h3>
          <p class="text-gray-700 leading-relaxed">
            Platform, tüm içerik, tasarım, yazılım, logo, marka ve diğer fikri mülkiyet unsurları dahil olmak üzere {{ appTitle }}'a aittir ve telif hakları ile korunmaktadır. Kullanıcılar, Platform içeriğini kopyalayamaz, çoğaltamaz, dağıtamaz veya ticari amaçla kullanamazlar. Kullanıcıların Platforma yükledikleri veriler üzerindeki haklar kendilerine aittir.
          </p>
        </section>

        <!-- 8. Veri Koruma -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">8. Veri Koruma ve Gizlilik</h3>
          <p class="text-gray-700 leading-relaxed">
            Kişisel verilerinizin işlenmesi hakkında detaylı bilgi için
            <router-link to="/privacy-policy" class="text-blue-600 hover:text-blue-800 underline font-medium">
              Gizlilik Politikamızı
            </router-link>
            incelemenizi öneririz. Platform, 6698 sayılı KVKK ve ilgili mevzuat hükümlerine uygun olarak faaliyet göstermektedir. Multi-tenant yapısında her şirketin verileri birbirinden izole şekilde saklanmakta ve işlenmektedir.
          </p>
        </section>

        <!-- 9. Sorumluluk Sınırlaması -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">9. Sorumluluk Sınırlaması</h3>
          <div class="space-y-3 text-gray-700 leading-relaxed">
            <p>
              <strong>9.1.</strong> Platform "olduğu gibi" (as-is) sunulmakta olup, kesintisiz veya hatasız çalışacağı garanti edilmemektedir. Bakım, güncelleme ve teknik nedenlerle hizmet kesintileri yaşanabilir.
            </p>
            <p>
              <strong>9.2.</strong> Platform, kullanıcıların girdikleri verilerin doğruluğu, eksiksizliği veya yasal uygunluğu konusunda sorumluluk kabul etmez. SGK, vergi ve diğer yasal bildirimlerin doğruluğu şirket yöneticisinin sorumluluğundadır.
            </p>
            <p>
              <strong>9.3.</strong> Platformun kullanımından kaynaklanan dolaylı, arızi veya cezai zararlardan sorumluluk kabul edilmez. Doğrudan zararlarda sorumluluk, ilgili abonelik döneminde ödenen ücretle sınırlıdır.
            </p>
          </div>
        </section>

        <!-- 10. Hesap Askıya Alma ve Fesih -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">10. Hesap Askıya Alma ve Fesih</h3>
          <div class="space-y-3 text-gray-700 leading-relaxed">
            <p>
              <strong>10.1.</strong> Kullanım şartlarının ihlali halinde hesabınız önceden bildirimde bulunmaksızın askıya alınabilir veya feshedilebilir.
            </p>
            <p>
              <strong>10.2.</strong> Hesap feshi durumunda, yasal saklama yükümlülüğü bulunan veriler dışındaki kişisel verileriniz makul bir süre içinde silinir.
            </p>
            <p>
              <strong>10.3.</strong> Kullanıcı, dilediği zaman hesabının silinmesini talep edebilir. Silme talebi, veri sorumlusu (şirket yöneticisi) onayına tabidir.
            </p>
          </div>
        </section>

        <!-- 11. Üçüncü Taraf Hizmetleri -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">11. Üçüncü Taraf Hizmetleri</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            Platform, aşağıdaki üçüncü taraf hizmetlerini kullanmaktadır:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="font-medium text-gray-900">Google OAuth</p>
              <p class="text-gray-600 text-sm">Kimlik doğrulama hizmeti</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="font-medium text-gray-900">Google reCAPTCHA</p>
              <p class="text-gray-600 text-sm">Bot koruma hizmeti</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="font-medium text-gray-900">Iyzipay</p>
              <p class="text-gray-600 text-sm">Ödeme altyapısı</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="font-medium text-gray-900">SMTP E-posta</p>
              <p class="text-gray-600 text-sm">Bildirim gönderimleri</p>
            </div>
          </div>
          <p class="text-gray-600 text-sm mt-3">
            Bu hizmetlerin kendi kullanım şartları ve gizlilik politikaları geçerlidir. Platform, üçüncü taraf hizmetlerinin kesintileri veya değişikliklerinden sorumlu değildir.
          </p>
        </section>

        <!-- 12. Değişiklikler -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">12. Şartlarda Değişiklik</h3>
          <p class="text-gray-700 leading-relaxed">
            Bu Kullanım Şartları, yasal gereklilikler veya hizmet değişiklikleri doğrultusunda güncellenebilir. Önemli değişiklikler yapılması halinde, Platform üzerinden ve/veya e-posta yoluyla bilgilendirileceksiniz. Değişiklik sonrası Platformu kullanmaya devam etmeniz, güncel şartları kabul ettiğiniz anlamına gelir.
          </p>
        </section>

        <!-- 13. Uygulanacak Hukuk -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">13. Uygulanacak Hukuk ve Uyuşmazlık Çözümü</h3>
          <p class="text-gray-700 leading-relaxed">
            Bu Kullanım Şartları, Türkiye Cumhuriyeti kanunlarına tabidir. Taraflar arasında doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti mahkemeleri ve icra daireleri yetkilidir. Tüketici uyuşmazlıklarında 6502 sayılı Tüketicinin Korunması Hakkında Kanun hükümleri geçerlidir.
          </p>
        </section>

        <!-- 14. İletişim -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">14. İletişim</h3>
          <p class="text-gray-700 leading-relaxed">
            Kullanım şartları hakkında sorularınız veya geri bildirimleriniz için:
          </p>
          <div class="mt-4 bg-gray-50 rounded-lg p-5">
            <p class="text-gray-700"><strong>Platform:</strong> {{ appTitle }}</p>
            <p class="text-gray-700 mt-1"><strong>E-posta:</strong> destek@personelplus.com</p>
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
            <router-link to="/privacy-policy" class="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
              Gizlilik Politikası
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
