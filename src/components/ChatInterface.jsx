import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import AddContactModal from './AddContactModal';
import QRModal from './QRModal';
import RoomCodeModal from './RoomCodeModal';

function ChatInterface({ p2pManager, profile, status, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [onlineContacts, setOnlineContacts] = useState(new Set());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [typingPeers, setTypingPeers] = useState(new Map());
  const [activeRoomCode, setActiveRoomCode] = useState(null);

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
      await loadRooms();
      
      // Aktif oda varsa yükle
      const savedRoomCode = localStorage.getItem('activeRoomCode');
      if (savedRoomCode) {
        setActiveRoomCode(savedRoomCode);
        p2pManager.setRoomCode(savedRoomCode);
      }
      
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
        
        // Mesajı kaydet - eğer activeRoomCode varsa ve gönderen odadaysa, roomCode ile kaydet
        let chatId = data.from;
        
        if (activeRoomCode) {
          const room = await storage.getRoom(activeRoomCode);
          if (room && room.members?.some(m => m.peerId === data.from)) {
            chatId = activeRoomCode; // Oda mesajı olarak kaydet
            console.log('📥 Oda mesajı:', activeRoomCode);
          }
        }
        
        const newMessage = {
          peerId: chatId,
          message: data.message,
          timestamp: data.timestamp,
          isSent: false,
          from: data.from
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
      
      // Online listesine ekle
      setOnlineContacts(prev => new Set([...prev, peerInfo.peerId]));
      
      // Aynı odadaysa otomatik üye ekle
      if (peerInfo.isSameRoom && activeRoomCode) {
        console.log('🎯 Aynı odadan peer:', peerInfo.username, '- Otomatik ekleniyor');
        
        const room = await storage.getRoom(activeRoomCode);
        
        // Üye ekle
        await storage.addRoomMember(activeRoomCode, {
          peerId: peerInfo.peerId,
          username: peerInfo.username,
          joinedAt: Date.now(),
          deviceName: peerInfo.deviceName
        });
        
        // Yenilenen odayı al
        const updatedRoom = await storage.getRoom(activeRoomCode);
        
        // Diğer tüm üyelere de bağlan (eğer bağlı değilse)
        if (updatedRoom && updatedRoom.members) {
          for (const member of updatedRoom.members) {
            if (member.peerId !== profile.peerId && !p2pManager.connections.has(member.peerId)) {
              try {
                await p2pManager.connectToPeer(member.peerId);
                console.log('✅ Oda üyesine bağlanıldı:', member.username);
              } catch (error) {
                console.warn('⚠️ Bağlantı kurulamadı:', member.username);
              }
            }
          }
        }
        
        await loadRooms();
      }
      
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

  const loadRooms = async () => {
    const savedRooms = await storage.getAllRooms();
    setRooms(savedRooms);
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

  const handleDeleteContact = async (contactId) => {
    if (confirm('Silmek istediğinizden emin misiniz?')) {
      if (selectedContact?.isGroup) {
        // Grup odası - roomCode'dan sil
        await storage.deleteRoom(selectedContact.roomCode);
        await loadRooms();
      } else {
        // Normal kişi
        await storage.deleteContact(contactId);
        p2pManager.disconnect(contactId);
        await loadContacts();
      }
      
      if (selectedContact?.peerId === contactId || selectedContact?.roomCode === contactId) {
        setSelectedContact(null);
      }
    }
  };

  const handleRoomJoin = async (roomCode) => {
    console.log('🚪 Odaya katılındı:', roomCode);
    setActiveRoomCode(roomCode);
    p2pManager.setRoomCode(roomCode);
    
    // Oda kodunu localStorage'a kaydet
    localStorage.setItem('activeRoomCode', roomCode);
    
    // Odayı storage'a kaydet
    let room = await storage.getRoom(roomCode);
    if (!room) {
      room = {
        roomCode: roomCode,
        name: `Oda ${roomCode}`,
        createdAt: Date.now(),
        members: [{
          peerId: profile.peerId,
          username: profile.username,
          joinedAt: Date.now()
        }],
        isGroup: true
      };
      await storage.saveRoom(room);
      console.log('✅ Yeni oda oluşturuldu:', roomCode);
    } else {
      // Kendini üye olarak ekle
      await storage.addRoomMember(roomCode, {
        peerId: profile.peerId,
        username: profile.username,
        joinedAt: Date.now()
      });
      
      // Mevcut tüm üyelere bağlan
      console.log('🔗 Oda üyelerine bağlanılıyor...');
      for (const member of room.members) {
        if (member.peerId !== profile.peerId) {
          try {
            await p2pManager.connectToPeer(member.peerId);
            console.log('✅ Bağlantı kuruldu:', member.username);
          } catch (error) {
            console.warn('⚠️ Bağlantı kurulamadı:', member.username, error);
          }
        }
      }
    }
    
    await loadRooms();
  };

  const handleSelectContact = async (contact) => {
    // Grup için dinamik members oluştur
    if (contact.isGroup) {
      // Odadaki tüm aktif bağlantıları members olarak ekle
      const connectedPeers = Array.from(p2pManager.connections.keys());
      const dynamicMembers = connectedPeers.map(peerId => {
        const conn = p2pManager.connections.get(peerId);
        return {
          peerId: peerId,
          username: conn.username || 'Unknown',
          joinedAt: Date.now()
        };
      });
      
      // Kendimizi de ekle
      dynamicMembers.push({
        peerId: profile.peerId,
        username: profile.username,
        joinedAt: Date.now()
      });
      
      // Güncellenmiş contact
      const updatedContact = {
        ...contact,
        members: dynamicMembers
      };
      
      setSelectedContact(updatedContact);
      console.log('📊 Grup üyeleri:', dynamicMembers.length, 'kişi');
      
      // Storage'ı da güncelle
      await storage.saveRoom({
        ...contact,
        members: dynamicMembers
      });
      await loadRooms();
    } else {
      setSelectedContact(contact);
      
      // Normal 1-1 chat için bağlan
      if (contact.peerId && !p2pManager.isConnectedTo(contact.peerId)) {
        try {
          await p2pManager.connectToPeer(contact.peerId);
        } catch (error) {
          console.error('Connection error:', error);
        }
      }
    }
  };

  return (
    <div className="h-screen flex bg-gray-900 relative overflow-hidden">
      <Sidebar
        profile={profile}
        contacts={contacts}
        rooms={rooms}
        selectedContact={selectedContact}
        onSelectContact={handleSelectContact}
        onAddContact={() => setShowAddContact(true)}
        onShowQR={() => setShowQRModal(true)}
        onCreateRoom={() => setShowRoomModal(true)}
        onLogout={onLogout}
        status={status}
        onlineContacts={onlineContacts}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        p2pManager={p2pManager}
        activeRoomCode={activeRoomCode}
      />

      <ChatWindow
        p2pManager={p2pManager}
        contact={selectedContact}
        profile={profile}
        isOnline={selectedContact ? (
          selectedContact.isGroup 
            ? selectedContact.members?.some(m => onlineContacts.has(m.peerId))
            : onlineContacts.has(selectedContact.peerId)
        ) : false}
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

      {showRoomModal && (
        <RoomCodeModal
          onClose={() => setShowRoomModal(false)}
          profile={profile}
          p2pManager={p2pManager}
          onRoomJoin={handleRoomJoin}
        />
      )}
    </div>
  );
}

export default ChatInterface;
