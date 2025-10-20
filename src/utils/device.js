// Cihaz bilgileri yardımcı fonksiyonları

export class DeviceHelper {
  // Cihaz tipini algıla
  static getDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  // Cihaz ikonunu al
  static getDeviceIcon(deviceType) {
    switch (deviceType) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'desktop':
        return '💻';
      default:
        return '🖥️';
    }
  }

  // İşletim sistemini algıla
  static getOS() {
    const ua = navigator.userAgent;
    
    if (/windows/i.test(ua)) return 'Windows';
    if (/macintosh|mac os x/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    
    return 'Unknown';
  }

  // Tarayıcıyı algıla
  static getBrowser() {
    const ua = navigator.userAgent;
    
    if (/chrome|chromium|crios/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
    if (/firefox|fxios/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
    if (/edg/i.test(ua)) return 'Edge';
    if (/opr\//i.test(ua)) return 'Opera';
    
    return 'Unknown';
  }

  // Cihaz benzersiz ID'si oluştur (tarayıcı fingerprint)
  static generateDeviceId() {
    // Var olan device ID'yi kontrol et
    const existingId = localStorage.getItem('deviceId');
    if (existingId) return existingId;

    // Yeni ID oluştur
    const deviceType = this.getDeviceType();
    const os = this.getOS();
    const browser = this.getBrowser();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    const deviceId = `${deviceType}-${os}-${browser}-${timestamp}-${random}`;
    localStorage.setItem('deviceId', deviceId);
    
    return deviceId;
  }

  // Cihaz bilgilerini al
  static getDeviceInfo() {
    return {
      deviceId: this.generateDeviceId(),
      deviceType: this.getDeviceType(),
      os: this.getOS(),
      browser: this.getBrowser(),
      icon: this.getDeviceIcon(this.getDeviceType()),
      timestamp: Date.now()
    };
  }

  // Cihaz adı oluştur
  static getDeviceName() {
    const deviceType = this.getDeviceType();
    const os = this.getOS();
    const browser = this.getBrowser();
    
    let name = '';
    if (deviceType === 'mobile') {
      name = `📱 ${os} Telefon`;
    } else if (deviceType === 'tablet') {
      name = `📱 ${os} Tablet`;
    } else {
      name = `💻 ${os} ${browser}`;
    }
    
    return name;
  }
}
