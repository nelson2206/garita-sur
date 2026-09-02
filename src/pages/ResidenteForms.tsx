import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatos, useSesion } from '../lib/auth';
import type { Pase, Unidad } from '../lib/types';
import { DIAS_LARGO, code6, fmtDT, localDT, normPlate, nowIso, paseLink, uid, waText } from '../lib/util';
import { Modal, QrView, toast } from '../components/ui';

export function NuevoPase({ unidadId, onCreado }: { unidadId: string; onCreado: (p: Pase) => void }) {
  const { perfil } = useSesion(); const p = useDatos(); const nav = useNavigate();
  const d = new Date(); const h = new Date(d); h.setHours(23, 59, 0, 0);
  const [f, setF] = useState({ tipo: 'invitado', nombre: '', placa: '', desde: localDT(d), hasta: localDT(h), usos_max: '2' });
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));
  async function crear(e: FormEvent) {
    e.preventDefault();
    const pase: Pase = { id: uid(), condominio_id: perfil!.condominio_id, unidad_id: unidadId, codigo: code6(), tipo: f.tipo as Pase['tipo'], nombre: f.nombre.trim(), placa: normPlate(f.placa), desde: new Date(f.desde).toISOString(), hasta: new Date(f.hasta).toISOString(), usos: 0, usos_max: +f.usos_max, estado: 'activo', creado_en: nowIso() };
    await p.upsert('pases', pase as unknown as { id: string }); toast('Pase creado'); nav('/residente'); onCreado(pase);
  }
  return <form onSubmit={crear} className="card">
    <h4>Nueva invitación</h4>
    <label>Tipo<select value={f.tipo} onChange={e => set('tipo', e.target.value)}><option value="invitado">Invitado</option><option value="proveedor">Proveedor o delivery</option><option value="huesped">Huésped de alquiler</option></select></label>
    <label>Nombre del invitado<input required value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Lucía Paredes" /></label>
    <label>Placa (opcional)<input value={f.placa} onChange={e => set('placa', e.target.value)} placeholder="ABC-123" /></label>
    <div className="row"><label style={{ flex: 1 }}>Desde<input type="datetime-local" required value={f.desde} onChange={e => set('desde', e.target.value)} /></label><label style={{ flex: 1 }}>Hasta<input type="datetime-local" required value={f.hasta} onChange={e => set('hasta', e.target.value)} /></label></div>
    <label>Ingresos permitidos<select value={f.usos_max} onChange={e => set('usos_max', e.target.value)}><option value="1">1 ingreso</option><option value="2">2 ingresos (ida y vuelta)</option><option value="10">Hasta 10 ingresos</option></select></label>
    <button className="btn primary block">Generar pase con QR</button>
  </form>;
}

export function NuevoPersonal({ unidadId, onCreado }: { unidadId: string; onCreado: (p: Pase) => void }) {
  const { perfil } = useSesion(); const p = useDatos();
  const [f, setF] = useState({ nombre: '', rol: '', hd: '07:00', hh: '18:00' }); const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));
  async function crear(e: FormEvent) {
    e.preventDefault(); const anio = new Date(); anio.setFullYear(anio.getFullYear() + 1);
    const pase: Pase = { id: uid(), condominio_id: perfil!.condominio_id, unidad_id: unidadId, codigo: code6(), tipo: 'personal', nombre: f.nombre.trim(), rol: f.rol, dias, hora_desde: f.hd, hora_hasta: f.hh, desde: nowIso(), hasta: anio.toISOString(), usos: 0, usos_max: 9999, estado: 'activo', creado_en: nowIso() };
    await p.upsert('pases', pase as unknown as { id: string }); toast('Credencial creada'); setF({ nombre: '', rol: '', hd: '07:00', hh: '18:00' }); onCreado(pase);
  }
  return <form onSubmit={crear} className="card">
    <h4>Agregar persona</h4>
    <label>Nombre<input required value={f.nombre} onChange={e => set('nombre', e.target.value)} /></label>
    <label>Rol<input required value={f.rol} onChange={e => set('rol', e.target.value)} placeholder="Ej. Trabajadora del hogar" /></label>
    <label>Días<div className="dias">{[1, 2, 3, 4, 5, 6, 0].map(i => <label key={i}><input type="checkbox" checked={dias.includes(i)} onChange={e => setDias(d => e.target.checked ? [...d, i] : d.filter(x => x !== i))} />{DIAS_LARGO[i]}</label>)}</div></label>
    <div className="row"><label style={{ flex: 1 }}>Desde<input type="time" value={f.hd} onChange={e => set('hd', e.target.value)} /></label><label style={{ flex: 1 }}>Hasta<input type="time" value={f.hh} onChange={e => set('hh', e.target.value)} /></label></div>
    <button className="btn primary block">Crear credencial</button>
  </form>;
}

export function PaseModal({ pase, onClose }: { pase: Pase; onClose: () => void }) {
  const p = useDatos(); const u = p.get<Unidad>('unidades', pase.unidad_id); const c = p.condominio();
  return <Modal onClose={onClose}>
    <span className="eyebrow">{pase.tipo === 'personal' ? 'Credencial recurrente' : 'Pase de invitado'}</span>
    <h3>{pase.nombre}</h3>
    <QrView texto={'GS:' + pase.codigo} />
    <div className="code">{pase.codigo}</div>
    <p className="small">{u?.lote} · {pase.placa ? `placa ${pase.placa} · ` : ''}{pase.tipo === 'personal' ? `${pase.hora_desde} a ${pase.hora_hasta}` : `hasta ${fmtDT(pase.hasta)}`}</p>
    <div className="row">
      <button className="btn primary" onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(waText(pase, u, c)), '_blank')}>Enviar por WhatsApp</button>
      <button className="btn" onClick={() => navigator.clipboard?.writeText(paseLink(pase.codigo)).then(() => toast('Enlace copiado'))}>Copiar enlace</button>
      <button className="btn ghost" onClick={onClose}>Cerrar</button>
    </div>
  </Modal>;
}
