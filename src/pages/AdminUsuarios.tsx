import { useState, type FormEvent } from 'react';
import { useDatos, useSesion } from '../lib/auth';
import type { Invitacion, Rol, Unidad } from '../lib/types';
import { fmtDT, nowIso, uid } from '../lib/util';
import { toast } from '../components/ui';

const ROLES: [Rol, string][] = [['residente', 'Propietario'], ['vigilante', 'Vigilante'], ['admin', 'Administración']];

/** Alta de usuarios: la administración invita por correo y la persona entra con su código. */
export function Usuarios() {
  const { perfil, modo } = useSesion(); const p = useDatos();
  const unidades = p.all<Unidad>('unidades').sort((a, b) => a.lote.localeCompare(b.lote, undefined, { numeric: true }));
  const inv = p.all<Invitacion>('invitaciones').sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  const [f, setF] = useState({ email: '', nombre: '', rol: 'residente' as Rol, unidad_id: '' });
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));

  async function invitar(e: FormEvent) {
    e.preventDefault();
    const email = f.email.trim().toLowerCase();
    if (inv.some(i => i.email === email && i.estado === 'pendiente')) return toast('Ya hay una invitación pendiente para ese correo');
    const nueva: Invitacion = { id: uid(), condominio_id: perfil!.condominio_id, email, nombre: f.nombre.trim(), rol: f.rol, unidad_id: f.rol === 'residente' ? (f.unidad_id || unidades[0]?.id || null) : null, estado: 'pendiente', creado_en: nowIso(), aceptado_en: null };
    await p.upsert('invitaciones', nueva as unknown as { id: string });
    setF({ email: '', nombre: '', rol: 'residente', unidad_id: '' });
    toast('Invitación creada');
  }
  const anular = (i: Invitacion) => p.upsert('invitaciones', { ...i, estado: 'anulada' }).then(() => toast('Invitación anulada'));
  function avisar(i: Invitacion) {
    const cuerpo = `Hola ${i.nombre}: ya puedes usar la app de la garita de ${p.condominio()?.nombre}. Entra a ${location.origin}${location.pathname} con este correo (${i.email}) y recibirás un código de acceso.`;
    window.open(`mailto:${i.email}?subject=${encodeURIComponent('Acceso a la app de la garita')}&body=${encodeURIComponent(cuerpo)}`);
  }
  const pill = (e: Invitacion['estado']) => e === 'aceptada' ? <span className="pill ok">Activo</span> : e === 'anulada' ? <span className="pill nv">Anulada</span> : <span className="pill warn">Pendiente</span>;

  return <div className="card">
    <h3>Usuarios del condominio</h3>
    <p className="small">Invita por correo a propietarios, vigilantes y administración. La persona entra con ese correo y recibe un código; no hay contraseñas que administrar.</p>
    {modo !== 'nube' && <p className="muted">En modo demo las invitaciones solo se listan: no se envía correo ni se crea la cuenta.</p>}
    <form onSubmit={invitar} className="grid">
      <div className="row">
        <label style={{ flex: 1.3 }}>Correo<input type="email" required value={f.email} onChange={e => set('email', e.target.value)} placeholder="persona@correo.com" /></label>
        <label style={{ flex: 1 }}>Nombre<input required value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Familia Castro" /></label>
      </div>
      <div className="row">
        <label style={{ flex: 1 }}>Rol<select value={f.rol} onChange={e => set('rol', e.target.value)}>{ROLES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        {f.rol === 'residente' && <label style={{ flex: 1.3 }}>Lote<select value={f.unidad_id} onChange={e => set('unidad_id', e.target.value)}>{unidades.map(u => <option key={u.id} value={u.id}>{u.lote} · {u.propietario}</option>)}</select></label>}
      </div>
      <button className="btn primary block">Invitar</button>
    </form>
    <div className="tbl"><table>
      <thead><tr><th>Correo</th><th>Nombre</th><th>Rol</th><th>Lote</th><th>Estado</th><th>Creada</th><th></th></tr></thead>
      <tbody>{inv.map(i => <tr key={i.id}>
        <td>{i.email}</td><td>{i.nombre}</td><td>{ROLES.find(r => r[0] === i.rol)?.[1]}</td>
        <td>{p.get<Unidad>('unidades', i.unidad_id)?.lote || '—'}</td>
        <td>{pill(i.estado)}</td><td>{fmtDT(i.creado_en)}</td>
        <td><div className="row">
          {i.estado === 'pendiente' && <button className="btn sm" onClick={() => avisar(i)}>Avisar por correo</button>}
          {i.estado !== 'anulada' && <button className="btn sm ghost danger" onClick={() => anular(i)}>Anular</button>}
        </div></td>
      </tr>)}</tbody>
    </table></div>
    {!inv.length && <p className="muted">Aún no hay invitaciones.</p>}
  </div>;
}
