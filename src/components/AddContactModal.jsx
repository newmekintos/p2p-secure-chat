import { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';

function AddContactModal({ onClose, onAdd, myPeerId }) {
  const [name, setName] = useState('');
  const [peerId, setPeerId] = useState('');
  const [error, setError] = useState('');

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
            <input
              type="text"
              id="peerId"
              value={peerId}
              onChange={(e) => setPeerId(e.target.value)}
              placeholder="Kişinin Peer ID'sini girin"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="mt-2 text-xs text-gray-500">
              Karşı tarafın size verdiği Peer ID'yi buraya girin
            </p>
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
