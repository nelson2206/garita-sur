import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { useDatos, useSesion } from '../lib/auth';
import type { Evento, Pase, Unidad } from '../lib/types';
import { DIAS, fmtDT, waText } from '../lib/util';
import { Plate, toast } from '../components/ui';
import { NuevoPase, NuevoPersonal, PaseModal } from './ResidenteForms';
import { Inicio } from './ResidenteInicio';

export type Acciones = { onVer: (p: Pase) => void; onWa: (p: Pase) => void; onAnular: (p: Pase) => void };

export default function Residente() {
  const { perfil } = useSesion(); const p = useDatos();
  const [verPase, setVerPase] = useState<Pase | null>(null);
  const uid_ = perfil!.unidad_id || '';
  const u = p.get<Unidad>('unidades', uid_); const c = p.condominio();
  const pases = p.all<Pase>('pases').filter(x => x.unidad_id === uid_);
  const acciones: Acciones = {
    onVer: setVerPase,
    onWa: x => window.open('https://wa.me/?text=' + encodeURIComponent(waText(x, u, c)), '_blank'),
    onAnular: async x => { await p.upsert('pases', { ...x, estado: 'anulado' }); toast('Pase anulado'); },
  };
  const cls = ({ isActive }: { isActive: boolean }) => isActive ? 'activo' : '';
  return (
    <main className="phone">
      <div><span className="eyebrow">{c?.nombre}</span><h2>{u?.lote} · {u?.propietario}</h2></div>
      <Routes>
        <Route index element={<Inicio unidadId={uid_} {...acciones} />} />
        <Route path="nuevo" element={<NuevoPase unidadId={uid_} onCreado={setVerPase} />} />
        <Route path="personal" element={<Personal unidadId={uid_} pases={pases} {...acciones} onCreado={setVerPase} />} />
        <Route path="actividad" element={<Actividad unidadId={uid_} />} />
      </Routes>
      {verPase && <PaseModal pase={verPase} onClose={() => setVerPase(null)} />}
      <nav className="nav">
        <NavLink to="/residente" end className={cls}><span>⌂</span>Inicio</NavLink>
        <NavLink to="/residente/nuevo" className={cls}><span>+</span>Invitar</NavLink>
        <NavLink to="/residente/personal" className={cls}><span>☺</span>Personal</NavLink>
        <NavLink to="/residente/actividad" className={cls}><span>≡</span>Actividad</NavLink>
      </nav>
    </main>
  );
}

function Personal({ unidadId, pases, onVer, onWa, onAnular, onCreado }: { unidadId: string; pases: Pase[]; onCreado: (p: Pase) => void } & Acciones) {
  const pers = pases.filter(x => x.tipo === 'personal' && x.estado !== 'anulado');
  return <>
    <div className="card"><h4>Personal recurrente</h4><p className="small">Trabajadoras del hogar, jardineros, piscineros. Entran con su QR en los días y horas que apruebes.</p>
      {pers.length ? pers.map(x => <div key={x.id} className="item">
        <div className="row between"><span className="t">{x.nombre}</span><span className="pill acc">{x.codigo}</span></div>
        <span className="s">{x.rol} · {(x.dias || []).map(d => DIAS[d]).join(' ')} · {x.hora_desde} a {x.hora_hasta} · {x.usos} ingresos</span>
        <div className="row"><button className="btn sm" onClick={() => onVer(x)}>Ver QR</button><button className="btn sm" onClick={() => onWa(x)}>WhatsApp</button><button className="btn sm ghost danger" onClick={() => onAnular(x)}>Dar de baja</button></div>
      </div>) : <p className="muted">Sin personal registrado.</p>}
    </div>
    <NuevoPersonal unidadId={unidadId} onCreado={onCreado} />
  </>;
}

function Actividad({ unidadId }: { unidadId: string }) {
  const p = useDatos();
  const bit = p.all<Evento>('eventos').filter(b => b.unidad_id === unidadId).sort((a, b) => b.ts.localeCompare(a.ts));
  return <div className="card"><h4>Actividad de mi lote</h4>{bit.length ? bit.map(b => <div key={b.id} className="item"><div className="row between"><span className="t">{b.tipo === 'ingreso' ? 'Ingreso' : 'Salida'} · {b.nombre}</span><span className="small">{fmtDT(b.ts)}</span></div><span className="s"><Plate p={b.placa} /> {b.autorizo}</span></div>) : <p className="muted">Sin movimientos.</p>}</div>;
}
