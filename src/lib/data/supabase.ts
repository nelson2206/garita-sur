import type { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { DataProvider, type Row } from './provider';
import type { Tabla } from '../types';
import { uid } from '../util';

const TABLAS: Tabla[] = ['condominios', 'unidades', 'vehiculos', 'pases', 'eventos', 'presencia', 'solicitudes'];

/** Datos en Supabase filtrados por condominio, con actualización en tiempo real. */
export class SupabaseProvider extends DataProvider {
  modo = 'nube' as const;
  private canal: ReturnType<SupabaseClient['channel']> | null = null;
  constructor(private sb: SupabaseClient, private condominioId: string) { super(); }

  async init() {
    this.limpiar();
    await Promise.all(TABLAS.map(async t => {
      const q = t === 'condominios' ? this.sb.from(t).select('*').eq('id', this.condominioId) : this.sb.from(t).select('*').eq('condominio_id', this.condominioId);
      const { data, error } = await q;
      if (error) { console.warn(t, error.message); return; }
      for (const r of (data || []) as Row[]) this.cache[t][r.id] = r;
    }));
    this.canal = this.sb.channel('garita-' + this.condominioId);
    for (const t of TABLAS) {
      const filter = t === 'condominios' ? `id=eq.${this.condominioId}` : `condominio_id=eq.${this.condominioId}`;
      this.canal.on('postgres_changes', { event: '*', schema: 'public', table: t, filter }, (p: RealtimePostgresChangesPayload<Row>) => {
        if (p.eventType === 'DELETE') delete this.cache[t][(p.old as Row).id]; else this.cache[t][(p.new as Row).id] = p.new as Row;
        this.emit();
      });
    }
    this.canal.subscribe();
    this.ready = true; this.emit();
  }
  async upsert(t: Tabla, row: Row) {
    this.cache[t][row.id] = row; this.emit();
    const { error } = await this.sb.from(t).upsert(row);
    if (error) throw new Error(error.message);
  }
  async remove(t: Tabla, id: string) {
    delete this.cache[t][id]; this.emit();
    const { error } = await this.sb.from(t).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
  async subirFoto(dataUrl: string) {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${this.condominioId}/${uid()}.jpg`;
    const { error } = await this.sb.storage.from('fotos').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw new Error(error.message);
    return path;
  }
  async resolverFoto(ref: string) {
    if (ref.startsWith('data:')) return ref;
    const { data } = await this.sb.storage.from('fotos').createSignedUrl(ref, 3600);
    return data?.signedUrl || '';
  }
  async reset() { /* en la nube no se reinicia desde la app */ }
  destroy() { this.canal?.unsubscribe(); }
}
