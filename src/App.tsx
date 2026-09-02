import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useSesion } from './lib/auth';
import Login from './pages/Login';
import Residente from './pages/Residente';
import Garita from './pages/Garita';
import Admin from './pages/Admin';
import PasePublico from './pages/Pase';
import { Cabecera } from './components/ui';

export default function App() {
  const { cargando, perfil, provider } = useSesion();
  const home = perfil?.rol === 'residente' ? '/residente' : perfil?.rol === 'vigilante' ? '/garita' : '/admin';
  const nav = useNavigate(); const anterior = useRef<string | null>(null);
  // Al iniciar sesión, cada rol aterriza en su pantalla; al cerrarla, vuelve al ingreso.
  useEffect(() => { const actual = perfil?.id ?? null; if (actual !== anterior.current && !location.hash.startsWith('#/pase/')) nav(actual ? home : '/', { replace: true }); anterior.current = actual; }, [perfil?.id, home, nav]);
  return (
    <Routes>
      <Route path="/pase/:codigo" element={<PasePublico />} />
      <Route path="/*" element={
        cargando ? <div className="centro"><p className="muted">Cargando…</p></div>
        : !perfil || !provider ? <Login />
        : <>
            <Cabecera />
            <Routes>
              <Route index element={<Navigate to={home} replace />} />
              <Route path="/residente/*" element={perfil.rol === 'residente' ? <Residente /> : <Navigate to="/" replace />} />
              <Route path="/garita" element={perfil.rol !== 'residente' ? <Garita /> : <Navigate to="/" replace />} />
              <Route path="/admin" element={perfil.rol === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to={home} replace />} />
            </Routes>
          </>
      } />
    </Routes>
  );
}
