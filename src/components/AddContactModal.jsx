import { useState, useEffect, useRef } from 'react';
import { X, UserPlus, AlertCircle, QrCode, Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

function AddContactModal({ onClose, onAdd, myPeerId, onAddAndChat }) {
  const [name, setName] = useState('');
  const [peerId, setPeerId] = useState('');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [autoAddFromQR, setAutoAddFromQR] = useState(false);
  const qrScannerRef = useRef(null);
  const nameInputRef = useRef(null);
  const scannerDivId = 'qr-reader';

  useEffect(() => {
    return () => {
      // Cleanup: scanner'ı durdur
      if (qrScannerRef.current) {
        qrScannerRef.current.stop()
          .catch(err => console.log('Cleanup: Scanner zaten durdurulmuş'));
      }
    };
  }, []);

  const startQRScanner = async () => {
    try {
      setIsScanning(true);
      setError('');
      
      // Önce kamera izni iste
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Test için hemen kapat
      } catch (permErr) {
        setError('Kamera izni gerekli! Lütfen izin verin.');
        setIsScanning(false);
        return;
      }
      
      const html5QrCode = new Html5Qrcode(scannerDivId);
      qrScannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // QR kod okundu
          console.log('QR kod tarandı:', decodedText);
          
          // JSON parse et (yeni format: {peerId, username, roomCode})
          let qrData = { peerId: decodedText, username: null, roomCode: null };
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.peerId) {
              qrData = parsed;
              console.log('✅ JSON QR parse edildi:', qrData);
            }
          } catch (e) {
            // Eski format (sadece peer ID), sorun değil
            console.log('📌 Eski format QR (sadece peer ID)');
          }
          
          // Scanner'ı durdur
          if (qrScannerRef.current) {
            qrScannerRef.current.stop()
              .then(() => {
                console.log('Scanner başarıyla durduruldu');
                qrScannerRef.current = null;
                setIsScanning(false);
              })
              .catch(err => {
                console.log('Scanner durdurulamadı (zaten durmuş olabilir)');
                qrScannerRef.current = null;
                setIsScanning(false);
              });
          }
          
          // Geçici isimle kişi ekle - username public key değişiminde güncellenecek
          const tempName = qrData.username || 'Bağlanıyor...';
          const newContact = {
            name: tempName,
            peerId: qrData.peerId,
            addedAt: Date.now(),
            autoAdded: true,
            tempName: !qrData.username, // QR'da username varsa geçici değil
            roomCode: qrData.roomCode // Oda kodu varsa ekle
          };
          
          console.log('🎯 QR ile otomatik ekleniyor:', newContact);
          
          // Eğer oda kodu varsa, odaya da katıl!
          if (qrData.roomCode) {
            console.log('🚪 QR\'da oda kodu var, odaya katılınıyor:', qrData.roomCode);
            // onAddAndChat callback'i odaya katılmayı handle edecek
          }
          
          // Kişiyi ekle ve direkt chat'e git
          if (onAddAndChat) {
            onAddAndChat(newContact);
          } else {
            onAdd(newContact);
          }
        },
        (errorMessage) => {
          // Okuma hatası (normal, sürekli tarama yapıyor)
        }
      );
    } catch (err) {
      console.error('QR Scanner hatası:', err);
      setError('Kamera erişimi reddedildi veya bulunamadı');
      setIsScanning(false);
    }
  };

  const stopQRScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
        .then(() => {
          console.log('QR Scanner durduruldu');
          setIsScanning(false);
        })
        .catch(err => {
          console.log('QR Scanner zaten durdurulmuş');
          setIsScanning(false);
        });
    } else {
      setIsScanning(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !peerId.trim()) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    if (peerId === myPeerId) {
      setError('Kendinizi ekleyemezsiniz');
      return;
    }

    onAdd({
      name: name.trim(),
      peerId: peerId.trim(),
      addedAt: Date.now()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Yeni Kişi Ekle</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              İsim
            </label>
            <input
              ref={nameInputRef}
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kişinin ismini girin"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="peerId" className="block text-sm font-medium text-gray-300 mb-2">
              Peer ID
            </label>
            <div className="space-y-2">
              <input
                type="text"
                id="peerId"
                value={peerId}
                onChange={(e) => setPeerId(e.target.value)}
                placeholder="Kişinin Peer ID'sini girin"
                disabled={isScanning}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm disabled:opacity-50"
              />
              
              {/* QR Tarama Butonu */}
              {!isScanning ? (
                <button
                  type="button"
                  onClick={startQRScanner}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
                >
                  <QrCode className="w-5 h-5" />
                  QR Kod Taratarak Ekle
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopQRScanner}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                >
                  <Camera className="w-5 h-5" />
                  Taramayı Durdur
                </button>
              )}

              {/* QR Scanner */}
              {isScanning && (
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <div id={scannerDivId} className="w-full"></div>
                </div>
              )}
            </div>
            
            {!isScanning && (
              <p className="mt-2 text-xs text-gray-500">
                Peer ID yazın veya QR kod taratın
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
            <p className="text-sm text-blue-300 mb-2">
              💡 <strong>Nasıl kullanılır?</strong>
            </p>
            <ol className="text-xs text-blue-400 space-y-1 list-decimal list-inside">
              <li>Karşı taraf size Peer ID'sini paylaşsın</li>
              <li>Peer ID'yi buraya yapıştırın</li>
              <li>Her iki taraf da birbirini eklemeli</li>
              <li>Artık mesajlaşabilirsiniz!</li>
            </ol>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
            >
              Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddContactModal;
