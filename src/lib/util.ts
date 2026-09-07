import type { Condominio, Pase, TipoPase, Unidad } from './types';

// Pases con horario recurrente: valen muchas veces dentro de sus días y horas, sin gastar cupo de ingresos.
export const RECURRENTES: TipoPase[] = ['personal', 'familiar', 'obra'];
export const esRecurrente = (t: TipoPase) => RECURRENTES.includes(t);
export const ETIQUETA_TIPO: Record<TipoPase, string> = {
  invitado: 'Invitado', proveedor: 'Proveedor o delivery', huesped: 'Huésped de alquiler',
  personal: 'Personal del hogar', familiar: 'Familiar frecuente', obra: 'Obra o contratista',
};

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const code6 = () => Array.from({ length: 6 }, () => CH[Math.floor(Math.random() * CH.length)]).join('');
export const nowIso = () => new Date().toISOString();
export const fmtDT = (iso?: string | null) => iso ? new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
export const fmtT = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
export const normPlate = (p?: string | null) => { const s = (p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return s.length >= 6 ? s.slice(0, 3) + '-' + s.slice(3) : s; };
export const soloDigitos = (s: string) => s.replace(/[^0-9]/g, '');
export const localDT = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
export const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const DIAS_LARGO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export type Semaforo = { cls: 'ok' | 'warn' | 'bad'; titulo: string; detalle: string };
export function semaforo(u: Unidad | undefined, c: Condominio | undefined): Semaforo {
  if (!u || u.cuotas_pendientes <= 0) return { cls: 'ok', titulo: 'Al día', detalle: 'Sin cuotas pendientes.' };
  if (c?.regla_morosidad === 'amenidades') return { cls: 'bad', titulo: `En mora · ${u.cuotas_pendientes} cuota(s)`, detalle: 'Amenidades restringidas por acuerdo de junta. El ingreso a la vivienda está permitido.' };
  return { cls: 'warn', titulo: `En mora · ${u.cuotas_pendientes} cuota(s)`, detalle: 'Solo informar. No impide el ingreso a la vivienda ni de sus invitados.' };
}

export function validarPase(p: Pase | undefined): { ok: boolean; msg?: string } {
  if (!p) return { ok: false, msg: 'El código no existe' };
  if (p.estado === 'anulado') return { ok: false, msg: 'Pase anulado por el propietario' };
  const n = new Date();
  if (n < new Date(p.desde)) return { ok: false, msg: 'Pase aún no vigente (desde ' + fmtDT(p.desde) + ')' };
  if (n > new Date(p.hasta)) return { ok: false, msg: 'Pase vencido el ' + fmtDT(p.hasta) };
  if (esRecurrente(p.tipo)) {
    const hm = n.toTimeString().slice(0, 5);
    if (p.dias && p.dias.length && !p.dias.includes(n.getDay())) return { ok: false, msg: 'Hoy no es día autorizado' };
    if (p.hora_desde && p.hora_hasta && (hm < p.hora_desde || hm > p.hora_hasta)) return { ok: false, msg: `Fuera de horario (${p.hora_desde} a ${p.hora_hasta})` };
  } else if (p.usos >= p.usos_max) return { ok: false, msg: 'Pase sin ingresos disponibles' };
  return { ok: true };
}

export const limpiarCodigo = (s: string) => (s || '').trim().toUpperCase().replace(/^GS:/, '');
export const paseLink = (codigo: string) => `${location.origin}${location.pathname}#/pase/${codigo}`;
export function waText(p: Pase, u: Unidad | undefined, c: Condominio | undefined) {
  return `Hola ${p.nombre}, te invité a ${c?.nombre ?? 'mi condominio'} (${u?.lote ?? ''}). Muestra este código en la garita: ${p.codigo}. Válido de ${fmtDT(p.desde)} a ${fmtDT(p.hasta)}. Tu pase: ${paseLink(p.codigo)}`;
}
const NL = String.fromCharCode(10);
export const csv = (rows: (string | number | null | undefined)[][]) => rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join(NL);
export async function descargar(nombre: string, contenido: string, tipo = 'text/csv') {
  // En la página publicada en claude.ai la descarga pasa por la capacidad "downloads"; en la app normal, por el navegador.
  const runtime = (window as unknown as { claude?: { use(n: string): Promise<{ save(o: { filename: string; data: string }): Promise<void> } | null> } }).claude;
  if (runtime) { try { const d = await runtime.use('downloads'); if (d) { await d.save({ filename: nombre, data: contenido }); return; } } catch { /* cancelado o no disponible */ } }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([String.fromCharCode(0xFEFF) + contenido], { type: tipo }));
  a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
