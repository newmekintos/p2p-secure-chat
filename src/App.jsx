import { useState, useEffect } from 'react';
import { P2PManager } from './utils/p2p';
import { storage } from './utils/storage';
import LoginScreen from './components/LoginScreen';
import ChatInterface from './components/ChatInterface';

function App() {
  const [p2pManager] = useState(() => new P2PManager());
  const [isInitialized, setIsInitialized] = useState(false);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    // Storage'ı başlat ve profili yükle
    const initStorage = async () => {
      await storage.init();
      const savedProfile = await storage.getProfile();
      if (savedProfile) {
        setProfile(savedProfile);
        // Otomatik olarak P2P'yi başlat
        try {
          await p2pManager.initialize(savedProfile.peerId);
          setIsInitialized(true);
        } catch (error) {
          console.error('Auto-init failed:', error);
        }
      }
    };
    initStorage();

    // Status değişikliklerini dinle
    p2pManager.onStatus((status, data) => {
      setStatus(status);
      if (status === 'connected') {
        console.log('Connected with ID:', data);
      }
    });

    return () => {
      p2pManager.destroy();
    };
  }, [p2pManager]);

  const handleLogin = async (username) => {
    try {
      const peerId = await p2pManager.initialize();
      const newProfile = {
        username,
        peerId,
        createdAt: Date.now()
      };
      await storage.saveProfile(newProfile);
      setProfile(newProfile);
      setIsInitialized(true);
    } catch (error) {
      console.error('Login error:', error);
      alert('Bağlantı hatası! Lütfen tekrar deneyin.');
    }
  };

  const handleLogout = async () => {
    p2pManager.destroy();
    await storage.clearAll();
    setProfile(null);
    setIsInitialized(false);
    window.location.reload();
  };

  if (!isInitialized || !profile) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <ChatInterface 
      p2pManager={p2pManager} 
      profile={profile}
      status={status}
      onLogout={handleLogout}
    />
  );
}

export default App;
