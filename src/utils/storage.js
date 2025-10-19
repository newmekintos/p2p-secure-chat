import { openDB } from 'idb';

const DB_NAME = 'p2p-chat-db';
const DB_VERSION = 1;

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

  // Tüm verileri temizle
  async clearAll() {
    await this.db.clear('messages');
    await this.db.clear('contacts');
    await this.db.clear('profile');
  }
}

export const storage = new StorageManager();
