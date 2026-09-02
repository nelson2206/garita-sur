import { useState } from 'react';
import { useDatos, useSesion } from '../lib/auth';
import { registrarIngreso } from '../lib/acciones';
import type { Pase, Unidad, Vehiculo } from '../lib/types';
import { fmtDT, semaforo, soloDigitos } from '../lib/util';
import { Plate, toast } from '../components/ui';
import type { ModalGarita } from './Garita';

type Res = { k: 'veh'; u: Unidad; v: Vehiculo } | { k: 'uni'; u: Unidad } | { k: 'pase'; pase: Pase };

/** Búsqueda en el padrón (lotes, placas) y en los pases vigentes. */
export function Busqueda({ setModal }: { setModal: (m: ModalGarita) => void }) {
  const { perfil } = useSesion(); const p = useDatos(); const c = p.condominio();
  const [q, setQ] = useState('');
  const Q = q.trim().toUpperCase(); const qp = Q.replace(/[^A-Z0-9]/g, ''); const qn = soloDigitos(Q);
  const res: Res[] = [];
  if (Q.length >= 2) {
    for (const u of p.all<Unidad>('unidades')) {
      for (const v of p.all<Vehiculo>('vehiculos').filter(v => v.unidad_id === u.id)) if (qp && v.placa.replace('-', '').includes(qp)) res.push({ k: 'veh', u, v });
      if (u.lote.toUpperCase().includes(Q) || (qn && soloDigitos(u.lote) === qn) || u.propietario.toUpperCase().includes(Q)) res.push({ k: 'uni', u });
    }
    for (const pase of p.all<Pase>('pases').filter(x => x.estado === 'activo')) if (pase.codigo === Q || pase.nombre.toUpperCase().includes(Q) || (pase.placa && qp && pase.placa.replace('-', '').includes(qp))) res.push({ k: 'pase', pase });
  }
  const ingresoVehiculo = (u: Unidad, v: Vehiculo) => registrarIngreso(p, perfil!, { nombre: u.propietario, placa: v.placa, unidadId: u.id, medio: 'placa', autorizo: 'Vehículo registrado en el padrón', tipo: 'residente' }).then(() => { toast('Ingreso registrado'); setQ(''); });
  const placasDe = (u: Unidad) => p.all<Vehiculo>('vehiculos').filter(v => v.unidad_id === u.id).map(v => v.placa).join(', ') || 'Sin vehículos';
  return (
    <div className="card">
      <label>Buscar placa, nombre, lote o código<input value={q} onChange={e => setQ(e.target.value)} placeholder="Ej. BJK-482, Lucía, 12, 7QK4M2" autoComplete="off" /></label>
      <div className="list">
        {Q.length < 2 && <p className="muted">Escribe para buscar en el padrón y en los pases vigentes.</p>}
        {Q.length >= 2 && res.length === 0 && <p className="muted">Sin resultados. Puedes registrar una visita no anunciada.</p>}
        {res.slice(0, 8).map((r, i) => {
          if (r.k === 'veh') { const s = semaforo(r.u, c); return <div key={i} className="item"><div className="row between"><span className="t"><Plate p={r.v.placa} /> {r.v.descripcion}</span><span className={'pill ' + s.cls}>{s.titulo}</span></div><span className="s">{r.u.lote} · {r.u.propietario} · vehículo registrado</span><div className="row"><button className="btn sm primary" onClick={() => ingresoVehiculo(r.u, r.v)}>Registrar ingreso</button></div></div>; }
          if (r.k === 'uni') { const s = semaforo(r.u, c); return <div key={i} className="item"><div className="row between"><span className="t">{r.u.lote} · {r.u.propietario}</span><span className={'pill ' + s.cls}>{s.titulo}</span></div><span className="s">{placasDe(r.u)} · {r.u.telefono}</span><div className="row"><button className="btn sm" onClick={() => setModal({ k: 'noanunciado', unidadId: r.u.id })}>Visita no anunciada para este lote</button></div></div>; }
          const u = p.get<Unidad>('unidades', r.pase.unidad_id);
          return <div key={i} className="item"><div className="row between"><span className="t">{r.pase.nombre} <span className="pill acc">{r.pase.codigo}</span></span><span className="pill sea">{r.pase.tipo}</span></div><span className="s">{u?.lote} · {r.pase.placa ? `placa ${r.pase.placa} · ` : ''}{r.pase.tipo === 'personal' ? `${r.pase.hora_desde} a ${r.pase.hora_hasta}` : `hasta ${fmtDT(r.pase.hasta)}`}</span><div className="row"><button className="btn sm primary" onClick={() => setModal({ k: 'validar', codigo: r.pase.codigo, foto: '' })}>Validar pase</button></div></div>;
        })}
      </div>
    </div>
  );
}
