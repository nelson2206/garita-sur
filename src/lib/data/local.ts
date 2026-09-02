import { DataProvider, type Row } from './provider';
import type { Tabla } from '../types';

const KEY = 'garitasur-app';
export const CONDO_DEMO = 'c-demo';

/** Datos ficticios para el modo demo (sin backend). */
export function semilla() {
  const cid = CONDO_DEMO;
  const t = new Date();
  const h = (hh: number, mm: number) => { const d = new Date(t); d.setHours(hh, mm, 0, 0); return d.toISOString(); };
  const manana = new Date(t); manana.setDate(t.getDate() + 1); manana.setHours(23, 59, 0, 0);
  const anio = new Date(t); anio.setFullYear(t.getFullYear() + 1);
  const u = (id: string, lote: string, propietario: string, tel: string, cuotas: number) => ({ id, condominio_id: cid, lote, propietario, telefono: tel, cuotas_pendientes: cuotas, cupo_vehiculos: 3 });
  const v = (id: string, unidad_id: string, placa: string, descripcion: string) => ({ id, condominio_id: cid, unidad_id, placa, descripcion });
  const lista = {
    condominios: [{ id: cid, nombre: 'Condominio Las Dunas del Sur', regla_morosidad: 'informar', acuerdo: '', retencion_dias: 30 }],
    unidades: [u('u3', 'Lote 3', 'Familia Salazar', '+51 9xx xxx 301', 0), u('u7', 'Lote 7', 'Familia Moreno', '+51 9xx xxx 307', 2), u('u12', 'Lote 12', 'Familia Huamán', '+51 9xx xxx 312', 0), u('u15', 'Lote 15', 'Familia Delgado', '+51 9xx xxx 315', 4), u('u21', 'Lote 21', 'Familia Castro', '+51 9xx xxx 321', 0), u('u24', 'Lote 24', 'Familia Ríos', '+51 9xx xxx 324', 0)],
    vehiculos: [v('v1', 'u3', 'BJK-482', 'Toyota RAV4 gris'), v('v2', 'u7', 'ABX-215', 'Kia Sportage blanca'), v('v3', 'u12', 'C4T-903', 'Hyundai Tucson negra'), v('v4', 'u12', 'AQP-118', 'Subaru Forester azul'), v('v5', 'u15', 'F2R-771', 'Mazda CX-5 roja'), v('v6', 'u24', 'BGD-330', 'Nissan X-Trail plata')],
    pases: [
      { id: 'p1', condominio_id: cid, unidad_id: 'u12', codigo: '7QK4M2', tipo: 'invitado', nombre: 'Lucía Paredes', placa: 'AXR-560', desde: h(0, 0), hasta: manana.toISOString(), usos: 0, usos_max: 2, estado: 'activo', creado_en: h(7, 40) },
      { id: 'p2', condominio_id: cid, unidad_id: 'u3', codigo: 'M3NP8H', tipo: 'personal', nombre: 'Rosa Quispe', rol: 'Trabajadora del hogar', dias: [0, 1, 2, 3, 4, 5, 6], hora_desde: '06:00', hora_hasta: '22:00', desde: h(0, 0), hasta: anio.toISOString(), usos: 14, usos_max: 9999, estado: 'activo', creado_en: h(6, 0) },
      { id: 'p3', condominio_id: cid, unidad_id: 'u15', codigo: 'W9DL4C', tipo: 'personal', nombre: 'Julio Ccama', rol: 'Jardinero', dias: [2, 5], hora_desde: '08:00', hora_hasta: '13:00', desde: h(0, 0), hasta: anio.toISOString(), usos: 5, usos_max: 9999, estado: 'activo', creado_en: h(6, 0) },
    ],
    eventos: [
      { id: 'e1', condominio_id: cid, unidad_id: 'u3', ts: h(7, 55), tipo: 'ingreso', nombre: 'Rosa Quispe', placa: '', medio: 'qr', autorizo: 'Credencial recurrente · Familia Salazar', sincronizado: true },
      { id: 'e2', condominio_id: cid, unidad_id: 'u24', ts: h(9, 12), tipo: 'ingreso', nombre: 'Familia Ríos', placa: 'BGD-330', medio: 'placa', autorizo: 'Vehículo registrado', sincronizado: true },
      { id: 'e3', condominio_id: cid, unidad_id: 'u7', ts: h(9, 40), tipo: 'ingreso', nombre: 'Repartidor gas', placa: 'M2K-118', medio: 'manual', autorizo: 'Aprobado por teléfono · Familia Moreno', sincronizado: true },
      { id: 'e4', condominio_id: cid, unidad_id: 'u7', ts: h(10, 5), tipo: 'salida', nombre: 'Repartidor gas', placa: 'M2K-118', medio: 'manual', autorizo: '', sincronizado: true },
    ],
    presencia: [
      { id: 'd1', condominio_id: cid, unidad_id: 'u3', nombre: 'Rosa Quispe', placa: '', desde: h(7, 55), tipo: 'personal' },
      { id: 'd2', condominio_id: cid, unidad_id: 'u24', nombre: 'Familia Ríos', placa: 'BGD-330', desde: h(9, 12), tipo: 'residente' },
    ],
    solicitudes: [] as Row[],
  };
  const out: Record<string, Record<string, Row>> = {};
  for (const [k, arr] of Object.entries(lista)) out[k] = Object.fromEntries((arr as Row[]).map(r => [r.id, r]));
  return out;
}

export class LocalProvider extends DataProvider {
  modo = 'local' as const;
  async init() {
    let raw: Record<string, Record<string, Row>> | null = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { raw = null; }
    const datos = raw && raw.unidades && Object.keys(raw.unidades).length ? raw : semilla();
    this.limpiar();
    for (const t of Object.keys(this.cache) as Tabla[]) this.cache[t] = datos[t] || {};
    this.persist(); this.ready = true; this.emit();
  }
  private persist() { try { localStorage.setItem(KEY, JSON.stringify(this.cache)); } catch { /* sin espacio */ } }
  async upsert(t: Tabla, row: Row) { this.cache[t][row.id] = row; this.persist(); this.emit(); }
  async remove(t: Tabla, id: string) { delete this.cache[t][id]; this.persist(); this.emit(); }
  async subirFoto(dataUrl: string) { return dataUrl; }
  async resolverFoto(ref: string) { return ref; }
  async reset() { localStorage.removeItem(KEY); await this.init(); }
}
