import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { NavLink } from 'react-router-dom';
import { useSesion } from '../lib/auth';
import type { Semaforo } from '../lib/util';

let setToastGlobal: ((m: string) => void) | null = null;
export function toast(m: string) { setToastGlobal?.(m); }
export function Toast() {
  const [m, setM] = useState('');
  useEffect(() => { setToastGlobal = setM; return () => { setToastGlobal = null; }; }, []);
  useEffect(() => { if (!m) return; const t = setTimeout(() => setM(''), 2600); return () => clearTimeout(t); }, [m]);
  return m ? <div className="toast" role="status">{m}</div> : null;
}

export function Cabecera() {
  const { perfil, modo, salir, provider } = useSesion();
  const c = provider?.condominio();
  return (
    <>
      <div className="stripe" />
      <header className="top">
        <div className="brand"><span className="sq">GS</span><h1>Garita Sur</h1></div>
        <span className="rol">{c?.nombre} · {perfil?.nombre}</span>
        {perfil?.rol === 'admin' && <nav className="row" style={{ gap: 4 }}><NavLink to="/admin" className={({ isActive }) => 'btn sm ' + (isActive ? 'dark' : 'ghost')}>Administración</NavLink><NavLink to="/garita" className={({ isActive }) => 'btn sm ' + (isActive ? 'dark' : 'ghost')}>Garita</NavLink></nav>}
        <div className="der">
          <span className={'dot ' + (modo === 'nube' ? 'on' : 'off')} />{modo === 'nube' ? 'En la nube' : 'Modo demo'}
          <button className="btn sm ghost" onClick={() => salir()}>Salir</button>
        </div>
      </header>
      <Toast />
    </>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div className="modal" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="box" role="dialog">{children}</div></div>;
}
export const Plate = ({ p }: { p?: string | null }) => p ? <span className="plate">{p}</span> : null;
export const SemaforoBox = ({ s, titulo }: { s: Semaforo; titulo?: string }) => (
  <div className={'semaforo ' + s.cls}><span className="eyebrow">{titulo || 'Estado de cuenta'}</span><b>{s.titulo}</b><span className="small">{s.detalle}</span></div>
);
export function QrView({ texto }: { texto: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(texto, { width: 220, margin: 1 }).then(setSrc).catch(() => setSrc('')); }, [texto]);
  return <div className="qr">{src ? <img src={src} alt="Código QR del pase" width={220} height={220} /> : <p className="muted">Generando QR…</p>}</div>;
}
/** Muestra una foto guardada (referencia de almacenamiento o dataURL). */
export function Foto({ referencia }: { referencia?: string | null }) {
  const { provider } = useSesion();
  const [src, setSrc] = useState('');
  useEffect(() => { if (referencia && provider) provider.resolverFoto(referencia).then(setSrc); }, [referencia, provider]);
  return src ? <img className="thumb" src={src} alt="Foto del ingreso" /> : null;
}
