import { DataProvider, type Row } from './provider';
import { TABLAS, type Tabla } from '../types';
import { semilla } from './local';

type Snap = { docs: { id: string; data(): Record<string, unknown> | undefined }[] };
type Col = { doc(id?: string): { set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> }; onSnapshot(fn: (s: Snap) => void, err?: (e: unknown) => void): () => void };
type Db = { collection(p: string): Col };
declare global { interface Window { claude?: { use(name: string): Promise<unknown> } } }

/** Datos compartidos entre todos los que abren la página publicada en claude.ai (demo multi-dispositivo sin Supabase). */
export class ArtifactProvider extends DataProvider {
  modo = 'compartido' as const;
  private db: Db | null = null;

  async init() {
    if (!window.claude) throw new Error('sin runtime de artifact');
    const db = (await Promise.race([window.claude.use('db'), new Promise(r => setTimeout(() => r(null), 12000))])) as Db | null;
    if (!db) throw new Error('almacén compartido no disponible');
    this.db = db; this.limpiar();
    await Promise.all(TABLAS.map(t => new Promise<void>(res => {
      let first = true;
      db.collection(t).onSnapshot(s => {
        this.cache[t] = {};
        for (const d of s.docs) { const v = d.data(); if (v) this.cache[t][d.id] = { ...(v as Row), id: d.id }; }
        this.emit(); if (first) { first = false; res(); }
      }, e => { console.warn(t, e); if (first) { first = false; res(); } });
    })));
    if (!this.all('unidades').length) await this.seed();
    this.ready = true; this.emit();
  }
  async upsert(t: Tabla, row: Row) { this.cache[t][row.id] = row; this.emit(); await this.db!.collection(t).doc(row.id).set(row); }
  async remove(t: Tabla, id: string) { delete this.cache[t][id]; this.emit(); await this.db!.collection(t).doc(id).delete(); }
  async subirFoto(dataUrl: string) { return dataUrl; }
  async resolverFoto(ref: string) { return ref; }
  async seed() { const s = semilla(); for (const t of TABLAS) for (const r of Object.values(s[t] || {})) await this.upsert(t, r); }
  async reset() { for (const t of TABLAS) for (const id of Object.keys(this.cache[t])) await this.remove(t, id); await this.seed(); }
}
