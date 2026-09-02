import type { Condominio, Tabla } from '../types';

export type Row = { id: string; [k: string]: unknown };
type Cache = Record<Tabla, Record<string, Row>>;
const vacio = (): Cache => ({ condominios: {}, unidades: {}, vehiculos: {}, pases: {}, eventos: {}, presencia: {}, solicitudes: {} });

/** Capa de datos: mantiene una copia en memoria y avisa a la interfaz cuando cambia. */
export abstract class DataProvider {
  abstract modo: 'local' | 'nube';
  protected cache: Cache = vacio();
  private subs = new Set<() => void>();
  ready = false;

  subscribe(fn: () => void) { this.subs.add(fn); return () => { this.subs.delete(fn); }; }
  protected emit() { this.subs.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }
  all<T = Row>(t: Tabla): T[] { return Object.values(this.cache[t]) as T[]; }
  get<T = Row>(t: Tabla, id?: string | null): T | undefined { return id ? (this.cache[t][id] as T | undefined) : undefined; }
  condominio(): Condominio | undefined { return this.all<Condominio>('condominios')[0]; }
  protected limpiar() { this.cache = vacio(); }

  /** Aplica un cambio solo en memoria (modo sin internet u optimista). */
  applyLocal(t: Tabla, row: Row | null, id?: string) {
    if (row) this.cache[t][row.id] = row; else if (id) delete this.cache[t][id];
    this.emit();
  }
  abstract init(): Promise<void>;
  abstract upsert(t: Tabla, row: Row): Promise<void>;
  abstract remove(t: Tabla, id: string): Promise<void>;
  /** Guarda una foto (dataURL) y devuelve una referencia que resolverFoto convierte en URL visible. */
  abstract subirFoto(dataUrl: string): Promise<string>;
  abstract resolverFoto(ref: string): Promise<string>;
  abstract reset(): Promise<void>;
}
