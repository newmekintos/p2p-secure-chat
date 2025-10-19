# 🔒 P2P Şifreli Mesajlaşma Platformu

Tamamen frontend tabanlı, merkezi olmayan, sansürlenemez ve uçtan uca şifreli mesajlaşma platformu.

## ✨ Özellikler

- **🔐 Uçtan Uca Şifreleme**: RSA-4096 + SHA-512 ile askeri düzeyde güvenlik
- **🌐 P2P (Peer-to-Peer)**: Doğrudan cihazlar arası bağlantı, sunucu yok
- **🚫 Sansürlenemez**: Hiçbir merkezi otorite mesajları engelleyemez
- **👻 Anonim**: Kayıt, veritabanı veya kullanıcı takibi yok
- **💾 Yerel Depolama**: Tüm veriler IndexedDB ile yerel olarak saklanır
- **⚡ Gerçek Zamanlı**: WebRTC ile anlık mesajlaşma
- **🎨 Modern UI**: React + TailwindCSS ile güzel arayüz

## 🚀 Kurulum

### Gereksinimler
- Node.js 18 veya üzeri
- npm veya yarn

### Adımlar

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

3. Tarayıcınızda açın: `http://localhost:5173`

## 📦 Production Build

GitHub Pages veya başka bir statik hosting için:

```bash
npm run build
```

`dist` klasöründeki dosyalar deploy edilebilir.

## 🎯 Kullanım

### 1. İlk Kurulum
- Platforma ilk girişte bir kullanıcı adı seçin
- Sistem otomatik olarak sizin için benzersiz bir Peer ID oluşturacak

### 2. Kişi Ekleme
- "Kişi Ekle" butonuna tıklayın
- Kişinin adını ve Peer ID'sini girin
- **Önemli**: Her iki taraf da birbirini eklemelidir!

### 3. Mesajlaşma
- Eklediğiniz kişi çevrimiçi olduğunda yeşil nokta görünür
- Mesajlarınız otomatik olarak şifrelenir
- Karşı taraf da çevrimiçi olmalıdır

## 🔧 Teknik Detaylar

### Teknolojiler
- **React 18**: UI framework
- **Vite**: Build tool
- **TailwindCSS**: Styling
- **PeerJS**: WebRTC wrapper
- **idb**: IndexedDB wrapper
- **Web Crypto API**: Şifreleme

### Mimari
```
[Cihaz A] <--WebRTC P2P--> [Cihaz B]
    ↓                          ↓
IndexedDB                  IndexedDB
```

### Güvenlik
- RSA-4096 bit asimetrik şifreleme + SHA-512 hash
- Her kullanıcının benzersiz anahtar çifti
- Mesajlar istemci tarafında şifrelenir/çözülür
- Hiçbir veri sunucuda saklanmaz

## 🌐 GitHub Pages'e Deploy

1. `vite.config.js` içinde `base` değerini ayarlayın:
```js
base: '/repo-adınız/'
```

2. Build alın:
```bash
npm run build
```

3. GitHub Pages'i aktifleştirin ve `dist` klasörünü deploy edin

## 📝 Önemli Notlar

- **Çevrimiçi Gereksinimi**: Her iki taraf da mesajlaşmak için çevrimiçi olmalıdır
- **Sinyal Sunucusu**: PeerJS'in ücretsiz sinyal sunucusu kullanılır (sadece bağlantı kurmak için)
- **Veri Aktarımı**: Mesajlar direkt peer-to-peer gönderilir, hiçbir sunucudan geçmez
- **Yerel Depolama**: Mesajlar sadece sizin cihazınızda saklanır

## 🔒 Gizlilik

- Hiçbir kayıt veya hesap gerekmiyor
- Mesajlar hiçbir sunucuda saklanmıyor
- Peer ID'ler geçicidir ve yeniden oluşturulabilir
- Tarayıcı geçmişini temizlerseniz tüm veriler silinir

## 🐛 Sorun Giderme

### Bağlantı Kurulamıyor
- İnternet bağlantınızı kontrol edin
- Her iki tarafın da doğru Peer ID'yi girdiğinden emin olun
- Firewall veya VPN bağlantıyı engelliyor olabilir

### Mesaj Gönderilemiyor
- Karşı tarafın çevrimiçi olduğundan emin olun
- Bağlantının kurulu olduğunu kontrol edin (yeşil nokta)
- Sayfayı yenileyin ve tekrar deneyin

## 📄 Lisans

MIT License - İstediğiniz gibi kullanabilirsiniz!

## 🤝 Katkıda Bulunma

Pull request'ler kabul edilir. Büyük değişiklikler için önce bir issue açın.

---

**⚠️ Uyarı**: Bu bir prototip projedir. Kritik iş amaçlı kullanmadan önce güvenlik denetimi yaptırın.
