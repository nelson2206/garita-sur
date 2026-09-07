import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDatos } from '../lib/auth';
import type { Pase, Presencia, Solicitud, Unidad, Vehiculo } from '../lib/types';
import { esRecurrente, fmtDT, fmtT, normPlate, nowIso, semaforo, uid } from '../lib/util';
import { avisar, avisosActivos, avisosSoportados, pedirPermisoAvisos } from '../lib/notificaciones';
import { Plate, SemaforoBox, toast } from '../components/ui';
import type { Acciones } from './Residente';

export function Inicio({ unidadId, onVer, onWa, onAnular }: { unidadId: string } & Acciones) {
  const p = useDatos(); const u = p.get<Unidad>('unidades', unidadId); const c = p.condominio();
  const [placa, setPlaca] = useState(''); const [desc, setDesc] = useState('');
  const [avisos, setAvisos] = useState(avisosActivos());
  const solic = p.all<Solicitud>('solicitudes').filter(s => s.unidad_id === unidadId && s.estado === 'pendiente');
  const activos = p.all<Pase>('pases').filter(x => x.unidad_id === unidadId && !esRecurrente(x.tipo) && x.estado === 'activo');
  const dentro = p.all<Presencia>('presencia').filter(d => d.unidad_id === unidadId);
  const vehiculos = p.all<Vehiculo>('vehiculos').filter(v => v.unidad_id === unidadId);

  // Aviso del navegador cuando la garita pide autorización y la app está abierta o instalada.
  const vistas = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(solic.map(s => s.id));
    if (vistas.current === null) { vistas.current = ids; return; }
    for (const s of solic) {
      if (!vistas.current.has(s.id)) avisar('La garita pide tu aprobación', `${s.nombre}${s.placa ? ` (${s.placa})` : ''} quiere ingresar a ${u?.lote ?? 'tu lote'}`);
    }
    vistas.current = ids;
  }, [solic, u?.lote]);

  const resolver = async (s: Solicitud, estado: 'aprobada' | 'rechazada') => {
    await p.upsert('solicitudes', { ...s, estado, resuelto_en: nowIso() });
    toast(estado === 'aprobada' ? 'Ingreso aprobado. La garita ya lo ve.' : 'Ingreso rechazado');
  };
  const agregarVeh = async () => {
    if (!placa.trim() || !u) return;
    if (vehiculos.length >= u.cupo_vehiculos) return toast('Cupo de vehículos completo');
    await p.upsert('vehiculos', { id: uid(), condominio_id: u.condominio_id, unidad_id: unidadId, placa: normPlate(placa), descripcion: desc });
    setPlaca(''); setDesc(''); toast('Vehículo registrado');
  };
  const activarAvisos = async () => {
    const ok = await pedirPermisoAvisos(); setAvisos(ok);
    toast(ok ? 'Avisos activados' : 'El navegador no dio permiso para avisos');
  };

  return <>
    {solic.map(s => <div key={s.id} className="card" style={{ borderLeft: '6px solid var(--accent)' }}>
      <span className="eyebrow">La garita pide tu aprobación</span>
      <div><b>{s.nombre}</b> <Plate p={s.placa} /><p className="small">{s.nota || 'Visita no anunciada'} · {fmtT(s.ts)}</p></div>
      <div className="row"><button className="btn primary sm" onClick={() => resolver(s, 'aprobada')}>Aprobar ingreso</button><button className="btn sm danger" onClick={() => resolver(s, 'rechazada')}>Rechazar</button></div>
    </div>)}
    {avisosSoportados() && !avisos && <div className="card" style={{ borderLeft: '6px solid var(--sea)' }}>
      <span className="eyebrow">Avisos</span>
      <p className="small">Activa los avisos para enterarte cuando la garita pida tu autorización, sin tener la app abierta.</p>
      <button className="btn sm dark" onClick={activarAvisos}>Activar avisos en este dispositivo</button>
    </div>}
    <SemaforoBox s={semaforo(u, c)} />
    <div className="card">
      <div className="row between"><h4>Mis pases activos</h4><span className="pill sea">{activos.length}</span></div>
      {activos.length ? activos.map(x => <div key={x.id} className="item">
        <div className="row between"><span className="t">{x.nombre}</span><span className="pill acc">{x.codigo}</span></div>
        <span className="s">{x.grupo ? `${x.grupo} · ` : ''}{x.placa ? `Placa ${x.placa} · ` : ''}hasta {fmtDT(x.hasta)} · {x.usos}/{x.usos_max} ingresos</span>
        <div className="row"><button className="btn sm" onClick={() => onVer(x)}>Ver QR</button><button className="btn sm" onClick={() => onWa(x)}>WhatsApp</button><button className="btn sm ghost danger" onClick={() => onAnular(x)}>Anular</button></div>
      </div>) : <p className="muted">Aún no tienes invitaciones vigentes.</p>}
      <NavLink to="/residente/nuevo" className="btn primary block">+ Invitar a alguien</NavLink>
    </div>
    <div className="card"><h4>En mi lote ahora</h4>{dentro.length ? dentro.map(d => <div key={d.id} className="item"><span className="t">{d.nombre}</span><span className="s"><Plate p={d.placa} /> desde {fmtT(d.desde)}</span></div>) : <p className="muted">Nadie registrado dentro.</p>}</div>
    <div className="card"><h4>Mis vehículos</h4>
      {vehiculos.map(v => <div key={v.id} className="row between"><span><Plate p={v.placa} /> <span className="small">{v.descripcion}</span></span><button className="btn sm ghost danger" onClick={() => p.remove('vehiculos', v.id)}>Quitar</button></div>)}
      <div className="row"><input placeholder="Placa (ABC-123)" value={placa} onChange={e => setPlaca(e.target.value)} style={{ flex: 1 }} /><input placeholder="Marca y color" value={desc} onChange={e => setDesc(e.target.value)} style={{ flex: 1.4 }} /><button className="btn sm dark" onClick={agregarVeh}>Agregar</button></div>
      <p className="muted">Cupo: {vehiculos.length} de {u?.cupo_vehiculos}. El vigilante ve tus placas al buscar.</p>
    </div>
  </>;
}
