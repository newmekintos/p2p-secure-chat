import { openDB } from 'idb';

const DB_NAME = 'p2p-chat-db';
const DB_VERSION = 2; // Yakındaki cihazlar için version artırıldı

class StorageManager {
  constructor() {
    this.db = null;
  }

  async init() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Kullanıcı profili store
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile');
        }
        
        // Mesajlar store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          messageStore.createIndex('peerId', 'peerId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Kişiler store
        if (!db.objectStoreNames.contains('contacts')) {
          db.createObjectStore('contacts', { keyPath: 'peerId' });
        }
        
        // Yakındaki cihazlar store
        if (!db.objectStoreNames.contains('nearbyDevices')) {
          const devicesStore = db.createObjectStore('nearbyDevices', { keyPath: 'peerId' });
          devicesStore.createIndex('username', 'username', { unique: false });
          devicesStore.createIndex('lastSeen', 'lastSeen', { unique: false });
        }
      },
    });
  }

  // Profil işlemleri
  async saveProfile(profile) {
    await this.db.put('profile', profile, 'current');
  }

  async getProfile() {
    return await this.db.get('profile', 'current');
  }

  // Mesaj işlemleri
  async saveMessage(message) {
    return await this.db.add('messages', message);
  }

  async getMessages(peerId) {
    const tx = this.db.transaction('messages', 'readonly');
    const index = tx.store.index('peerId');
    const messages = await index.getAll(peerId);
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  }

  async getAllMessages() {
    return await this.db.getAll('messages');
  }

  // Kişi işlemleri
  async saveContact(contact) {
    await this.db.put('contacts', contact);
  }

  async getContact(peerId) {
    return await this.db.get('contacts', peerId);
  }

  async getAllContacts() {
    return await this.db.getAll('contacts');
  }

  async deleteContact(peerId) {
    await this.db.delete('contacts', peerId);
  }

  // Yakındaki cihazlar işlemleri
  async saveNearbyDevice(device) {
    await this.db.put('nearbyDevices', {
      ...device,
      lastSeen: Date.now()
    });
  }

  async getNearbyDevice(peerId) {
    return await this.db.get('nearbyDevices', peerId);
  }

  async getAllNearbyDevices() {
    const devices = await this.db.getAll('nearbyDevices');
    // Son 5 dakika içinde görülen cihazları döndür
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return devices.filter(device => device.lastSeen > fiveMinutesAgo);
  }

  async deleteNearbyDevice(peerId) {
    await this.db.delete('nearbyDevices', peerId);
  }

  async cleanupOldDevices() {
    const devices = await this.db.getAll('nearbyDevices');
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    
    for (const device of devices) {
      if (device.lastSeen < tenMinutesAgo) {
        await this.deleteNearbyDevice(device.peerId);
      }
    }
  }

  // Tüm verileri temizle
  async clearAll() {
    await this.db.clear('messages');
    await this.db.clear('contacts');
    await this.db.clear('nearbyDevices');
    await this.db.clear('profile');
  }
}

export const storage = new StorageManager();
