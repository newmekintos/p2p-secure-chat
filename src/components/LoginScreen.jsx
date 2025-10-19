import { useState } from 'react';
import { Shield, Lock, Radio, AlertCircle, RefreshCw } from 'lucide-react';

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    setError('');
    try {
      await onLogin(username.trim());
    } catch (error) {
      setIsLoading(false);
      setError(error.message || 'Bağlantı hatası! Lütfen tekrar deneyin.');
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-md w-full">
        {/* Logo ve Başlık */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <Radio className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            P2P Şifreli Chat
          </h1>
          <p className="text-gray-400">Merkezi olmayan, sansürlenemez mesajlaşma</p>
        </div>

        {/* Özellikler */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-gray-700/50">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Uçtan Uca Şifreleme</h3>
                <p className="text-sm text-gray-400">Tüm mesajlar RSA-2048 ile şifrelenir</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Radio className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Sunucusuz P2P</h3>
                <p className="text-sm text-gray-400">Doğrudan cihazlar arası bağlantı</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Tamamen Anonim</h3>
                <p className="text-sm text-gray-400">Kayıt, veritabanı veya izleme yok</p>
              </div>
            </div>
          </div>
        </div>

        {/* Giriş Formu */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hata Mesajı */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700/50 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-300">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="İstediğiniz bir isim seçin"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                disabled={isLoading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Bağlanıyor... (30 saniye bekleniyor)
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {error && <RefreshCw className="w-5 h-5" />}
                  {error ? 'Tekrar Dene' : 'Platformu Başlat'}
                </span>
              )}
            </button>
          </form>

          {/* Mobil İpucu */}
          {isLoading && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                ⏳ Mobil cihazlarda bağlantı biraz daha uzun sürebilir
              </p>
            </div>
          )}
        </div>

        {/* Bilgilendirme */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Bu platform tamamen tarayıcınızda çalışır. Hiçbir veri sunucuda saklanmaz.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
