import { X, QrCode, Copy, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

function QRModal({ onClose, peerId, username, roomCode }) {
  const [copied, setCopied] = useState(false);

  // QR koduna hem peer ID hem oda kodu koy
  const qrData = JSON.stringify({
    peerId: peerId,
    username: username,
    roomCode: roomCode || null
  });

  const copyPeerId = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">QR Kod İle Paylaş</h2>
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
          {/* QR Code */}
          <div className="bg-white rounded-2xl p-6 flex items-center justify-center">
            <QRCodeSVG
              value={qrData}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* Info */}
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">
              {roomCode 
                ? 'QR\'ı taratan odaya direkt katılır!' 
                : 'Karşı taraf bu QR kodu taratarak sizi ekleyebilir'
              }
            </p>
            <p className="text-lg font-semibold text-white">
              {username}
            </p>
            {roomCode && (
              <p className="text-sm text-purple-400 mt-2">
                Oda: {roomCode}
              </p>
            )}
          </div>

          {/* Peer ID */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2 text-center">Peer ID</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-gray-300 font-mono break-all text-center">
                {peerId}
              </code>
              <button
                onClick={copyPeerId}
                className="p-2 hover:bg-gray-700 rounded-lg transition flex-shrink-0"
                title="Kopyala"
              >
                {copied ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export default QRModal;
