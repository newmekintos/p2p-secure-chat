import Peer from 'peerjs';
import { CryptoHelper } from './crypto';
import { DeviceHelper } from './device';

export class P2PManager {
  constructor() {
    this.peer = null;
    this.connections = new Map();
    this.publicKey = null;
    this.privateKey = null;
    this.peerId = null;
    this.username = null;
    this.deviceInfo = null;
    this.onMessageCallback = null;
    this.onConnectionCallback = null;
    this.onDisconnectionCallback = null;
    this.onStatusCallback = null;
    this.onIncomingPeerCallback = null; // Yeni: Gelen peer bildirimi
  }

  // P2P bağlantıyı başlat
  async initialize(userId = null, username = null) {
    this.username = username;
    this.deviceInfo = DeviceHelper.getDeviceInfo();
    
    console.log('🖥️ Cihaz bilgisi:', {
      type: this.deviceInfo.deviceType,
      os: this.deviceInfo.os,
      browser: this.deviceInfo.browser,
      name: DeviceHelper.getDeviceName()
    });
    
    try {
      // Anahtarları üret
      const keyPair = await CryptoHelper.generateKeyPair();
      this.publicKey = keyPair.publicKey;
      this.privateKey = keyPair.privateKey;

      // PeerJS bağlantısını başlat - Cloud sunucu kullan
      const config = {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        },
        debug: 2 // Debug için log seviyesi
      };

      this.peer = userId ? new Peer(userId, config) : new Peer(config);

      return new Promise((resolve, reject) => {
        // 30 saniye timeout (mobil cihazlar için)
        const timeout = setTimeout(() => {
          reject(new Error('Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.'));
        }, 30000);

        this.peer.on('open', (id) => {
          clearTimeout(timeout);
          this.peerId = id;
          console.log('Peer ID:', id);
          this.onStatusCallback?.('connected', id);
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
          clearTimeout(timeout);
          // "Could not connect" hatasını daha soft göster
          if (err.type === 'peer-unavailable') {
            console.log('ℹ️ Peer şu anda mevcut değil:', err.message);
          } else {
            console.error('Peer error:', err);
            this.onStatusCallback?.('error', err.message);
          }
          
          // Sadece initialization hatalarında reject et
          if (!this.peerId) {
            reject(err);
          }
        });

        this.peer.on('disconnected', () => {
          console.log('Peer disconnected from server, attempting reconnection...');
          this.onStatusCallback?.('reconnecting');
          
          // 2 saniye sonra yeniden bağlan
          setTimeout(() => {
            if (this.peer && !this.peer.destroyed) {
              this.peer.reconnect();
            }
          }, 2000);
        });

        this.peer.on('close', () => {
          console.log('Peer connection closed');
          this.onStatusCallback?.('disconnected');
        });
      });
    } catch (error) {
      console.error('Initialization error:', error);
      throw error;
    }
  }

  // Başka bir peer'a bağlan
  async connectToPeer(peerId) {
    if (this.connections.has(peerId)) {
      console.log('Already connected to', peerId);
      return;
    }

    const conn = this.peer.connect(peerId, {
      reliable: true
    });

    this.setupConnection(conn);
  }

  // Bağlantıyı yapılandır
  setupConnection(conn) {
    conn.on('open', async () => {
      console.log('Connection opened with', conn.peer);
      this.connections.set(conn.peer, conn);

      // Public key'i ve cihaz bilgisini paylaş
      const publicKeyData = await CryptoHelper.exportPublicKey(this.publicKey);
      conn.send({
        type: 'public-key',
        publicKey: publicKeyData,
        peerId: this.peerId,
        username: this.username || 'Unknown',
        deviceInfo: this.deviceInfo,
        deviceName: DeviceHelper.getDeviceName()
      });
      conn.sentPublicKey = true; // Public key gönderildi işaretle
      console.log('Public key gönderildi:', conn.peer);

      this.onConnectionCallback?.({
        peerId: conn.peer,
        connected: true,
        username: conn.metadata?.username
      });
    });

    conn.on('data', async (data) => {
      await this.handleData(conn.peer, data);
    });

    conn.on('close', () => {
      console.log('Connection closed with', conn.peer);
      this.connections.delete(conn.peer);
      this.onDisconnectionCallback?.(conn.peer);
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }

  // Gelen veriyi işle
  async handleData(peerId, data) {
    switch (data.type) {
      case 'public-key':
        // Karşı tarafın public key'ini sakla
        const publicKey = await CryptoHelper.importPublicKey(data.publicKey);
        const conn = this.connections.get(peerId);
        if (conn) {
          conn.publicKey = publicKey;
          conn.peerName = data.peerId;
          conn.username = data.username;
          conn.deviceInfo = data.deviceInfo;
          conn.deviceName = data.deviceName;
          console.log('Public key alındı:', peerId, '✅', data.deviceName || '');
          
          // Eğer biz de henüz public key göndermediyse, gönder
          if (!conn.sentPublicKey) {
            const myPublicKeyData = await CryptoHelper.exportPublicKey(this.publicKey);
            conn.send({
              type: 'public-key',
              publicKey: myPublicKeyData,
              peerId: this.peerId,
              username: this.username || 'Unknown',
              deviceInfo: this.deviceInfo,
              deviceName: DeviceHelper.getDeviceName()
            });
            conn.sentPublicKey = true;
            console.log('Public key gönderildi:', peerId);
          }
        }
        
        // Yeni peer geldiğini bildir (otomatik ekleme için)
        this.onIncomingPeerCallback?.({
          peerId: data.peerId,
          username: data.username || 'Unknown User',
          deviceInfo: data.deviceInfo,
          deviceName: data.deviceName,
          isOwnDevice: data.username === this.username // Kendi cihazımız mı?
        });
        break;

      case 'message':
        // Şifreli mesajı çöz
        console.log('📨 Şifreli mesaj alındı:', peerId);
        try {
          console.log('🔓 Mesaj şifresi çözülüyor...');
          const decryptedMessage = await CryptoHelper.decrypt(
            this.privateKey,
            data.encrypted
          );
          console.log('✅ Mesaj şifresi çözüldü:', decryptedMessage);
          
          this.onMessageCallback?.({
            from: peerId,
            message: decryptedMessage,
            timestamp: data.timestamp,
            encrypted: true
          });
          console.log('✅ Mesaj callback\'e iletildi');
        } catch (error) {
          console.error('❌ Şifre çözme hatası:', error);
        }
        break;

      case 'typing':
        this.onMessageCallback?.({
          from: peerId,
          type: 'typing',
          typing: data.typing
        });
        break;
    }
  }

  // Mesaj gönder
  async sendMessage(peerId, message) {
    const conn = this.connections.get(peerId);
    console.log('🔵 sendMessage çağrıldı:', { peerId, message, conn: !!conn, publicKey: !!conn?.publicKey });
    
    if (!conn) {
      console.error('❌ Bağlantı bulunamadı:', peerId);
      throw new Error('Bağlantı bulunamadı');
    }
    
    if (!conn.publicKey) {
      console.error('❌ Public key yok! Bağlantı henüz hazır değil.');
      throw new Error('Bağlantı henüz hazır değil - Public key bekleniyor');
    }

    try {
      // Mesajı şifrele
      console.log('🔐 Mesaj şifreleniyor...');
      const encrypted = await CryptoHelper.encrypt(conn.publicKey, message);
      console.log('✅ Mesaj şifrelendi, gönderiliyor...');

      conn.send({
        type: 'message',
        encrypted: encrypted,
        timestamp: Date.now()
      });
      
      console.log('✅ Mesaj gönderildi!', peerId);
    } catch (error) {
      console.error('❌ Mesaj gönderme hatası:', error);
      throw error;
    }
  }

  // Yazıyor durumunu gönder
  sendTyping(peerId, isTyping) {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.send({
        type: 'typing',
        typing: isTyping
      });
    }
  }

  // Bağlantıyı kes
  disconnect(peerId) {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.close();
      this.connections.delete(peerId);
    }
  }

  // Tüm bağlantıları kes
  disconnectAll() {
    this.connections.forEach((conn) => {
      conn.close();
    });
    this.connections.clear();
  }

  // Peer'ı kapat
  destroy() {
    this.disconnectAll();
    if (this.peer) {
      this.peer.destroy();
    }
  }

  // Event listener'ları ayarla
  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  onConnection(callback) {
    this.onConnectionCallback = callback;
  }

  onDisconnection(callback) {
    this.onDisconnectionCallback = callback;
  }

  onStatus(callback) {
    this.onStatusCallback = callback;
  }

  // Aktif bağlantıları al
  getActiveConnections() {
    return Array.from(this.connections.keys());
  }

  // Bağlantı durumunu kontrol et
  isConnectedTo(peerId) {
    return this.connections.has(peerId);
  }
}
