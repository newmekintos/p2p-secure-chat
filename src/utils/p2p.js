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
    this.roomCode = null;
    this.onMessageCallback = null;
    this.onConnectionCallback = null;
    this.onDisconnectionCallback = null;
    this.onStatusCallback = null;
    this.onIncomingPeerCallback = null; // Yeni: Gelen peer bildirimi
    this.onRoomJoinCallback = null; // Yeni: Oda katılım bildirimi
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
        debug: 0 // Debug kapalı - console temiz
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
          console.log('✅ Bağlandı:', id);
          this.onStatusCallback?.('connected', id);
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
          clearTimeout(timeout);
          // Yaygın hataları daha soft göster
          if (err.type === 'peer-unavailable') {
            // Sessizce handle et
          } else if (err.type === 'network' || err.type === 'server-error') {
            // Otomatik reconnect olacak
            this.onStatusCallback?.('reconnecting');
          } else {
            console.log('⚠️ Bağlantı sorunu (düzeliyor...)');
            this.onStatusCallback?.('error', err.message);
          }
          
          // Sadece initialization hatalarında reject et
          if (!this.peerId) {
            reject(err);
          }
        });

        this.peer.on('disconnected', () => {
          // Sessizce reconnect
          this.onStatusCallback?.('reconnecting');
          
          // 2 saniye sonra yeniden bağlan
          setTimeout(() => {
            if (this.peer && !this.peer.destroyed) {
              this.peer.reconnect();
            }
          }, 2000);
        });

        this.peer.on('close', () => {
          // Sessizce handle et
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

    if (!this.peer) {
      console.error('❌ Peer henüz başlatılmadı');
      return;
    }

    try {
      const conn = this.peer.connect(peerId, {
        reliable: true
      });

      if (!conn) {
        console.error('❌ Bağlantı oluşturulamadı:', peerId);
        return;
      }

      this.setupConnection(conn);
    } catch (error) {
      console.error('❌ connectToPeer hatası:', error);
    }
  }

  // Bağlantıyı yapılandır
  setupConnection(conn) {
    conn.on('open', async () => {
      // Sessizce bağlan
      this.connections.set(conn.peer, conn);

      // Public key'i, cihaz bilgisini ve oda kodunu paylaş
      const publicKeyData = await CryptoHelper.exportPublicKey(this.publicKey);
      conn.send({
        type: 'public-key',
        publicKey: publicKeyData,
        peerId: this.peerId,
        username: this.username || 'Unknown',
        deviceInfo: this.deviceInfo,
        deviceName: DeviceHelper.getDeviceName(),
        roomCode: this.roomCode
      });
      conn.sentPublicKey = true; // Public key gönderildi işaretle

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
      // Sessizce handle et
      this.connections.delete(conn.peer);
      this.onDisconnectionCallback?.(conn.peer);
    });

    conn.on('error', (err) => {
      // Sessizce handle et
    });
  }

  // Gelen veriyi işle
  async handleData(peerId, data) {
    switch (data.type) {
      case 'room-join':
        // Başka bir peer odaya katıldı - bilgisini kaydet
        console.log('📥 Oda katılım bildirimi alındı:', data.roomCode, 'from:', data.username);
        if (this.onRoomJoinCallback) {
          this.onRoomJoinCallback({
            roomCode: data.roomCode,
            roomInfo: data.roomInfo,
            peerId: data.peerId,
            username: data.username
          });
        }
        break;
      
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
          conn.roomCode = data.roomCode;
          
          // Oda kodu kontrolü - sessizce yap
          
          // Eğer biz de henüz public key göndermediyse, gönder
          if (!conn.sentPublicKey) {
            const myPublicKeyData = await CryptoHelper.exportPublicKey(this.publicKey);
            conn.send({
              type: 'public-key',
              publicKey: myPublicKeyData,
              peerId: this.peerId,
              username: this.username || 'Unknown',
              deviceInfo: this.deviceInfo,
              deviceName: DeviceHelper.getDeviceName(),
              roomCode: this.roomCode
            });
            conn.sentPublicKey = true;
          }
        }
        
        // Yeni peer geldiğini bildir (otomatik ekleme için)
        this.onIncomingPeerCallback?.({
          peerId: data.peerId,
          username: data.username || 'Unknown User',
          deviceInfo: data.deviceInfo,
          deviceName: data.deviceName,
          roomCode: data.roomCode,
          isOwnDevice: data.username === this.username, // Kendi cihazımız mı?
          isSameRoom: this.roomCode && data.roomCode && this.roomCode === data.roomCode // Aynı odada mı?
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
    if (!conn || !conn.publicKey) {
      throw new Error('Peer not connected or public key not available');
    }

    // Mesajı şifrele
    const encryptedMessage = await CryptoHelper.encrypt(message, conn.publicKey);
    
    conn.send({
      type: 'message',
      message: encryptedMessage,
      from: this.peerId,
      timestamp: Date.now()
    });
  }

  // Oda bilgisi BROADCAST et (tüm bağlı peer'lere)
  broadcastRoomJoin(roomCode, roomInfo) {
    console.log('📢 Oda katılım broadcast ediliyor:', roomCode);
    this.connections.forEach((conn, peerId) => {
      try {
        conn.send({
          type: 'room-join',
          roomCode: roomCode,
          roomInfo: roomInfo,
          peerId: this.peerId,
          username: this.username
        });
        console.log('✅ Broadcast gönderildi:', peerId);
      } catch (error) {
        console.warn('⚠️ Broadcast gönderilemedi:', peerId);
      }
    });
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

  // Oda kodunu ayarla
  setRoomCode(roomCode) {
    this.roomCode = roomCode;
    console.log('🚪 Oda kodu ayarlandı:', roomCode);
    localStorage.setItem('activeRoomCode', roomCode);
  }

  // Oda kodunu temizle
  clearRoomCode() {
    this.roomCode = null;
    localStorage.removeItem('activeRoomCode');
    console.log('🚪 Odadan çıkıldı');
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
