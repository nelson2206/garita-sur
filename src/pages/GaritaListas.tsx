import { useDatos, useSesion } from '../lib/auth';
import { Offline } from '../lib/offline';
import { registrarIngreso, registrarSalida } from '../lib/acciones';
import type { Evento, Presencia, Solicitud, Unidad } from '../lib/types';
import { fmtT, nowIso } from '../lib/util';
import { telefonoUtil, waLink } from '../lib/notificaciones';
import { Plate, toast } from '../components/ui';

export function Dentro() {
  const { perfil } = useSesion(); const p = useDatos();
  const dentro = p.all<Presencia>('presencia').sort((a, b) => a.desde.localeCompare(b.desde));
  return <div className="card"><div className="row between"><h3>Dentro ahora</h3><span className="pill sea">{dentro.length}</span></div>
    <div className="list">{dentro.length ? dentro.map(d => <div key={d.id} className="item"><div className="row between"><span className="t">{d.nombre} <Plate p={d.placa} /></span><span className="small">desde {fmtT(d.desde)}</span></div><span className="s">{p.get<Unidad>('unidades', d.unidad_id)?.lote} · {d.tipo}</span><div className="row"><button className="btn sm" onClick={() => registrarSalida(p, perfil!, d).then(() => toast('Salida registrada'))}>Registrar salida</button></div></div>) : <p className="muted">Nadie dentro.</p>}</div>
  </div>;
}

export function Solicitudes() {
  const { perfil } = useSesion(); const p = useDatos();
  const solic = p.all<Solicitud>('solicitudes').sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 6);
  const unidad = (id: string) => p.get<Unidad>('unidades', id);
  const marcarTel = (s: Solicitud) => Offline.escribir(p, 'solicitudes', { ...s, estado: 'telefono', resuelto_en: nowIso() });
  const ingreso = async (s: Solicitud) => {
    await registrarIngreso(p, perfil!, { nombre: s.nombre, placa: s.placa || '', unidadId: s.unidad_id, medio: 'manual', autorizo: (s.estado === 'aprobada' ? 'Aprobado en la app · ' : 'Aprobado por teléfono · ') + (unidad(s.unidad_id)?.propietario || '') });
    await Offline.escribir(p, 'solicitudes', { ...s, estado: 'ingreso' }); toast('Ingreso registrado');
  };
  const pill = (s: Solicitud) => s.estado === 'pendiente' ? <span className="pill warn">Esperando al residente</span> : s.estado === 'aprobada' ? <span className="pill ok">Aprobada en la app</span> : s.estado === 'telefono' ? <span className="pill ok">Aprobada por teléfono</span> : s.estado === 'rechazada' ? <span className="pill bad">Rechazada</span> : <span className="pill nv">Ingresó</span>;
  // Si el propietario no tiene la app abierta, el aviso seguro es WhatsApp desde la garita.
  const avisarWa = (s: Solicitud) => {
    const u = unidad(s.unidad_id);
    const texto = `Garita de ${p.condominio()?.nombre ?? 'el condominio'}: ${s.nombre}${s.placa ? ` (placa ${s.placa})` : ''} pide ingresar a ${u?.lote ?? 'su lote'}${s.nota ? `. Motivo: ${s.nota}` : ''}. ¿Autoriza el ingreso?`;
    window.open(waLink(u?.telefono, texto), '_blank');
  };
  return <div className="card"><h3>Solicitudes al residente</h3><div className="list">{solic.length ? solic.map(s => <div key={s.id} className="item"><div className="row between"><span className="t">{s.nombre} <Plate p={s.placa} /></span>{pill(s)}</div><span className="s">{unidad(s.unidad_id)?.lote} · {unidad(s.unidad_id)?.propietario} · {fmtT(s.ts)}</span><div className="row">{s.estado === 'pendiente' && <>
    <button className="btn sm primary" onClick={() => avisarWa(s)}>Avisar por WhatsApp</button>
    <button className="btn sm" onClick={() => marcarTel(s)}>Aprobó por teléfono</button>
    {!telefonoUtil(unidad(s.unidad_id)?.telefono) && <span className="pill nv">Lote sin teléfono en el padrón</span>}
  </>}{(s.estado === 'aprobada' || s.estado === 'telefono') && <button className="btn sm primary" onClick={() => ingreso(s)}>Registrar ingreso</button>}</div></div>) : <p className="muted">Sin solicitudes.</p>}</div></div>;
}

export function BitacoraTurno() {
  const p = useDatos();
  const bit = p.all<Evento>('eventos').sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 8);
  return <div className="card"><h3>Bitácora del turno</h3><div className="list">{bit.map(b => <div key={b.id} className="item"><div className="row between"><span className="t">{b.tipo === 'ingreso' ? 'Ingreso' : 'Salida'} · {b.nombre} <Plate p={b.placa} /></span><span className="small">{fmtT(b.ts)} {b.sincronizado === false && <span className="pill warn">local</span>}</span></div><span className="s">{p.get<Unidad>('unidades', b.unidad_id)?.lote} · {b.medio} · {b.autorizo}{b.vigilante ? ` · registró ${b.vigilante}` : ''}</span></div>)}</div></div>;
}
