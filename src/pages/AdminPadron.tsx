import { useRef, useState } from 'react';
import { useDatos, useSesion } from '../lib/auth';
import type { Unidad, Vehiculo } from '../lib/types';
import { normPlate, uid } from '../lib/util';
import { Plate, toast } from '../components/ui';

/** Padrón de lotes: estado de cuenta, vehículos, alta manual e importación desde CSV. */
export function Padron() {
  const { perfil } = useSesion(); const p = useDatos(); const cid = perfil!.condominio_id;
  const [nuevo, setNuevo] = useState({ lote: '', propietario: '', telefono: '' });
  const [veh, setVeh] = useState<{ unidadId: string; placa: string }>({ unidadId: '', placa: '' });
  const file = useRef<HTMLInputElement>(null);
  const us = p.all<Unidad>('unidades').sort((a, b) => a.lote.localeCompare(b.lote, undefined, { numeric: true }));
  const vehs = (u: Unidad) => p.all<Vehiculo>('vehiculos').filter(v => v.unidad_id === u.id);

  const setCuotas = (u: Unidad, n: number) => p.upsert('unidades', { ...u, cuotas_pendientes: Math.max(0, n) }).then(() => toast('Estado de cuenta actualizado'));
  async function agregarUnidad() {
    if (!nuevo.lote.trim() || !nuevo.propietario.trim()) return;
    await p.upsert('unidades', { id: uid(), condominio_id: cid, lote: nuevo.lote.trim(), propietario: nuevo.propietario.trim(), telefono: nuevo.telefono, cuotas_pendientes: 0, cupo_vehiculos: 3 });
    setNuevo({ lote: '', propietario: '', telefono: '' }); toast('Lote agregado');
  }
  async function agregarVehiculo() {
    if (!veh.unidadId || !veh.placa.trim()) return;
    await p.upsert('vehiculos', { id: uid(), condominio_id: cid, unidad_id: veh.unidadId, placa: normPlate(veh.placa), descripcion: '' }); setVeh({ unidadId: '', placa: '' }); toast('Vehículo agregado');
  }
  /** CSV con columnas: lote, propietario, telefono, cuotas_pendientes, placas (separadas por ;). */
  async function importar(f: File) {
    const texto = await f.text();
    const lineas = texto.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const sep = lineas[0].includes(';') && !lineas[0].includes(',') ? ';' : ',';
    const cab = lineas[0].toLowerCase().split(sep).map(s => s.trim().replace(/"/g, ''));
    const idx = (n: string) => cab.indexOf(n);
    if (idx('lote') < 0 || idx('propietario') < 0) return toast('El CSV necesita las columnas lote y propietario');
    let n = 0;
    for (const l of lineas.slice(1)) {
      const c = l.split(sep).map(s => s.trim().replace(/"/g, ''));
      const lote = c[idx('lote')]; if (!lote) continue;
      const existente = us.find(u => u.lote.toLowerCase() === lote.toLowerCase());
      const u: Unidad = { id: existente?.id || uid(), condominio_id: cid, lote, propietario: c[idx('propietario')] || '', telefono: idx('telefono') >= 0 ? c[idx('telefono')] : '', cuotas_pendientes: idx('cuotas_pendientes') >= 0 ? +c[idx('cuotas_pendientes')] || 0 : (existente?.cuotas_pendientes || 0), cupo_vehiculos: existente?.cupo_vehiculos || 3 };
      await p.upsert('unidades', u as unknown as { id: string }); n++;
      if (idx('placas') >= 0) for (const pl of (c[idx('placas')] || '').split(/[;|/ ]+/).filter(Boolean)) {
        const placa = normPlate(pl); if (!p.all<Vehiculo>('vehiculos').some(v => v.placa === placa)) await p.upsert('vehiculos', { id: uid(), condominio_id: cid, unidad_id: u.id, placa, descripcion: '' });
      }
    }
    toast(`${n} lote(s) importados`);
  }
  return (
    <div className="card">
      <h3>Padrón y estado de cuenta</h3>
      <p className="small">Las cuotas pendientes llegan por integración con la plataforma de cuotas o desde un CSV con columnas lote, propietario, telefono, cuotas_pendientes, placas.</p>
      <div className="row"><button className="btn sm" onClick={() => file.current?.click()}>Importar CSV</button><input ref={file} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ''; }} /></div>
      <div className="tbl"><table>
        <thead><tr><th>Lote</th><th>Propietario</th><th>Vehículos</th><th>Cuotas pend.</th><th>Estado</th></tr></thead>
        <tbody>{us.map(u => <tr key={u.id}><td><b>{u.lote}</b></td><td>{u.propietario}</td><td>{vehs(u).map(v => <Plate key={v.id} p={v.placa} />)}</td><td><input type="number" min={0} defaultValue={u.cuotas_pendientes} onBlur={e => { if (+e.target.value !== u.cuotas_pendientes) setCuotas(u, +e.target.value); }} style={{ width: 70, padding: '4px 6px', minHeight: 0 }} /></td><td><span className={'pill ' + (u.cuotas_pendientes > 0 ? 'bad' : 'ok')}>{u.cuotas_pendientes > 0 ? 'En mora' : 'Al día'}</span></td></tr>)}</tbody>
      </table></div>
      <div className="row"><input placeholder="Lote" value={nuevo.lote} onChange={e => setNuevo(s => ({ ...s, lote: e.target.value }))} style={{ flex: .6 }} /><input placeholder="Propietario" value={nuevo.propietario} onChange={e => setNuevo(s => ({ ...s, propietario: e.target.value }))} style={{ flex: 1.2 }} /><input placeholder="Teléfono" value={nuevo.telefono} onChange={e => setNuevo(s => ({ ...s, telefono: e.target.value }))} style={{ flex: .8 }} /><button className="btn sm dark" onClick={agregarUnidad}>Agregar lote</button></div>
      <div className="row"><select value={veh.unidadId} onChange={e => setVeh(s => ({ ...s, unidadId: e.target.value }))} style={{ flex: 1 }}><option value="">Lote…</option>{us.map(u => <option key={u.id} value={u.id}>{u.lote}</option>)}</select><input placeholder="Placa" value={veh.placa} onChange={e => setVeh(s => ({ ...s, placa: e.target.value }))} style={{ flex: 1 }} /><button className="btn sm dark" onClick={agregarVehiculo}>Agregar placa</button></div>
    </div>
  );
}
