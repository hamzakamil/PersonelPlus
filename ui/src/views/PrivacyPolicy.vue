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
        <span class="text-sm text-gray-500">Gizlilik Politikasi</span>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div class="bg-white rounded-xl shadow-sm p-8 sm:p-12 space-y-8">

        <div class="text-center border-b pb-8">
          <h2 class="text-3xl font-bold text-gray-900">Gizlilik Politikasi</h2>
          <p class="mt-2 text-gray-500">Son guncelleme: {{ lastUpdated }}</p>
        </div>

        <!-- 1. Giris -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">1. Giris</h3>
          <p class="text-gray-700 leading-relaxed">
            {{ appTitle }} ("Platform", "Biz"), kullanicilarin gizliligine buyuk onem verir. Bu Gizlilik Politikasi, Platformumuzu kullandiginizda kisisel verilerinizin nasil toplandigi, islendigi, saklandigi ve korundugu hakkinda sizi bilgilendirmek amaciyla hazirlanmistir. Bu politika, 6698 sayili Kisisel Verilerin Korunmasi Kanunu (KVKK) ve ilgili mevzuat hukümleri ile Avrupa Birligi Genel Veri Koruma Tüzügü (GDPR) kapsaminda duzenlenmistir.
          </p>
        </section>

        <!-- 2. Veri Sorumlusu -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">2. Veri Sorumlusu</h3>
          <p class="text-gray-700 leading-relaxed">
            {{ appTitle }} platformu, multi-tenant SaaS yapisinda hizmet veren bir insan kaynaklari yonetim sistemidir. Platformda veri sorumlusu, ilgili sirket/bayi yoneticisidir. Platform saglayicisi olarak biz, veri isleyen konumunda teknik altyapiyi saglamaktayiz.
          </p>
        </section>

        <!-- 3. Toplanan Veriler -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">3. Toplanan Kisisel Veriler</h3>
          <p class="text-gray-700 leading-relaxed mb-4">
            Platformumuz asagidaki kisisel verileri toplamakta ve islemektedir:
          </p>

          <div class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">3.1. Hesap Bilgileri</h4>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>Ad, soyad ve e-posta adresi</li>
                <li>Sifre (sifrelenmis/hashlanmis olarak)</li>
                <li>Telefon numarasi</li>
                <li>Profil fotografi</li>
              </ul>
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">3.2. Google Hesap Bilgileri</h4>
              <p class="text-gray-700 mb-2">
                Google ile giris yapmaniz halinde, Google hesabinizdan asagidaki bilgiler alinir:
              </p>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>Google hesap kimlik numarasi (Google ID)</li>
                <li>E-posta adresi</li>
                <li>Ad ve soyad</li>
                <li>Profil fotografi URL'si</li>
              </ul>
              <p class="text-gray-600 text-sm mt-2">
                Google OAuth entegrasyonu yalnizca kimlik dogrulama amaci ile kullanilmaktadir. Google hesabinizdaki diger verilere (rehber, takvim, dosyalar vb.) erisim saglanmaz.
              </p>
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">3.3. Calisma Bilgileri</h4>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>Sirket ve departman bilgileri</li>
                <li>Gorev unvani ve pozisyon</li>
                <li>Ise giris/cikis tarihleri</li>
                <li>Devamsizlik ve izin kayitlari</li>
                <li>Puantaj (calisma takvimi) verileri</li>
                <li>Maas ve bordro bilgileri</li>
                <li>Avans ve mesai talepleri</li>
              </ul>
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">3.4. Teknik Veriler</h4>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>IP adresi ve tarayici bilgileri</li>
                <li>Giris/cikis zaman damgalari</li>
                <li>Oturum bilgileri (JWT token)</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 4. Verilerin Islenmesi -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">4. Verilerin Islenme Amaclari</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            Kisisel verileriniz asagidaki amaclarla islenmektedir:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-2">
            <li>Kullanici hesabi olusturma ve kimlik dogrulama</li>
            <li>Google OAuth ile guvenli giris saglama</li>
            <li>Insan kaynaklari yonetim hizmetlerinin sunulmasi</li>
            <li>Izin, devamsizlik ve puantaj yonetimi</li>
            <li>Bordro ve maas hesaplamalarinin yapilmasi</li>
            <li>Yasal yukümlüluklerin yerine getirilmesi (SGK, vergi vb.)</li>
            <li>Platform guvenliginin saglanmasi</li>
            <li>Bildirim ve iletisim hizmetleri</li>
            <li>Abonelik ve odeme islemlerinin yonetimi</li>
          </ul>
        </section>

        <!-- 5. Hukuki Dayanak -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">5. Hukuki Dayanak</h3>
          <p class="text-gray-700 leading-relaxed">
            Kisisel verileriniz, KVKK'nin 5. ve 6. maddelerinde belirtilen asagidaki hukuki sebeplere dayali olarak islenmektedir:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-2 mt-3">
            <li>Acik rizaniz (Google ile giris, profil fotografi yukleme)</li>
            <li>Sozlesmenin kurulmasi ve ifasi</li>
            <li>Hukuki yukümlulugun yerine getirilmesi (SGK bildirimleri, Is Kanunu)</li>
            <li>Veri sorumlusunun mesru menfaati (platform guvenligi)</li>
          </ul>
        </section>

        <!-- 6. Google API Kullanimi -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">6. Google API Hizmetleri Kullanimi</h3>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <p class="text-gray-700 leading-relaxed mb-3">
              Platformumuz, Google OAuth 2.0 protokolunu kullanarak "Google ile Giris" ozelligi sunmaktadir. Bu kapsamda:
            </p>
            <ul class="list-disc list-inside text-gray-700 space-y-2">
              <li>Yalnizca kimlik dogrulama icin gerekli minimum bilgiler (e-posta, ad, profil fotografi) alinir</li>
              <li>Google hesabinizdaki diger verilere erisim saglanmaz</li>
              <li>Google API'den alinan veriler yalnizca hesap olusturma ve giris islemi icin kullanilir</li>
              <li>Google hesap bilgileriniz ucuncu taraflarla paylasilmaz</li>
              <li>Google API Hizmetleri Kullanici Veri Politikasi'na (Google API Services User Data Policy) uygun hareket edilir</li>
              <li>Sinirli kullanim gereksinimleri (Limited Use requirements) dahilinde verileriniz islenir</li>
            </ul>
            <p class="text-gray-600 text-sm mt-3">
              Google hesabinizi dilediginiz zaman platformdan ayirabilir ve Google ile iliskili verilerinizin silinmesini talep edebilirsiniz.
            </p>
          </div>
        </section>

        <!-- 7. Veri Saklama -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">7. Verilerin Saklanmasi ve Guvenligi</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            Kisisel verileriniz, isleme amacinin gerektirdigi süre boyunca saklanmaktadir:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-2">
            <li>Hesap bilgileri: Hesap aktif oldugu sürece</li>
            <li>Calisma verileri: Yasal saklama süreleri boyunca (Is Kanunu geregi en az 10 yil)</li>
            <li>Giris kayitlari: 1 yil</li>
            <li>Sifreler: Bcrypt ile tek yonlu sifrelenererek saklanir (geri donusturulemez)</li>
          </ul>
          <p class="text-gray-700 leading-relaxed mt-3">
            Verileriniz JWT tabanli kimlik dogrulama, HTTPS sifreleme ve erisim kontrolu mekanizmalari ile korunmaktadir. MongoDB veritabani endüstri standartlarinda güvenlik önlemleri ile yonetilmektedir.
          </p>
        </section>

        <!-- 8. Veri Paylasimi -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">8. Verilerin Paylasilmasi</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            Kisisel verileriniz asagidaki durumlar disinda ucuncu taraflarla paylasilmaz:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-2">
            <li><strong>Yasal zorunluluk:</strong> Yetkili kamu kurum ve kuruluslarin talepleri dogrultusunda</li>
            <li><strong>Is iliskisi:</strong> Bagli oldugunuz sirketin yetkili yoneticileri ile (is iliskisi kapsaminda)</li>
            <li><strong>Odeme islemleri:</strong> Iyzipay odeme altyapisi ile (yalnizca odeme bilgileri)</li>
            <li><strong>E-posta hizmetleri:</strong> SMTP saglayicisi ile (yalnizca bildirim gonderimleri)</li>
          </ul>
          <p class="text-gray-700 leading-relaxed mt-3">
            Verileriniz yurt disina aktarilmaz. Tum veriler Turkiye sinirlarindaki sunucularda saklanir.
          </p>
        </section>

        <!-- 9. Cerezler -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">9. Cerezler ve Yerel Depolama</h3>
          <p class="text-gray-700 leading-relaxed">
            Platformumuz, oturum yonetimi icin tarayicinizin yerel depolama alanini (localStorage) kullanmaktadir. Burada yalnizca kimlik dogrulama tokeni (JWT) ve temel kullanici bilgileri saklanir. Ucuncu taraf izleme cerezleri veya reklam cerezleri kullanilmamaktadir.
          </p>
        </section>

        <!-- 10. Kullanici Haklari -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">10. Haklariniz</h3>
          <p class="text-gray-700 leading-relaxed mb-3">
            KVKK'nin 11. maddesi uyarinca asagidaki haklara sahipsiniz:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">Kisisel verilerinizin islenip islenmedigini ogrenme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">Islenmisse buna iliskin bilgi talep etme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">Islenme amacini ve amacina uygun kullanilip kullanilmadigini ogrenme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">Eksik veya yanlis islenmis verilerin duzeltilmesini isteme</span>
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
              <span class="text-gray-700 text-sm">Islenen verilerin ucuncu kisilere bildirilmesini isteme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">Islemin aleyhine bir sonuc cikmasi durumunda itiraz etme</span>
            </div>
            <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-sm">Kanuna aykiri isleme nedeniyle zararin giderilmesini talep etme</span>
            </div>
          </div>
        </section>

        <!-- 11. Google Hesap Ayirma -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">11. Google Hesabinin Ayrilmasi</h3>
          <p class="text-gray-700 leading-relaxed">
            Google hesabinizi platformdan ayirmak istediginizde, hesap ayarlarinizdan bu islemi gerceklestirebilirsiniz. Ayirma islemi sonrasinda Google ID bilginiz sistemimizden silinir ve bundan sonra yalnizca e-posta/sifre ile giris yapabilirsiniz. Ayrica Google hesabinizin
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">
              ucuncu taraf erisim ayarlarindan
            </a>
            platformumuzun erisimini kaldirabilirsiniz.
          </p>
        </section>

        <!-- 12. Cocuklarin Gizliligi -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">12. Cocuklarin Gizliligi</h3>
          <p class="text-gray-700 leading-relaxed">
            Platformumuz 18 yasindan kücük bireylere yonelik degildir. Bilerek 18 yasindan küçük bireylerden kisisel veri toplamamaktayiz. Boyle bir durumun tespiti halinde ilgili veriler derhal silinir.
          </p>
        </section>

        <!-- 13. Degisiklikler -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">13. Politika Degisiklikleri</h3>
          <p class="text-gray-700 leading-relaxed">
            Bu Gizlilik Politikasi, yasal degisiklikler veya platform guncellemeleri dogrultusunda zaman zaman revize edilebilir. Onemli degisiklikler yapilmasi halinde, platformumuz uzerinden ve/veya e-posta yoluyla bilgilendirileceksiniz. Guncel versiyonu her zaman bu sayfadan gorebilirsiniz.
          </p>
        </section>

        <!-- 14. Iletisim -->
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">14. Iletisim</h3>
          <p class="text-gray-700 leading-relaxed">
            Gizlilik politikamiz hakkinda sorulariniz veya KVKK kapsamindaki talepleriniz icin asagidaki kanallar uzerinden bizimle iletisime gecebilirsiniz:
          </p>
          <div class="mt-4 bg-gray-50 rounded-lg p-5">
            <p class="text-gray-700"><strong>Platform:</strong> {{ appTitle }}</p>
            <p class="text-gray-700 mt-1"><strong>E-posta:</strong> destek@personelplus.com</p>
            <p class="text-gray-600 text-sm mt-3">
              KVKK kapsamindaki basvarulariniz, talebin bize ulasmasindan itibaren en gec 30 gün icinde sonuclandirilir.
            </p>
          </div>
        </section>

        <!-- Footer -->
        <div class="border-t pt-6 text-center">
          <p class="text-gray-500 text-sm">
            &copy; {{ currentYear }} {{ appTitle }}. Tum haklar saklidir.
          </p>
          <router-link to="/login" class="inline-block mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
            &larr; Giris Sayfasina Don
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
const appTitle = import.meta.env.VITE_APP_TITLE || 'PersonelPlus'
const currentYear = new Date().getFullYear()
const lastUpdated = '17 Subat 2026'
</script>
