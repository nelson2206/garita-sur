import { Navigate, Route, Routes } from 'react-router-dom';
import { useSesion } from './lib/auth';
import Login from './pages/Login';
import Residente from './pages/Residente';
import Garita from './pages/Garita';
import Admin from './pages/Admin';
import PasePublico from './pages/Pase';
import { Cabecera } from './components/ui';

export default function App() {
  const { cargando, perfil, provider } = useSesion();
  return (
    <Routes>
      <Route path="/pase/:codigo" element={<PasePublico />} />
      <Route path="/*" element={
        cargando ? <div className="centro"><p className="muted">Cargando…</p></div>
        : !perfil || !provider ? <Login />
        : <>
            <Cabecera />
            <Routes>
              <Route path="/" element={<Navigate to={perfil.rol === 'residente' ? '/residente' : perfil.rol === 'vigilante' ? '/garita' : '/admin'} replace />} />
              <Route path="/residente/*" element={perfil.rol === 'residente' ? <Residente /> : <Navigate to="/" replace />} />
              <Route path="/garita" element={perfil.rol !== 'residente' ? <Garita /> : <Navigate to="/" replace />} />
              <Route path="/admin" element={perfil.rol === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
      } />
    </Routes>
  );
}
