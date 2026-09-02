import { useState } from 'react';
import { useDatos, useSesion } from '../lib/auth';
import type { Condominio, Evento, Pase, Solicitud, Unidad } from '../lib/types';
import { csv, descargar, fmtDT } from '../lib/util';
import { Foto, Plate, toast } from '../components/ui';
import { Padron } from './AdminPadron';

export default function Admin() {
  const { modo } = useSesion(); const p = useDatos();
  const c = p.condominio() as Condominio | undefined;
  const [cfg, setCfg] = useState({ regla: c?.regla_morosidad || 'informar', acuerdo: c?.acuerdo || '', retencion: String(c?.retencion_dias || 30) });
  const unidad = (id?: string | null) => p.get<Unidad>('unidades', id);
  const bit = p.all<Evento>('eventos').sort((a, b) => b.ts.localeCompare(a.ts));
  const hoy = new Date().toDateString();
  const us = p.all<Unidad>('unidades');
  const kpis: [string | number, string][] = [
    [bit.filter(b => b.tipo === 'ingreso' && new Date(b.ts).toDateString() === hoy).length, 'ingresos hoy'],
    [p.all('presencia').length, 'dentro ahora'],
    [p.all<Pase>('pases').filter(x => x.estado === 'activo' && x.tipo !== 'personal').length, 'pases de invitado vigentes'],
    [`${us.filter(u => u.cuotas_pendientes > 0).length} de ${us.length}`, 'lotes en mora'],
    [p.all<Solicitud>('solicitudes').filter(s => s.estado === 'pendiente').length, 'solicitudes pendientes'],
  ];
  async function guardarCfg() {
    if (!c) return;
    await p.upsert('condominios', { ...c, regla_morosidad: cfg.regla, acuerdo: cfg.acuerdo, retencion_dias: +cfg.retencion || 30 }); toast('Reglas guardadas. La garita ya las aplica.');
  }
  function exportar() {
    const rows = [['fecha_hora', 'evento', 'persona', 'placa', 'lote', 'medio', 'autorizo', 'sincronizado'], ...[...bit].reverse().map(b => [b.ts, b.tipo, b.nombre, b.placa, unidad(b.unidad_id)?.lote, b.medio, b.autorizo, b.sincronizado === false ? 'no' : 'si'])];
    descargar(`bitacora-${new Date().toISOString().slice(0, 10)}.csv`, csv(rows));
  }
  return (
    <main className="grid" style={{ gap: 16 }}>
      <div className="row between">
        <div><span className="eyebrow">Administración</span><h2>{c?.nombre}</h2></div>
        <div className="row"><button className="btn" onClick={exportar}>Exportar bitácora (CSV)</button>{modo === 'local' && <button className="btn ghost danger" onClick={() => { if (confirm('¿Reiniciar la demo con los datos de ejemplo?')) p.reset().then(() => toast('Demo reiniciada')); }}>Reiniciar demo</button>}</div>
      </div>
      <div className="kpis">{kpis.map(([n, l]) => <div key={l} className="kpi"><span className="n">{n}</span><span className="l">{l}</span></div>)}</div>
      <div className="grid g2">
        <div className="card">
          <h3>Regla de morosidad en garita</h3>
          <p className="small">La ley no permite impedir el ingreso a la vivienda. Elige qué ve el vigilante cuando un lote está en mora.</p>
          <label>Cuando el lote está en mora<select value={cfg.regla} onChange={e => setCfg(s => ({ ...s, regla: e.target.value as 'informar' | 'amenidades' }))}>
            <option value="informar">Solo informar al vigilante (recomendado por defecto)</option>
            <option value="amenidades">Informar y restringir amenidades (requiere acuerdo de junta)</option>
          </select></label>
          <label>Acuerdo de junta que respalda la regla<input value={cfg.acuerdo} onChange={e => setCfg(s => ({ ...s, acuerdo: e.target.value }))} placeholder="Ej. Asamblea 14-nov-2026, punto 3" /></label>
          <label>Retención de fotos de la bitácora (días, máximo 60)<input type="number" min={1} max={60} value={cfg.retencion} onChange={e => setCfg(s => ({ ...s, retencion: e.target.value }))} /></label>
          <button className="btn dark" onClick={guardarCfg}>Guardar reglas</button>
        </div>
        <Padron />
      </div>
      <div className="card">
        <div className="row between"><h3>Bitácora completa</h3><span className="muted">{bit.length} registros</span></div>
        <div className="tbl"><table>
          <thead><tr><th>Fecha y hora</th><th>Evento</th><th>Persona</th><th>Placa</th><th>Lote</th><th>Medio</th><th>Autorizó</th><th>Foto</th><th>Sinc.</th></tr></thead>
          <tbody>{bit.map(b => <tr key={b.id}><td>{fmtDT(b.ts)}</td><td>{b.tipo === 'ingreso' ? <span className="pill sea">Ingreso</span> : <span className="pill nv">Salida</span>}</td><td>{b.nombre}</td><td><Plate p={b.placa} /></td><td>{unidad(b.unidad_id)?.lote}</td><td>{b.medio}</td><td className="small">{b.autorizo}</td><td><Foto referencia={b.foto_url} /></td><td>{b.sincronizado === false ? <span className="pill warn">pendiente</span> : <span className="pill ok">ok</span>}</td></tr>)}</tbody>
        </table></div>
      </div>
    </main>
  );
}
