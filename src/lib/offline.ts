import { get, set } from 'idb-keyval';
import type { DataProvider, Row } from './data/provider';
import type { Tabla } from './types';

type Op = { t: Tabla; row: Row | null; id: string };
const KEY = 'garitasur-cola';

/** Cola de escrituras de la garita cuando no hay internet. Se vacía al reconectar. */
class ColaOffline {
  cola: Op[] = [];
  forzarOffline = false;
  private subs = new Set<() => void>();
  private cargada = false;

  get online() { return navigator.onLine && !this.forzarOffline; }
  subscribe(fn: () => void) { this.subs.add(fn); return () => { this.subs.delete(fn); }; }
  emit() { this.subs.forEach(f => f()); }
  async cargar() { if (this.cargada) return; this.cola = (await get<Op[]>(KEY)) || []; this.cargada = true; this.emit(); }
  private async guardar() { await set(KEY, this.cola); this.emit(); }

  async escribir(p: DataProvider, t: Tabla, row: Row) {
    const marcado = t === 'eventos' ? { ...row, sincronizado: true } : row;
    if (this.online) {
      try { await p.upsert(t, marcado); return; } catch (e) { console.warn('sin conexion, encolando', e); }
    }
    p.applyLocal(t, t === 'eventos' ? { ...row, sincronizado: false } : row);
    this.cola.push({ t, row: marcado, id: row.id }); await this.guardar();
  }
  async borrar(p: DataProvider, t: Tabla, id: string) {
    if (this.online) { try { await p.remove(t, id); return; } catch (e) { console.warn('sin conexion, encolando', e); } }
    p.applyLocal(t, null, id);
    this.cola.push({ t, row: null, id }); await this.guardar();
  }
  async sincronizar(p: DataProvider): Promise<number> {
    if (!this.online || !this.cola.length) return 0;
    let n = 0;
    while (this.cola.length) {
      const op = this.cola[0];
      try {
        if (op.row) await p.upsert(op.t, op.row); else await p.remove(op.t, op.id);
        this.cola.shift(); n++;
      } catch (e) { console.warn('sincronizacion interrumpida', e); break; }
    }
    await this.guardar();
    return n;
  }
  setForzar(v: boolean) { this.forzarOffline = v; this.emit(); }
}
export const Offline = new ColaOffline();
window.addEventListener('online', () => Offline.emit());
window.addEventListener('offline', () => Offline.emit());
