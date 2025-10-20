import { useState, useEffect } from 'react';
import { X, Users, Copy, CheckCircle } from 'lucide-react';

function RoomCodeModal({ onClose, profile, p2pManager, onRoomJoin, onShowQR }) {
  const [roomCode, setRoomCode] = useState('');
  const [myRoomCode, setMyRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {
    // Rastgele oda kodu oluştur
    generateRoomCode();
  }, []);

  const generateRoomCode = () => {
    // BASIT ÇÖZÜM: Oda kodu = TAM PEER ID
    // İkinci kişi direkt bağlanabilir!
    setMyRoomCode(profile.peerId);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(myRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError('Lütfen bir oda kodu girin');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const cleanCode = roomCode.trim(); // lowercase tut - peer ID'ler lowercase
      
      console.log('🔗 Oda sahibine bağlanılıyor (Peer ID):', cleanCode);
      
      // Oda kodu = Peer ID, direkt bağlan!
      try {
        await p2pManager.connectToPeer(cleanCode);
        console.log('✅ Oda sahibine bağlanıldı!');
      } catch (err) {
        console.error('❌ Bağlantı hatası:', err);
        setError('Oda sahibine bağlanılamadı. Peer ID geçerli mi?');
        setIsJoining(false);
        return;
      }
      
      // Oda kodunu callback ile parent'a gönder
      if (onRoomJoin) {
        await onRoomJoin(cleanCode);
      }

      setActiveRoom(cleanCode);
      
      // 1 saniye sonra kapat
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError('Odaya katılırken hata oluştu: ' + err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateRoom = () => {
    const cleanCode = myRoomCode.toUpperCase();
    
    if (onRoomJoin) {
      onRoomJoin(cleanCode);
    }

    // 1 saniye sonra kapat
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Oda Kodu ile Bağlan</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Senin Oda Kodan */}
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-purple-300">🎯 Senin Oda ID'n</h3>
              <p className="text-xs text-gray-400 mt-1">Bunu paylaş, diğerleri odana katılsın</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-900/50 px-3 py-3 rounded-lg">
                <p className="text-sm font-mono text-center text-white break-all">
                  {myRoomCode}
                </p>
              </div>
              <button
                onClick={copyRoomCode}
                className="p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
              >
                {copied ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Copy className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={!!activeRoom}
              className="mt-3 w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
            >
              {activeRoom ? '✅ Oda Aktif' : 'Bu Odayı Aç'}
            </button>

            <button
              onClick={onShowQR}
              className="mt-2 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium text-sm"
            >
              📱 QR Kod ile Paylaş (Kolay)
            </button>

            <p className="mt-2 text-xs text-gray-400 text-center">
              💡 Bu kodla direkt bağlantı kurulur
            </p>
          </div>

          {/* Veya Ayırıcı */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-700"></div>
            <span className="text-xs text-gray-500 font-medium">VEYA</span>
            <div className="flex-1 h-px bg-gray-700"></div>
          </div>

          {/* Odaya Katıl */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              📥 Oda ID Gir (Peer ID)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.trim())}
                placeholder="Oda ID'sini yapıştır..."
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleJoinRoom}
                disabled={isJoining || !roomCode.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
              >
                {isJoining ? '...' : 'Katıl'}
              </button>
            </div>

            {error && (
              <p className="mt-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <p className="text-xs text-blue-300">
                💡 <strong>İpucu:</strong> Aynı oda kodunu giren herkes birbirini otomatik görür ve bağlanır!
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default RoomCodeModal;
