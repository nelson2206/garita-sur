export type Rol = 'residente' | 'vigilante' | 'admin';

export const TABLAS = ['condominios', 'unidades', 'vehiculos', 'pases', 'eventos', 'presencia', 'solicitudes', 'turnos', 'ocurrencias', 'invitaciones'] as const;
export type Tabla = typeof TABLAS[number];

export interface Condominio { id: string; nombre: string; regla_morosidad: 'informar' | 'amenidades'; acuerdo?: string | null; retencion_dias: number; responsable_datos?: string | null; }
export interface Perfil { id: string; condominio_id: string; rol: Rol; nombre: string; unidad_id?: string | null; telefono?: string | null; }
export interface Unidad { id: string; condominio_id: string; lote: string; propietario: string; telefono?: string | null; cuotas_pendientes: number; cupo_vehiculos: number; }
export interface Vehiculo { id: string; condominio_id: string; unidad_id: string; placa: string; descripcion?: string | null; }

// Un pase es toda autorización de ingreso: invitado, familiar frecuente, personal, proveedor, huésped u obra.
export type TipoPase = 'invitado' | 'proveedor' | 'huesped' | 'personal' | 'familiar' | 'obra';
export interface Pase {
  id: string; condominio_id: string; unidad_id: string; codigo: string;
  tipo: TipoPase; nombre: string; rol?: string | null; placa?: string | null;
  desde: string; hasta: string; dias?: number[] | null; hora_desde?: string | null; hora_hasta?: string | null;
  usos: number; usos_max: number; estado: 'activo' | 'usado' | 'vencido' | 'anulado'; creado_en: string;
  // Nombre del evento social o de la empresa contratista que agrupa varios pases.
  grupo?: string | null;
}
export interface Evento {
  id: string; condominio_id: string; unidad_id?: string | null; ts: string; tipo: 'ingreso' | 'salida'; nombre: string;
  placa?: string | null; medio: 'qr' | 'manual' | 'placa'; autorizo?: string | null; foto_url?: string | null; pase_id?: string | null;
  vigilante?: string | null; turno_id?: string | null; sincronizado: boolean;
}
export interface Presencia { id: string; condominio_id: string; unidad_id?: string | null; nombre: string; placa?: string | null; desde: string; tipo: string; }
export interface Solicitud { id: string; condominio_id: string; unidad_id: string; ts: string; nombre: string; placa?: string | null; nota?: string | null; estado: 'pendiente' | 'aprobada' | 'rechazada' | 'telefono' | 'ingreso'; resuelto_en?: string | null; }

// Turno de garita: quién está de guardia, desde cuándo y qué dejó dicho al relevo.
export interface Turno { id: string; condominio_id: string; vigilante: string; inicio: string; fin?: string | null; notas_apertura?: string | null; notas_cierre?: string | null; }
// Libro de ocurrencias del turno: notas e incidentes.
export interface Ocurrencia { id: string; condominio_id: string; turno_id?: string | null; ts: string; texto: string; gravedad: 'nota' | 'incidente'; vigilante?: string | null; }
// Invitación de acceso que la administración envía por correo.
export interface Invitacion { id: string; condominio_id: string; email: string; rol: Rol; nombre: string; unidad_id?: string | null; estado: 'pendiente' | 'aceptada' | 'anulada'; creado_en: string; aceptado_en?: string | null; }
