import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatos, useSesion } from '../lib/auth';
import type { Pase, TipoPase, Unidad } from '../lib/types';
import { DIAS_LARGO, ETIQUETA_TIPO, code6, fmtDT, localDT, normPlate, nowIso, paseLink, uid, waText } from '../lib/util';
import { Modal, QrView, toast } from '../components/ui';

/** Invitación puntual. Con varios nombres crea un pase por invitado, útil para eventos. */
export function NuevoPase({ unidadId, onCreado }: { unidadId: string; onCreado: (p: Pase) => void }) {
  const { perfil } = useSesion(); const p = useDatos(); const nav = useNavigate();
  const d = new Date(); const h = new Date(d); h.setHours(23, 59, 0, 0);
  const [f, setF] = useState({ tipo: 'invitado', nombre: '', placa: '', desde: localDT(d), hasta: localDT(h), usos_max: '2', grupo: '' });
  const [varios, setVarios] = useState(false); const [lista, setLista] = useState('');
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));
  const nombres = lista.split(/\r?\n|,|;/).map(s => s.trim()).filter(Boolean);

  async function crear(e: FormEvent) {
    e.preventDefault();
    const base = { condominio_id: perfil!.condominio_id, unidad_id: unidadId, tipo: f.tipo as TipoPase, desde: new Date(f.desde).toISOString(), hasta: new Date(f.hasta).toISOString(), usos: 0, usos_max: +f.usos_max, estado: 'activo' as const, creado_en: nowIso(), grupo: f.grupo.trim() || null };
    if (varios) {
      if (!nombres.length) return toast('Escribe al menos un invitado');
      if (!f.grupo.trim()) return toast('Ponle nombre al evento para agrupar los pases');
      for (const n of nombres) await p.upsert('pases', { ...base, id: uid(), codigo: code6(), nombre: n, placa: null } as unknown as { id: string });
      toast(`${nombres.length} pases creados`); nav('/residente'); return;
    }
    const pase: Pase = { ...base, id: uid(), codigo: code6(), nombre: f.nombre.trim(), placa: normPlate(f.placa) };
    await p.upsert('pases', pase as unknown as { id: string }); toast('Pase creado'); nav('/residente'); onCreado(pase);
  }

  return <form onSubmit={crear} className="card">
    <h4>Nueva invitación</h4>
    <label>Tipo<select value={f.tipo} onChange={e => set('tipo', e.target.value)}>
      {(['invitado', 'proveedor', 'huesped'] as TipoPase[]).map(t => <option key={t} value={t}>{ETIQUETA_TIPO[t]}</option>)}
    </select></label>
    <label className="switch"><input type="checkbox" checked={varios} onChange={e => setVarios(e.target.checked)} />Invitar a varias personas a la vez (evento o reunión)</label>
    {varios ? <>
      <label>Nombre del evento<input required value={f.grupo} onChange={e => set('grupo', e.target.value)} placeholder="Ej. Almuerzo de cumpleaños" /></label>
      <label>Invitados, uno por línea<textarea rows={6} value={lista} onChange={e => setLista(e.target.value)} placeholder={'Lucía Paredes\nCarlos Bravo\nFamilia Ortega'} /></label>
      <p className="muted">{nombres.length} invitado(s). Puedes pegar la lista desde Excel: cada fila crea su propio pase con código.</p>
    </> : <>
      <label>Nombre del invitado<input required value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Lucía Paredes" /></label>
      <label>Placa (opcional)<input value={f.placa} onChange={e => set('placa', e.target.value)} placeholder="ABC-123" /></label>
    </>}
    <div className="row"><label style={{ flex: 1 }}>Desde<input type="datetime-local" required value={f.desde} onChange={e => set('desde', e.target.value)} /></label><label style={{ flex: 1 }}>Hasta<input type="datetime-local" required value={f.hasta} onChange={e => set('hasta', e.target.value)} /></label></div>
    <label>Ingresos permitidos por persona<select value={f.usos_max} onChange={e => set('usos_max', e.target.value)}><option value="1">1 ingreso</option><option value="2">2 ingresos (ida y vuelta)</option><option value="10">Hasta 10 ingresos</option></select></label>
    <button className="btn primary block">{varios ? `Generar ${nombres.length || ''} pases` : 'Generar pase con QR'}</button>
  </form>;
}

const PRESETS: Record<'personal' | 'familiar' | 'obra', { dias: number[]; hd: string; hh: string; rol: string; meses: number }> = {
  personal: { dias: [1, 2, 3, 4, 5], hd: '07:00', hh: '18:00', rol: 'Trabajadora del hogar', meses: 12 },
  familiar: { dias: [0, 1, 2, 3, 4, 5, 6], hd: '00:00', hh: '23:59', rol: 'Familiar', meses: 12 },
  obra: { dias: [1, 2, 3, 4, 5], hd: '08:00', hh: '17:00', rol: 'Albañil', meses: 2 },
};

/** Credenciales que se repiten: personal del hogar, familia frecuente y trabajadores de obra. */
export function NuevoRecurrente({ unidadId, onCreado }: { unidadId: string; onCreado: (p: Pase) => void }) {
  const { perfil } = useSesion(); const p = useDatos();
  const [tipo, setTipo] = useState<'personal' | 'familiar' | 'obra'>('personal');
  const [f, setF] = useState({ nombre: '', rol: PRESETS.personal.rol, hd: '07:00', hh: '18:00', grupo: '', placa: '' });
  const [dias, setDias] = useState<number[]>(PRESETS.personal.dias);
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));

  function cambiarTipo(t: 'personal' | 'familiar' | 'obra') {
    const pr = PRESETS[t];
    setTipo(t); setDias(pr.dias); setF(s => ({ ...s, rol: pr.rol, hd: pr.hd, hh: pr.hh }));
  }
  async function crear(e: FormEvent) {
    e.preventDefault();
    const hasta = new Date(); hasta.setMonth(hasta.getMonth() + PRESETS[tipo].meses);
    const pase: Pase = { id: uid(), condominio_id: perfil!.condominio_id, unidad_id: unidadId, codigo: code6(), tipo, nombre: f.nombre.trim(), rol: f.rol, placa: normPlate(f.placa) || null, grupo: tipo === 'obra' ? (f.grupo.trim() || null) : null, dias, hora_desde: f.hd, hora_hasta: f.hh, desde: nowIso(), hasta: hasta.toISOString(), usos: 0, usos_max: 9999, estado: 'activo', creado_en: nowIso() };
    await p.upsert('pases', pase as unknown as { id: string }); toast('Credencial creada');
    setF(s => ({ ...s, nombre: '', placa: '' })); onCreado(pase);
  }
  return <form onSubmit={crear} className="card">
    <h4>Agregar credencial recurrente</h4>
    <label>Tipo<select value={tipo} onChange={e => cambiarTipo(e.target.value as 'personal' | 'familiar' | 'obra')}>
      <option value="personal">{ETIQUETA_TIPO.personal}</option>
      <option value="familiar">{ETIQUETA_TIPO.familiar}</option>
      <option value="obra">{ETIQUETA_TIPO.obra}</option>
    </select></label>
    {tipo === 'obra' && <>
      <label>Obra o empresa<input required value={f.grupo} onChange={e => set('grupo', e.target.value)} placeholder="Ej. Ampliación segundo piso" /></label>
      <p className="muted">La credencial vence en 2 meses. Renuévala si la obra continúa.</p>
    </>}
    <label>Nombre<input required value={f.nombre} onChange={e => set('nombre', e.target.value)} /></label>
    <label>{tipo === 'familiar' ? 'Parentesco' : 'Oficio'}<input required value={f.rol} onChange={e => set('rol', e.target.value)} /></label>
    <label>Placa (opcional)<input value={f.placa} onChange={e => set('placa', e.target.value)} placeholder="ABC-123" /></label>
    <label>Días<div className="dias">{[1, 2, 3, 4, 5, 6, 0].map(i => <label key={i}><input type="checkbox" checked={dias.includes(i)} onChange={e => setDias(d => e.target.checked ? [...d, i] : d.filter(x => x !== i))} />{DIAS_LARGO[i]}</label>)}</div></label>
    <div className="row"><label style={{ flex: 1 }}>Desde<input type="time" value={f.hd} onChange={e => set('hd', e.target.value)} /></label><label style={{ flex: 1 }}>Hasta<input type="time" value={f.hh} onChange={e => set('hh', e.target.value)} /></label></div>
    <button className="btn primary block">Crear credencial</button>
  </form>;
}

export function PaseModal({ pase, onClose }: { pase: Pase; onClose: () => void }) {
  const p = useDatos(); const u = p.get<Unidad>('unidades', pase.unidad_id); const c = p.condominio();
  return <Modal onClose={onClose}>
    <span className="eyebrow">{ETIQUETA_TIPO[pase.tipo]}</span>
    <h3>{pase.nombre}</h3>
    <QrView texto={'GS:' + pase.codigo} />
    <div className="code">{pase.codigo}</div>
    <p className="small">{u?.lote} · {pase.placa ? `placa ${pase.placa} · ` : ''}{pase.hora_desde ? `${pase.hora_desde} a ${pase.hora_hasta}` : `hasta ${fmtDT(pase.hasta)}`}{pase.grupo ? ` · ${pase.grupo}` : ''}</p>
    <div className="row">
      <button className="btn primary" onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(waText(pase, u, c)), '_blank')}>Enviar por WhatsApp</button>
      <button className="btn" onClick={() => navigator.clipboard?.writeText(paseLink(pase.codigo)).then(() => toast('Enlace copiado'))}>Copiar enlace</button>
      <button className="btn ghost" onClick={onClose}>Cerrar</button>
    </div>
  </Modal>;
}
