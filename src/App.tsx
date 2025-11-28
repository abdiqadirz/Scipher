import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { GameRoom } from './pages/GameRoom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

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
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<GameRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
