import type { DataProvider } from './data/provider';
import { Offline } from './offline';
import type { Ocurrencia, Pase, Presencia, Perfil, Turno } from './types';
import { esRecurrente, nowIso, uid } from './util';

export interface Ingreso { nombre: string; placa?: string; unidadId?: string | null; medio: 'qr' | 'manual' | 'placa'; autorizo: string; pase?: Pase; foto?: string; tipo?: string; }

/** Turno de garita abierto, si lo hay. La bitácora se cuelga de él para saber quién estaba de guardia. */
export const turnoAbierto = (p: DataProvider): Turno | undefined => p.all<Turno>('turnos').filter(t => !t.fin).sort((a, b) => b.inicio.localeCompare(a.inicio))[0];

export async function abrirTurno(p: DataProvider, perfil: Perfil, notas: string) {
  const anterior = turnoAbierto(p);
  if (anterior) await Offline.escribir(p, 'turnos', { ...anterior, fin: nowIso() });
  const t: Turno = { id: uid(), condominio_id: perfil.condominio_id, vigilante: perfil.nombre, inicio: nowIso(), fin: null, notas_apertura: notas || null, notas_cierre: null };
  await Offline.escribir(p, 'turnos', t as unknown as Record<string, unknown> & { id: string });
  return t;
}

export async function cerrarTurno(p: DataProvider, t: Turno, notas: string) {
  await Offline.escribir(p, 'turnos', { ...t, fin: nowIso(), notas_cierre: notas || null });
}

export async function anotarOcurrencia(p: DataProvider, perfil: Perfil, texto: string, gravedad: Ocurrencia['gravedad']) {
  const t = turnoAbierto(p);
  const o: Ocurrencia = { id: uid(), condominio_id: perfil.condominio_id, turno_id: t?.id || null, ts: nowIso(), texto, gravedad, vigilante: perfil.nombre };
  await Offline.escribir(p, 'ocurrencias', o as unknown as Record<string, unknown> & { id: string });
}

/** Registra un ingreso: evento en bitácora, presencia y consumo del pase. Funciona sin internet. */
export async function registrarIngreso(p: DataProvider, perfil: Perfil, i: Ingreso) {
  const cid = perfil.condominio_id; const id = uid(); const turno = turnoAbierto(p);
  let foto_url = '';
  if (i.foto) { try { foto_url = Offline.online ? await p.subirFoto(i.foto) : i.foto; } catch { foto_url = ''; } }
  await Offline.escribir(p, 'eventos', { id, condominio_id: cid, unidad_id: i.unidadId || null, ts: nowIso(), tipo: 'ingreso', nombre: i.nombre, placa: i.placa || '', medio: i.medio, autorizo: i.autorizo, foto_url, pase_id: i.pase?.id || null, vigilante: perfil.nombre, turno_id: turno?.id || null, registrado_por: perfil.id.startsWith('demo-') ? null : perfil.id, sincronizado: true });
  await Offline.escribir(p, 'presencia', { id, condominio_id: cid, unidad_id: i.unidadId || null, nombre: i.nombre, placa: i.placa || '', desde: nowIso(), tipo: i.tipo || 'visita' });
  if (i.pase) {
    const np: Pase = { ...i.pase, usos: (i.pase.usos || 0) + 1 };
    if (!esRecurrente(np.tipo) && np.usos >= np.usos_max) np.estado = 'usado';
    await Offline.escribir(p, 'pases', np as unknown as Record<string, unknown> & { id: string });
  }
}

export async function registrarSalida(p: DataProvider, perfil: Perfil, d: Presencia) {
  const turno = turnoAbierto(p);
  await Offline.escribir(p, 'eventos', { id: uid(), condominio_id: perfil.condominio_id, unidad_id: d.unidad_id || null, ts: nowIso(), tipo: 'salida', nombre: d.nombre, placa: d.placa || '', medio: 'manual', autorizo: '', foto_url: '', pase_id: null, vigilante: perfil.nombre, turno_id: turno?.id || null, registrado_por: perfil.id.startsWith('demo-') ? null : perfil.id, sincronizado: true });
  await Offline.borrar(p, 'presencia', d.id);
}
