import { useState, useEffect, useRef } from 'react';
import { Send, Info, Trash2, Lock, Radio, Menu } from 'lucide-react';
import { storage } from '../utils/storage';

function ChatWindow({ p2pManager, contact, profile, isOnline, onDeleteContact, onMobileMenuClick }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!contact) return;

    // Mesajları yükle
    loadMessages();

    // Typing event'lerini dinle
    const originalCallback = p2pManager.onMessageCallback;
    p2pManager.onMessageCallback = (data) => {
      // Önce orijinal callback'i çağır
      if (originalCallback) {
        originalCallback(data);
      }
      
      // Typing event'i bu kişiden geliyorsa handle et
      if (data.type === 'typing' && data.from === contact.peerId) {
        setIsTyping(data.typing);
        console.log('⌨️ Typing:', data.typing, 'from:', contact.peerId);
      }
    };

    // Mesajları her 500ms'de bir yenile (daha hızlı)
    const messageInterval = setInterval(() => {
      loadMessages();
    }, 500);

    return () => {
      clearInterval(messageInterval);
      // Callback'i restore et
      p2pManager.onMessageCallback = originalCallback;
    };
  }, [contact, p2pManager]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!contact) return;
    
    // Grup odası için roomCode kullan, yoksa peerId
    const chatId = contact.roomCode || contact.peerId;
    const msgs = await storage.getMessages(chatId);
    setMessages(msgs);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !contact || isSending) {
      return;
    }

    // Grup odası kontrolü
    const isGroupRoom = contact.isGroup && contact.members;
    
    // Grup odası için en az bir üye online olmalı
    if (isGroupRoom && !isOnline) {
      alert('Odada çevrimiçi üye yok!');
      return;
    }

    setIsSending(true);
    try {
      const messageText = inputMessage.trim();
      const chatId = contact.roomCode || contact.peerId;
      
      if (isGroupRoom) {
        // Grup odası - tüm üyelere gönder
        console.log('📤 Grup mesajı gönderiliyor:', contact.members.length, 'üye');
        
        let sentCount = 0;
        for (const member of contact.members) {
          // Kendine gönderme
          if (member.peerId === profile.peerId) continue;
          
          try {
            await p2pManager.sendMessage(member.peerId, messageText);
            sentCount++;
            console.log('✅ Mesaj gönderildi:', member.username);
          } catch (error) {
            console.warn('⚠️ Mesaj gönderilemedi:', member.username, error.message);
          }
        }
        
        if (sentCount === 0) {
          throw new Error('Hiçbir üyeye mesaj gönderilemedi');
        }
        
        console.log(`✅ ${sentCount} üyeye mesaj gönderildi`);
      } else {
        // Normal 1-1 chat
        await p2pManager.sendMessage(contact.peerId, messageText);
      }

      // Mesajı kaydet
      const newMessage = {
        peerId: chatId,
        message: messageText,
        timestamp: Date.now(),
        isSent: true,
        from: profile.username
      };

      await storage.saveMessage(newMessage);
      await loadMessages();
      setInputMessage('');
      
      // Yazıyor durumunu kapat
      if (isGroupRoom) {
        contact.members.forEach(member => {
          if (member.peerId !== profile.peerId) {
            p2pManager.sendTyping(member.peerId, false);
          }
        });
      } else {
        p2pManager.sendTyping(contact.peerId, false);
      }
    } catch (error) {
      console.error('❌ Mesaj gönderme hatası:', error);
      alert('Mesaj gönderilemedi! ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);

    if (!contact || !isOnline) return;

    // Yazıyor durumunu gönder
    p2pManager.sendTyping(contact.peerId, true);

    // Timeout'u temizle ve yeniden başlat
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      p2pManager.sendTyping(contact.peerId, false);
    }, 2000);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col bg-gray-900">
        {/* Mobil Header - Kişi Seçili Değilken */}
        <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-4 lg:hidden">
          <button
            onClick={onMobileMenuClick}
            className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400"
            title="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="ml-3 text-white font-semibold">P2P Şifreli Chat</h2>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Radio className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Mesajlaşmaya Başlayın
            </h3>
            <p className="text-gray-500">
              Bir kişi seçin veya yeni kişi ekleyin
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Chat Header */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {/* Mobil Hamburger Menu */}
          <button
            onClick={onMobileMenuClick}
            className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 lg:hidden"
            title="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {contact.name.charAt(0).toUpperCase()}
              </span>
            </div>
            {isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-gray-800 rounded-full" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white">{contact.name}</h3>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Radio className="w-3 h-3" />
              {contact.isGroup ? (
                `${contact.members?.length || 1} üye • ${contact.members?.length > 1 ? 'Aktif' : 'Sadece Sen'}`
              ) : (
                isOnline ? 'Çevrimiçi' : 'Çevrimdışı'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/50 rounded-lg">
            <Lock className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-gray-400">Şifreli</span>
          </div>
          <button
            onClick={() => onDeleteContact(contact.roomCode || contact.peerId)}
            className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-red-400"
            title={contact.isGroup ? "Odayı Sil" : "Kişiyi Sil"}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                Uçtan uca şifreli sohbet
              </p>
              <p className="text-gray-600 text-xs mt-1">
                İlk mesajı gönderin
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isGroupRoom = contact.isGroup;
            const showSenderName = isGroupRoom && !msg.isSent;
            
            return (
              <div
                key={index}
                className={`flex ${msg.isSent ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md px-4 py-2.5 rounded-2xl ${
                    msg.isSent
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {showSenderName && msg.from && (
                    <p className="text-xs text-purple-400 font-semibold mb-1">
                      {msg.from}
                    </p>
                  )}
                  <p className="text-sm break-words">{msg.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.isSent ? 'text-blue-200' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        {!isOnline && !contact.isGroup && (
          <div className="mb-3 px-4 py-2 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-yellow-400 text-sm text-center">
            Kişi çevrimdışı. Bağlantı kurulması bekleniyor...
          </div>
        )}
        {contact.isGroup && (!contact.members || contact.members.length <= 1) && (
          <div className="mb-3 px-4 py-2 bg-blue-900/20 border border-blue-700/50 rounded-lg text-blue-400 text-sm text-center">
            Odada başka üye yok. Oda kodunu paylaşın!
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={handleTyping}
            placeholder={
              contact.isGroup 
                ? (contact.members?.length > 1 ? "Grup mesajı yazın..." : "Oda kodunu paylaşın...")
                : (isOnline ? "Mesajınızı yazın..." : "Bağlantı bekleniyor...")
            }
            disabled={isSending || (!isOnline && !contact.isGroup)}
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending || (!isOnline && !contact.isGroup)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition flex items-center gap-2 font-medium"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Gönderiliyor
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Gönder
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatWindow;
