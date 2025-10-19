import Peer from 'peerjs';
import { CryptoHelper } from './crypto';

export class P2PManager {
  constructor() {
    this.peer = null;
    this.connections = new Map();
    this.publicKey = null;
    this.privateKey = null;
    this.peerId = null;
    this.username = null;
    this.onMessageCallback = null;
    this.onConnectionCallback = null;
    this.onDisconnectionCallback = null;
    this.onStatusCallback = null;
    this.onIncomingPeerCallback = null; // Yeni: Gelen peer bildirimi
  }

  // P2P bağlantıyı başlat
  async initialize(userId = null, username = null) {
    this.username = username;
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
          console.error('Peer error:', err);
          this.onStatusCallback?.('error', err.message);
          reject(err);
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

      // Public key'i paylaş
      const publicKeyData = await CryptoHelper.exportPublicKey(this.publicKey);
      conn.send({
        type: 'public-key',
        publicKey: publicKeyData,
        peerId: this.peerId,
        username: this.username || 'Unknown' // Kullanıcı adını da gönder
      });

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
        this.connections.get(peerId).publicKey = publicKey;
        this.connections.get(peerId).peerName = data.peerId;
        this.connections.get(peerId).username = data.username;
        
        // Yeni peer geldiğini bildir (otomatik ekleme için)
        this.onIncomingPeerCallback?.({
          peerId: data.peerId,
          username: data.username || 'Unknown User'
        });
        break;

      case 'message':
        // Şifreli mesajı çöz
        try {
          const decryptedMessage = await CryptoHelper.decrypt(
            this.privateKey,
            data.encrypted
          );
          
          this.onMessageCallback?.({
            from: peerId,
            message: decryptedMessage,
            timestamp: data.timestamp,
            encrypted: true
          });
        } catch (error) {
          console.error('Decryption error:', error);
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
      throw new Error('Connection not ready');
    }

    // Mesajı şifrele
    const encrypted = await CryptoHelper.encrypt(conn.publicKey, message);

    conn.send({
      type: 'message',
      encrypted: encrypted,
      timestamp: Date.now()
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
