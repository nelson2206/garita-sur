import { useState, type FormEvent } from 'react';
import { useSesion } from '../lib/auth';
import { semilla } from '../lib/data/local';
import type { Unidad, Rol } from '../lib/types';

export default function Login() {
  const { modo, enviarCodigo, verificarCodigo, entrarDemo, error } = useSesion();
  const [email, setEmail] = useState(''); const [token, setToken] = useState('');
  const [paso, setPaso] = useState<'email' | 'codigo'>('email'); const [msg, setMsg] = useState(''); const [ocupado, setOcupado] = useState(false);
  const [rol, setRol] = useState<Rol>('residente'); const [unidad, setUnidad] = useState('u12');
  const unidades = Object.values(semilla().unidades) as unknown as Unidad[];

  async function enviar(e: FormEvent) {
    e.preventDefault(); setOcupado(true); setMsg('');
    try { await enviarCodigo(email.trim()); setPaso('codigo'); setMsg('Te enviamos un correo. Haz clic en el enlace o escribe aquí el código que contiene.'); }
    catch (err) { setMsg((err as Error).message); } finally { setOcupado(false); }
  }
  async function verificar(e: FormEvent) {
    e.preventDefault(); setOcupado(true); setMsg('');
    try { await verificarCodigo(email.trim(), token.trim()); } catch (err) { setMsg((err as Error).message); } finally { setOcupado(false); }
  }

  return (
    <main className="login">
      <div className="stripe" />
      <div className="brand"><span className="sq" style={{ width: 34, height: 34 }}>GS</span><h2>Garita Sur</h2></div>
      {modo === 'local' ? (
        <div className="card">
          <span className="eyebrow">Modo demo</span>
          <p className="small">No hay backend configurado: la app usa datos de ejemplo guardados en este navegador. Elige con qué rol entrar.</p>
          <label>Rol<select value={rol} onChange={e => setRol(e.target.value as Rol)}>
            <option value="residente">Propietario (celular)</option>
            <option value="vigilante">Vigilante (tablet de garita)</option>
            <option value="admin">Administración (web)</option>
          </select></label>
          {rol === 'residente' && <label>Lote<select value={unidad} onChange={e => setUnidad(e.target.value)}>{unidades.map(u => <option key={u.id} value={u.id}>{u.lote} · {u.propietario}</option>)}</select></label>}
          <button className="btn primary block" onClick={() => entrarDemo(rol, rol === 'residente' ? unidad : undefined)}>Entrar</button>
          <p className="muted">Para conectar la base real, copia .env.example a .env con los datos de Supabase.</p>
        </div>
      ) : (
        <div className="card">
          <span className="eyebrow">Ingreso</span>
          {paso === 'email' ? (
            <form onSubmit={enviar} className="grid">
              <label>Correo electrónico<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" /></label>
              <button className="btn primary block" disabled={ocupado}>Enviar código de acceso</button>
            </form>
          ) : (
            <form onSubmit={verificar} className="grid">
              <label>Código recibido por correo<input inputMode="numeric" value={token} onChange={e => setToken(e.target.value)} placeholder="Código de 6 u 8 dígitos" /></label>
              <button className="btn primary block" disabled={ocupado}>Entrar</button>
              <button type="button" className="btn ghost block" onClick={() => setPaso('email')}>Cambiar correo</button>
            </form>
          )}
          {msg && <p className="small">{msg}</p>}
          {error && <p className="error">{error}</p>}
          <p className="muted">Sin contraseñas: cada ingreso se valida con un código enviado a tu correo.</p>
        </div>
      )}
    </main>
  );
}
