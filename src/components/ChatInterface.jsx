import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import AddContactModal from './AddContactModal';
import QRModal from './QRModal';

function ChatInterface({ p2pManager, profile, status, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [onlineContacts, setOnlineContacts] = useState(new Set());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [typingPeers, setTypingPeers] = useState(new Map());

  // Mobil sidebar açıkken scroll engelle
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

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
      console.log('🎯 ChatInterface - Mesaj alındı:', data);
      
      // Typing event'leri için özel handler yok - direkt geç
      // ChatWindow kendi typing state'ini yönetecek

      if (data.message && data.from) {
        console.log('💾 Mesaj kaydediliyor:', data.from, data.message);
        
        // Mesajı kaydet
        const newMessage = {
          peerId: data.from,
          message: data.message,
          timestamp: data.timestamp,
          isSent: false
        };

        try {
          await storage.saveMessage(newMessage);
          console.log('✅ Mesaj storage\'a kaydedildi');
        } catch (error) {
          console.error('❌ Storage kayıt hatası:', error);
        }
        
        // Eğer bu kişi seçili ise UI'ı güncelle
        // ChatWindow kendi mesajlarını reload edecek
      } else {
        console.warn('⚠️ Mesaj formatı hatalı:', data);
      }
    });

    // Gelen peer'leri otomatik ekle (tek yönlü mesajlaşma için)
    p2pManager.onIncomingPeerCallback = async (peerInfo) => {
      console.log('Yeni peer bağlandı:', peerInfo);
      
      const existingContact = await storage.getContact(peerInfo.peerId);
      
      if (!existingContact) {
        // Kişi yoksa otomatik ekle
        const newContact = {
          peerId: peerInfo.peerId,
          name: peerInfo.username,
          addedAt: Date.now(),
          autoAdded: true
        };
        await storage.saveContact(newContact);
        await loadContacts();
        console.log('Kişi otomatik eklendi:', newContact);
      } else if (existingContact.tempName || existingContact.name === 'Bağlanıyor...') {
        // Geçici isimle eklenmişse gerçek isimle güncelle
        const updatedContact = {
          ...existingContact,
          name: peerInfo.username,
          tempName: false
        };
        await storage.saveContact(updatedContact);
        await loadContacts();
        console.log('✅ Kişi adı güncellendi:', peerInfo.username);
        
        // Eğer bu kişi seçiliyse, seçili kişiyi de güncelle
        if (selectedContact?.peerId === peerInfo.peerId) {
          setSelectedContact(updatedContact);
        }
      }
    };

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

    // Sayfa kapatılınca veya yenilenince cleanup
    const handleBeforeUnload = () => {
      p2pManager.disconnectAll();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [p2pManager]);

  const loadContacts = async () => {
    const savedContacts = await storage.getAllContacts();
    setContacts(savedContacts);
  };

  const handleAddContact = async (contact) => {
    await storage.saveContact(contact);
    await loadContacts();
    setShowAddContact(false);
    
    // Otomatik bağlan (hata görmezden gel - karşı taraf çevrimdışı olabilir)
    try {
      await p2pManager.connectToPeer(contact.peerId);
      console.log('✅ Kişiye bağlanma denemesi yapıldı:', contact.peerId);
    } catch (error) {
      console.log('ℹ️ Şu anda bağlanılamadı (karşı taraf çevrimdışı olabilir):', error.message);
      // Hata görmezden gel - karşı taraf çevrimiçi olunca otomatik bağlanacak
    }
  };

  const handleAddAndChat = async (contact) => {
    await storage.saveContact(contact);
    const allContacts = await storage.getAllContacts();
    setContacts(allContacts);
    setShowAddContact(false);
    
    // Kişiyi seç (chat'e git)
    setSelectedContact(contact);
    
    // Bağlanmayı dene
    try {
      await p2pManager.connectToPeer(contact.peerId);
      console.log('✅ QR ile eklenen kişiye bağlanıldı:', contact.peerId);
    } catch (error) {
      console.log('ℹ️ Bağlantı kurulacak:', error.message);
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
    <div className="h-screen flex bg-gray-900 relative overflow-hidden">
      <Sidebar
        profile={profile}
        contacts={contacts}
        selectedContact={selectedContact}
        onSelectContact={handleSelectContact}
        onAddContact={() => setShowAddContact(true)}
        onShowQR={() => setShowQRModal(true)}
        onLogout={onLogout}
        status={status}
        onlineContacts={onlineContacts}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <ChatWindow
        p2pManager={p2pManager}
        contact={selectedContact}
        profile={profile}
        isOnline={selectedContact ? onlineContacts.has(selectedContact.peerId) : false}
        onDeleteContact={handleDeleteContact}
        onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
      />

      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onAdd={handleAddContact}
          onAddAndChat={handleAddAndChat}
          myPeerId={profile.peerId}
        />
      )}

      {showQRModal && (
        <QRModal
          onClose={() => setShowQRModal(false)}
          peerId={profile.peerId}
          username={profile.username}
        />
      )}
    </div>
  );
}

export default ChatInterface;
