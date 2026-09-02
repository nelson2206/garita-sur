export type Rol = 'residente' | 'vigilante' | 'admin';
export type Tabla = 'condominios' | 'unidades' | 'vehiculos' | 'pases' | 'eventos' | 'presencia' | 'solicitudes';

export interface Condominio { id: string; nombre: string; regla_morosidad: 'informar' | 'amenidades'; acuerdo?: string | null; retencion_dias: number; }
export interface Perfil { id: string; condominio_id: string; rol: Rol; nombre: string; unidad_id?: string | null; telefono?: string | null; }
export interface Unidad { id: string; condominio_id: string; lote: string; propietario: string; telefono?: string | null; cuotas_pendientes: number; cupo_vehiculos: number; }
export interface Vehiculo { id: string; condominio_id: string; unidad_id: string; placa: string; descripcion?: string | null; }
export interface Pase {
  id: string; condominio_id: string; unidad_id: string; codigo: string;
  tipo: 'invitado' | 'proveedor' | 'huesped' | 'personal'; nombre: string; rol?: string | null; placa?: string | null;
  desde: string; hasta: string; dias?: number[] | null; hora_desde?: string | null; hora_hasta?: string | null;
  usos: number; usos_max: number; estado: 'activo' | 'usado' | 'vencido' | 'anulado'; creado_en: string;
}
export interface Evento {
  id: string; condominio_id: string; unidad_id?: string | null; ts: string; tipo: 'ingreso' | 'salida'; nombre: string;
  placa?: string | null; medio: 'qr' | 'manual' | 'placa'; autorizo?: string | null; foto_url?: string | null; pase_id?: string | null; sincronizado: boolean;
}
export interface Presencia { id: string; condominio_id: string; unidad_id?: string | null; nombre: string; placa?: string | null; desde: string; tipo: string; }
export interface Solicitud { id: string; condominio_id: string; unidad_id: string; ts: string; nombre: string; placa?: string | null; nota?: string | null; estado: 'pendiente' | 'aprobada' | 'rechazada' | 'telefono' | 'ingreso'; resuelto_en?: string | null; }
