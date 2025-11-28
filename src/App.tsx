import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameHub } from './pages/GameHub';
import { Home } from './pages/Home';
import { GameRoom } from './pages/GameRoom';
import { WavelengthLobby } from './pages/WavelengthLobby';
import { WavelengthRoom } from './pages/WavelengthRoom';
import { ThePlantLobby } from './pages/ThePlantLobby';
import { ThePlantRoom } from './pages/ThePlantRoom';
import { supabase } from './lib/supabase';

function App() {
  useEffect(() => {
    // Try to sign in anonymously in the background
    // If it fails, the app will fallback to guest mode (client-side IDs)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.signInAnonymously().catch(console.error);
      }
    });
  }, []);

  // Non-blocking render
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameHub />} />
        <Route path="/scipher" element={<Home />} />
        <Route path="/scipher/:roomId" element={<GameRoom />} />
        <Route path="/wavelength" element={<WavelengthLobby />} />
        <Route path="/wavelength/:roomId" element={<WavelengthRoom />} />
        <Route path="/the-plant" element={<ThePlantLobby />} />
        <Route path="/the-plant/:roomId" element={<ThePlantRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
