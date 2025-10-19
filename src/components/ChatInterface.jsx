import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import AddContactModal from './AddContactModal';

function ChatInterface({ p2pManager, profile, status, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [onlineContacts, setOnlineContacts] = useState(new Set());

  useEffect(() => {
    const initConnections = async () => {
      await loadContacts();
      
      // Tüm kayıtlı kişilere otomatik bağlan
      const savedContacts = await storage.getAllContacts();
      savedContacts.forEach(contact => {
        try {
          p2pManager.connectToPeer(contact.peerId);
        } catch (error) {
          console.error('Auto-connect error:', error);
        }
      });
    };

    initConnections();

    // GLOBAL mesaj dinleyicisi - TÜM gelen mesajları yakala
    p2pManager.onMessage(async (data) => {
      if (data.type === 'typing') {
        // Typing event'i ChatWindow'da handle edilir
        return;
      }

      if (data.message && data.from) {
        console.log('Mesaj alındı:', data.from, data.message);
        
        // Mesajı kaydet
        const newMessage = {
          peerId: data.from,
          message: data.message,
          timestamp: data.timestamp,
          isSent: false
        };

        await storage.saveMessage(newMessage);
        
        // Eğer bu kişi seçili ise UI'ı güncelle
        // ChatWindow kendi mesajlarını reload edecek
      }
    });

    // Bağlantı event'lerini dinle
    p2pManager.onConnection((data) => {
      if (data.connected) {
        console.log('Peer connected:', data.peerId);
        setOnlineContacts(prev => new Set([...prev, data.peerId]));
      }
    });

    p2pManager.onDisconnection((peerId) => {
      console.log('Peer disconnected:', peerId);
      setOnlineContacts(prev => {
        const newSet = new Set(prev);
        newSet.delete(peerId);
        return newSet;
      });
    });
  }, [p2pManager]);

  const loadContacts = async () => {
    const savedContacts = await storage.getAllContacts();
    setContacts(savedContacts);
  };

  const handleAddContact = async (contact) => {
    await storage.saveContact(contact);
    await loadContacts();
    setShowAddContact(false);
    
    // Otomatik bağlan
    try {
      await p2pManager.connectToPeer(contact.peerId);
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const handleDeleteContact = async (peerId) => {
    if (confirm('Bu kişiyi silmek istediğinizden emin misiniz?')) {
      await storage.deleteContact(peerId);
      p2pManager.disconnect(peerId);
      if (selectedContact?.peerId === peerId) {
        setSelectedContact(null);
      }
      await loadContacts();
    }
  };

  const handleSelectContact = async (contact) => {
    setSelectedContact(contact);
    
    // Eğer bağlantı yoksa bağlan
    if (!p2pManager.isConnectedTo(contact.peerId)) {
      try {
        await p2pManager.connectToPeer(contact.peerId);
      } catch (error) {
        console.error('Connection error:', error);
      }
    }
  };

  return (
    <div className="h-screen flex bg-gray-900">
      <Sidebar
        profile={profile}
        contacts={contacts}
        selectedContact={selectedContact}
        onSelectContact={handleSelectContact}
        onAddContact={() => setShowAddContact(true)}
        onLogout={onLogout}
        status={status}
        onlineContacts={onlineContacts}
      />

      <ChatWindow
        p2pManager={p2pManager}
        contact={selectedContact}
        profile={profile}
        isOnline={selectedContact ? onlineContacts.has(selectedContact.peerId) : false}
        onDeleteContact={handleDeleteContact}
      />

      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onAdd={handleAddContact}
          myPeerId={profile.peerId}
        />
      )}
    </div>
  );
}

export default ChatInterface;
