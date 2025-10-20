import { User, UserPlus, LogOut, Copy, CheckCircle, Radio, QrCode } from 'lucide-react';
import { useState } from 'react';

function Sidebar({
  profile,
  contacts,
  selectedContact,
  onSelectContact,
  onAddContact,
  onShowQR,
  onLogout,
  status,
  onlineContacts,
  isMobileOpen,
  onMobileClose,
  nearbyDevices = []
}) {
  const [copied, setCopied] = useState(false);

  const copyPeerId = () => {
    navigator.clipboard.writeText(profile.peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectContact = (contact) => {
    onSelectContact(contact);
    onMobileClose?.(); // Mobilde kişi seçilince sidebar'ı kapat
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Çevrimiçi';
      case 'disconnected': return 'Çevrimdışı';
      case 'error': return 'Hata';
      default: return 'Bağlanıyor...';
    }
  };

  return (
    <>
      {/* Mobil Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative
        inset-y-0 left-0
        w-full sm:w-80 bg-gray-800 
        border-r border-gray-700 
        flex flex-col
        z-50
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Profil Bölümü */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-white truncate">{profile.username}</h2>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-xs text-gray-400">{getStatusText()}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-red-400"
            title="Çıkış Yap"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Peer ID */}
        <div className="bg-gray-900/50 rounded-lg p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Peer ID</p>
              <p className="text-xs text-gray-300 font-mono truncate">{profile.peerId}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={onShowQR}
                className="p-1.5 hover:bg-gray-700 rounded transition flex-shrink-0"
                title="QR Kod Göster"
              >
                <QrCode className="w-4 h-4 text-purple-400" />
              </button>
              <button
                onClick={copyPeerId}
                className="p-1.5 hover:bg-gray-700 rounded transition flex-shrink-0"
                title="Kopyala"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kişi Ekle Butonu */}
      <div className="p-4 border-b border-gray-700 space-y-2">
        <button
          onClick={onAddContact}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
        >
          <UserPlus className="w-5 h-5" />
          Kişi Ekle
        </button>
        
        <div className="flex items-center gap-2 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <div className="text-yellow-400 text-2xl">💡</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-yellow-300">Yakındaki Cihazları Bul</p>
            <p className="text-xs text-yellow-400/70 mt-0.5">
              QR kodu göster veya tarat
            </p>
          </div>
          <button
            onClick={onShowQR}
            className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition"
          >
            <QrCode className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Yakındaki Aktif Cihazlar */}
      {nearbyDevices.length > 0 && (
        <div className="px-4 pt-3 pb-2 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              🔍 Yakındaki Aktif Cihazlar
            </h3>
            <span className="text-xs text-green-500 font-medium">
              {nearbyDevices.length} Aktif
            </span>
          </div>
          <div className="space-y-1">
            {nearbyDevices.map((device) => {
              const isOnline = onlineContacts.has(device.peerId);
              
              return (
                <button
                  key={device.peerId}
                  onClick={() => onSelectContact(device)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-700/50 transition"
                >
                  <div className="relative">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      device.isOwnDevice 
                        ? 'bg-purple-600/20 border border-purple-500/30' 
                        : 'bg-blue-600/20 border border-blue-500/30'
                    }`}>
                      <span className="text-lg">{device.deviceInfo?.icon || '🖥️'}</span>
                    </div>
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-white truncate">
                        {device.deviceName}
                      </p>
                      {device.isOwnDevice && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded">
                          Sen
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {device.username} • {device.deviceInfo?.os || 'Bilinmeyen'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Kişiler Listesi */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {contacts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400 text-sm mb-1">Henüz kişi yok</p>
            <p className="text-gray-500 text-xs">Mesajlaşmaya başlamak için kişi ekleyin</p>
          </div>
        ) : (
          <div className="p-2">
            {contacts.map((contact) => {
              const isOnline = onlineContacts.has(contact.peerId);
              const isSelected = selectedContact?.peerId === contact.peerId;
              
              return (
                <button
                  key={contact.peerId}
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition mb-1 ${
                    isSelected 
                      ? 'bg-blue-600/20 border border-blue-500/50' 
                      : 'hover:bg-gray-700/50'
                  }`}
                >
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-blue-500' : 'bg-gray-700'
                    }`}>
                      <User className="w-5 h-5 text-white" />
                    </div>
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-gray-800 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-white truncate">{contact.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Radio className="w-3 h-3" />
                      {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Bilgi */}
      <div className="p-3 border-t border-gray-700">
        <p className="text-xs text-center text-gray-500">
          🔒 Uçtan uca şifreli • P2P bağlantı
        </p>
        {/* Mobil Kapatma Butonu */}
        <button
          onClick={onMobileClose}
          className="mt-2 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition lg:hidden"
        >
          Kapat
        </button>
      </div>
    </div>
    </>
  );
}

export default Sidebar;
