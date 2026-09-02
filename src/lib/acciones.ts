import type { DataProvider } from './data/provider';
import { Offline } from './offline';
import type { Pase, Presencia, Perfil } from './types';
import { nowIso, uid } from './util';

export interface Ingreso { nombre: string; placa?: string; unidadId?: string | null; medio: 'qr' | 'manual' | 'placa'; autorizo: string; pase?: Pase; foto?: string; tipo?: string; }

/** Registra un ingreso: evento en bitácora, presencia y consumo del pase. Funciona sin internet. */
export async function registrarIngreso(p: DataProvider, perfil: Perfil, i: Ingreso) {
  const cid = perfil.condominio_id; const id = uid();
  let foto_url = '';
  if (i.foto) { try { foto_url = Offline.online ? await p.subirFoto(i.foto) : i.foto; } catch { foto_url = ''; } }
  await Offline.escribir(p, 'eventos', { id, condominio_id: cid, unidad_id: i.unidadId || null, ts: nowIso(), tipo: 'ingreso', nombre: i.nombre, placa: i.placa || '', medio: i.medio, autorizo: i.autorizo, foto_url, pase_id: i.pase?.id || null, registrado_por: perfil.id.startsWith('demo-') ? null : perfil.id, sincronizado: true });
  await Offline.escribir(p, 'presencia', { id, condominio_id: cid, unidad_id: i.unidadId || null, nombre: i.nombre, placa: i.placa || '', desde: nowIso(), tipo: i.tipo || 'visita' });
  if (i.pase) {
    const np: Pase = { ...i.pase, usos: (i.pase.usos || 0) + 1 };
    if (np.tipo !== 'personal' && np.usos >= np.usos_max) np.estado = 'usado';
    await Offline.escribir(p, 'pases', np as unknown as Record<string, unknown> & { id: string });
  }
}

export async function registrarSalida(p: DataProvider, perfil: Perfil, d: Presencia) {
  await Offline.escribir(p, 'eventos', { id: uid(), condominio_id: perfil.condominio_id, unidad_id: d.unidad_id || null, ts: nowIso(), tipo: 'salida', nombre: d.nombre, placa: d.placa || '', medio: 'manual', autorizo: '', foto_url: '', pase_id: null, registrado_por: perfil.id.startsWith('demo-') ? null : perfil.id, sincronizado: true });
  await Offline.borrar(p, 'presencia', d.id);
}
