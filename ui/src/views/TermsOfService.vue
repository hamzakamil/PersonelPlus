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
        <span class="text-sm text-gray-500">Kullanim Sartlari</span>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div class="bg-white rounded-xl shadow-sm p-8 sm:p-12 space-y-8">

        <div class="text-center border-b pb-8">
          <h2 class="text-3xl font-bold text-gray-900">Kullanim Sartlari</h2>
          <p class="mt-2 text-gray-500">Son guncelleme: {{ lastUpdated }}</p>
        </div>

        <!-- 1. Genel Hükümler -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">1. Genel Hukumler</h3>
          <p class="text-gray-700 leading-relaxed">
            Bu Kullanim Sartlari, {{ appTitle }} ("Platform") tarafindan sunulan insan kaynaklari yonetim hizmetlerinin kullanimina iliskin kosullari duzenler. Platforma kayit olarak veya Platformu kullanarak bu sartlari kabul etmis sayilirsiniz. Bu sartlari kabul etmiyorsaniz Platformu kullanmayiniz.
          </p>
        </section>

        <!-- 2. Tanimlar -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">2. Tanimlar</h3>
          <div class="space-y-3">
            <div class="flex gap-2">
              <span class="font-medium text-gray-900 whitespace-nowrap">"Platform":</span>
              <span class="text-gray-700">{{ appTitle }} web uygulamasi ve ilgili tum hizmetler.</span>
            </div>
            <div class="flex gap-2">
              <span class="font-medium text-gray-900 whitespace-nowrap">"Kullanici":</span>
              <span class="text-gray-700">Platforma kayitli tum bireysel kullanicilar (calisanlar, yoneticiler, adminler).</span>
            </div>
            <div class="flex gap-2">
              <span class="font-medium text-gray-900 whitespace-nowrap">"Abone":</span>
              <span class="text-gray-700">Platform uzerinden abonelik satin alan bayi veya sirket yoneticileri.</span>
            </div>
            <div class="flex gap-2">
              <span class="font-medium text-gray-900 whitespace-nowrap">"Hizmet":</span>
              <span class="text-gray-700">Platformun sundugu insan kaynaklari yonetimi, puantaj, izin takibi, bordro ve diger IK hizmetleri.</span>
            </div>
          </div>
        </section>

        <!-- 3. Hizmet Kapsamı -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">3. Hizmet Kapsami</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            {{ appTitle }}, multi-tenant SaaS yapisinda asagidaki hizmetleri sunmaktadir:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-2">
            <li>Calisan bilgi yonetimi ve personel kayitlari</li>
            <li>Puantaj (devamsizlik takvimi) yonetimi</li>
            <li>Yillik izin, rapor ve diger izin turleri takibi</li>
            <li>Mesai ve avans talep yonetimi</li>
            <li>Bordro goruntuleme ve onay surecleri</li>
            <li>Departman ve organizasyon yonetimi</li>
            <li>Raporlama ve istatistik hizmetleri</li>
            <li>Bildirim ve iletisim altyapisi</li>
          </ul>
        </section>

        <!-- 4. Hesap Oluşturma -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">4. Hesap Olusturma ve Guvenlik</h3>
          <div class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">4.1. Kayit</h4>
              <p class="text-gray-700">
                Platformu kullanmak icin gecerli bir e-posta adresi ile kayit olmaniz veya Google hesabiniz ile giris yapmaniz gerekmektedir. Kayit sirasinda verdigeniz bilgilerin dogru ve guncel olmasi sizin sorumlulugunuzdadir.
              </p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">4.2. Hesap Guvenligi</h4>
              <p class="text-gray-700">
                Hesap bilgilerinizin (sifre, oturum tokeni vb.) gizliligini korumak sizin sorumlulugunuzdadir. Hesabiniz uzerinden gerceklestirilen tum islemlerden siz sorumlusunuz. Yetkisiz erisim tespit ettiginizde derhal bize bildirmeniz gerekmektedir.
              </p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">4.3. Google ile Giris</h4>
              <p class="text-gray-700">
                Google hesabiniz ile giris yaptiginizda, Google'in kullanim sartlari ve gizlilik politikasi da gecerlidir. Google hesabiniz uzerinden saglanan kimlik dogrulama bilgilerinin dogrulugu Google tarafindan garanti edilmektedir.
              </p>
            </div>
          </div>
        </section>

        <!-- 5. Kullanım Kuralları -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">5. Kullanim Kurallari</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            Platform kullanicilari asagidaki kurallara uymakla yukumludur:
          </p>
          <div class="space-y-3">
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Platformu yalnizca yasal amaclarla ve is sureclerinin yonetimi icin kullanmak</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Dogru ve guncel bilgiler saglamak</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Diger kullanicilarin kisisel verilerini korumak ve gizlilige saygı gostermek</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Is mevzuatina ve ilgili yasal duzenlemelere uygun hareket etmek</span>
            </div>
          </div>

          <p class="text-gray-700 leading-relaxed mt-4 mb-3">
            Asagidaki davranislar kesinlikle yasaktir:
          </p>
          <div class="space-y-3">
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Yetkisiz erisim girisimleri veya guvenlık acıklarını kötüye kullanma</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Platformu baskalarinin haklarina zarar verecek sekilde kullanma</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Otomatik bot, crawler veya benzeri araclarla Platforma erisim</span>
            </div>
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700">Yaniltici, sahte veya hukuka aykiri icerik yukleme</span>
            </div>
          </div>
        </section>

        <!-- 6. Abonelik ve Ödeme -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">6. Abonelik ve Odeme</h3>
          <div class="space-y-3 text-gray-700 leading-relaxed">
            <p>
              <strong>6.1.</strong> Platform hizmetleri abonelik modeli ile sunulmaktadir. Abonelik paketleri, fiyatlari ve ozellikleri Platform uzerinde belirtilmektedir.
            </p>
            <p>
              <strong>6.2.</strong> Odemeler, Iyzipay odeme altyapisi uzerinden guvenli sekilde gerceklestirilir. Kredi karti bilgileriniz Platform tarafindan saklanmaz; dogrudan Iyzipay tarafindan islenir.
            </p>
            <p>
              <strong>6.3.</strong> Abonelik suresi sonunda yenileme yapilmazsa, Platforma erisim kisitlanabilir. Verileriniz yasal saklama suresi boyunca korunmaya devam eder.
            </p>
            <p>
              <strong>6.4.</strong> Iade ve iptal kosullari, satin alma sirasinda belirtilen sartlara tabidir. Mesafeli satis sozlesmesi hukumleri gecerlidir.
            </p>
          </div>
        </section>

        <!-- 7. Fikri Mülkiyet -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">7. Fikri Mulkiyet Haklari</h3>
          <p class="text-gray-700 leading-relaxed">
            Platform, tum icerik, tasarim, yazilim, logo, marka ve diger fikri mulkiyet unsurlari dahil olmak uzere {{ appTitle }}'a aittir ve telif haklari ile korunmaktadir. Kullanicilar, Platform icerigini kopyalayamaz, cogaltamaz, dagitamaz veya ticari amacla kullanamazlar. Kullanicilarin Platforma yukledikleri veriler uzerindeki haklar kendilerine aittir.
          </p>
        </section>

        <!-- 8. Veri Koruma -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">8. Veri Koruma ve Gizlilik</h3>
          <p class="text-gray-700 leading-relaxed">
            Kisisel verilerinizin islenmesi hakkinda detayli bilgi icin
            <router-link to="/privacy-policy" class="text-blue-600 hover:text-blue-800 underline font-medium">
              Gizlilik Politikamizi
            </router-link>
            incelemenizi oneririz. Platform, 6698 sayili KVKK ve ilgili mevzuat hukumlerine uygun olarak faaliyet gostermektedir. Multi-tenant yapisinda her sirketin verileri birbirinden izole sekilde saklanmakta ve islenmektedir.
          </p>
        </section>

        <!-- 9. Sorumluluk Sınırlaması -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">9. Sorumluluk Sinirlamasi</h3>
          <div class="space-y-3 text-gray-700 leading-relaxed">
            <p>
              <strong>9.1.</strong> Platform "oldugu gibi" (as-is) sunulmakta olup, kesintisiz veya hatasiz calisacagi garanti edilmemektedir. Bakim, guncelleme ve teknik nedenlerle hizmet kesintileri yasanabilir.
            </p>
            <p>
              <strong>9.2.</strong> Platform, kullanicilarin girdikleri verilerin dogrulugu, eksiksizligi veya yasal uygunlugu konusunda sorumluluk kabul etmez. SGK, vergi ve diger yasal bildirimlerin dogrulugu sirket yoneticisinin sorumlulugundadir.
            </p>
            <p>
              <strong>9.3.</strong> Platformun kullanimindan kaynaklanan dolayli, arizi veya cezai zararlardan sorumluluk kabul edilmez. Dogrudan zararlarda sorumluluk, ilgili abonelik doneminde odenen ucretle sinirlidir.
            </p>
          </div>
        </section>

        <!-- 10. Hesap Askıya Alma ve Fesih -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">10. Hesap Askiya Alma ve Fesih</h3>
          <div class="space-y-3 text-gray-700 leading-relaxed">
            <p>
              <strong>10.1.</strong> Kullanim sartlarinin ihlali halinde hesabiniz onceden bildirimde bulunmaksizin askiya alinabilir veya feshedilebilir.
            </p>
            <p>
              <strong>10.2.</strong> Hesap feshi durumunda, yasal saklama yukumlulugu bulunan veriler disindaki kisisel verileriniz makul bir sure icinde silinir.
            </p>
            <p>
              <strong>10.3.</strong> Kullanici, dilediği zaman hesabinin silinmesini talep edebilir. Silme talebi, veri sorumlusu (sirket yoneticisi) onayina tabidir.
            </p>
          </div>
        </section>

        <!-- 11. Üçüncü Taraf Hizmetleri -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">11. Ucuncu Taraf Hizmetleri</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            Platform, asagidaki ucuncu taraf hizmetlerini kullanmaktadir:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="font-medium text-gray-900">Google OAuth</p>
              <p class="text-gray-600 text-sm">Kimlik dogrulama hizmeti</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="font-medium text-gray-900">Google reCAPTCHA</p>
              <p class="text-gray-600 text-sm">Bot koruma hizmeti</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="font-medium text-gray-900">Iyzipay</p>
              <p class="text-gray-600 text-sm">Odeme altyapisi</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="font-medium text-gray-900">SMTP E-posta</p>
              <p class="text-gray-600 text-sm">Bildirim gonderimleri</p>
            </div>
          </div>
          <p class="text-gray-600 text-sm mt-3">
            Bu hizmetlerin kendi kullanim sartlari ve gizlilik politikalari gecerlidir. Platform, ucuncu taraf hizmetlerinin kesintileri veya degisikliklerinden sorumlu degildir.
          </p>
        </section>

        <!-- 12. Değişiklikler -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">12. Sartlarda Degisiklik</h3>
          <p class="text-gray-700 leading-relaxed">
            Bu Kullanim Sartlari, yasal gereklilikler veya hizmet degisiklikleri dogrultusunda guncellenebilir. Onemli degisiklikler yapilmasi halinde, Platform uzerinden ve/veya e-posta yoluyla bilgilendirileceksiniz. Degisiklik sonrasi Platformu kullanmaya devam etmeniz, guncel sartlari kabul ettiginiz anlamina gelir.
          </p>
        </section>

        <!-- 13. Uygulanacak Hukuk -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">13. Uygulanacak Hukuk ve Uyusmazlik Cozumu</h3>
          <p class="text-gray-700 leading-relaxed">
            Bu Kullanim Sartlari, Turkiye Cumhuriyeti kanunlarina tabidir. Taraflar arasinda dogabilecek uyusmazliklarda Turkiye Cumhuriyeti mahkemeleri ve icra daireleri yetkilidir. Tüketici uyusmazliklarinda 6502 sayili Tuketicinin Korunmasi Hakkinda Kanun hukumleri gecerlidir.
          </p>
        </section>

        <!-- 14. İletişim -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">14. Iletisim</h3>
          <p class="text-gray-700 leading-relaxed">
            Kullanim sartlari hakkinda sorulariniz veya geri bildirimleriniz icin:
          </p>
          <div class="mt-4 bg-gray-50 rounded-lg p-5">
            <p class="text-gray-700"><strong>Platform:</strong> {{ appTitle }}</p>
            <p class="text-gray-700 mt-1"><strong>E-posta:</strong> destek@personelplus.com</p>
          </div>
        </section>

        <!-- Footer -->
        <div class="border-t pt-6 text-center">
          <p class="text-gray-500 text-sm">
            &copy; {{ currentYear }} {{ appTitle }}. Tum haklar saklidir.
          </p>
          <div class="flex items-center justify-center gap-4 mt-4">
            <router-link to="/login" class="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
              &larr; Giris Sayfasi
            </router-link>
            <span class="text-gray-300">|</span>
            <router-link to="/privacy-policy" class="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
              Gizlilik Politikasi
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
const lastUpdated = '18 Subat 2026'
</script>
